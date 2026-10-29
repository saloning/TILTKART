import express from 'express';
import {createServer} from 'node:http';
import {Server} from 'socket.io';
import os from 'node:os';
const app=express(),server=createServer(app),io=new Server(server);app.use(express.static('public'));
const port=Number(process.env.PORT)||3000;
const interfaces=Object.values(os.networkInterfaces()).flat().filter(Boolean);
const candidates=interfaces.filter(x=>x.family==='IPv4'&&!x.internal);
const preferred=candidates.find(x=>/^192\.168\.|^10\.|^172\.(1[6-9]|2[0-9]|3[01])\./.test(x.address));
const ip=(preferred||candidates[0])?.address||'localhost';
const base=(process.env.PUBLIC_URL||`http://${ip}:${port}`).replace(/\/$/,'');
const joinUrl=`${base}/controller.html`;
const alphabet='ABCDEFGHJKLMNPQRSTUVWXYZ';
const makeCode=()=>Array.from({length:4},()=>alphabet[Math.floor(Math.random()*alphabet.length)]).join('');
let roomCode=makeCode();
app.get('/config',(req,res)=>{const origin=process.env.PUBLIC_URL||`${req.protocol}://${req.get('host')}`;res.set('Cache-Control','no-store').json({joinUrl:`${origin.replace(/\/$/,'')}/controller.html`,roomCode});});
let players={},race=null,phase='lobby',started=0;
const colors=['#ff637d','#53c9ff','#ffe06b','#a993ff','#6ff0b2','#ff9f57','#ff70d7','#f0f0f0'];
function track(){const seed=Math.random()*10000;const nodes=[];for(let i=0;i<120;i++){const t=i/119;nodes.push({x:Math.sin(t*11+seed)*145+Math.sin(t*24+seed*.7)*38,y:t*6200});}return nodes;}
function reset(){roomCode=makeCode();race={nodes:track(),length:6200,seed:Math.random()};phase='lobby';started=0;for(const p of Object.values(players)){p.progress=0;p.lane=0;p.speed=0;p.finished=false;p.finishTime=null;p.input={steer:0,gas:false,brake:false,boost:false};}io.emit('state',{players,phase,race,started,roomCode});}
reset();
io.on('connection',socket=>{socket.on('join',data=>{const name=typeof data==='object'?data?.name:data;const code=typeof data==='object'?String(data?.code||'').trim().toUpperCase():'';if(code!==roomCode){socket.emit('joinError','Incorrect room code. Check the laptop screen.');return;}if(phase!=='lobby'||Object.keys(players).length>=8){socket.emit('joinError','Race already started or lobby full');return;}const id=socket.id;players[id]={id,name:String(name||'Racer').trim().slice(0,16)||'Racer',color:colors[Object.keys(players).length],progress:0,lane:0,speed:0,finished:false,finishTime:null,input:{steer:0,gas:false,brake:false,boost:false}};socket.emit('joined',{id});io.emit('state',{players,phase,race,started,roomCode});});socket.on('input',input=>{if(players[socket.id])players[socket.id].input={steer:Math.max(-1,Math.min(1,Number(input.steer)||0)),gas:!!input.gas,brake:!!input.brake,boost:!!input.boost};});socket.on('hostStart',()=>{if(phase==='lobby'&&Object.keys(players).length){phase='racing';started=Date.now()+3500;io.emit('state',{players,phase,race,started,roomCode});}});socket.on('hostReset',reset);socket.on('disconnect',()=>{delete players[socket.id];io.emit('state',{players,phase,race,started,roomCode});});});
let last=Date.now();setInterval(()=>{const now=Date.now(),dt=Math.min(.05,(now-last)/1000);last=now;if(phase==='racing'&&now>=started){for(const p of Object.values(players)){if(p.finished)continue;const input=p.input;const target=input.brake?65:input.gas?(input.boost?440:330):135;p.speed+=(target-p.speed)*Math.min(1,dt*(input.brake?4:1.5));p.lane+=input.steer*dt*(105+p.speed*.22);p.lane=Math.max(-150,Math.min(150,p.lane));if(Math.abs(p.lane)>103)p.speed=Math.min(p.speed,120);p.progress+=p.speed*dt;if(p.progress>=race.length){p.progress=race.length;p.finished=true;p.finishTime=(now-started)/1000;}}if(Object.values(players).length&&Object.values(players).every(p=>p.finished))phase='finished';}io.emit('tick',{players,phase,started});},50);
server.listen(port,'0.0.0.0',()=>console.log(`HOST http://localhost:${port}\nPHONES ${joinUrl}`));
