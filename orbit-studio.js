/* Orbit Studio — free profile personalization for approved ORBIT + members.
   All profile photos use short-lived signed URLs from a private storage bucket. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const BUCKET='orbit-member-avatars';
const DEFAULT={home_theme:'classic',avatar_style:'planet',avatar_ring:'orbit',name_font:'default',avatar_path:'',site_palette:{}};
const CATALOG={
 avatar_style:[
  {id:'planet',label:'Orbit',icon:'🪐'},
  {id:'moon',label:'Moonlight',icon:'🌙'},
  {id:'comet',label:'Comet',icon:'☄️'},
  {id:'star',label:'Starlight',icon:'✨'},
  {id:'aurora',label:'Aurora',icon:'🌌'},
  {id:'galaxy',label:'Galaxy',icon:'🌠'}
 ],
 avatar_ring:[
  {id:'none',label:'Classic'},
  {id:'orbit',label:'Orbit'},
  {id:'neon',label:'Electric'},
  {id:'solar',label:'Solar Flare'},
  {id:'ice',label:'Frost'},
  {id:'royal',label:'Royal'}
 ],
 name_font:[
  {id:'default',label:'Original'},
  {id:'rounded',label:'Rounded'},
  {id:'serif',label:'Elegant'},
  {id:'mono',label:'Terminal'},
  {id:'tech',label:'Space Tech'},
  {id:'hand',label:'Handwritten'}
 ],
 home_theme:[
  {id:'classic',label:'Classic Orbit'},
  {id:'aurora',label:'Aurora'},
  {id:'sunset',label:'Solar Sunset'},
  {id:'rose',label:'Rose Nebula'},
  {id:'arctic',label:'Arctic'},
  {id:'midnight',label:'Midnight'},
  {id:'nebula',label:'Deep Nebula'}
 ]
};

const PALETTE_DEFAULT={
 background:'#050B2F',sidebar:'#071B62',surface:'#101D52',
 accent:'#5E93FF',text:'#F2F6FF',border:'#3B569F'
};
const PALETTE_KEYS=Object.keys(PALETTE_DEFAULT);
const PALETTE_PRESETS=[
 {id:'classic',label:'Classic Orbit',colors:{...PALETTE_DEFAULT}},
 {id:'aurora',label:'Aurora',colors:{background:'#061E2B',sidebar:'#0B3B46',surface:'#103641',accent:'#5DE8C7',text:'#EDFFFA',border:'#347A87'}},
 {id:'sunset',label:'Solar Sunset',colors:{background:'#281522',sidebar:'#562B44',surface:'#42283B',accent:'#FFC278',text:'#FFF1E8',border:'#915C71'}},
 {id:'rose',label:'Rose Nebula',colors:{background:'#221530',sidebar:'#44255B',surface:'#39234F',accent:'#EEA0F5',text:'#FFF1FF',border:'#85519B'}},
 {id:'arctic',label:'Arctic',colors:{background:'#0E293A',sidebar:'#174760',surface:'#1A3D51',accent:'#96E4FA',text:'#F0FAFF',border:'#497B99'}},
 {id:'midnight',label:'Midnight',colors:{background:'#030615',sidebar:'#0A1237',surface:'#0C1534',accent:'#8E9EFF',text:'#EDF0FF',border:'#2D4279'}},
 {id:'daylight',label:'Daylight',colors:{background:'#E9F1FF',sidebar:'#CCDFFF',surface:'#FFFFFF',accent:'#2851C2',text:'#152641',border:'#A3B8D9'}}
];
let savedPalette=null, draftPalette=null, savingPalette=false;
function normalizePalette(candidate){
 if(!candidate||typeof candidate!=='object'||Array.isArray(candidate))return null;
 if(Object.keys(candidate).length===0)return null;
 if(Object.keys(candidate).length!==PALETTE_KEYS.length)return null;
 const result={};
 for(const key of PALETTE_KEYS){
  const value=candidate[key];
  if(typeof value!=='string'||!/^#[0-9a-f]{6}$/i.test(value))return null;
  result[key]=value.toUpperCase();
 }
 return result;
}
function clonePalette(value){return value?{...value}:null}
function paletteEqual(a,b){
 if(!a&&!b)return true;
 if(!a||!b)return false;
 return PALETTE_KEYS.every(key=>a[key]===b[key]);
}
function paletteLuminance(hex){
 const parts=[1,3,5].map(n=>parseInt(hex.slice(n,n+2),16)/255)
  .map(x=>x<=0.04045?x/12.92:Math.pow((x+0.055)/1.055,2.4));
 return parts[0]*0.2126+parts[1]*0.7152+parts[2]*0.0722;
}
function paletteContrast(a,b){
 const x=paletteLuminance(a),y=paletteLuminance(b);
 return (Math.max(x,y)+0.05)/(Math.min(x,y)+0.05);
}
function paletteTextOnAccent(accent){
 return paletteContrast('#FFFFFF',accent)>paletteContrast('#111827',accent)?'#FFFFFF':'#111827';
}
function applySitePalette(colors){
 const app=$('appLayout');if(!app)return;
 const active=normalizePalette(colors);
 for(const target of [app,document.documentElement]){
  if(!active){
   delete target.dataset.sitePalette;
   for(const key of PALETTE_KEYS)target.style.removeProperty('--oc-'+key);
   target.style.removeProperty('--oc-accent-ink');
  }else{
   target.dataset.sitePalette='custom';
   for(const key of PALETTE_KEYS)target.style.setProperty('--oc-'+key,active[key]);
   target.style.setProperty('--oc-accent-ink',paletteTextOnAccent(active.accent));
  }
 }
}
function renderPaletteState(){
 const colors=draftPalette||PALETTE_DEFAULT;
 for(const key of PALETTE_KEYS){
  const input=$('palette'+key[0].toUpperCase()+key.slice(1));
  const label=$('palette'+key[0].toUpperCase()+key.slice(1)+'Hex');
  if(input&&input.value.toUpperCase()!==colors[key])input.value=colors[key];
  if(label)label.textContent=colors[key];
 }
 const mini=$('paletteMiniPreview');
 if(mini){
  for(const key of PALETTE_KEYS)mini.style.setProperty('--pv-'+key,colors[key]);
  mini.style.setProperty('--pv-accent-ink',paletteTextOnAccent(colors.accent));
 }
 const diff=!paletteEqual(draftPalette,savedPalette);
 const save=$('paletteSave'),undo=$('paletteUndo'),reset=$('paletteReset');
 if(save)save.disabled=!diff||savingPalette;
 if(undo)undo.disabled=!diff||savingPalette;
 if(reset)reset.disabled=savingPalette||(!draftPalette&&!savedPalette);
 for(const button of $('palettePresets')?.querySelectorAll('[data-palette-preset]')||[]){
  const selected=paletteEqual(draftPalette,PALETTE_PRESETS.find(p=>p.id===button.dataset.palettePreset)?.colors);
  button.classList.toggle('selected',selected);
  button.setAttribute('aria-pressed',String(selected));
 }
 const readability=$('paletteContrast');
 if(readability){
  const r1=paletteContrast(colors.text,colors.background);
  const r2=paletteContrast(colors.text,colors.surface);
  const tooLow=Math.min(r1,r2)<4.5;
  readability.textContent=tooLow?
   'Low contrast: the chosen text may be hard to read. Try a lighter or darker text color.':
   'Looking good! Your text is readable against the main background and cards.';
  readability.dataset.warning=tooLow?'true':'false';
 }
}
function editPalette(key,value){
 if(!PALETTE_KEYS.includes(key)||!/^#[0-9a-f]{6}$/i.test(value))return;
 draftPalette={...(draftPalette||PALETTE_DEFAULT),[key]:value.toUpperCase()};
 applySitePalette(draftPalette);
 renderPaletteState();
 const status=$('paletteStatus');if(status)status.textContent='Previewing your colors. Click Save my palette to keep them.';
}
function renderPalettePresets(){
 const box=$('palettePresets');if(!box)return;
 box.replaceChildren();
 for(const preset of PALETTE_PRESETS){
  const btn=document.createElement('button');btn.type='button';btn.className='palette-preset';
  btn.dataset.palettePreset=preset.id;
  const dots=document.createElement('span');dots.className='palette-preset-dots';
  for(const key of ['sidebar','surface','accent']){
   const dot=document.createElement('span');dot.style.backgroundColor=preset.colors[key];dots.append(dot)
  }
  const name=document.createElement('span');name.textContent=preset.label;
  btn.append(dots,name);
  btn.onclick=()=>{
   draftPalette={...preset.colors};
   applySitePalette(draftPalette);renderPaletteState();
   const note=$('paletteStatus');if(note)note.textContent='Previewing '+preset.label+'. Choose Save my palette to keep it.';
  };
  box.append(btn);
 }
}
function syncSitePalette(){
 if(!me)return;
 const next=normalizePalette(get(me.id).site_palette);
 const hasUnsaved=!paletteEqual(draftPalette,savedPalette);
 savedPalette=clonePalette(next);
 if(!hasUnsaved)draftPalette=clonePalette(next);
 applySitePalette(draftPalette);
 renderPaletteState();
}
async function saveSitePalette(){
 if(!client||!me||savingPalette)return;
 const value=normalizePalette(draftPalette);
 savingPalette=true;renderPaletteState();
 const message=$('paletteStatus');
 if(message)message.textContent='Saving your palette…';
 try{
  const {data,error}=await client.from('orbit_appearance')
   .update({site_palette:value||{}}).eq('user_id',me.id)
   .select('site_palette').single();
  if(error)throw error;
  appearance.set(me.id,{...get(me.id),site_palette:data.site_palette||{}});
  savedPalette=clonePalette(value);
  draftPalette=clonePalette(value);
  if(message)message.textContent=value?'Saved! Your colors will be restored when you return.':'Original ORBIT + colors restored.';
 }catch(e){
  if(message)message.textContent='Unable to save your palette: '+e.message;
 }
 finally{savingPalette=false;renderPaletteState()}
}
function bindPaletteUI(){
 renderPalettePresets();
 for(const input of document.querySelectorAll('#paletteFields input[data-palette-key]')){
  input.addEventListener('input',()=>editPalette(input.dataset.paletteKey,input.value));
 }
 $('paletteSave')?.addEventListener('click',saveSitePalette);
 $('paletteUndo')?.addEventListener('click',()=>{
  draftPalette=clonePalette(savedPalette);
  applySitePalette(draftPalette);renderPaletteState();
  $('paletteStatus').textContent='Unsaved changes discarded.';
 });
 $('paletteReset')?.addEventListener('click',()=>{
  draftPalette=null;applySitePalette(null);renderPaletteState();
  saveSitePalette();
 });
 renderPaletteState();
}

let client=null,me=null,currentNick='ORBIT + Member',appearance=new Map(),signed=new Map(),loadedAt=0,busy=null,onUpdate=null,ready=false,initializing=null;
const allowed=(type,id)=>CATALOG[type].some(x=>x.id===id);
function status(text,isError=false){
 const el=$('studioStatus');if(!el)return;el.textContent=text;el.dataset.error=isError?'true':'false';
}
function get(id){return appearance.get(id)||DEFAULT}
function avatarSymbol(style){return CATALOG.avatar_style.find(x=>x.id===style)?.icon||'🪐'}
function setTheme(){
 const container=$('appLayout');if(!container||!me)return;
 container.dataset.homeTheme=get(me.id).home_theme;
 const greeting=$('homeGreeting');if(greeting)greeting.textContent='Welcome back, '+currentNick+'. Your Orbit is ready.';
}
function decorateAvatar(element,id,nick){
 if(!element)return;
 const item=get(id);
 element.classList.add('orbit-avatar');
 element.dataset.ring=item.avatar_ring;
 element.dataset.avatar=item.avatar_style;
 element.replaceChildren();
 const active=signed.get(id);
 if(active&&active.expires>Date.now()&&item.avatar_path){
  const img=document.createElement('img');
  img.src=active.url;
  img.alt='Profile picture of '+String(nick||'member');
  img.loading='lazy';
  img.referrerPolicy='no-referrer';
  img.addEventListener('error',()=>{
   if(img.parentElement===element){element.replaceChildren(document.createTextNode(avatarSymbol(item.avatar_style)))}
  },{once:true});
  element.append(img);
 }else{
  element.append(document.createTextNode(avatarSymbol(item.avatar_style)));
 }
 element.title=(nick||'Member')+"'s avatar";
}
function decorateName(element,id){
 if(!element)return;
 const prev=element.dataset.appearanceFont;
 if(prev)element.classList.remove('orbit-font-'+prev);
 const next=get(id).name_font;
 element.classList.add('orbit-font-'+next);
 element.dataset.appearanceFont=next;
}
function updatePreview(){
 if(!me)return;
 setTheme();
 const avatar=$('studioAvatar');decorateAvatar(avatar,me.id,currentNick);
 const nm=$('studioDisplayName');if(nm){nm.textContent=currentNick;decorateName(nm,me.id)}
 decorateAvatar($('sidebarAvatar'),me.id,currentNick);
 decorateName($('profileName'),me.id);
 const mine=get(me.id);
 for(const [key,containerId] of Object.entries({
  avatar_style:'studioAvatarOptions',avatar_ring:'studioRingOptions',
  name_font:'studioFontOptions',home_theme:'studioThemeOptions'
 })){
  const el=$(containerId);if(!el)continue;
  for(const button of el.querySelectorAll('[data-option-id]')){
   const active=button.dataset.optionId===mine[key];
   button.classList.toggle('selected',active);
   button.setAttribute('aria-pressed',String(active));
  }
 }
 $('studioRemovePhoto').disabled=!mine.avatar_path;
}
async function loadAll(force=false){
 if(!client||!me)return;
 if(busy)return busy;
 if(!force&&Date.now()-loadedAt<55000)return;
 busy=(async()=>{
  const {data,error}=await client.from('orbit_appearance').select('user_id,home_theme,avatar_style,avatar_ring,name_font,avatar_path,site_palette').limit(250);
  if(error)throw error;
  appearance=new Map((data||[]).map(row=>[row.user_id,{...DEFAULT,...row}]));
  syncSitePalette();
  const uploads=(data||[]).filter(p=>p.avatar_path);
  await Promise.all(uploads.map(async p=>{
   const existing=signed.get(p.user_id);
   if(existing&&existing.path===p.avatar_path&&existing.expires>Date.now()+60000&&!force)return;
   const result=await client.storage.from(BUCKET).createSignedUrl(p.avatar_path,900);
   if(!result.error&&result.data?.signedUrl){
    signed.set(p.user_id,{path:p.avatar_path,url:result.data.signedUrl,expires:Date.now()+14*60000});
   }
  }));
  loadedAt=Date.now();
  updatePreview();
 })().catch(e=>{
  console.warn('Orbit Studio appearance load:',e.message);
  if($('studio').classList.contains('active'))status('Could not load appearance: '+e.message,true);
 }).finally(()=>busy=null);
 return busy;
}
function renderOptions(type,targetId){
 const root=$(targetId);if(!root)return;root.replaceChildren();
 for(const option of CATALOG[type]){
  const button=document.createElement('button');
  button.type='button';button.className='studio-option';
  button.dataset.optionId=option.id;
  const tile=document.createElement('div');tile.className='studio-option-visual';
  if(type==='avatar_style'){tile.classList.add('orbit-avatar-preview','avatar-style-'+option.id);tile.textContent=option.icon}
  else if(type==='avatar_ring'){
   tile.classList.add('studio-ring-thumb');
   const circle=document.createElement('span');circle.className='orbit-avatar';circle.dataset.ring=option.id;circle.textContent='🪐';tile.append(circle);
  }else if(type==='name_font'){tile.classList.add('orbit-font-'+option.id);tile.textContent='Aa'}
  else{tile.classList.add('studio-theme-thumb');tile.dataset.theme=option.id}
  const label=document.createElement('span');label.className='studio-option-label';label.textContent=option.label;
  button.append(tile,label);
  button.onclick=()=>saveOption(type,option.id);
  root.append(button);
 }
}
function renderAllOptions(){
 renderOptions('avatar_style','studioAvatarOptions');
 renderOptions('avatar_ring','studioRingOptions');
 renderOptions('name_font','studioFontOptions');
 renderOptions('home_theme','studioThemeOptions');
}
async function notify(){
 updatePreview();
 if(onUpdate)try{await onUpdate()}catch(e){console.warn(e)}
}
async function saveOption(type,value){
 if(!client||!me||!allowed(type,value))return;
 const payload={[type]:value};
 const existing=get(me.id);
 if(type==='avatar_style'&&existing.avatar_path)payload.avatar_path='';
 status('Saving '+value+'…');
 const {error}=await client.from('orbit_appearance').update(payload).eq('user_id',me.id);
 if(error){status('Could not save: '+error.message,true);return}
 if(payload.avatar_path===''){
  signed.delete(me.id);
  client.storage.from(BUCKET).remove([existing.avatar_path]).catch(()=>{});
 }
 appearance.set(me.id,{...existing,...payload});
 await notify();status('Saved! Other members will see your updated avatar, ring, or name font. Home themes are personal.');
}
function photoBlob(file){
 return new Promise((resolve,reject)=>{
  if(!file||!['image/png','image/jpeg','image/webp'].includes(file.type)){reject(new Error('Choose a PNG, JPG or WebP image.'));return}
  if(file.size>8*1024*1024){reject(new Error('Choose an image smaller than 8 MB.'));return}
  const url=URL.createObjectURL(file),im=new Image();
  im.onload=()=>{
   URL.revokeObjectURL(url);
   const canvas=document.createElement('canvas');canvas.width=256;canvas.height=256;
   const context=canvas.getContext('2d');
   if(!context){reject(new Error('Image editing is unavailable on this device.'));return}
   const side=Math.min(im.naturalWidth,im.naturalHeight);
   context.drawImage(im,(im.naturalWidth-side)/2,(im.naturalHeight-side)/2,side,side,0,0,256,256);
   canvas.toBlob(blob=>{
    if(!blob||blob.type!=='image/webp'||blob.size>1048576)reject(new Error('Could not process this image.'));
    else resolve(blob);
   },'image/webp',.78);
  };
  im.onerror=()=>{URL.revokeObjectURL(url);reject(new Error('Could not read that image.'))};
  im.src=url;
 });
}
async function upload(file){
 if(!client||!me||!file)return;
 status('Preparing your photo…');
 try{
  const blob=await photoBlob(file);
  const path=me.id+'/avatar.webp';
  const uploaded=await client.storage.from(BUCKET).upload(path,blob,{contentType:'image/webp',upsert:true,cacheControl:'1'});
  if(uploaded.error)throw uploaded.error;
  const updated=await client.from('orbit_appearance').update({avatar_path:path}).eq('user_id',me.id);
  if(updated.error)throw updated.error;
  appearance.set(me.id,{...get(me.id),avatar_path:path});
  signed.delete(me.id);
  await loadAll(true);
  await notify();
  status('Profile photo saved. Only approved ORBIT + members can view it.');
 }catch(e){status('Photo upload failed: '+e.message,true)}
 finally{$('studioUploadFile').value=''}
}
async function removePhoto(){
 if(!client||!me)return;
 const path=get(me.id).avatar_path;if(!path){status('Choose any free avatar above.');return}
 status('Removing your photo…');
 const result=await client.storage.from(BUCKET).remove([path]);
 if(result.error){status('Could not remove photo: '+result.error.message,true);return}
 const updated=await client.from('orbit_appearance').update({avatar_path:''}).eq('user_id',me.id);
 if(updated.error){status(updated.error.message,true);return}
 appearance.set(me.id,{...get(me.id),avatar_path:''});signed.delete(me.id);await notify();
 status('Photo removed. Your selected free avatar is shown instead.');
}
function bindUI(){
 if(ready)return;ready=true;renderAllOptions();bindPaletteUI();
 $('studioUploadFile')?.addEventListener('change',e=>upload(e.target.files?.[0]));
 $('studioRemovePhoto')?.addEventListener('click',removePhoto);
}
async function init(db,user){
 if(!db||!user)return;
 bindUI();
 client=db;
 if(me?.id===user.id){updatePreview();return}
 me=user;loadedAt=0;appearance.clear();signed.clear();savedPalette=null;draftPalette=null;applySitePalette(null);currentNick=user.user_metadata?.nickname||'ORBIT + Member';
 const {data,error}=await client.from('orbit_appearance').select('user_id').eq('user_id',user.id).maybeSingle();
 if(error){status('Could not check appearance settings: '+error.message,true);return}
 if(!data){
  const create=await client.from('orbit_appearance').insert({user_id:user.id});
  if(create.error){status('Could not initialize your Studio settings: '+create.error.message,true);return}
 }
 await loadAll(true);
}
function setNickname(nick){if(typeof nick==='string'&&nick.trim()){currentNick=nick.trim();const sidebarName=$('profileName');if(sidebarName)sidebarName.textContent=currentNick;updatePreview()}}
function clear(){client=null;me=null;appearance.clear();signed.clear();loadedAt=0;currentNick='ORBIT + Member';savedPalette=null;draftPalette=null;applySitePalette(null);renderPaletteState()}
window.OrbitStudio={init,loadAll,get,decorateAvatar,decorateName,updatePreview,setNickname,clear,setOnUpdate(fn){onUpdate=typeof fn==='function'?fn:null},renderAllOptions};
})();
