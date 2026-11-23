/* ORBIT + Arcade — original browser mini-game implementations.
 * Tetris (falling blocks), Snake, Flappy Bird style flight.
 * Cosmos is non-redeemable, earned in capped amounts through Supabase RPC.
 * Scores originate in the browser; server checks rate/eligibility, not full gameplay.
 */
(function(){
'use strict';
const $=id=>document.getElementById(id);
const EXTRAS=window.OrbitArcadeExtras||null;
const canvas=$('arcadeCanvas');
const ctx=canvas?.getContext('2d');
const W=340,H=480;
const RULES={
 tetris:{name:'Tetris',instructions:'Move with ← →, rotate with ↑, soft drop with ↓, and hard drop with Space. Clear lines for points.',conversion:'2% of your Tetris points. A score of 500 earns 10 Cosmos. Formula: score ÷ 50.'},
 snake:{name:'Snake',instructions:'Use ← ↑ → ↓ or WASD to steer. Collect glowing stars. Avoid walls and your own tail.',conversion:'50% of your apples collected. 20 apples earn 10 Cosmos. Formula: score ÷ 2.'},
 flappy:{name:'Flappy Bird',instructions:'Press Space, ↑, tap the canvas, or use the Flap button to fly. Pass through gaps to score.',conversion:'100% of pipes passed. 10 pipes earn 10 Cosmos. Formula: 1 Cosmos per pipe.'},
 ...(EXTRAS?.RULES||{})
};
const COLORS=['#000000','#84d4fc','#8198ff','#fbce7b','#bf8eff','#6cedc2','#ff8393','#629dff'];
const PIECES=[
 [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
 [[2,0,0],[2,2,2],[0,0,0]],
 [[0,0,3],[3,3,3],[0,0,0]],
 [[4,4],[4,4]],
 [[0,5,5],[5,5,0],[0,0,0]],
 [[0,6,0],[6,6,6],[0,0,0]],
 [[7,7,0],[0,7,7],[0,0,0]]
];
let db=null,member=null,game='tetris',state=null,score=0,runId=null,
 playing=false,paused=false,requestId=0,lastTime=0,waiting=false,initialized=false;
let wallet={total:0,today:0,daily_cap:60,best:Object.fromEntries(Object.keys(RULES).map(k=>[k,0]))};
function setStatus(s){const p=$('arcadeStatus');if(p)p.textContent=s}
function setOverlay(title,message){
 const box=$('arcadeOverlay');if(!box)return;
 box.hidden=false;
 $('arcadeOverlayHeading').textContent=title;
 $('arcadeOverlayMessage').textContent=message;
}
function hideOverlay(){if($('arcadeOverlay'))$('arcadeOverlay').hidden=true}
function isVisible(){return $('games')?.classList.contains('active')&&!document.hidden}
function setScore(n){
 score=Math.max(0,Math.min(250000,Math.trunc(n)));
 $('arcadeScore').textContent=score.toLocaleString();
}
function updateWallet(){
 $('arcadeBalance').textContent=Number(wallet.total||0).toLocaleString();
 $('sidebarCosmosCount').textContent=Number(wallet.total||0).toLocaleString();
 $('arcadeEarnedToday').textContent=Number(wallet.today||0).toLocaleString();
 $('arcadeBest').textContent=Number(wallet.best?.[game]||0).toLocaleString();
 const list=$('arcadePersonalBests');
 list.replaceChildren();
 for(const key of Object.keys(RULES)){
  const row=document.createElement('div');row.className='arcade-best';
  const label=document.createElement('span');label.textContent=RULES[key].name;
  const count=document.createElement('b');count.textContent=Number(wallet.best?.[key]||0).toLocaleString();
  row.append(label,count);list.append(row);
 }
}
async function loadSummary(){
 if(!db||!member)return;
 const {data,error}=await db.rpc('orbit_game_summary');
 if(error){setStatus('Cosmos balance unavailable: '+error.message);return}
 if(data&&typeof data==='object'){
  wallet={total:Number(data.total||0),today:Number(data.today||0),daily_cap:60,best:data.best||wallet.best};
  updateWallet();
 }
}
function paintBG(title){
 if(!ctx)return;
 const grad=ctx.createLinearGradient(0,0,W,H);
 grad.addColorStop(0,'#07183d');grad.addColorStop(.6,'#0a1747');grad.addColorStop(1,'#161045');
 ctx.fillStyle=grad;ctx.fillRect(0,0,W,H);
 for(let i=0;i<27;i++){
  const x=((i*73+37)%W),y=((i*149+45)%H);
  ctx.fillStyle='rgba(202,223,255,.36)';
  ctx.beginPath();ctx.arc(x,y,i%7===0?1.5:.7,0,Math.PI*2);ctx.fill();
 }
 ctx.fillStyle='#b5cafa';ctx.textAlign='center';ctx.font='bold 18px "Segoe UI",sans-serif';
 ctx.fillText(title,W/2,35);
}
function glowRect(x,y,w,h,color){
 ctx.fillStyle=color;ctx.fillRect(x+1,y+1,w-2,h-2);
 ctx.fillStyle='rgba(255,255,255,.28)';ctx.fillRect(x+2,y+2,w-4,Math.min(4,h-4));
 ctx.fillStyle='rgba(5,10,28,.25)';ctx.fillRect(x+2,y+h-5,w-4,3);
}
function cloneMatrix(x){return x.map(row=>row.slice())}
function tetrisCreate(){
 const board=Array.from({length:20},()=>Array(10).fill(0));
 const s={board,active:null,gravity:0,lines:0,bag:[]};
 tetrisSpawn(s);
 return s;
}
function tetrisNext(s){
 if(!s.bag.length){
  s.bag=[0,1,2,3,4,5,6];
  for(let i=s.bag.length-1;i>0;i--){
   const j=Math.floor(Math.random()*(i+1));
   [s.bag[i],s.bag[j]]=[s.bag[j],s.bag[i]];
  }
 }
 return s.bag.pop();
}
function tetrisSpawn(s){
 const index=tetrisNext(s);
 const matrix=cloneMatrix(PIECES[index]);
 s.active={m:matrix,x:Math.floor((10-matrix[0].length)/2),y:0};
 if(tetrisCollision(s,s.active.x,s.active.y,matrix)){endGame('Blocks reached the top');return false}
 return true;
}
function tetrisCollision(s,x,y,matrix){
 for(let r=0;r<matrix.length;r++)for(let c=0;c<matrix[r].length;c++){
  if(!matrix[r][c])continue;
  const xx=x+c,yy=y+r;
  if(xx<0||xx>=10||yy>=20)return true;
  if(yy>=0&&s.board[yy][xx])return true;
 }
 return false;
}
function tetrisMove(dx,dy){
 const a=state?.active;if(!a||!playing||paused)return false;
 if(tetrisCollision(state,a.x+dx,a.y+dy,a.m))return false;
 a.x+=dx;a.y+=dy;
 return true;
}
function tetrisRotate(){
 const a=state?.active;if(!a||!playing||paused)return;
 const rotate=a.m[0].map((_,c)=>a.m.map(row=>row[c]).reverse());
 for(const shift of [0,-1,1,-2,2]){
  if(!tetrisCollision(state,a.x+shift,a.y,rotate)){a.x+=shift;a.m=rotate;return}
 }
}
function tetrisLock(){
 const a=state.active;
 for(let r=0;r<a.m.length;r++)for(let c=0;c<a.m[r].length;c++){
  if(!a.m[r][c])continue;
  const x=a.x+c,y=a.y+r;
  if(y<0){endGame('Blocks reached the top');return}
  if(y>=0&&y<20)state.board[y][x]=a.m[r][c];
 }
 let cleared=0;
 for(let y=19;y>=0;y--){
  if(state.board[y].every(Boolean)){
   state.board.splice(y,1);state.board.unshift(Array(10).fill(0));
   cleared++;y++;
  }
 }
 if(cleared){
  state.lines+=cleared;
  setScore(score+([0,100,300,500,800][cleared]||0));
 }
 tetrisSpawn(state);
}
function tetrisStep(dt){
 if(!playing||paused||!state?.active)return;
 state.gravity+=dt*1000;
 const delay=Math.max(125,660-Math.floor(state.lines/8)*60);
 if(state.gravity>=delay){
  state.gravity=0;
  if(!tetrisMove(0,1))tetrisLock();
 }
}
function tetrisInput(key){
 if(key==='left')tetrisMove(-1,0);
 if(key==='right')tetrisMove(1,0);
 if(key==='rotate')tetrisRotate();
 if(key==='down'){if(tetrisMove(0,1))setScore(score+1);else tetrisLock()}
 if(key==='drop'){
  let moves=0;
  while(tetrisMove(0,1)&&moves<20)moves++;
  setScore(score+moves*2);
  tetrisLock();
 }
}
function tetrisDraw(){
 paintBG('TETRIS');
 if(!ctx||!state)return;
 const unit=21,ox=65,oy=37;
 ctx.fillStyle='rgba(4,10,29,.93)';ctx.fillRect(ox-3,oy-3,216,426);
 for(let y=0;y<20;y++)for(let x=0;x<10;x++){
  const bx=ox+x*unit,by=oy+y*unit;
  ctx.fillStyle='#13234e';ctx.fillRect(bx+1,by+1,unit-2,unit-2);
  if(state.board[y][x])glowRect(bx,by,unit,unit,COLORS[state.board[y][x]]);
 }
 if(state.active){
  const a=state.active;
  for(let r=0;r<a.m.length;r++)for(let c=0;c<a.m[r].length;c++){
   if(!a.m[r][c])continue;
   const xx=a.x+c,yy=a.y+r;
   if(yy>=0)glowRect(ox+xx*unit,oy+yy*unit,unit,unit,COLORS[a.m[r][c]]);
  }
 }
 ctx.strokeStyle='#5576be';ctx.strokeRect(ox-3,oy-3,216,426);
}
function randomStar(s){
 let star;let tries=0;
 do{star={x:Math.floor(Math.random()*17),y:Math.floor(Math.random()*19)};tries++}
 while(tries<400&&s.body.some(x=>x.x===star.x&&x.y===star.y));
 return star;
}
function snakeCreate(){
 const s={body:[{x:8,y:9},{x:7,y:9},{x:6,y:9}],dir:{x:1,y:0},next:{x:1,y:0},star:null,elapsed:0};
 s.star=randomStar(s);return s;
}
function snakeInput(key){
 if(!state)return;
 const dirs={left:{x:-1,y:0},right:{x:1,y:0},rotate:{x:0,y:-1},down:{x:0,y:1}};
 const v=dirs[key];if(!v)return;
 if(v.x===-state.dir.x&&v.y===-state.dir.y)return;
 state.next=v;
}
function snakeStep(dt){
 if(!playing||paused||!state)return;
 state.elapsed+=dt*1000;
 const delay=Math.max(85,155-Math.floor(score/7)*6);
 if(state.elapsed<delay)return;
 state.elapsed=0;
 state.dir={...state.next};
 const head=state.body[0],next={x:head.x+state.dir.x,y:head.y+state.dir.y};
 if(next.x<0||next.y<0||next.x>=17||next.y>=19){endGame('You hit a wall');return}
 const ate=next.x===state.star.x&&next.y===state.star.y;
 const checking=ate?state.body:state.body.slice(0,-1);
 if(checking.some(p=>p.x===next.x&&p.y===next.y)){endGame('You ran into your tail');return}
 state.body.unshift(next);
 if(ate){setScore(score+1);state.star=randomStar(state)}
 else state.body.pop();
 if(state.body.length>=17*19)endGame('You filled the board!');
}
function snakeDraw(){
 paintBG('SNAKE');
 if(!ctx||!state)return;
 const unit=19,ox=8,oy=62;
 ctx.fillStyle='#04152a';ctx.fillRect(ox-3,oy-3,329,367);
 ctx.strokeStyle='#173559';ctx.lineWidth=.8;
 for(let x=0;x<=17;x++){ctx.beginPath();ctx.moveTo(ox+x*unit,oy);ctx.lineTo(ox+x*unit,oy+19*unit);ctx.stroke()}
 for(let y=0;y<=19;y++){ctx.beginPath();ctx.moveTo(ox,oy+y*unit);ctx.lineTo(ox+17*unit,oy+y*unit);ctx.stroke()}
 const star=state.star;
 ctx.fillStyle='#ffe17d';ctx.shadowColor='#ffdb70';ctx.shadowBlur=12;
 ctx.beginPath();ctx.arc(ox+star.x*unit+unit/2,oy+star.y*unit+unit/2,6,0,Math.PI*2);ctx.fill();ctx.shadowBlur=0;
 state.body.forEach((p,i)=>{
  ctx.fillStyle=i===0?'#abfff1':i%2?'#43cca8':'#55e8be';
  ctx.beginPath();ctx.roundRect(ox+p.x*unit+1,oy+p.y*unit+1,unit-2,unit-2,5);ctx.fill();
 });
}
function flappyCreate(){return {y:220,vy:0,pipes:[],elapsed:0,spawn:0.7,failed:false}}
function flap(){if(!state||!playing||paused)return;state.vy=-265}
function flappyStep(dt){
 if(!playing||paused||!state)return;
 state.elapsed+=dt;
 state.vy+=660*dt;
 state.y+=state.vy*dt;
 state.spawn+=dt;
 if(state.spawn>=1.55){
  state.spawn=0;
  const gapCenter=143+Math.random()*194;
  state.pipes.push({x:W+10,gapCenter,scored:false});
 }
 const speed=132;
 for(const pipe of state.pipes){
  pipe.x-=speed*dt;
  if(!pipe.scored&&pipe.x+56<78){pipe.scored=true;setScore(score+1)}
  const withinX=78+12>pipe.x&&78-12<pipe.x+56;
  const outsideGap=state.y-12<pipe.gapCenter-79||state.y+12>pipe.gapCenter+79;
  if(withinX&&outsideGap){endGame('You hit an obstacle');return}
 }
 state.pipes=state.pipes.filter(p=>p.x>-70);
 if(state.y<13||state.y>H-24){endGame('Your bird landed');return}
}
function flappyDraw(){
 paintBG('FLAPPY BIRD');
 if(!ctx||!state)return;
 ctx.fillStyle='#090d2b';
 ctx.fillRect(0,H-23,W,23);
 ctx.fillStyle='#5e82d0';
 ctx.fillRect(0,H-25,W,3);
 state.pipes.forEach(p=>{
  const gx=p.gapCenter-79,gy=p.gapCenter+79;
  const grad=ctx.createLinearGradient(p.x,0,p.x+56,0);
  grad.addColorStop(0,'#185a88');grad.addColorStop(.5,'#4bdbb9');grad.addColorStop(1,'#1a667c');
  ctx.fillStyle=grad;
  ctx.fillRect(p.x,0,56,gx);
  ctx.fillRect(p.x,gy,56,H-gy-25);
  ctx.fillStyle='#a9fff3';
  ctx.fillRect(p.x-3,gx-10,62,10);
  ctx.fillRect(p.x-3,gy,62,10);
 });
 ctx.save();ctx.translate(78,state.y);ctx.rotate(Math.max(-.4,Math.min(.9,state.vy/480)));
 ctx.shadowColor='#76b3ff';ctx.shadowBlur=18;
 const grad=ctx.createRadialGradient(-4,-5,2,0,0,14);
 grad.addColorStop(0,'#fff3b6');grad.addColorStop(.7,'#f5d579');grad.addColorStop(1,'#ff9f55');
 ctx.fillStyle=grad;ctx.beginPath();ctx.arc(0,0,13,0,Math.PI*2);ctx.fill();
 ctx.shadowBlur=0;ctx.fillStyle='#213868';ctx.beginPath();ctx.arc(5,-4,2.4,0,Math.PI*2);ctx.fill();
 ctx.fillStyle='#ff8b74';ctx.beginPath();ctx.moveTo(10,1);ctx.lineTo(21,5);ctx.lineTo(10,9);ctx.closePath();ctx.fill();
 ctx.restore();
}
function draw(){
 if(!ctx)return;
 if(game==='tetris')tetrisDraw();
 if(game==='snake')snakeDraw();
 if(game==='flappy')flappyDraw();
 if(EXTRAS?.RULES[game])EXTRAS.draw(game,state,ctx);
}
function gameAPI(){return {add:n=>{if(Number.isFinite(n)&&n>0)setScore(score+n)},end:reason=>endGame(reason)}}
function setControls(){
 const start=$('arcadeStart'),pause=$('arcadePause'),stop=$('arcadeStop');
 start.disabled=waiting||playing;
 pause.disabled=waiting||!playing;
 stop.disabled=waiting||!playing;
 pause.textContent=paused?'Resume':'Pause';
 start.textContent=waiting?'Starting…':'Start game';
}
function frame(time){
 if(!playing||paused||!isVisible()){if(playing&&!paused)pauseGame();return}
 const dt=Math.min(.05,(time-lastTime)/1000||0);
 lastTime=time;
 if(game==='tetris')tetrisStep(dt);
 else if(game==='snake')snakeStep(dt);
 else if(game==='flappy')flappyStep(dt);
 else if(EXTRAS?.RULES[game])EXTRAS.step(game,state,dt,gameAPI());
 draw();
 if(playing&&!paused)requestId=requestAnimationFrame(frame);
}
function pauseGame(){
 if(!playing)return;
 paused=true;cancelAnimationFrame(requestId);
 setOverlay('Paused','Resume whenever you are ready.');
 setControls();
}
function resumeGame(){
 if(!playing||!isVisible())return;
 paused=false;hideOverlay();lastTime=performance.now();requestId=requestAnimationFrame(frame);setControls();
}
function togglePause(){if(!playing)return; if(paused)resumeGame();else pauseGame()}
async function endGame(reason){
 if(!playing)return;
 playing=false;paused=false;waiting=true;cancelAnimationFrame(requestId);setControls();
 const session=runId;runId=null;
 const final=score,owner=member?.id,finishedGame=game,claimClient=db;
 setOverlay(reason||'Round finished','Score: '+final.toLocaleString()+'. Checking Cosmos earned…');
 if(!session||!claimClient||!owner){waiting=false;setControls();return}
 setStatus('Saving your result…');
 try{
  const {data,error}=await claimClient.rpc('orbit_finish_game',{p_run_id:session,p_score:final});
  if(member?.id!==owner)return;
  if(error){
   setStatus('Score: '+final.toLocaleString()+'. Cosmos not awarded: '+error.message);
   setOverlay('Round over','Score: '+final.toLocaleString()+'. You can try a new round.');
   await loadSummary();return;
  }
  wallet.total=Number(data.total||0);wallet.today=Number(data.today||0);
  wallet.best={...wallet.best,[finishedGame]:Number(data.best||0)};
  updateWallet();
  const reward=Number(data.earned||0);
  const summary=reward?'+'+reward+' Cosmos ✦':'0 Cosmos (daily limit reached or low score)';
  setOverlay('Round complete',final.toLocaleString()+' points · '+summary);
  setStatus('Round saved. '+summary+'. You have earned '+wallet.today+' of 60 Cosmos today.');
 }catch(e){
  if(member?.id===owner)setStatus('Could not save the round: '+(e?.message||'network error'));
 }finally{
  if(member?.id===owner){waiting=false;setControls()}
 }
}
async function startGame(){
 if(waiting||playing||!db||!member)return;
 waiting=true;setControls();setStatus('Creating your game session…');
 const chosen=game;
 const {data,error}=await db.rpc('orbit_start_game',{p_game:chosen});
 waiting=false;
 if(error){setStatus('Unable to start: '+error.message);setOverlay('Could not start',error.message);setControls();return}
 runId=data;
 setScore(0);
 state=game==='tetris'?tetrisCreate():game==='snake'?snakeCreate():game==='flappy'?flappyCreate():EXTRAS?.create(game);
 playing=true;paused=false;
 hideOverlay();setStatus('Playing '+RULES[game].name+'. Enjoy your round!');
 lastTime=performance.now();setControls();draw();requestId=requestAnimationFrame(frame);
}
function chooseGame(next){
 if(!Object.prototype.hasOwnProperty.call(RULES,next))return;
 if(playing||waiting){setStatus('Finish the current round before switching games.');return}
 game=next;score=0;runId=null;state=next==='tetris'?tetrisCreate():next==='snake'?snakeCreate():next==='flappy'?flappyCreate():EXTRAS?.create(next);
 $('arcadeCurrentName').textContent=RULES[game].name;
 $('arcadeInfoTitle').textContent='How to play '+RULES[game].name;
 $('arcadeInstructions').textContent=RULES[game].instructions;
 $('arcadeConversion').textContent=RULES[game].conversion;
 setScore(0);
 EXTRAS?.keypad(game,key=>{if(!playing||paused||waiting)return;EXTRAS.key(game,state,key,gameAPI());draw()});
 for(const button of document.querySelectorAll('[data-arcade-game]')){
  const selected=button.dataset.arcadeGame===game;
  button.classList.toggle('selected',selected);
  button.setAttribute('aria-pressed',String(selected));
 }
 updateWallet();setControls();
 setOverlay(RULES[game].name,'Select Start game when you’re ready.');
 setStatus('You can earn up to 60 Cosmos per day, shared across all 16 games.');
 draw();
}
function control(name){
 if(!playing||paused||!isVisible())return;
 if(game==='tetris')tetrisInput(name);
 else if(game==='snake')snakeInput(name);
 else if(game==='flappy'&&['rotate','up','drop'].includes(name))flap();
 else if(EXTRAS?.RULES[game])EXTRAS.input(game,state,name==='down'&&game==='minesweeper'?'flag':name==='rotate'&&['blockblast','minesweeper'].includes(game)?'drop':name,gameAPI());
 draw();
}
function handleKey(e){
 if(!isVisible()||!playing||paused||e.ctrlKey||e.altKey||e.metaKey)return;
 if(e.target?.closest?.('input,textarea,select,[contenteditable]'))return;
 const map={ArrowLeft:'left',a:'left',A:'left',ArrowRight:'right',d:'right',D:'right',
  ArrowUp:'rotate',w:'rotate',W:'rotate',ArrowDown:'down',s:'down',S:'down',' ':'drop'};
 if(EXTRAS?.RULES[game]&&EXTRAS.key(game,state,e.key,gameAPI())){e.preventDefault();draw();return}
 const key=map[e.key];if(!key)return;
 e.preventDefault();
 if(game==='flappy')control('rotate');
 else control(key);
}
function bind(){
 if(initialized)return;initialized=true;
 document.querySelectorAll('[data-arcade-game]').forEach(button=>button.addEventListener('click',()=>chooseGame(button.dataset.arcadeGame)));
 $('arcadeStart').addEventListener('click',startGame);
 $('arcadePause').addEventListener('click',togglePause);
 $('arcadeStop').addEventListener('click',()=>endGame('Round ended'));
 document.querySelectorAll('[data-arcade-input]').forEach(button=>button.addEventListener('click',()=>{
  const action=button.dataset.arcadeInput;
  control(game==='flappy'?'rotate':action);
 }));
 canvas?.addEventListener('pointerdown',e=>{
 if(!playing||paused||waiting)return;
 if(game==='flappy'){e.preventDefault();flap();return}
 if(EXTRAS?.RULES[game]){
  e.preventDefault();const area=canvas.getBoundingClientRect();
  if(area.width&&area.height){
   const x=(e.clientX-area.left)*340/area.width,y=(e.clientY-area.top)*480/area.height;
   EXTRAS.pointer(game,state,x,y,gameAPI());draw()
  }
 }
});
 document.addEventListener('keydown',handleKey);
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&playing&&!paused)pauseGame()});
 chooseGame('tetris');
}
async function init(client,person){
 if(!client||!person)return;
 bind();
 if(member?.id===person.id&&db===client){updateWallet();return}
 if(playing){cancelAnimationFrame(requestId);playing=false;paused=false;runId=null}
 db=client;member=person;
 wallet={total:0,today:0,daily_cap:60,best:Object.fromEntries(Object.keys(RULES).map(k=>[k,0]))};
 updateWallet();chooseGame('tetris');await loadSummary();
}
function open(){if(!db||!member)return;draw();loadSummary()}
function pause(){if(playing&&!paused)pauseGame()}
function clear(){
 cancelAnimationFrame(requestId);db=null;member=null;runId=null;playing=false;paused=false;waiting=false;
 wallet={total:0,today:0,daily_cap:60,best:Object.fromEntries(Object.keys(RULES).map(k=>[k,0]))};
 updateWallet();if(initialized)chooseGame('tetris');
}
window.OrbitArcade={init,open,pause,clear,loadSummary};
})();
