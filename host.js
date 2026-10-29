const canvas=document.getElementById('game'),ctx=canvas.getContext('2d');
const $=id=>document.getElementById(id);
let players={},race=null,phase='lobby',started=0,connections=new Map(),peer=null,roomCode='';
const colors=['#ff637d','#53c9ff','#ffe06b','#a993ff','#6ff0b2','#ff9f57','#ff70d7','#f0f0f0'];
const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ';
const makeCode=()=>Array.from({length:4},()=>alphabet[Math.floor(Math.random()*alphabet.length)]).join('');
const safeName=s=>String(s||'Racer').trim().slice(0,16)||'Racer';
const blankInput=()=>({steer:0,gas:false,brake:false,boost:false});
function track(){const seed=Math.random()*10000,nodes=[];for(let i=0;i<120;i++){const t=i/119;nodes.push({x:Math.sin(t*11+seed)*145+Math.sin(t*24+seed*.7)*38,y:t*6200});}return {nodes,length:6200};}
function state(){return {type:'state',players,phase,race,started};}
function broadcast(msg){for(const c of connections.values())if(c.open)try{c.send(msg)}catch(e){console.warn(e)}}
function resetTrack(){race=track();phase='lobby';started=0;for(const p of Object.values(players))Object.assign(p,{progress:0,lane:0,speed:0,heading:0,impact:0,finished:false,finishTime:null,input:blankInput()});broadcast(state());update();}
function hostRoom(){if(peer){peer.destroy();peer=null;}roomCode=makeCode();$('roomCode').textContent=roomCode;$('networkHelp').textContent='Connecting room…';peer=new Peer('tiltkart-'+roomCode.toLowerCase(),{debug:1});peer.on('open',()=>{$('networkHelp').textContent='Room ready! Keep this tab open. Share the address and code.';});peer.on('error',err=>{if(err.type==='unavailable-id'){hostRoom();return;}$('networkHelp').textContent='Connection error: '+err.type+' — refresh to retry.';});peer.on('connection',conn=>{conn.on('data',msg=>{if(!msg||typeof msg!=='object')return;if(msg.type==='join'){if(phase!=='lobby'||Object.keys(players).length>=8){conn.send({type:'joinError',message:'Race started or lobby full'});return;}if(players[conn.peer])return;const id=conn.peer;players[id]={id,name:safeName(msg.name),color:colors[Object.keys(players).length],progress:0,lane:0,speed:0,heading:0,impact:0,finished:false,finishTime:null,input:blankInput()};connections.set(id,conn);conn.send({type:'joined',name:players[id].name});broadcast(state());update();}else if(msg.type==='input'&&players[conn.peer]){const a=msg.input||{};players[conn.peer].input={steer:Math.max(-1,Math.min(1,Number(a.steer)||0)),gas:!!a.gas,brake:!!a.brake,boost:!!a.boost};}});conn.on('close',()=>{connections.delete(conn.peer);delete players[conn.peer];broadcast(state());update();});conn.on('error',()=>{});});}
$('joinAddress').textContent=new URL('./',location.href).href;
$('start').onclick=()=>{if(phase==='lobby'&&Object.keys(players).length){phase='racing';started=Date.now()+3500;broadcast(state());update();}};
$('reset').onclick=resetTrack;
function escapeHtml(s){return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function update(){const arr=Object.values(players).sort((a,b)=>b.progress-a.progress);$('count').textContent=`${arr.length}/8`;$('players').innerHTML=arr.map(p=>`<div class="player"><span><i class="dot" style="background:${p.color}"></i>${escapeHtml(p.name)}</span><b>${p.finished?'🏁':Math.round(p.progress/62)+'%'}</b></div>`).join('')||'No racers yet';const remain=Math.ceil((started-Date.now())/1000);$('status').textContent=phase==='lobby'?'Share link + code • Start when ready':phase==='finished'?'🏆 FINISH! '+(arr[0]?.name||''):remain>0?'STARTING IN '+remain:'🏎️ RACE IN PROGRESS';}
let last=performance.now();
const ROAD_LIMIT=108, CAR_RADIUS=17;
setInterval(()=>{
 const now=performance.now(),dt=Math.min(.05,(now-last)/1000);last=now;
 if(phase==='racing'&&Date.now()>=started){
  const racers=Object.values(players);
  for(const p of racers){
   if(p.finished)continue;
   const input=p.input;
   const target=input.brake?45:input.gas?(input.boost?460:320):110;
   p.speed+=(target-p.speed)*Math.min(1,dt*(input.brake?5:1.7));
   p.impact=Math.max(0,(p.impact||0)-dt);
   const turn=Number(input.steer)||0;
   p.heading+=(turn*.32-p.heading)*Math.min(1,dt*9);
   p.lane+=Math.sin(p.heading)*p.speed*dt*.95;
   if(p.lane>ROAD_LIMIT-CAR_RADIUS){p.lane=ROAD_LIMIT-CAR_RADIUS;p.speed=Math.max(30,p.speed*.46);p.heading=-.42;p.impact=.35;}
   if(p.lane< -ROAD_LIMIT+CAR_RADIUS){p.lane=-ROAD_LIMIT+CAR_RADIUS;p.speed=Math.max(30,p.speed*.46);p.heading=.42;p.impact=.35;}
   p.progress+=Math.max(0,p.speed*Math.cos(p.heading))*dt;
   if(p.progress>=race.length){p.progress=race.length;p.finished=true;p.finishTime=(Date.now()-started)/1000;}
  }
  // Resolve overlapping car bodies, separating them and reducing their speed.
  for(let i=0;i<racers.length;i++)for(let j=i+1;j<racers.length;j++){
   const a=racers[i],b=racers[j];
   const dx=a.lane-b.lane,dy=a.progress-b.progress;
   const dist=Math.hypot(dx,dy),minDist=CAR_RADIUS*2;
   if(dist>=minDist)continue;
   const nx=dist>.001?dx/dist:(i%2?1:-1),ny=dist>.001?dy/dist:0;
   const overlap=(minDist-dist)/2+0.15;
   a.lane+=nx*overlap;b.lane-=nx*overlap;
   a.progress=Math.max(0,a.progress+ny*overlap);b.progress=Math.max(0,b.progress-ny*overlap);
   a.lane=Math.max(-ROAD_LIMIT+CAR_RADIUS,Math.min(ROAD_LIMIT-CAR_RADIUS,a.lane));
   b.lane=Math.max(-ROAD_LIMIT+CAR_RADIUS,Math.min(ROAD_LIMIT-CAR_RADIUS,b.lane));
   const slow=Math.min(a.speed,b.speed)*.58;
   a.speed=Math.min(a.speed,slow);b.speed=Math.min(b.speed,slow);
   a.heading+=nx*.28;b.heading-=nx*.28;
   a.impact=.35;b.impact=.35;
  }
  if(racers.length&&racers.every(p=>p.finished))phase='finished';
 }
 broadcast({type:'tick',players,phase,started});update();
},50);
resetTrack();if(typeof Peer==='undefined'){$('networkHelp').textContent='PeerJS could not load. Check internet connection.';}else hostRoom();
function center(y){if(!race)return 0;const a=race.nodes;let k=Math.max(0,Math.min(a.length-2,Math.floor(y/6200*(a.length-1))));const t=(y-a[k].y)/(a[k+1].y-a[k].y);return a[k].x+(a[k+1].x-a[k].x)*Math.max(0,Math.min(1,t));}
// Fixed overview camera: the entire track stays still; cars move through it.
function draw(){
 const rect=canvas.getBoundingClientRect(),dpr=Math.min(2,devicePixelRatio||1);
 if(canvas.width!==Math.floor(rect.width*dpr)||canvas.height!==Math.floor(rect.height*dpr)){
  canvas.width=Math.floor(rect.width*dpr);canvas.height=Math.floor(rect.height*dpr);
 }
 ctx.setTransform(dpr,0,0,dpr,0,0);
 const w=rect.width,h=rect.height;
 ctx.fillStyle='#4e8b75';ctx.fillRect(0,0,w,h);
 if(!race){requestAnimationFrame(draw);return;}
 const margin=48,roadHalf=128;
 const minX=Math.min(...race.nodes.map(n=>n.x))-roadHalf-30;
 const maxX=Math.max(...race.nodes.map(n=>n.x))+roadHalf+30;
 const scale=Math.min((w-2*margin)/(maxX-minX),(h-2*margin)/race.length);
 const ox=(w-(maxX-minX)*scale)/2-minX*scale;
 const sy=y=>h-margin-y*scale;
 const sx=y=>ox+center(y)*scale;
 // All road geometry is in fixed world coordinates, with no camera scrolling.
 for(const [width,color] of [[140,'#d8e0ca'],[130,'#d76568'],[112,'#343c53']]){
  ctx.beginPath();
  race.nodes.forEach((n,i)=>{const x=sx(n.y)-width*scale,y=sy(n.y);i?ctx.lineTo(x,y):ctx.moveTo(x,y)});
  for(let i=race.nodes.length-1;i>=0;i--){const n=race.nodes[i];ctx.lineTo(sx(n.y)+width*scale,sy(n.y));}
  ctx.closePath();ctx.fillStyle=color;ctx.fill();
 }
 ctx.strokeStyle='#f8f2db99';ctx.lineWidth=Math.max(1,2*scale);ctx.setLineDash([Math.max(2,18*scale),Math.max(2,22*scale)]);
 for(const lane of [-55,55]){ctx.beginPath();race.nodes.forEach((n,i)=>{const x=sx(n.y)+lane*scale,y=sy(n.y);i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.stroke();}
 ctx.setLineDash([]);
 for(let y=280;y<race.length;y+=360){for(const side of [-1,1]){
  const x=sx(y)+side*170*scale,yy=sy(y);
  ctx.fillStyle='#265b43';ctx.beginPath();ctx.arc(x+2,yy+2,Math.max(2,14*scale),0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#b7e878';ctx.beginPath();ctx.arc(x,yy,Math.max(2,11*scale),0,Math.PI*2);ctx.fill();
 }}
 const finishY=sy(race.length);
 for(let i=0;i<12;i++){ctx.fillStyle=i%2?'white':'#111';ctx.fillRect(sx(race.length)+(i-6)*19*scale,finishY,19*scale,Math.max(2,14*scale));}
 const racers=Object.values(players);
 // Minimum visual size keeps karts visible even on very long tracks.
 const kartScale=Math.max(.65,scale*2.8);
 for(const p of racers){
  const x=sx(p.progress)+p.lane*scale,y=sy(p.progress);
  ctx.save();ctx.translate(x,y);ctx.rotate(-(p.heading||0));
  if(p.input?.boost&&p.input?.gas&&phase==='racing'&&!p.finished&&Date.now()>=started){
   const flicker=4+Math.random()*10;
   ctx.fillStyle='#ff6b1a';ctx.beginPath();ctx.moveTo(-8*kartScale,18*kartScale);ctx.lineTo(0,(31+flicker)*kartScale);ctx.lineTo(8*kartScale,18*kartScale);ctx.fill();
   ctx.fillStyle='#ffe45c';ctx.beginPath();ctx.moveTo(-4*kartScale,19*kartScale);ctx.lineTo(0,(25+flicker*.6)*kartScale);ctx.lineTo(4*kartScale,19*kartScale);ctx.fill();
  }
  ctx.fillStyle='#10152388';ctx.fillRect(-14*kartScale,-17*kartScale,28*kartScale,39*kartScale);
  ctx.fillStyle=p.impact>0?'#ffffff':p.color;
  ctx.beginPath();ctx.roundRect(-12*kartScale,-20*kartScale,24*kartScale,38*kartScale,5*kartScale);ctx.fill();
  ctx.fillStyle='#17253c';ctx.fillRect(-8*kartScale,-8*kartScale,16*kartScale,12*kartScale);
  ctx.restore();
  ctx.fillStyle='#fff';ctx.font='bold 11px system-ui';ctx.textAlign='center';ctx.fillText(p.name,x,y-25*kartScale);
 }
 const lead=Math.max(0,...racers.map(p=>p.progress));
 ctx.fillStyle='#0b1329bb';ctx.fillRect(12,h-53,Math.min(330,w-24),40);
 ctx.fillStyle='#fff';ctx.font='bold 12px system-ui';ctx.textAlign='left';
 ctx.fillText('FINISH LINE • '+Math.round(lead/race.length*100)+'% COMPLETE',24,h-28);
 requestAnimationFrame(draw);
}
requestAnimationFrame(draw);
