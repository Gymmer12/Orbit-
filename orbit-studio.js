/* Orbit Studio — free profile personalization for approved ORBIT + members.
   All profile photos use short-lived signed URLs from a private storage bucket. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const BUCKET='orbit-member-avatars';
const DEFAULT={home_theme:'classic',avatar_style:'planet',avatar_ring:'orbit',name_font:'default',avatar_path:''};
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
  const {data,error}=await client.from('orbit_appearance').select('user_id,home_theme,avatar_style,avatar_ring,name_font,avatar_path').limit(250);
  if(error)throw error;
  appearance=new Map((data||[]).map(row=>[row.user_id,{...DEFAULT,...row}]));
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
 if(ready)return;ready=true;renderAllOptions();
 $('studioUploadFile')?.addEventListener('change',e=>upload(e.target.files?.[0]));
 $('studioRemovePhoto')?.addEventListener('click',removePhoto);
}
async function init(db,user){
 if(!db||!user)return;
 bindUI();
 client=db;
 if(me?.id===user.id){updatePreview();return}
 me=user;loadedAt=0;appearance.clear();signed.clear();currentNick=user.user_metadata?.nickname||'ORBIT + Member';
 const {data,error}=await client.from('orbit_appearance').select('user_id').eq('user_id',user.id).maybeSingle();
 if(error){status('Could not check appearance settings: '+error.message,true);return}
 if(!data){
  const create=await client.from('orbit_appearance').insert({user_id:user.id});
  if(create.error){status('Could not initialize your Studio settings: '+create.error.message,true);return}
 }
 await loadAll(true);
}
function setNickname(nick){if(typeof nick==='string'&&nick.trim()){currentNick=nick.trim();updatePreview()}}
function clear(){client=null;me=null;appearance.clear();signed.clear();loadedAt=0;currentNick='ORBIT + Member';}
window.OrbitStudio={init,loadAll,get,decorateAvatar,decorateName,updatePreview,setNickname,clear,setOnUpdate(fn){onUpdate=typeof fn==='function'?fn:null},renderAllOptions};
})();
