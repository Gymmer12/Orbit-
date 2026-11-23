/* ORBIT + member Settings — adapted from the profile/status controls in Alan's ORBIT.
   Public: approved members' nickname, bio, status, avatar shade.
   Private: email, password and notification preferences (RLS enforced). */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const STATUSES={
 online:{label:'Online',dot:'online'},
 idle:{label:'Idle',dot:'idle'},
 dnd:{label:'Do Not Disturb',dot:'dnd'},
 invisible:{label:'Invisible',dot:'invisible'}
};
const DEFAULT={member_status:'online',custom_status:'',bio:'',avatar_color:'#416ECB'};
const PREFS={notify_dms:false,notify_all_chat:false};
let client=null,user=null,own=null,prefs={...PREFS},publicProfiles=new Map(),ready=false;
let onUpdate=null,onMessage=null,onOpenStudio=null,lastNotifiedAt=Date.now();
let busy=false,lastNotificationPoll=0;
function setFeedback(id,message,error=false){
 const el=$(id);
 if(!el)return;
 el.textContent=message;
 el.dataset.error=error?'true':'false';
}
function chosenStatus(){
 return document.querySelector('input[name="settingsPresence"]:checked')?.value||'online';
}
function memberColor(id){
 const v=publicProfiles.get(id)?.avatar_color;
 return /^#[0-9a-f]{6}$/i.test(v||'')?v:DEFAULT.avatar_color;
}
function setProfiles(rows){
 publicProfiles=new Map((rows||[]).map(row=>[row.id,{...DEFAULT,...row}]));
 if(user&&publicProfiles.has(user.id))own=publicProfiles.get(user.id);
 updateSidebar();
 updateAccountPreview();
}
function displayStatus(profile,isLive=true){
 const setting=profile?.member_status||'online';
 if(!isLive||setting==='invisible')return 'Offline';
 return STATUSES[setting]?.label||'Online';
}
function isVisibleOnline(profile,heartbeat){
 return Boolean(heartbeat)&&profile?.member_status!=='invisible';
}
function displayText(profile,isLive){
 if(!isLive||profile?.member_status==='invisible')return 'Offline';
 return (profile?.custom_status||'').trim()||displayStatus(profile,true);
}
function setDot(element,status){
 if(!element)return;
 element.className='settings-presence-dot '+(STATUSES[status]?.dot||'offline');
}
function updateSidebar(){
 const el=$('sidebarStatus');
 if(!el||!user)return;
 const p=own||DEFAULT;
 el.replaceChildren();
 const dot=document.createElement('span');setDot(dot,p.member_status||'online');
 const text=document.createElement('span');text.textContent=(p.custom_status||'').trim()||STATUSES[p.member_status]?.label||'Online';
 el.append(dot,text);
 el.title='Your status: '+(STATUSES[p.member_status]?.label||'Online')+'. Open Settings to change it.';
}
function updateAccountPreview(){
 if(!user)return;
 const p=own||{...DEFAULT,nickname:user.user_metadata?.nickname||'Member'};
 const nickname=p.nickname||user.user_metadata?.nickname||'Member';
 const role=$('settingsAccountRole');
 const name=$('settingsDisplayName'),profile=$('settingsNameValue'),email=$('settingsEmailValue');
 if(name)name.textContent=nickname;
 if(profile)profile.textContent=nickname;
 if(email)email.textContent=user.email||'Not available';
 if(role)role.textContent=user._orbitRole||'ORBIT + Member';
 const status=$('settingsPreviewStatus');
 if(status){
  status.replaceChildren();
  const dot=document.createElement('span');setDot(dot,p.member_status||'online');
  const label=document.createElement('span');label.textContent=STATUSES[p.member_status]?.label||'Online';
  status.append(dot,label);
 }
 const av=$('settingsAvatar');
 if(av){
  window.OrbitStudio?.decorateAvatar(av,user.id,nickname);
  av.style.setProperty('--member-avatar-color',memberColor(user.id));
 }
}
function fillForm(){
 if(!user||!own)return;
 const radio=$('settings').querySelector('input[name="settingsPresence"][value="'+(own.member_status||'online')+'"]');
 if(radio)radio.checked=true;
 $('settingsCustomStatus').value=own.custom_status||'';
 $('settingsBio').value=own.bio||'';
 $('settingsBioCount').textContent=String(($('settingsBio').value||'').length);
 $('settingsAvatarColor').value=memberColor(user.id);
 $('settingsNotifyDMs').checked=!!prefs.notify_dms;
 $('settingsNotifyChat').checked=!!prefs.notify_all_chat;
 updateSidebar();updateAccountPreview();
}
function selectTab(tab){
 const valid=['account','presence','profile','appearance','notifications','security'];
 if(!valid.includes(tab))tab='account';
 document.querySelectorAll('[data-settings-tab]').forEach(el=>{
  const active=el.dataset.settingsTab===tab;
  el.classList.toggle('active',active);el.setAttribute('aria-current',active?'page':'false');
 });
 document.querySelectorAll('[data-settings-panel]').forEach(el=>el.classList.toggle('active',el.dataset.settingsPanel===tab));
}
async function load(){
 if(!client||!user)return;
 const [profile,pref]=await Promise.all([
  client.from('profiles').select('id,nickname,member_status,custom_status,bio,avatar_color').eq('id',user.id).maybeSingle(),
  client.from('orbit_member_preferences').select('user_id,notify_dms,notify_all_chat').eq('user_id',user.id).maybeSingle()
 ]);
 if(profile.error){setFeedback('settingsPresenceFeedback','Could not load your profile: '+profile.error.message,true);return}
 if(pref.error){setFeedback('settingsNotificationsFeedback','Could not load your preferences: '+pref.error.message,true)}
 own=profile.data?{...DEFAULT,...profile.data}:{...DEFAULT,nickname:user.user_metadata?.nickname||'Member'};
 publicProfiles.set(user.id,own);
 prefs=pref.data?{...PREFS,...pref.data}:{...PREFS};
 fillForm();
}
function trimText(s,n){return String(s||'').trim().slice(0,n)}
async function savePresence(){
 if(!client||!user||busy)return;
 const choice=chosenStatus();
 if(!Object.prototype.hasOwnProperty.call(STATUSES,choice))return;
 busy=true;
 const btn=$('settingsPresenceSave');btn.disabled=true;
 const custom=trimText($('settingsCustomStatus').value,80);
 const {data,error}=await client.from('profiles').update({member_status:choice,custom_status:custom}).eq('id',user.id)
  .select('id,nickname,member_status,custom_status,bio,avatar_color').single();
 busy=false;btn.disabled=false;
 if(error){setFeedback('settingsPresenceFeedback',error.message,true);return}
 own={...DEFAULT,...data};publicProfiles.set(user.id,own);
 // Invisible should not leave a recent online heartbeat discoverable.
 if(choice==='invisible')await client.from('orbit_presence').delete().eq('user_id',user.id);
 else if(!document.hidden)await client.from('orbit_presence').upsert({user_id:user.id},{onConflict:'user_id'});
 fillForm();setFeedback('settingsPresenceFeedback','Status saved! Your friends will see the update.');
 if(onUpdate)await onUpdate();
}
async function saveBio(){
 if(!client||!user||busy)return;
 busy=true;$('settingsProfileSave').disabled=true;
 const payload={bio:trimText($('settingsBio').value,190),avatar_color:$('settingsAvatarColor').value};
 const {data,error}=await client.from('profiles').update(payload).eq('id',user.id)
  .select('id,nickname,member_status,custom_status,bio,avatar_color').single();
 busy=false;$('settingsProfileSave').disabled=false;
 if(error){setFeedback('settingsProfileFeedback',error.message,true);return}
 own={...DEFAULT,...data};publicProfiles.set(user.id,own);
 fillForm();setFeedback('settingsProfileFeedback','Profile saved. Other approved members can view your bio.');
 if(onUpdate)await onUpdate();
}
async function savePrefs(){
 if(!client||!user||busy)return;
 const notify_dms=$('settingsNotifyDMs').checked;
 const notify_all_chat=$('settingsNotifyChat').checked;
 busy=true;$('settingsNotificationsSave').disabled=true;
 const {data,error}=await client.from('orbit_member_preferences')
  .upsert({user_id:user.id,notify_dms,notify_all_chat},{onConflict:'user_id'})
  .select('notify_dms,notify_all_chat').single();
 busy=false;$('settingsNotificationsSave').disabled=false;
 if(error){setFeedback('settingsNotificationsFeedback',error.message,true);return}
 prefs={...PREFS,...data};
 const grant=typeof Notification!=='undefined'&&Notification.permission==='granted';
 setFeedback('settingsNotificationsFeedback',grant||(!notify_dms&&!notify_all_chat)?
  'Notification settings saved.':
  'Preferences saved. Select "Allow browser notifications" if you want pop-up alerts.');
}
async function allowNotifications(){
 if(typeof Notification==='undefined'){
  setFeedback('settingsNotificationsFeedback','This browser does not support desktop notifications.',true);return
 }
 try{
  const result=await Notification.requestPermission();
  setFeedback('settingsNotificationsFeedback',result==='granted'?
   'Browser notifications enabled while ORBIT + is open.':
   'Notifications were not enabled. You can still use ORBIT + normally.',result!=='granted');
 }catch(e){setFeedback('settingsNotificationsFeedback','Browser notification permission is unavailable.',true)}
}
async function savePassword(){
 if(!client||!user||busy)return;
 const first=$('settingsNewPassword').value,repeat=$('settingsConfirmPassword').value;
 if(first.length<8){setFeedback('settingsSecurityFeedback','Use a password at least 8 characters long.',true);return}
 if(first!==repeat){setFeedback('settingsSecurityFeedback','The passwords do not match.',true);return}
 busy=true;$('settingsPasswordSave').disabled=true;
 const {error}=await client.auth.updateUser({password:first});
 busy=false;$('settingsPasswordSave').disabled=false;
 $('settingsNewPassword').value='';$('settingsConfirmPassword').value='';
 setFeedback('settingsSecurityFeedback',error?error.message:'Your ORBIT + password was updated.',!!error);
}
function closeMember(){
 const modal=$('memberProfileModal');if(modal)modal.hidden=true;
}
function openMember(id,isLive){
 if(!user||!client)return;
 const p=publicProfiles.get(id);
 if(!p)return;
 const modal=$('memberProfileModal');
 const name=$('memberProfileHeading'),bio=$('memberProfileBio'),st=$('memberProfileStatus'),av=$('memberProfileAvatar');
 name.textContent=p.nickname||'Member';
 window.OrbitStudio?.decorateName(name,id);
 bio.textContent=p.bio?.trim()||'No bio yet.';
 st.replaceChildren();
 const live=isVisibleOnline(p,isLive);
 const dot=document.createElement('span');
 setDot(dot,live?p.member_status||'online':'offline');
 const label=document.createElement('span');
 const text=displayStatus(p,live);
 label.textContent=text+((p.custom_status||'').trim()?' · '+p.custom_status.trim():'');
 st.append(dot,label);
 window.OrbitStudio?.decorateAvatar(av,id,p.nickname);
 av.style.setProperty('--member-avatar-color',memberColor(id));
 const dm=$('memberProfileMessage');
 dm.hidden=id===user.id;
 dm.onclick=()=>{closeMember();if(onMessage)onMessage(id)};
 modal.hidden=false;
}
async function pollNotifications(){
 if(!client||!user||!own||!document.hidden||busy)return;
 if(typeof Notification==='undefined'||Notification.permission!=='granted')return;
 if(own.member_status==='dnd')return;
 if(!prefs.notify_dms&&!prefs.notify_all_chat)return;
 if(Date.now()-lastNotificationPoll<8500)return;
 const since=new Date(lastNotifiedAt).toISOString();
 lastNotificationPoll=Date.now();
 lastNotifiedAt=lastNotificationPoll;
 const queries=[];
 if(prefs.notify_dms)queries.push(client.from('direct_messages')
  .select('id,sender_id,created_at').eq('recipient_id',user.id).gt('created_at',since).order('created_at',{ascending:false}).limit(10));
 if(prefs.notify_all_chat)queries.push(client.from('general_messages')
  .select('id,sender_id,created_at').gt('created_at',since).order('created_at',{ascending:false}).limit(10));
 const results=await Promise.all(queries);
 const others=results.some(r=>!r.error&&(r.data||[]).some(m=>m.sender_id!==user.id));
 if(others)try{
  new Notification('ORBIT + — New message',{body:'You have new messages. Open ORBIT + to read them.',tag:'orbit-new-messages'});
 }catch(e){console.warn('Notifications unavailable',e)}
}
function bindUI(){
 if(ready)return;ready=true;
 document.querySelectorAll('[data-settings-tab]').forEach(el=>el.addEventListener('click',()=>selectTab(el.dataset.settingsTab)));
 $('settingsCustomStatus')?.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();savePresence()}});
 $('settingsBio')?.addEventListener('input',()=>{$('settingsBioCount').textContent=String($('settingsBio').value.length)});
 $('settingsPresenceSave')?.addEventListener('click',savePresence);
 $('settingsProfileSave')?.addEventListener('click',saveBio);
 $('settingsNotificationsSave')?.addEventListener('click',savePrefs);
 $('settingsEnableNotifications')?.addEventListener('click',allowNotifications);
 $('settingsPasswordSave')?.addEventListener('click',savePassword);
 $('settingsEditAvatar')?.addEventListener('click',()=>onOpenStudio?.());
 $('settingsOpenStudio')?.addEventListener('click',()=>onOpenStudio?.());
 $('settingsLogout')?.addEventListener('click',()=>client?.auth.signOut());
 $('memberProfileClose')?.addEventListener('click',closeMember);
 $('memberProfileModal')?.addEventListener('click',e=>{if(e.target===$('memberProfileModal'))closeMember()});
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!$('memberProfileModal')?.hidden)closeMember()});
}
async function init(db,member,options={}){
 if(!db||!member)return;
 bindUI();
 client=db;
 onUpdate=typeof options.onUpdate==='function'?options.onUpdate:null;
 onMessage=typeof options.onMessage==='function'?options.onMessage:null;
 onOpenStudio=typeof options.onOpenStudio==='function'?options.onOpenStudio:null;
 if(user?.id===member.id){updateSidebar();updateAccountPreview();return}
 user=member;
 user._orbitRole=options.role||'ORBIT + Member';
 own=null; publicProfiles.clear();prefs={...PREFS};lastNotifiedAt=Date.now();
 await load();
}
function clear(){
 client=null;user=null;own=null;prefs={...PREFS};publicProfiles.clear();onUpdate=null;onMessage=null;onOpenStudio=null;
 closeMember();
 const sidebar=$('sidebarStatus');if(sidebar)sidebar.textContent='Offline';
}
window.OrbitSettings={init,load,selectTab,setProfiles,memberColor,isVisibleOnline,displayStatus,displayText,openMember,pollNotifications,clear,myStatus(){return own?.member_status||'online'}};
})();
