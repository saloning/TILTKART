const canvas=document.getElementById('game'),ctx=canvas.getContext('2d');
const $=id=>document.getElementById(id);
let players={},race=null,phase='lobby',started=0,connections=new Map(),peer=null,roomCode='',pausedAt=0;
const colors=['#ff637d','#53c9ff','#ffe06b','#a993ff','#6ff0b2','#ff9f57','#ff70d7','#f0f0f0'];
const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ';
const makeCode=()=>Array.from({length:4},()=>alphabet[Math.floor(Math.random()*alphabet.length)]).join('');
const safeName=s=>String(s||'Racer').trim().slice(0,16)||'Racer';
const blankInput=()=>({steer:0,gas:false,brake:false,boost:false});
// Generate a closed, smooth stadium circuit with different bends each round.
function track(){
 const count=12, anchors=[],rotation=Math.random()*Math.PI*2;
 for(let i=0;i<count;i++){
  const t=i/count*Math.PI*2+rotation;
  const radius=760+(Math.random()-.5)*260;
  anchors.push({x:Math.cos(t)*radius*1.23,y:Math.sin(t)*radius*.85});
 }
 const pts=[];
 for(let i=0;i<count;i++)for(let j=0;j<30;j++){
  const t=j/30,p0=anchors[(i-1+count)%count],p1=anchors[i],p2=anchors[(i+1)%count],p3=anchors[(i+2)%count];
  const calc=k=>.5*((2*p1[k])+(-p0[k]+p2[k])*t+(2*p0[k]-5*p1[k]+4*p2[k]-p3[k])*t*t+(-p0[k]+3*p1[k]-3*p2[k]+p3[k])*t*t*t);
  pts.push({x:calc('x'),y:calc('y')});
 }
 let length=0;const cumulative=[0];
 for(let i=0;i<pts.length;i++){const a=pts[i],b=pts[(i+1)%pts.length];length+=Math.hypot(a.x-b.x,a.y-b.y);cumulative.push(length);}
 return {nodes:pts,cumulative,lapLength:length,length:length*3,laps:3};
}
function pointAt(distance){
 if(!race)return {x:0,y:0,tx:0,ty:-1,nx:1,ny:0};
 const len=race.lapLength,d=((distance%len)+len)%len,cs=race.cumulative,pts=race.nodes;
 let lo=0,hi=pts.length-1;
 while(lo<hi){const m=(lo+hi+1)>>1;if(cs[m]<=d)lo=m;else hi=m-1;}
 const a=pts[lo],b=pts[(lo+1)%pts.length],seg=cs[lo+1]-cs[lo]||1,t=(d-cs[lo])/seg;
 const tx=(b.x-a.x)/seg,ty=(b.y-a.y)/seg;
 return {x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t,tx,ty,nx:-ty,ny:tx};
}
function state(){return {type:'state',players,phase,race,started};}
function broadcast(msg){for(const c of connections.values())if(c.open)try{c.send(msg)}catch(e){console.warn(e)}}
function resetTrack(){race=track();phase='lobby';started=0;pausedAt=0;$('pause').hidden=true;$('pause').textContent='⏸ PAUSE';for(const p of Object.values(players))Object.assign(p,{progress:0,lane:0,speed:0,heading:0,impact:0,boosting:false,finished:false,finishTime:null,input:blankInput()});broadcast(state());update();}
function hostRoom(){if(peer){peer.destroy();peer=null;}roomCode=makeCode();$('roomCode').textContent=roomCode;$('networkHelp').textContent='Connecting room…';peer=new Peer('tiltkart-'+roomCode.toLowerCase(),{debug:1});peer.on('open',()=>{$('networkHelp').textContent='Room ready! Keep this tab open. Share the address and code.';});peer.on('error',err=>{if(err.type==='unavailable-id'){hostRoom();return;}$('networkHelp').textContent='Connection error: '+err.type+' — refresh to retry.';});peer.on('connection',conn=>{conn.on('data',msg=>{if(!msg||typeof msg!=='object')return;if(msg.type==='join'){if(phase!=='lobby'||Object.keys(players).length>=8){conn.send({type:'joinError',message:'Race started or lobby full'});return;}if(players[conn.peer])return;const id=conn.peer;players[id]={id,name:safeName(msg.name),color:colors[Object.keys(players).length],progress:0,lane:0,speed:0,heading:0,impact:0,boosting:false,finished:false,finishTime:null,input:blankInput()};connections.set(id,conn);conn.send({type:'joined',name:players[id].name});broadcast(state());update();}else if(msg.type==='input'&&players[conn.peer]){const a=msg.input||{};players[conn.peer].input={steer:Math.max(-1,Math.min(1,Number(a.steer)||0)),gas:!!a.gas,brake:!!a.brake,boost:!!a.boost};}});conn.on('close',()=>{connections.delete(conn.peer);delete players[conn.peer];broadcast(state());update();});conn.on('error',()=>{});});}
$('joinAddress').textContent=new URL('./',location.href).href;
$('start').onclick=()=>{if(phase==='lobby'&&Object.keys(players).length){phase='racing';started=Date.now()+4000;$('pause').hidden=false;broadcast(state());update();}};
$('reset').onclick=resetTrack;
$('pause').onclick=()=>{if(phase==='racing'){phase='paused';pausedAt=Date.now();$('pause').textContent='▶ RESUME';}else if(phase==='paused'){started+=Date.now()-pausedAt;phase='racing';$('pause').textContent='⏸ PAUSE';}broadcast(state());update();};
function escapeHtml(s){return s.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function update(){if($('trackMapPanel'))$('trackMapPanel').hidden=phase==='lobby';
 $('joinPanel').hidden=phase!=='lobby';const arr=Object.values(players).sort((a,b)=>b.progress-a.progress);$('mapLegend').innerHTML=arr.map(p=>`<span><i class="dot" style="background:${p.color}"></i>${escapeHtml(p.name)}</span>`).join('');
 $('count').textContent=`${arr.length}/8`;$('players').innerHTML=arr.map(p=>`<div class="player"><span><i class="dot" style="background:${p.color}"></i>${escapeHtml(p.name)}</span><b>${p.finished?'🏁':'L'+Math.min(3,Math.floor(p.progress/race.lapLength)+1)+' · '+Math.round(p.progress/race.length*100)+'%'}</b></div>`).join('')||'No racers yet';const remain=Math.ceil((started-Date.now())/1000);$('status').textContent=phase==='lobby'?'Share link + code • Start when ready':phase==='finished'?'🏆 FINISH! '+(arr[0]?.name||''):phase==='paused'?'⏸ RACE PAUSED':remain>0?'STARTING IN '+remain:'🏎️ RACE IN PROGRESS';}
let last=performance.now();
const ROAD_LIMIT=108, CAR_RADIUS=17;
setInterval(()=>{
 const now=performance.now(),dt=Math.min(.05,(now-last)/1000);last=now;
 if(phase==='racing'&&Date.now()>=started){
  const racers=Object.values(players);
  for(const p of racers){
   if(p.finished)continue;
   const input=p.input;
   const boosting=!!(input.gas&&input.boost&&!input.brake);
   const target=input.brake?0:input.gas?(boosting?610:320):0;
   p.boosting=boosting;
   p.speed+=(target-p.speed)*Math.min(1,dt*(input.brake?8:boosting?6.5:input.gas?3.2:6));if(p.speed<1)p.speed=0;
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
   const aa=pointAt(a.progress),bb=pointAt(b.progress);const dx=(aa.x+aa.nx*a.lane)-(bb.x+bb.nx*b.lane),dy=(aa.y+aa.ny*a.lane)-(bb.y+bb.ny*b.lane);
   const dist=Math.hypot(dx,dy),minDist=CAR_RADIUS*2;
   if(dist>=minDist)continue;
   const nx=dist>.001?dx/dist:(i%2?1:-1),ny=dist>.001?dy/dist:0;
   const overlap=(minDist-dist)/2+0.15;
   a.lane+=((nx*aa.nx+ny*aa.ny)*overlap);b.lane-=((nx*bb.nx+ny*bb.ny)*overlap);
   a.progress=Math.max(0,a.progress+(nx*aa.tx+ny*aa.ty)*overlap);b.progress=Math.max(0,b.progress-(nx*bb.tx+ny*bb.ty)*overlap);
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
// The camera locks onto the racer with the highest progress; the minimap shows the whole loop.
function draw(){
 const rect=canvas.getBoundingClientRect(),dpr=Math.min(2,devicePixelRatio||1);
 if(canvas.width!==Math.floor(rect.width*dpr)||canvas.height!==Math.floor(rect.height*dpr)){canvas.width=Math.floor(rect.width*dpr);canvas.height=Math.floor(rect.height*dpr);}
 ctx.setTransform(dpr,0,0,dpr,0,0);const w=rect.width,h=rect.height;
 ctx.fillStyle='#202b3d';ctx.fillRect(0,0,w,h);
 const racers=Object.values(players),lead=Math.max(0,...racers.map(p=>p.progress));
 const focus=pointAt(lead),scale=Math.max(1.05,Math.min(2.15,w/345));
 const project=(x,y)=>({x:w*.5+(x-focus.x)*scale,y:h*.55-(y-focus.y)*scale});
 if(race){
  const nodes=race.nodes;
  // Stadium grandstands and safety barriers, traced around the complete circuit.
  function outline(offset,stroke,width){ctx.beginPath();for(let i=0;i<=nodes.length;i++){const d=race.cumulative[i],p=pointAt(d),q=project(p.x+p.nx*offset,p.y+p.ny*offset);if(!i)ctx.moveTo(q.x,q.y);else ctx.lineTo(q.x,q.y);}ctx.strokeStyle=stroke;ctx.lineWidth=width*scale;ctx.lineJoin='round';ctx.stroke();}
  for(const off of [-1,1]){
   outline(off*202,'#26354d',125);outline(off*183,'#55637c',62);outline(off*157,'#7c8ba0',20);
  }
  outline(0,'#cdd3e0',284);outline(0,'#dc6868',266);outline(0,'#343c53',224);
  outline(-108,'#f5eee2',3);outline(108,'#f5eee2',3);
  ctx.setLineDash([22*scale,24*scale]);outline(-52,'#ffffff70',2);outline(52,'#ffffff70',2);ctx.setLineDash([]);
  // Animated-looking fan stands on the outside of the track.
  const fanColors=['#f9d46b','#fa8197','#80d6f4','#f6f0dd','#bbadff','#a4f2ba'];
  for(let i=0;i<nodes.length;i+=2){const d=race.cumulative[i],p=pointAt(d);for(const side of [-1,1])for(let row=0;row<3;row++){
   const q=project(p.x+p.nx*side*(156+row*22),p.y+p.ny*side*(156+row*22));if(q.x<-10||q.x>w+10||q.y<-10||q.y>h+10)continue;
   ctx.beginPath();ctx.arc(q.x,q.y,Math.max(2,2.5*scale),0,Math.PI*2);ctx.fillStyle=fanColors[(i+row*13+(side+1)*3)%fanColors.length];ctx.fill();
  }}
  // Checkered start/finish stripe.
  const start=pointAt(0);for(let k=-6;k<6;k++){const p=project(start.x+start.nx*k*18,start.y+start.ny*k*18);ctx.fillStyle=k%2?'#fff':'#111';ctx.fillRect(p.x-8*scale,p.y-8*scale,16*scale,16*scale);}
 }
 for(const p of racers){const loc=pointAt(p.progress),pos=project(loc.x+loc.nx*p.lane,loc.y+loc.ny*p.lane);if(pos.x<-70||pos.x>w+70||pos.y<-70||pos.y>h+70)continue;
  ctx.save();ctx.translate(pos.x,pos.y);ctx.rotate(Math.atan2(-loc.ty,loc.tx)+Math.PI/2-(p.heading||0));
  if(p.boosting&&phase==='racing'&&Date.now()>=started&&!p.finished){const flame=20+Math.random()*20;ctx.fillStyle='#ff6a15';ctx.beginPath();ctx.moveTo(-10*scale,17*scale);ctx.lineTo(0,(26+flame)*scale);ctx.lineTo(10*scale,17*scale);ctx.fill();ctx.fillStyle='#ffeb68';ctx.beginPath();ctx.moveTo(-5*scale,18*scale);ctx.lineTo(0,(22+flame*.55)*scale);ctx.lineTo(5*scale,18*scale);ctx.fill();}
  ctx.fillStyle='#1119';ctx.fillRect(-15*scale,-19*scale,30*scale,42*scale);ctx.fillStyle=p.impact>0?'#ffffff':p.color;ctx.beginPath();ctx.roundRect(-13*scale,-23*scale,26*scale,43*scale,6*scale);ctx.fill();ctx.fillStyle='#16253e';ctx.fillRect(-9*scale,-9*scale,18*scale,13*scale);ctx.restore();
  ctx.font='bold 13px system-ui';ctx.textAlign='center';ctx.fillStyle='#fff';ctx.fillText(p.name,pos.x,pos.y-34*scale);
 }
 ctx.fillStyle='#0b1329dd';ctx.fillRect(12,h-62,Math.min(360,w-24),48);ctx.fillStyle='#fff';ctx.textAlign='left';ctx.font='bold 12px system-ui';ctx.fillText('3-LAP CIRCUIT  •  '+Math.round(lead/(race?.length||1)*100)+'% COMPLETE',25,h-33);
 if(phase==='racing'&&Date.now()<started){const left=started-Date.now(),lit=left>3000?0:left>2000?1:left>1000?2:3,cx=w/2,cy=h*.27;ctx.fillStyle='#101827e8';ctx.beginPath();ctx.roundRect(cx-108,cy-43,216,100,22);ctx.fill();for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(cx-65+i*65,cy,21,0,Math.PI*2);ctx.fillStyle=i<lit?'#ff4c3f':'#465064';ctx.fill();}ctx.font='900 19px system-ui';ctx.textAlign='center';ctx.fillStyle='white';ctx.fillText(lit===3?'GO!':'GET READY',cx,cy+42);}
 if(phase==='paused'){ctx.fillStyle='#101827bb';ctx.fillRect(0,0,w,h);ctx.textAlign='center';ctx.fillStyle='white';ctx.font='900 44px system-ui';ctx.fillText('PAUSED',w/2,h/2);}
 drawMap();requestAnimationFrame(draw);
}
function drawMap(){
 const wrap=$('trackMapPanel');if(!wrap||wrap.hidden||!race)return;
 const map=$('trackMap'),c=map.getContext('2d'),dpr=Math.min(2,devicePixelRatio||1),w=map.clientWidth,h=map.clientHeight;
 if(map.width!==Math.round(w*dpr)||map.height!==Math.round(h*dpr)){map.width=Math.round(w*dpr);map.height=Math.round(h*dpr);}
 c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,w,h);
 const nodes=race.nodes,minX=Math.min(...nodes.map(p=>p.x)),maxX=Math.max(...nodes.map(p=>p.x)),minY=Math.min(...nodes.map(p=>p.y)),maxY=Math.max(...nodes.map(p=>p.y));
 const sc=Math.min((w-32)/(maxX-minX+260),(h-32)/(maxY-minY+260));
 const xy=p=>({x:w/2+(p.x-(minX+maxX)/2)*sc,y:h/2-(p.y-(minY+maxY)/2)*sc});
 c.beginPath();nodes.forEach((p,i)=>{const q=xy(p);i?c.lineTo(q.x,q.y):c.moveTo(q.x,q.y)});c.closePath();c.strokeStyle='#66768f';c.lineWidth=12;c.lineJoin='round';c.stroke();c.strokeStyle='#e0e5ed';c.lineWidth=2;c.stroke();
 const st=xy(pointAt(0));c.fillStyle='#d6ff5c';c.fillRect(st.x-4,st.y-4,8,8);
 Object.values(players).forEach(p=>{const loc=pointAt(p.progress),q=xy({x:loc.x+loc.nx*p.lane,y:loc.y+loc.ny*p.lane});c.beginPath();c.arc(q.x,q.y,6,0,Math.PI*2);c.fillStyle=p.color;c.fill();c.strokeStyle='#111827';c.lineWidth=2;c.stroke();});
}
requestAnimationFrame(draw);
