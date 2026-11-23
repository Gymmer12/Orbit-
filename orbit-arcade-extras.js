/* ORBIT + ORIGINAL EXTRA ARCADE CARTRIDGES.
   Mechanics are independently implemented with Canvas; no third-party ROMs,
   imported game assets, or external network dependencies.
   Shared game lifecycle and Cosmos rewards are owned by orbit-arcade.js. */
(function(){
'use strict';
const W=340,H=480,rand=n=>Math.floor(Math.random()*n),pick=a=>a[rand(a.length)],clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const RULES={
 game2048:{name:'2048',instructions:'Use arrows or WASD to slide matching number tiles together. Reach 2048!',conversion:'1% of merge points: 1,000 points = 10 Cosmos.'},
 blockblast:{name:'Block Blast',instructions:'Move the purple shape with arrow keys. Press Space to place it. Clear complete rows and columns.',conversion:'5% of score: 200 points = 10 Cosmos.'},
 breakout:{name:'Block Breaker',instructions:'Use Left/Right to steer the paddle. Keep the ball bouncing and clear all the bricks.',conversion:'10% of score: 100 points = 10 Cosmos.'},
 dino:{name:'Dino Run',instructions:'Press Up, Space or the center arrow to jump over obstacles.',conversion:'5% of distance points: 200 points = 10 Cosmos.'},
 fruitninja:{name:'Fruit Ninja',instructions:'Tap flying fruit to slice it, or aim with arrows and press Space. Avoid missing eight fruit.',conversion:'25% of fruit points: 40 points = 10 Cosmos.'},
 geodash:{name:'Geometry Run',instructions:'Jump over geometric spikes using Up, Space or the center arrow.',conversion:'5% of distance points: 200 points = 10 Cosmos.'},
 girder:{name:'Girder Gorilla',instructions:'Move sideways on girders. Climb the middle ladder with Up. Dodge barrels.',conversion:'50% of climbing points: 20 points = 10 Cosmos.'},
 minesweeper:{name:'Minesweeper',instructions:'Arrow keys move the cursor, Space reveals, F or Down flags. Click cells to reveal.',conversion:'50% of uncovered cells: 20 cells = 10 Cosmos.'},
 pacman:{name:'Maze Chase',instructions:'Navigate with arrow keys and collect stars while avoiding roaming guardians.',conversion:'25% of collected stars: 40 stars = 10 Cosmos.'},
 slither:{name:'Slither',instructions:'Collect glowing stars with your growing trail. Avoid walls and your own tail.',conversion:'50% of collected stars: 20 stars = 10 Cosmos.'},
 slope:{name:'Slope',instructions:'Steer Left/Right to dodge obstacles sliding down the slope.',conversion:'5% of distance points: 200 points = 10 Cosmos.'},
 sudoku:{name:'Sudoku',instructions:'Choose a square with arrows or tap it. Fill the missing numbers with 1–9.',conversion:'50% of correct entries: 20 entries = 10 Cosmos.'},
 wordle:{name:'Word Guess',instructions:'Find the five-letter word in six guesses. Enter letters, Backspace and Enter.',conversion:'100% of puzzle points: 10 points = 10 Cosmos.'}
};
function bg(c,title){
 const g=c.createLinearGradient(0,0,340,480);g.addColorStop(0,'#081a45');g.addColorStop(1,'#0c1134');
 c.fillStyle=g;c.fillRect(0,0,340,480);
 for(let i=0;i<24;i++){c.fillStyle='#b5ceff40';c.fillRect((i*67+19)%340,(i*117+33)%480,1.5,1.5)}
 txt(c,title.toUpperCase(),170,29,17,'#c9dfff');
}
function txt(c,s,x,y,sz=14,color='#edf4ff'){
 c.font='700 '+sz+'px Arial,sans-serif';c.fillStyle=color;c.textAlign='center';c.fillText(String(s),x,y);
}
function rect(c,x,y,w,h,color,border){
 c.fillStyle=color;c.fillRect(x,y,w,h);
 if(border){c.lineWidth=1;c.strokeStyle=border;c.strokeRect(x,y,w,h)}
}
function disc(c,x,y,r,color){c.fillStyle=color;c.beginPath();c.arc(x,y,r,0,Math.PI*2);c.fill()}
function emptyBoard(w,h){return Array.from({length:h},()=>Array(w).fill(0))}
const vec={left:[-1,0],right:[1,0],rotate:[0,-1],down:[0,1]};
function spawn2048(s){const free=[];s.board.forEach((row,y)=>row.forEach((v,x)=>{if(!v)free.push({x,y})}));if(free.length){const p=pick(free);s.board[p.y][p.x]=Math.random()<.9?2:4}}
function init2048(){const s={board:emptyBoard(4,4)};spawn2048(s);spawn2048(s);return s}
function play2048(s,key,api){
 const before=JSON.stringify(s.board);let points=0;
 for(let a=0;a<4;a++){
  const cells=Array.from({length:4},(_,i)=>key==='left'?[a,i]:key==='right'?[a,3-i]:key==='rotate'?[i,a]:[3-i,a]);
  const line=cells.map(([y,x])=>s.board[y][x]).filter(Boolean);
  for(let i=0;i<line.length-1;i++)if(line[i]===line[i+1]){line[i]*=2;points+=line[i];line.splice(i+1,1)}
  cells.forEach(([y,x],i)=>s.board[y][x]=line[i]||0);
 }
 if(before!==JSON.stringify(s.board)){spawn2048(s);api.add(points)}
 const full=s.board.every(row=>row.every(Boolean));
 if(full&&!s.board.some((row,y)=>row.some((v,x)=>(x<3&&v===row[x+1])||(y<3&&v===s.board[y+1][x]))))api.end('No more moves!');
}
function draw2048(s,c){
 bg(c,'2048');
 rect(c,18,87,304,304,'#152859','#537bc4');
 const colors={2:'#dae9ff',4:'#bddeff',8:'#86c7ff',16:'#809dff',32:'#b19cfb',64:'#d7a0ed',128:'#efbca0',256:'#f9d78e',512:'#a7f4c3',1024:'#eeedaa',2048:'#ffffff'};
 for(let y=0;y<4;y++)for(let x=0;x<4;x++){
  const n=s.board[y][x],px=24+x*75,py=93+y*75;
  rect(c,px,py,69,69,colors[n]||'#213665');
  if(n)txt(c,n,px+34,py+44,n>512?17:23,'#142b4d');
 }
 txt(c,'Merge matching tiles to earn points',170,424,12,'#b5cdf0');
}
const pieces=[[[0,0]],[[0,0],[1,0]],[[0,0],[0,1]],[[0,0],[1,0],[2,0]],[[0,0],[0,1],[1,1]],[[0,0],[1,0],[0,1],[1,1]],[[0,0],[1,0],[2,0],[1,1]]];
function initBlast(){return{board:emptyBoard(8,8),x:3,y:3,piece:pick(pieces)}}
function placeBlast(s,api){
 const slots=s.piece.map(([dx,dy])=>[s.x+dx,s.y+dy]);
 if(slots.some(([x,y])=>x>=8||y>=8||s.board[y]?.[x]))return;
 slots.forEach(([x,y])=>s.board[y][x]=1);api.add(slots.length*10);
 let lines=0;
 for(let y=0;y<8;y++)if(s.board[y].every(Boolean)){s.board[y].fill(0);lines++}
 for(let x=0;x<8;x++)if(s.board.every(row=>row[x])){for(const row of s.board)row[x]=0;lines++}
 if(lines)api.add(lines*100);
 s.piece=pick(pieces);
 if(!s.board.some((row,y)=>row.some((_,x)=>s.piece.every(([dx,dy])=>x+dx<8&&y+dy<8&&!s.board[y+dy][x+dx]))))api.end('No space remains');
}
function drawBlast(s,c){
 bg(c,'Block Blast');rect(c,17,83,306,306,'#0e2050','#7194d2');
 for(let y=0;y<8;y++)for(let x=0;x<8;x++){
  rect(c,22+x*38,88+y*38,34,34,s.board[y][x]?'#67d8cd':'#223a75');
 }
 for(const [dx,dy] of s.piece){const x=s.x+dx,y=s.y+dy;if(x<8&&y<8)rect(c,22+x*38,88+y*38,34,34,s.board[y][x]?'#f69ea7':'#b4a1ff')}
 txt(c,'Space to place the highlighted shape',170,430,12,'#c9dcfc');
}
function initBreakout(){return{ball:{x:170,y:343,vx:120,vy:-173},paddle:140,lives:3,bricks:Array.from({length:5},()=>Array(7).fill(1))}}
function stepBreakout(s,dt,api){
 const b=s.ball;b.x+=b.vx*dt;b.y+=b.vy*dt;
 if(b.x<8||b.x>332){b.vx*=-1;b.x=clamp(b.x,8,332)}
 if(b.y<53){b.vy=Math.abs(b.vy);b.y=53}
 if(b.vy>0&&b.y>423&&b.y<444&&b.x>s.paddle-6&&b.x<s.paddle+78){b.vy=-Math.abs(b.vy);b.vx=(b.x-s.paddle-36)*3.5}
 if(b.y>475){s.lives--;if(s.lives<1){api.end('No balls left');return}s.ball={x:s.paddle+35,y:343,vx:115,vy:-170}}
 for(let y=0;y<5;y++)for(let x=0;x<7;x++){
  if(!s.bricks[y][x])continue;
  const bx=11+x*46,by=75+y*26;
  if(b.x>bx&&b.x<bx+43&&b.y>by&&b.y<by+22){
   s.bricks[y][x]=0;b.vy*=-1;api.add(10);
   if(s.bricks.every(row=>row.every(v=>!v)))api.end('All blocks cleared!');
   return;
  }
 }
}
function drawBreakout(s,c){
 bg(c,'Block Breaker');
 for(let y=0;y<5;y++)for(let x=0;x<7;x++)if(s.bricks[y][x])rect(c,11+x*46,75+y*26,43,22,['#80d6e2','#8ebeff','#a39bfa','#d6a0f1','#f8c893'][y]);
 rect(c,s.paddle,432,72,10,'#80d6f3');disc(c,s.ball.x,s.ball.y,7,'#ffe6a3');
 txt(c,'Balls left: '+s.lives,170,467,13,'#c0d4f8');
}
function initRun(){return{y:0,vy:0,t:0,next:1.6,obstacles:[],points:0}}
function stepRun(s,dt,api,geometric){
 s.t+=dt;s.next-=dt;s.vy+=880*dt;s.y=Math.min(0,s.y+s.vy*dt);
 if(s.y===0)s.vy=0;
 if(s.next<=0){s.obstacles.push({x:365,w:geometric?22:27});s.next=geometric?1.15:1.55}
 for(const o of s.obstacles){o.x-=(geometric?193:173)*dt;if(o.x<85&&o.x+o.w>55&&s.y>-32){api.end('Obstacle hit');return}}
 s.obstacles=s.obstacles.filter(o=>o.x>-40);
 const next=Math.floor(s.t*(geometric?6:5));if(next>s.points){api.add(next-s.points);s.points=next}
}
function drawRun(s,c,geometric){
 bg(c,geometric?'Geometry Run':'Dino Run');rect(c,0,385,340,5,'#5880c5');
 rect(c,58,354+s.y,29,30,geometric?'#ba9ef7':'#83dec1');
 for(const o of s.obstacles){
  if(geometric){c.fillStyle='#ff99ab';c.beginPath();c.moveTo(o.x,385);c.lineTo(o.x+o.w/2,350);c.lineTo(o.x+o.w,385);c.fill()}
  else{rect(c,o.x,352,o.w,33,'#82c59c');rect(c,o.x-5,364,8,5,'#82c59c')}
 }
 txt(c,'Up / Space to jump',170,433,13,'#d7e6ff');
}
function initFruit(){return{items:[],next:0,missed:0,target:170}}
function stepFruit(s,dt,api){
 s.next-=dt;if(s.next<=0){s.next=1.05;s.items.push({x:35+rand(270),y:500,vx:rand(90)-45,vy:-280-rand(75),shade:pick(['#ffabac','#f4da86','#99ebbe','#c7b5fc'])})}
 for(const f of s.items){f.x+=f.vx*dt;f.y+=f.vy*dt;f.vy+=480*dt}
 const n=s.items.length;s.items=s.items.filter(f=>f.y<550);
 s.missed+=n-s.items.length;if(s.missed>=8)api.end('Eight fruits missed');
}
function sliceFruit(s,x,y,api){
 const n=s.items.length;s.items=s.items.filter(f=>Math.hypot(x-f.x,y-f.y)>29);
 if(n!==s.items.length)api.add((n-s.items.length)*4);
}
function drawFruit(s,c){
 bg(c,'Fruit Ninja');for(const f of s.items){disc(c,f.x,f.y,20,f.shade);rect(c,f.x-2,f.y-24,4,7,'#d8ffda')}
 c.strokeStyle='#a3ddfa';c.lineWidth=2;c.beginPath();c.moveTo(s.target-13,266);c.lineTo(s.target+13,266);c.moveTo(s.target,253);c.lineTo(s.target,279);c.stroke();
 txt(c,'Missed: '+s.missed+' of 8',170,435,13,'#d2e1ff');
}
const levels=[406,337,268,199,130];
function initGirder(){return{x:20,level:0,barrels:[],next:1.2,t:0}}
function stepGirder(s,dt,api){
 s.t+=dt;s.next-=dt;
 if(s.next<=0){s.next=1.8;s.barrels.push({x:325,level:rand(Math.min(5,s.level+2)),vx:-75})}
 for(const b of s.barrels){
  b.x+=b.vx*dt;if(b.x<12||b.x>325)b.vx*=-1;
  if(b.level===s.level&&Math.abs(b.x-s.x)<19){api.end('A barrel caught you');return}
 }
 s.barrels=s.barrels.filter(b=>b.x<345&&b.x>-25);
}
function drawGirder(s,c){
 bg(c,'Girder Gorilla');
 for(const y of levels)rect(c,12,y+20,316,8,'#6688c0');
 for(let i=0;i<4;i++)rect(c,167,levels[i+1]+27,5,levels[i]-levels[i+1]-7,'#c3daff');
 rect(c,s.x,levels[s.level]-12,18,31,'#89eadd');
 for(const b of s.barrels)disc(c,b.x,levels[b.level]+13,10,'#f1a48f');
 txt(c,'Climb the center ladder with Up',170,453,12,'#cfddf9');
}
function initMine(){return{mine:emptyBoard(9,9),seen:emptyBoard(9,9),flag:emptyBoard(9,9),ready:false,x:4,y:4,done:0}}
function mineAround(s,x,y){const cells=[];for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){const a=x+dx,b=y+dy;if((dx||dy)&&a>=0&&a<9&&b>=0&&b<9)cells.push([a,b])}return cells}
function minePlace(s,x,y){
 let n=0;while(n<10){const a=rand(9),b=rand(9);if(s.mine[b][a]===-1||(Math.abs(a-x)<2&&Math.abs(b-y)<2))continue;s.mine[b][a]=-1;n++}
 for(let yy=0;yy<9;yy++)for(let xx=0;xx<9;xx++)if(s.mine[yy][xx]!==-1)s.mine[yy][xx]=mineAround(s,xx,yy).filter(([a,b])=>s.mine[b][a]===-1).length;
 s.ready=true;
}
function mineReveal(s,x,y,api){
 if(s.flag[y][x]||s.seen[y][x])return;
 if(!s.ready)minePlace(s,x,y);
 if(s.mine[y][x]===-1){api.end('A mine was uncovered');return}
 const queue=[[x,y]];
 while(queue.length){
  const [a,b]=queue.pop();if(s.seen[b][a]||s.flag[b][a]||s.mine[b][a]===-1)continue;
  s.seen[b][a]=1;s.done++;api.add(1);
  if(s.mine[b][a]===0)queue.push(...mineAround(s,a,b));
 }
 if(s.done===71)api.end('Minefield cleared!');
}
function drawMine(s,c){
 bg(c,'Minesweeper');rect(c,11,76,318,318,'#0e2352','#607fc4');
 for(let y=0;y<9;y++)for(let x=0;x<9;x++){
  const px=13+x*35,py=78+y*35;
  rect(c,px,py,33,33,s.seen[y][x]?'#294978':'#1c3166');
  if(s.flag[y][x])txt(c,'⚑',px+16,py+24,20,'#f2aba1');
  else if(s.seen[y][x]&&s.mine[y][x])txt(c,s.mine[y][x],px+16,py+24,19,'#bce9ff');
  if(x===s.x&&y===s.y){c.strokeStyle='#fff1a6';c.lineWidth=2;c.strokeRect(px+1,py+1,31,31)}
 }
 txt(c,'Space = reveal  ·  F / Down = flag',170,435,12,'#d5e4fc');
}
function initMaze(){
 const walls=new Set();
 for(let y=0;y<17;y++)for(let x=0;x<15;x++){
  if(x===0||y===0||x===14||y===16||((x===3||x===11)&&y>2&&y<14&&y!==8)||((y===4||y===12)&&x>3&&x<11&&x!==7))walls.add(y*15+x);
 }
 return{walls,stars:new Set(Array.from({length:255},(_,i)=>i).filter(i=>!walls.has(i))),player:{x:7,y:8},ghosts:[{x:1,y:1},{x:13,y:15}],next:.4};
}
function mazeMove(s,key,api){
 const [dx,dy]=vec[key]||[0,0];if(!dx&&!dy)return;
 const x=s.player.x+dx,y=s.player.y+dy;
 if(s.walls.has(y*15+x))return;
 s.player={x,y};
 if(s.stars.delete(y*15+x))api.add(1);
 if(s.ghosts.some(g=>g.x===x&&g.y===y))api.end('Caught by a guardian');
 if(!s.stars.size)api.end('Maze complete');
}
function stepMaze(s,dt,api){
 s.next-=dt;if(s.next>0)return;s.next=.3;
 for(const g of s.ghosts){
  const steps=Object.values(vec).filter(([dx,dy])=>!s.walls.has((g.y+dy)*15+g.x+dx));
  const [dx,dy]=pick(steps);g.x+=dx;g.y+=dy;
  if(g.x===s.player.x&&g.y===s.player.y){api.end('Caught by a guardian');return}
 }
}
function drawMaze(s,c){
 bg(c,'Maze Chase');const u=21,ox=13,oy=58;
 for(let y=0;y<17;y++)for(let x=0;x<15;x++){
  const k=y*15+x,px=ox+x*u,py=oy+y*u;
  rect(c,px,py,20,20,s.walls.has(k)?'#3457a1':'#091a40');
  if(s.stars.has(k))disc(c,px+10,py+10,2,'#f7dc9b');
 }
 disc(c,ox+s.player.x*u+10,oy+s.player.y*u+10,9,'#ffe081');
 s.ghosts.forEach((g,i)=>disc(c,ox+g.x*u+10,oy+g.y*u+10,8,i?'#ce9aea':'#ffa8b4'));
}
function initSlither(){return{body:[{x:7,y:8},{x:6,y:8},{x:5,y:8}],dir:[1,0],next:[1,0],food:{x:13,y:8},time:0}}
function steerSlither(s,key){const d=vec[key];if(d&&!(d[0]===-s.dir[0]&&d[1]===-s.dir[1]))s.next=d}
function stepSlither(s,dt,api){
 s.time+=dt;if(s.time<.14)return;s.time=0;s.dir=s.next;
 const n={x:s.body[0].x+s.dir[0],y:s.body[0].y+s.dir[1]};
 const ate=n.x===s.food.x&&n.y===s.food.y;
 if(n.x<0||n.y<0||n.x>=17||n.y>=20||(ate?s.body:s.body.slice(0,-1)).some(p=>p.x===n.x&&p.y===n.y)){api.end('Trail ended');return}
 s.body.unshift(n);
 if(ate){api.add(1);let z=0;do{s.food={x:rand(17),y:rand(20)};z++}while(z<500&&s.body.some(p=>p.x===s.food.x&&p.y===s.food.y))}
 else s.body.pop();
}
function drawSlither(s,c){
 bg(c,'Slither');rect(c,8,48,323,380,'#092441','#41649c');
 for(let i=s.body.length-1;i>=0;i--){const p=s.body[i];disc(c,17+p.x*19,57+p.y*19,9,i?'#49d8cc':'#d4fff6')}
 disc(c,17+s.food.x*19,57+s.food.y*19,7,'#f9da90');
}
function initSlope(){return{x:170,t:0,next:1,blocks:[],points:0}}
function stepSlope(s,dt,api){
 s.t+=dt;s.next-=dt;
 if(s.next<0){s.next=.85;s.blocks.push({x:35+rand(265),y:-25})}
 for(const b of s.blocks){b.y+=(170+Math.min(150,s.t*5))*dt;if(b.y>370&&b.y<410&&Math.abs(b.x-s.x)<27){api.end('The ball hit an obstacle');return}}
 s.blocks=s.blocks.filter(b=>b.y<500);
 const next=Math.floor(s.t*5);if(next>s.points){api.add(next-s.points);s.points=next}
}
function drawSlope(s,c){
 bg(c,'Slope');rect(c,16,74,308,365,'#101f4d','#3158a9');
 c.strokeStyle='#5a88c7';c.beginPath();c.moveTo(60,74);c.lineTo(16,439);c.moveTo(280,74);c.lineTo(324,439);c.stroke();
 for(const b of s.blocks)rect(c,b.x-18,b.y-18,36,36,'#f18ba9');
 disc(c,s.x,384,16,'#8cdbff');txt(c,'Steer left / right',170,462,12,'#dce7ff');
}
function sudokuSolution(){
 const base=(r,c)=>(r*3+Math.floor(r/3)+c)%9+1;
 const groups=[0,1,2];for(let i=2;i>0;i--){const j=rand(i+1);[groups[i],groups[j]]=[groups[j],groups[i]]}
 const rows=groups.flatMap(g=>{const n=[0,1,2];for(let i=2;i>0;i--){const j=rand(i+1);[n[i],n[j]]=[n[j],n[i]]}return n.map(x=>g*3+x)});
 const cols=[0,1,2,3,4,5,6,7,8],digits=[1,2,3,4,5,6,7,8,9];
 for(let i=8;i>0;i--){const j=rand(i+1);[digits[i],digits[j]]=[digits[j],digits[i]]}
 return rows.map(r=>cols.map(c=>digits[base(r,c)-1]));
}
function initSudoku(){
 const full=sudokuSolution(),grid=full.map(row=>row.slice()),holes=new Set();
 while(holes.size<28)holes.add(rand(81));
 for(const h of holes)grid[Math.floor(h/9)][h%9]=0;
 return{full,grid,holes,x:4,y:4,found:0,notice:''};
}
function inputSudoku(s,key,api){
 if(!/^[1-9]$/.test(key))return;
 const n=Number(key),h=s.y*9+s.x;
 if(!s.holes.has(h)||s.grid[s.y][s.x])return;
 if(s.full[s.y][s.x]===n){s.grid[s.y][s.x]=n;s.found++;api.add(1);s.notice='Correct!';if(s.found===s.holes.size)api.end('Puzzle complete!')}
 else s.notice='Try another number';
}
function drawSudoku(s,c){
 bg(c,'Sudoku');const u=33,ox=21,oy=87;
 rect(c,ox-2,oy-2,301,301,'#112a5b','#8ea8ef');
 for(let y=0;y<9;y++)for(let x=0;x<9;x++){
  const px=ox+x*u,py=oy+y*u,n=s.grid[y][x],editable=s.holes.has(y*9+x);
  rect(c,px,py,32,32,(x===s.x&&y===s.y)?'#536bbb':editable?'#1b3c72':'#304477');
  if(n)txt(c,n,px+16,py+24,17,editable?'#a6fff0':'#e9ecff');
 }
 c.strokeStyle='#a2b4f5';c.lineWidth=2;
 for(let i=3;i<9;i+=3){c.beginPath();c.moveTo(ox+i*u,oy);c.lineTo(ox+i*u,oy+297);c.moveTo(ox,oy+i*u);c.lineTo(ox+297,oy+i*u);c.stroke()}
 txt(c,s.notice||'Select a blank square and type 1–9',170,427,12,'#d5e6ff');
}
const WORDS=['PLANET','ORBIT','SPACE','GLOBE','STARS','GALAXY','SOLAR','COMET','MOONS','NOVA'];const FIVE=WORDS.filter(w=>w.length===5);
function initWord(){return{secret:pick(FIVE),typed:'',guesses:[],notice:''}}
function wordKey(s,key,api){
 if(key==='Backspace')s.typed=s.typed.slice(0,-1);
 else if(key==='Enter'){
  if(s.typed.length!==5){s.notice='Enter five letters';return}
  const guess=s.typed;s.guesses.push(guess);s.typed='';s.notice='';
  if(guess===s.secret){api.add(10+(6-s.guesses.length)*3);api.end('Correct word!');return}
  if(s.guesses.length>=6)api.end('The word was '+s.secret);
 }else if(/^[a-zA-Z]$/.test(key)&&s.typed.length<5)s.typed+=key.toUpperCase();
}
function drawWord(s,c){
 bg(c,'Word Guess');const sz=49,ox=36,oy=73;
 for(let y=0;y<6;y++)for(let x=0;x<5;x++){
  const guess=s.guesses[y]|| (s.guesses.length===y?s.typed:'');
  let color='#1a2e60';
  if(s.guesses[y])color=s.secret[x]===guess[x]?'#2a987e':s.secret.includes(guess[x])?'#9d7a40':'#3c4b74';
  const px=ox+x*54,py=oy+y*54;rect(c,px,py,sz,sz,color,'#6589bb');
  if(guess[x])txt(c,guess[x],px+sz/2,py+34,25,'#fff');
 }
 txt(c,s.notice||'Type a 5-letter word · Enter to submit',170,428,12,'#d8e6ff');
}
function create(game){
 switch(game){
  case 'game2048':return init2048();case 'blockblast':return initBlast();case 'breakout':return initBreakout();
  case 'dino':case 'geodash':return initRun();case 'fruitninja':return initFruit();
  case 'girder':return initGirder();case 'minesweeper':return initMine();case 'pacman':return initMaze();
  case 'slither':return initSlither();case 'slope':return initSlope();case 'sudoku':return initSudoku();
  case 'wordle':return initWord();
 }return null;
}
function step(game,s,dt,api){
 if(game==='breakout')stepBreakout(s,dt,api);
 else if(game==='dino'||game==='geodash')stepRun(s,dt,api,game==='geodash');
 else if(game==='fruitninja')stepFruit(s,dt,api);
 else if(game==='girder')stepGirder(s,dt,api);
 else if(game==='pacman')stepMaze(s,dt,api);
 else if(game==='slither')stepSlither(s,dt,api);
 else if(game==='slope')stepSlope(s,dt,api);
}
function input(game,s,key,api){
 const v=vec[key]||[0,0];
 if(game==='game2048'&&vec[key])play2048(s,key,api);
 else if(game==='blockblast'){
  if(vec[key]){s.x=clamp(s.x+v[0],0,7);s.y=clamp(s.y+v[1],0,7)}
  if(key==='drop')placeBlast(s,api);
 }
 else if(game==='breakout')s.paddle=clamp(s.paddle+v[0]*35,3,265);
 else if(game==='dino'||game==='geodash'){if((key==='rotate'||key==='drop')&&s.y===0)s.vy=-350}
 else if(game==='fruitninja'){s.target=clamp(s.target+v[0]*30,15,325);if(key==='drop')sliceFruit(s,s.target,266,api)}
 else if(game==='girder'){
  s.x=clamp(s.x+v[0]*24,15,300);
  if(key==='rotate'&&s.level<4&&Math.abs(s.x-170)<33){s.level++;api.add(5)}
  if(key==='down'&&s.level>0&&Math.abs(s.x-170)<33)s.level--;
  if(s.level===4&&s.x>280)api.end('You reached the top!');
 }
 else if(game==='minesweeper'){
  s.x=clamp(s.x+v[0],0,8);s.y=clamp(s.y+(key==='drop'?0:v[1]),0,8);
  if(key==='drop')mineReveal(s,s.x,s.y,api);
  if(key==='flag')s.flag[s.y][s.x]=s.flag[s.y][s.x]?0:1;
 }
 else if(game==='pacman')mazeMove(s,key,api);
 else if(game==='slither')steerSlither(s,key);
 else if(game==='slope')s.x=clamp(s.x+v[0]*28,36,304);
 else if(game==='sudoku'){
  s.x=clamp(s.x+v[0],0,8);s.y=clamp(s.y+v[1],0,8);
  if(/^[1-9]$/.test(key))inputSudoku(s,key,api);
 }
 else if(game==='wordle')wordKey(s,key,api);
}
function key(game,s,key,api){
 if(game==='wordle'){wordKey(s,key,api);return true}
 if(game==='sudoku'&&/^[1-9]$/.test(key)){inputSudoku(s,key,api);return true}
 if(game==='minesweeper'&&(key==='f'||key==='F')){input(game,s,'flag',api);return true}
 return false;
}
function pointer(game,s,x,y,api){
 if(game==='fruitninja')sliceFruit(s,x,y,api);
 else if(game==='minesweeper'){const a=Math.floor((x-13)/35),b=Math.floor((y-78)/35);if(a>=0&&a<9&&b>=0&&b<9){s.x=a;s.y=b;mineReveal(s,a,b,api)}}
 else if(game==='sudoku'){const a=Math.floor((x-21)/33),b=Math.floor((y-87)/33);if(a>=0&&a<9&&b>=0&&b<9){s.x=a;s.y=b}}
 else if(game==='blockblast'){
  const a=Math.floor((x-22)/38),b=Math.floor((y-88)/38);
  if(a>=0&&a<8&&b>=0&&b<8){s.x=a;s.y=b;placeBlast(s,api)}
 }
 else if(game==='dino'||game==='geodash')input(game,s,'rotate',api);
}
function draw(game,s,c){
 if(!s||!c)return;
 switch(game){
  case 'game2048':return draw2048(s,c);
  case 'blockblast':return drawBlast(s,c);
  case 'breakout':return drawBreakout(s,c);
  case 'dino':return drawRun(s,c,false);
  case 'geodash':return drawRun(s,c,true);
  case 'fruitninja':return drawFruit(s,c);
  case 'girder':return drawGirder(s,c);
  case 'minesweeper':return drawMine(s,c);
  case 'pacman':return drawMaze(s,c);
  case 'slither':return drawSlither(s,c);
  case 'slope':return drawSlope(s,c);
  case 'sudoku':return drawSudoku(s,c);
  case 'wordle':return drawWord(s,c);
 }
}
function keypad(game,dispatch){
 const el=document.getElementById('arcadeKeypad');if(!el)return;
 el.replaceChildren();
 const symbols=game==='sudoku'?'123456789':game==='wordle'?'QWERTYUIOPASDFGHJKLZXCVBNM':'';
 el.hidden=!symbols;
 if(!symbols)return;
 for(const k of symbols){
  const b=document.createElement('button');b.type='button';b.textContent=k;
  b.setAttribute('aria-label','Enter '+k);
  b.addEventListener('click',()=>dispatch(k));
  el.append(b);
 }
 if(game==='wordle')for(const k of ['Backspace','Enter']){
  const b=document.createElement('button');b.type='button';b.textContent=k==='Backspace'?'⌫':'Enter';
  b.addEventListener('click',()=>dispatch(k));el.append(b)
 }
}
window.OrbitArcadeExtras={RULES,create,step,input,key,pointer,draw,keypad};
})();