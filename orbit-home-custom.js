/* ORBIT + — personal homepage scenes and accessible animation controls.
 * Uses the existing owner-only RLS of public.orbit_appearance.
 * Only shipped image files and CSS gradients are allowed as backgrounds. */
(function(){
 'use strict';
 const $=id=>document.getElementById(id);
 const BASE={home_background:'original',home_tint:'#4767DF',home_tint_strength:0,home_motion:true};
 const SCENES={
  original:'url("assets/orbit-home-poster.jpg")',
  space:'url("assets/orbit-space.jpg")',
  starfield:'radial-gradient(1px 1px at 18% 16%,#eaf5ff 85%,transparent),radial-gradient(2px 2px at 73% 27%,#a6ddff 85%,transparent),radial-gradient(1px 1px at 42% 69%,#d9c6ff 85%,transparent),radial-gradient(ellipse at 70% 18%,#193f79,transparent 52%),linear-gradient(145deg,#030b29,#101b48 52%,#170f3a)',
  gradient:'radial-gradient(ellipse at 88% 20%,#5477ec 0%,transparent 44%),radial-gradient(ellipse at 10% 88%,#6c3db3 0%,transparent 55%),linear-gradient(125deg,#071743,#151252 65%,#1d1141)'
 };
 const KEYS=Object.keys(BASE);
 let client=null,user=null,loaded=false,bindDone=false,saved={...BASE},draft={...BASE},saving=false;
 function sanitize(row){
  return{
   home_background:Object.hasOwn(SCENES,row?.home_background)?row.home_background:BASE.home_background,
   home_tint:typeof row?.home_tint==='string'&&/^#[0-9a-f]{6}$/i.test(row.home_tint)?row.home_tint.toUpperCase():BASE.home_tint,
   home_tint_strength:Number.isInteger(Number(row?.home_tint_strength))?Math.max(0,Math.min(75,Math.round(Number(row.home_tint_strength)/5)*5)):BASE.home_tint_strength,
   home_motion:typeof row?.home_motion==='boolean'?row.home_motion:BASE.home_motion
  };
 }
 function same(a,b){return KEYS.every(k=>a[k]===b[k])}
 function showStatus(message,error=false){
  const node=$('homeEditorStatus');if(!node)return;
  node.textContent=message;node.dataset.error=error?'true':'false';
 }
 function apply(home){
  const app=$('appLayout');if(!app)return;
  app.dataset.homeBackground=home.home_background;
  app.dataset.homeMotion=home.home_motion?'on':'off';
  app.style.setProperty('--home-art',SCENES[home.home_background]||SCENES.original);
  app.style.setProperty('--home-tint',home.home_tint);
  app.style.setProperty('--home-tint-amount',home.home_tint_strength+'%');
  app.style.setProperty('--home-art-base',home.home_background==='original'?'#0a0b30':home.home_background==='space'?'#0a1745':home.home_background==='starfield'?'#050b28':'#0d1143');
 }
 function render(){
  if(!$('homeBackgroundChoices'))return;
  for(const btn of document.querySelectorAll('[data-home-choice]')){
   const chosen=btn.dataset.homeChoice===draft.home_background;
   btn.classList.toggle('selected',chosen);
   btn.setAttribute('aria-pressed',String(chosen));
  }
  $('homeTintColor').value=draft.home_tint;
  $('homeTintHex').textContent=draft.home_tint;
  $('homeTintStrength').value=String(draft.home_tint_strength);
  $('homeTintStrengthValue').textContent=draft.home_tint_strength+'%';
  $('homeMotionEnabled').checked=draft.home_motion;
  const preview=$('homeEditorPreview');
  if(preview){
   preview.style.setProperty('--home-art',SCENES[draft.home_background]||SCENES.original);
   preview.style.setProperty('--home-tint',draft.home_tint);
   preview.style.setProperty('--home-tint-amount',draft.home_tint_strength+'%');
   preview.dataset.motion=draft.home_motion?'on':'off';
  }
  $('homeSaveSettings').disabled=saving||!loaded||same(draft,saved);
  $('homeUndoSettings').disabled=saving||same(draft,saved);
  $('homeResetSettings').disabled=saving||!loaded;
 }
 function preview(next){
  draft=sanitize({...draft,...next});
  apply(draft);render();
  showStatus('Previewing your changes. Save my home to keep them on your account.');
 }
 function bind(){
  if(bindDone)return;bindDone=true;
  document.querySelectorAll('[data-home-choice]').forEach(btn=>btn.addEventListener('click',()=>{
   if(!loaded)return;
   preview({home_background:btn.dataset.homeChoice});
  }));
  $('homeTintColor')?.addEventListener('input',e=>{if(loaded)preview({home_tint:e.target.value})});
  $('homeTintStrength')?.addEventListener('input',e=>{if(loaded)preview({home_tint_strength:Number(e.target.value)})});
  $('homeMotionEnabled')?.addEventListener('change',e=>{if(loaded)preview({home_motion:e.target.checked})});
  $('homeSaveSettings')?.addEventListener('click',()=>save(false));
  $('homeUndoSettings')?.addEventListener('click',()=>{
   if(saving)return;
   draft={...saved};apply(draft);render();showStatus('Restored your last saved home settings.');
  });
  $('homeResetSettings')?.addEventListener('click',()=>{
   if(saving)return;
   draft={...BASE};apply(draft);render();
   save(true);
  });
  render();
 }
 async function load(force=false){
  if(!client||!user)return;
  if(loaded&&!force)return;
  const id=user.id;
  const {data,error}=await client.from('orbit_appearance')
   .select('home_background,home_tint,home_tint_strength,home_motion')
   .eq('user_id',id).maybeSingle();
  if(user?.id!==id)return;
  if(error){showStatus('Could not load home settings: '+error.message,true);return}
  saved=sanitize(data);
  draft={...saved};loaded=true;apply(draft);render();
  if(force)showStatus('Home settings refreshed from your account.');
 }
 async function save(restoreClassicTheme){
  if(!client||!user||!loaded||saving)return;
  saving=true;render();showStatus('Saving your home…');
  const id=user.id,requested=sanitize(draft);
  const payload={...requested};
  if(restoreClassicTheme)payload.home_theme='classic';
  try{
   const {data,error}=await client.from('orbit_appearance').update(payload)
    .eq('user_id',id)
    .select('home_background,home_tint,home_tint_strength,home_motion').single();
   if(error)throw error;
   if(user?.id!==id)return;
   saved=sanitize(data);draft={...saved};apply(draft);
   if(restoreClassicTheme){
    await window.OrbitStudio?.loadAll(true);
    showStatus('Original Orbit artwork, colors, and movement restored.');
   }else{
    showStatus('Saved! Your home design will follow your ORBIT + account on other devices.');
   }
  }catch(e){
   if(user?.id===id)showStatus('Home settings were not saved: '+(e?.message||'Try again.'),true);
  }finally{
   if(user?.id===id){saving=false;render()}
  }
 }
 async function init(db,person){
  if(!db||!person)return;
  bind();
  if(user?.id===person.id&&client===db){apply(draft);render();return}
  client=db;user=person;loaded=false;saving=false;
  saved={...BASE};draft={...BASE};apply(draft);render();
  await load(true);
 }
 function clear(){
  user=null;client=null;loaded=false;saving=false;
  saved={...BASE};draft={...BASE};
  const app=$('appLayout');
  if(app){
   delete app.dataset.homeBackground;
   delete app.dataset.homeMotion;
   for(const name of ['--home-art','--home-tint','--home-tint-amount','--home-art-base'])app.style.removeProperty(name);
  }
  render();
 }
 window.OrbitHomeCustomization={init,load,clear,applySaved(){apply(draft)},get(){return {...draft}}};
})();