import assert from 'node:assert/strict';
const base=process.argv[2] || process.env.EMDR_BASE_URL || 'http://127.0.0.1:8791';
const peers=[];
async function peer(role, room){
  const url=new URL(`/api/rooms/${room.roomId}/ws`,base);
  url.protocol=url.protocol==='https:'?'wss:':'ws:';
  url.searchParams.set('role',role);
  url.searchParams.set('token',role==='therapist'?room.clinicianToken:room.patientToken);
  const ws=new WebSocket(url), messages=[];
  ws.addEventListener('message',e=>messages.push(JSON.parse(e.data)));
  await new Promise((resolve,reject)=>{
    const t=setTimeout(()=>reject(Error('WebSocket open timeout')),10000);
    ws.addEventListener('open',()=>{clearTimeout(t);resolve();},{once:true});
    ws.addEventListener('error',()=>{clearTimeout(t);reject(Error('WebSocket handshake failed'));},{once:true});
  });
  const p={ws,messages,send:data=>ws.send(JSON.stringify(data))};peers.push(p);return p;
}
async function wait(p,predicate){
  const end=Date.now()+10000;
  while(Date.now()<end){const i=p.messages.findIndex(predicate);if(i>=0)return p.messages.splice(i,1)[0];await new Promise(r=>setTimeout(r,25));}
  throw Error('Expected protocol message not received');
}
try{
  for(const path of ['/','/realtime.js','/api/health']){
    const r=await fetch(new URL(path,base));assert.equal(r.status,200);await r.text();console.log('PASS GET',path);
  }
  const res=await fetch(new URL('/api/rooms',base),{method:'POST'});assert.equal(res.status,201);const room=await res.json();console.log('PASS create demo room');
  const therapist=await peer('therapist',room);await wait(therapist,m=>m.type==='snapshot');
  const patient=await peer('patient',room);await wait(patient,m=>m.type==='snapshot');
  await wait(therapist,m=>m.type==='presence'&&m.therapist&&m.patient);console.log('PASS both roles connected');
  patient.send({type:'start'});await wait(patient,m=>m.type==='error'&&m.message==='Sin permiso');console.log('PASS patient cannot start');
  therapist.send({type:'settings',settings:{level:5,soundActive:false}});await wait(patient,m=>m.type==='settings'&&m.settings.level===5);console.log('PASS settings broadcast');
  therapist.send({type:'start'});await wait(patient,m=>m.type==='start');
  therapist.send({type:'pause'});await wait(patient,m=>m.type==='pause');console.log('PASS start and pause');
  therapist.send({type:'start'});await wait(patient,m=>m.type==='start');
  patient.send({type:'stop'});await wait(therapist,m=>m.type==='stop'&&m.reason==='patient');console.log('PASS patient stop');
  therapist.send({type:'start'});await wait(patient,m=>m.type==='start');
  therapist.ws.close();await wait(patient,m=>m.type==='pause'&&m.reason==='therapist_disconnected');console.log('PASS pause on therapist disconnect');
}catch(e){console.error('FAIL',e.message);process.exitCode=1;}
finally{for(const p of peers)p.ws.close();}
