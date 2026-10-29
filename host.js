const canvas=document.getElementById('game'),ctx=canvas.getContext('2d');
const $=id=>document.getElementById(id);
let players={},race=null,phase='lobby',started=0,connections=new Map(),peer=null,roomCode='',pausedAt=0;
const colors=['#ff637d','#53c9ff','#ffe06b','#a993ff','#6ff0b2','#ff9f57','#ff70d7','#f0f0f0'];
const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ';
const makeCode=()=>Array.from({length:4},()=>alphabet[Math.floor(Math.random()*alphabet.length)]).join('');
const safeName=s=>String(s||'Racer').trim().slice(0,16)||'Racer';
const blankInput=()=>({steer:0,gas:false,brake:false,boost:false});
function track(){const seed=Math.random()*10000,nodes=[];for(let i=0;i<120;i++){const t=i/119;nodes.push({x:Math.sin(t*11+seed)*145+Math.sin(t*24+seed*.7)*38,y:t*6200});}return {nodes,length:6200};}
function state(){return {type:'state',players,phase,race,started};}
function broadcast(msg){for(const c of connections.values())if(c.open)try{c.send(msg)}catch(e){console.warn(e)}}
function resetTrack(){race=track();phase='lobby';started=0;pausedAt=0;$('pause').hidden=true;$('pause').textContent='⏸ PAUSE';for(const p of Object.values(players))Object.assign(p,{progress:0,lane:0,speed:0,heading:0,impact:0,finished:false,finishTime:null,input:blankInput()});broadcast(state());update();}
function hostRoom(){if(peer){peer.destroy();peer=null;}roomCode=makeCode();$('roomCode').textContent=roomCode;$('networkHelp').textContent='Connecting room…';peer=new Peer('tiltkart-'+roomCode.toLowerCase(),{debug:1});peer.on('open',()=>{$('networkHelp').textContent='Room ready! Keep this tab open. Share the address and code.';});peer.on('error',err=>{if(err.type==='unavailable-id'){hostRoom();return;}$('networkHelp').textContent='Connection error: '+err.type+' — refresh to retry.';});peer.on('connection',conn=>{conn.on('data',msg=>{if(!msg||typeof msg!=='object')return;if(msg.type==='join'){if(phase!=='lobby'||Object.keys(players).length>=8){conn.send({type:'joinError',message:'Race started or lobby full'});return;}if(players[conn.peer])return;const id=conn.peer;players[id]={id,name:safeName(msg.name),color:colors[Object.keys(players).length],progress:0,lane:0,speed:0,heading:0,impact:0,finished:false,finishTime:null,input:blankInput()};connections.set(id,conn);conn.send({type:'joined',name:players[id].name});broadcast(state());update();}else if(msg.type==='input'&&players[conn.peer]){const a=msg.input||{};players[conn.peer].input={steer:Math.max(-1,Math.min(1,Number(a.steer)||0)),gas:!!a.gas,brake:!!a.brake,boost:!!a.boost};}});conn.on('close',()=>{connections.delete(conn.peer);delete players[conn.peer];broadcast(state());update();});conn.on('error',()=>{});});}
$('joinAddress').textContent=new URL('./',location.href).href;
$('start').onclick=()=>{if(phase==='lobby'&&Object.keys(players).length){phase='racing';started=Date.now()+4000;$('pause').hidden=false;broadcast(state());update();}};
$('reset').onclick=resetTrack;
$('pause').onclick=()=>{if(phase==='racing'){phase='paused';pausedAt=Date.now();$('pause').textContent='▶ RESUME';}else if(phase==='paused'){started+=Date.now()-pausedAt;phase='racing';$('pause').textContent='⏸ PAUSE';}broadcast(state());update();};
function escapeHtml(s){return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function update(){const arr=Object.values(players).sort((a,b)=>b.progress-a.progress);$('count').textContent=`${arr.length}/8`;$('players').innerHTML=arr.map(p=>`<div class="player"><span><i class="dot" style="background:${p.color}"></i>${escapeHtml(p.name)}</span><b>${p.finished?'🏁':Math.round(p.progress/62)+'%'}</b></div>`).join('')||'No racers yet';const remain=Math.ceil((started-Date.now())/1000);$('status').textContent=phase==='lobby'?'Share link + code • Start when ready':phase==='finished'?'🏆 FINISH! '+(arr[0]?.name||''):phase==='paused'?'⏸ RACE PAUSED':remain>0?'STARTING IN '+remain:'🏎️ RACE IN PROGRESS';}
let last=performance.now();
const ROAD_LIMIT=108, CAR_RADIUS=17;
setInterval(()=>{
 const now=performance.now(),dt=Math.min(.05,(now-last)/1000);last=now;
 if(phase==='racing'&&Date.now()>=started){
  const racers=Object.values(players);
  for(const p of racers){
   if(p.finished)continue;
   const input=p.input;
   const target=input.brake?0:input.gas?(input.boost?460:320):0;
   p.speed+=(target-p.speed)*Math.min(1,dt*(input.brake?8:input.gas?3.2:6));if(p.speed<1)p.speed=0;
   p.impact=Math.max(0,(p.impact||0)-dt);
   const turn=Number(input.steer)||0;
   p.heading+=(turn*.32-p.heading)*Math.min(1,dt*9);
   p.lane+=Math.sin(p.heading)*p.speed*dt*.95;
   if(p.lane>ROAD_LIMIT-CAR_RADIUS){p.lane=ROAD_LIMIT-CAR_RADIUS;p.speed*=.32;p.heading=-.65;p.impact=.35;}
   if(p.lane< -ROAD_LIMIT+CAR_RADIUS){p.lane=-ROAD_LIMIT+CAR_RADIUS;p.speed*=.32;p.heading=.65;p.impact=.35;}
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
   const va=a.speed,vb=b.speed;
   a.speed=Math.max(0,Math.min(va*.45,vb*.6));b.speed=Math.max(0,Math.min(vb*.45,va*.6));
   a.heading+=nx*.28;b.heading-=nx*.28;
   a.impact=.35;b.impact=.35;
  }
  if(racers.length&&racers.every(p=>p.finished)){phase='finished';$('pause').hidden=true;}
 }
 broadcast({type:'tick',players,phase,started});update();
},50);
resetTrack();if(typeof Peer==='undefined'){$('networkHelp').textContent='PeerJS could not load. Check internet connection.';}else hostRoom();
function center(y){if(!race)return 0;const a=race.nodes;let k=Math.max(0,Math.min(a.length-2,Math.floor(y/6200*(a.length-1))));const t=(y-a[k].y)/(a[k+1].y-a[k].y);return a[k].x+(a[k+1].x-a[k].x)*Math.max(0,Math.min(1,t));}
// Original scrolling road view restored.
function draw(){const rect=canvas.getBoundingClientRect(),dpr=Math.min(2,devicePixelRatio||1);if(canvas.width!==Math.floor(rect.width*dpr)||canvas.height!==Math.floor(rect.height*dpr)){canvas.width=rect.width*dpr;canvas.height=rect.height*dpr;}ctx.setTransform(dpr,0,0,dpr,0,0);const w=rect.width,h=rect.height;ctx.fillStyle='#222b3e';ctx.fillRect(0,0,w,h);const racers=Object.values(players);const lead=Math.max(0,...racers.map(p=>p.progress));const camera=Math.max(0,lead-160);const scale=Math.min(2.6,w/365);const px=y=>h*.78-(y-camera)*scale;const cx=y=>w/2+(center(y)-center(camera))*scale;const from=camera-250,to=camera+h/scale+300;
if(race){for(let width of [140,128,112]){ctx.beginPath();for(let y=from;y<=to;y+=12){const x=cx(y),sy=px(y);if(y===from)ctx.moveTo(x-width*scale,sy);else ctx.lineTo(x-width*scale,sy);}for(let y=to;y>=from;y-=12)ctx.lineTo(cx(y)+width*scale,px(y));ctx.closePath();ctx.fillStyle=width===140?'#cbd9bc':width===128?'#df6866':'#343c53';ctx.fill();}ctx.strokeStyle='#e9e9da77';ctx.lineWidth=3;ctx.setLineDash([18,22]);for(const lane of [-55,55]){ctx.beginPath();for(let y=from;y<=to;y+=10){const x=cx(y)+lane*scale;if(y===from)ctx.moveTo(x,px(y));else ctx.lineTo(x,px(y));}ctx.stroke();}ctx.setLineDash([]);// Grandstands and fans follow the track on both sides, replacing the grass.
for(const side of [-1,1]){
  // Stadium concrete concourse, colored bleacher tiers and safety fencing.
  for(let band=0;band<4;band++){
    const inner=side*(143+band*30)*scale,outer=side*(173+band*30)*scale;
    ctx.beginPath();
    for(let y=from;y<=to;y+=14){const x=cx(y)+inner;if(y===from)ctx.moveTo(x,px(y));else ctx.lineTo(x,px(y));}
    for(let y=to;y>=from;y-=14)ctx.lineTo(cx(y)+outer,px(y));
    ctx.closePath();ctx.fillStyle=['#687389','#36425d','#58647d','#303a53'][band];ctx.fill();
  }
  // Spectator dots, staggered in rows so the crowd looks packed.
  for(let y=Math.floor(from/20)*20;y<=to;y+=20){
    const sy=px(y);if(sy < -15 || sy > h+15)continue;
    for(let row=0;row<4;row++){
      const offset=161+row*29;
      const x=cx(y)+side*offset*scale;
      const seed=Math.abs(Math.floor(y/20)*37+row*71+(side+1)*13);
      const fanColors=['#f9d46b','#fa8197','#80d6f4','#f6f0dd','#bbadff','#a4f2ba'];
      ctx.fillStyle=fanColors[seed%fanColors.length];
      ctx.beginPath();ctx.arc(x,sy,Math.max(1.6,2.6*scale),0,Math.PI*2);ctx.fill();
    }
  }
  ctx.beginPath();for(let y=from;y<=to;y+=12){const x=cx(y)+side*142*scale;if(y===from)ctx.moveTo(x,px(y));else ctx.lineTo(x,px(y));}
  ctx.strokeStyle='#f5f5f5';ctx.lineWidth=Math.max(2,3*scale);ctx.stroke();
  ctx.beginPath();for(let y=from;y<=to;y+=12){const x=cx(y)+side*147*scale;if(y===from)ctx.moveTo(x,px(y));else ctx.lineTo(x,px(y));}
  ctx.strokeStyle='#93a4c4';ctx.lineWidth=Math.max(1,1.5*scale);ctx.stroke();
}
const finish=px(6200);if(finish>-40&&finish<h+40){for(let i=-6;i<6;i++){ctx.fillStyle=i%2?'white':'#111';ctx.fillRect(cx(6200)+i*20*scale,finish,20*scale,12*scale);}}}
for(const p of racers){const sy=px(p.progress);if(sy< -50||sy>h+50)continue;const x=cx(p.progress)+p.lane*scale;ctx.save();ctx.translate(x,sy);ctx.rotate(-(p.heading||0));if(p.input?.boost&&p.input?.gas&&phase==='racing'&&Date.now()>=started&&!p.finished){const flame=12+Math.random()*15;ctx.fillStyle='#ff6a15';ctx.beginPath();ctx.moveTo(-10*scale,17*scale);ctx.lineTo(0,(26+flame)*scale);ctx.lineTo(10*scale,17*scale);ctx.fill();ctx.fillStyle='#ffeb68';ctx.beginPath();ctx.moveTo(-5*scale,18*scale);ctx.lineTo(0,(22+flame*.55)*scale);ctx.lineTo(5*scale,18*scale);ctx.fill();}ctx.fillStyle='#1119';ctx.fillRect(-15*scale,-19*scale,30*scale,42*scale);ctx.fillStyle=p.impact>0?'#ffffff':p.color;ctx.beginPath();ctx.roundRect(-13*scale,-23*scale,26*scale,43*scale,6*scale);ctx.fill();ctx.fillStyle='#16253e';ctx.fillRect(-9*scale,-9*scale,18*scale,13*scale);ctx.fillStyle='#fff';ctx.font=`bold ${12*scale}px system-ui`;ctx.textAlign='center';ctx.fillText(p.name,0,-33*scale);ctx.restore();}
ctx.fillStyle='#0b1329aa';ctx.fillRect(12,h-62,Math.min(330,w-24),48);ctx.fillStyle='#fff';ctx.font='bold 12px system-ui';ctx.fillText('FINISH LINE  •  '+Math.round(lead/62)+'% COMPLETE',25,h-33);
if(phase==='racing'&&Date.now()<started){const left=started-Date.now();const lit=left>3000?0:left>2000?1:left>1000?2:3;const centerX=w/2,centerY=h*.27;ctx.fillStyle='#101827e8';ctx.beginPath();ctx.roundRect(centerX-108,centerY-43,216,100,22);ctx.fill();for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(centerX-65+i*65,centerY,21,0,Math.PI*2);ctx.fillStyle=i<lit?'#ff4c3f':'#465064';ctx.fill();}ctx.font='900 19px system-ui';ctx.textAlign='center';ctx.fillStyle='white';ctx.fillText(lit===3?'GO!':'GET READY',centerX,centerY+42);}
if(phase==='paused'){ctx.fillStyle='#101827bb';ctx.fillRect(0,0,w,h);ctx.textAlign='center';ctx.fillStyle='white';ctx.font='900 44px system-ui';ctx.fillText('PAUSED',w/2,h/2);}
requestAnimationFrame(draw);}requestAnimationFrame(draw);
