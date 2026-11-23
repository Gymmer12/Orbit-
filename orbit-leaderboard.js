/* Approved-member Arcade leaderboard.
   Uses a server-checked Supabase RPC; nicknames only, never school emails. */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const GAMES=[
 ['cosmos','✦ Total Cosmos'],['tetris','Tetris'],['snake','Snake'],['flappy','Flappy Bird'],
 ['game2048','2048'],['blockblast','Block Blast'],['breakout','Block Breaker'],
 ['dino','Dino Run'],['fruitninja','Fruit Ninja'],['geodash','Geometry Run'],
 ['girder','Girder Gorilla'],['minesweeper','Minesweeper'],['pacman','Maze Chase'],
 ['slither','Slither'],['slope','Slope'],['sudoku','Sudoku'],['wordle','Word Guess']
];
const MEDALS=['🥇','🥈','🥉'];
let client=null,user=null,loadedGame='',loadedAt=0,requestSeq=0,bound=false,loading=false;
function selected(){return $('leaderboardGame')?.value||'cosmos'}
function resetRows(message){
 const root=$('leaderboardRows');root.replaceChildren();
 const p=document.createElement('p');p.className='leaderboard-empty';p.textContent=message;
 root.append(p);
}
function createAvatar(id,name){
 const el=document.createElement('span');el.className='orbit-avatar';
 el.textContent=(name||'M').slice(0,1).toUpperCase();
 window.OrbitStudio?.decorateAvatar(el,id,name);
 return el;
}
function createName(id,name){
 const label=document.createElement('span');label.textContent=name||'Member';
 window.OrbitStudio?.decorateName(label,id);
 return label;
}
function render(rows,game){
 const podium=$('leaderboardPodium');podium.replaceChildren();
 const list=$('leaderboardRows');list.replaceChildren();
 const highest=rows.slice(0,3);
 podium.hidden=!highest.length;
 highest.forEach((item,i)=>{
  const member=document.createElement('div');member.className='leaderboard-podium-member';
  if(item.user_id===user?.id)member.classList.add('self');
  const medal=document.createElement('span');medal.className='rank-icon';medal.textContent=MEDALS[i]||'★';
  const av=createAvatar(item.user_id,item.nickname);
  const name=document.createElement('strong');name.textContent=item.nickname||'Member';
  window.OrbitStudio?.decorateName(name,item.user_id);
  const val=document.createElement('small');val.textContent=Number(item.score||0).toLocaleString()+(game==='cosmos'?' Cosmos':' pts');
  member.append(medal,av,name,val);podium.append(member);
 });
 if(!rows.length){resetRows('No opted-in scores yet. Open Settings → About Me to choose whether your scores appear.');return}
 for(const item of rows){
  const row=document.createElement('div');row.className='leaderboard-entry';row.setAttribute('role','listitem');
  if(item.user_id===user?.id)row.classList.add('self');
  const rank=document.createElement('span');rank.className='leaderboard-rank';
  rank.textContent='#'+item.rank;
  const person=document.createElement('div');person.className='leaderboard-player';
  person.append(createAvatar(item.user_id,item.nickname),createName(item.user_id,item.nickname));
  const val=document.createElement('span');val.className='leaderboard-points';
  val.textContent=Number(item.score||0).toLocaleString();
  row.append(rank,person,val);list.append(row);
 }
}
function bind(){
 if(bound)return;bound=true;
 const select=$('leaderboardGame');select.replaceChildren();
 for(const [id,label] of GAMES){
  const option=document.createElement('option');option.value=id;option.textContent=label;select.append(option)
 }
 select.addEventListener('change',()=>load(true));
 $('leaderboardRefresh').addEventListener('click',()=>load(true));
 $('leaderboardManagePrivacy').addEventListener('click',()=>{ $('settingsNav')?.click();window.OrbitSettings?.selectTab('profile') });
}
async function load(force=false){
 if(!client||!user)return;
 const game=selected();
 if(!force&&game===loadedGame&&Date.now()-loadedAt<20000)return;
 const seq=++requestSeq;
 loading=true;
 $('leaderboardRefresh').disabled=true;
 $('leaderboardStatus').textContent='Loading rankings…';
 resetRows('Loading scores…');$('leaderboardPodium').replaceChildren();
 $('leaderboardPodium').hidden=true;
 const {data,error}=await client.rpc('orbit_arcade_leaderboard',{p_game:game});
 if(seq!==requestSeq)return;
 loading=false;
 $('leaderboardRefresh').disabled=false;
 if(error){resetRows('Could not load scores.');$('leaderboardStatus').textContent='Leaderboard unavailable: '+error.message;return}
 loadedGame=game;loadedAt=Date.now();
 $('leaderboardScoreLabel').textContent=game==='cosmos'?'COSMOS':'BEST SCORE';
 await window.OrbitStudio?.loadAll();
 if(seq!==requestSeq)return;
 render(Array.isArray(data)?data:[],game);
 $('leaderboardStatus').textContent='Showing the top '+Math.min(50,Array.isArray(data)?data.length:0)+' approved members.';
}
async function init(db,person){
 if(!db||!person)return;
 bind();
 if(user?.id===person.id&&client===db)return;
 client=db;user=person;loadedGame='';loadedAt=0;requestSeq++;
 resetRows('Open the Leaderboard to see rankings.');
}
function open(){return load(true)}
function refresh(){loadedAt=0;if($('leaderboard')?.classList.contains('active'))return load(true)}
function clear(){
 client=null;user=null;loadedGame='';loadedAt=0;requestSeq++;
 if(bound){resetRows('Sign in to view the leaderboard.');$('leaderboardPodium').replaceChildren();$('leaderboardPodium').hidden=true;}
}
window.OrbitLeaderboard={init,open,refresh,clear,GAMES};
})();
