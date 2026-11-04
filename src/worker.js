import { DurableObject } from 'cloudflare:workers';
import { cleanSettings, safeParse, DEFAULT_SETTINGS } from './validation.mjs';
const HOURS = 2 * 60 * 60 * 1000;
const encoder = new TextEncoder();
const json = (data, status=200, headers={}) => new Response(JSON.stringify(data), {status, headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...headers}});
const token = () => Array.from(crypto.getRandomValues(new Uint8Array(32)), x => x.toString(16).padStart(2,'0')).join('');
async function digest(value) { return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',encoder.encode(value))), x=>x.toString(16).padStart(2,'0')).join(''); }
const equal = (a,b) => { if(typeof a!=='string'||typeof b!=='string'||a.length!==b.length)return false; let x=0; for(let i=0;i<a.length;i++)x |= a.charCodeAt(i)^b.charCodeAt(i); return x===0; };
const originAllowed = (request, env) => { const origin=request.headers.get('Origin'); if(!origin)return true; const site=new URL(request.url).origin; return origin===site || (env.ALLOWED_ORIGIN && origin===env.ALLOWED_ORIGIN) || (/^http:\/\/localhost:\d+$/.test(origin) && env.DEV_LOCAL_ORIGIN === 'true'); };
export default {
 async fetch(request, env) {
   const url=new URL(request.url);
   if(url.pathname==='/api/health')return json({ok:true, service:'EMDR Prisma Rooms'});
   if(url.pathname==='/api/rooms' && request.method==='POST'){
     if(!originAllowed(request,env))return json({error:'Origen no autorizado'},403);
     // Demo-only mode: create capability-based rooms without a shared creation secret.
     // Do not use this endpoint for clinical deployment or public unrestricted access.

     const roomId=crypto.randomUUID(), clinicianToken=token(), patientToken=token();
     const room=env.ROOMS.getByName(roomId);
     const result=await room.fetch('https://internal/init',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({roomId, clinicianHash:await digest(clinicianToken),patientHash:await digest(patientToken),expiresAt:Date.now()+HOURS})});
     if(!result.ok)return json({error:'No se pudo crear sala'},500);
     return json({roomId,clinicianToken,patientToken,expiresAt:Date.now()+HOURS},201);
   }
   const m=url.pathname.match(/^\/api\/rooms\/([a-f0-9-]{36})\/ws$/);
   if(m && request.method==='GET'){
     if(!originAllowed(request,env))return json({error:'Origen no autorizado'},403);
     if(request.headers.get('Upgrade')?.toLowerCase()!=='websocket')return json({error:'Se requiere WebSocket'},426);
     const role=url.searchParams.get('role'), credential=url.searchParams.get('token');
     if(!['therapist','patient'].includes(role)||!credential || !/^[a-f0-9]{64}$/.test(credential))return json({error:'Acceso inválido'},401);
     const verified=await digest(credential);
     url.searchParams.delete('token');
     const headers=new Headers(request.headers);headers.set('X-Role',role);headers.set('X-Credential-Hash',verified);
     return env.ROOMS.getByName(m[1]).fetch(new Request(url.toString(),{method:'GET',headers}));
   }
   if(url.pathname.startsWith('/api/'))return json({error:'No encontrado'},404);
   return env.ASSETS.fetch(request);
 }
};
export class SessionRoom extends DurableObject {
 async metadata(){return await this.ctx.storage.get('meta');}
 send(ws,payload){try{ws.send(JSON.stringify(payload));}catch{}}
 broadcast(payload){for(const ws of this.ctx.getWebSockets())this.send(ws,payload);}
 async fetch(request){
   const url=new URL(request.url);
   if(url.pathname==='/init'&&request.method==='POST'){
     // Durable Object stub is not publicly routed. Initialization happens only through the Worker.

     if(await this.metadata())return json({error:'Sala existente'},409);
     const body=await request.json();
     if(!/^[a-f0-9-]{36}$/.test(body.roomId) || typeof body.clinicianHash!=='string' || typeof body.patientHash!=='string' || typeof body.expiresAt!=='number')return json({error:'Datos inválidos'},400);
     await this.ctx.storage.put('meta',{...body,settings:DEFAULT_SETTINGS,running:false,revision:0,lastHeartbeat:0});
     await this.ctx.storage.setAlarm(body.expiresAt);
     return json({ok:true});
   }
   const meta=await this.metadata();
   if(!meta||Date.now()>meta.expiresAt)return json({error:'Sala caducada'},410);
   const role=request.headers.get('X-Role');
   const hash=request.headers.get('X-Credential-Hash');
   if(!equal(hash,role==='therapist'?meta.clinicianHash:meta.patientHash))return json({error:'Acceso denegado'},403);
   if(role==='therapist'&&this.ctx.getWebSockets().some(ws=>ws.deserializeAttachment()?.role==='therapist'))return json({error:'Ya hay un profesional conectado'},409);
   if(role==='patient'&&this.ctx.getWebSockets().some(ws=>ws.deserializeAttachment()?.role==='patient'))return json({error:'Ya hay un paciente conectado'},409);
   const [client,server]=Object.values(new WebSocketPair());
   this.ctx.acceptWebSocket(server);
   server.serializeAttachment({role});
   this.send(server,{type:'snapshot',running:false,settings:meta.settings,revision:meta.revision,expiresAt:meta.expiresAt,serverNow:Date.now(),peerConnected:this.ctx.getWebSockets().some(ws=>ws!==server)});
   this.broadcast({type:'presence',therapist:this.ctx.getWebSockets().some(ws=>ws.deserializeAttachment()?.role==='therapist'),patient:this.ctx.getWebSockets().some(ws=>ws.deserializeAttachment()?.role==='patient')});
   return new Response(null,{status:101,webSocket:client});
 }
 async webSocketMessage(ws,msg){
   let data;try{data=safeParse(msg)}catch{return this.send(ws,{type:'error',message:'Mensaje inválido'});}
   const role=ws.deserializeAttachment()?.role, meta=await this.metadata();
   if(!meta||Date.now()>meta.expiresAt){ws.close(4001,'Sala caducada');return;}
   if(data.type==='ping'){this.send(ws,{type:'pong',clientSent:data.clientSent,serverNow:Date.now()});return;}
   if(role!=='therapist'){if(data.type==='stop'){this.broadcast({type:'stop',reason:'patient',revision:meta.revision+1,serverNow:Date.now()});await this.ctx.storage.put('meta',{...meta,running:false,revision:meta.revision+1});}else this.send(ws,{type:'error',message:'Sin permiso'});return;}
   if(data.type==='heartbeat'){meta.lastHeartbeat=Date.now();await this.ctx.storage.put('meta',meta);return;}
   if(data.type==='settings'){
     try{meta.settings={...meta.settings,...cleanSettings(data.settings)};}catch{return this.send(ws,{type:'error',message:'Parámetros inválidos'});}
     meta.revision++; await this.ctx.storage.put('meta',meta);
     this.broadcast({type:'settings',settings:meta.settings,revision:meta.revision,serverNow:Date.now()});return;
   }
   if(data.type==='start' || data.type==='pause'){
     if(data.type==='start'&&!this.ctx.getWebSockets().some(s=>s.deserializeAttachment()?.role==='patient'))return this.send(ws,{type:'error',message:'El paciente no está conectado'});
     meta.running=data.type==='start';meta.lastHeartbeat=Date.now();meta.revision++;
     await this.ctx.storage.put('meta',meta);
     this.broadcast({type:meta.running?'start':'pause',revision:meta.revision,serverNow:Date.now()});
     await this.ctx.storage.setAlarm(meta.running ? Date.now()+7000 : meta.expiresAt);return;
   }
   this.send(ws,{type:'error',message:'Comando desconocido'});
 }
 async disconnected(ws){
   const role=ws.deserializeAttachment()?.role;
   const meta=await this.metadata();
   if(meta?.running && role==='therapist'){
     meta.running=false;meta.revision++;await this.ctx.storage.put('meta',meta);
     this.broadcast({type:'pause',reason:'therapist_disconnected',revision:meta.revision,serverNow:Date.now()});
   }
   this.broadcast({type:'presence',therapist:this.ctx.getWebSockets().some(s=>s!==ws&&s.deserializeAttachment()?.role==='therapist'),patient:this.ctx.getWebSockets().some(s=>s!==ws&&s.deserializeAttachment()?.role==='patient')});
 }
 async webSocketClose(ws){await this.disconnected(ws);try{ws.close();}catch{}}
 async webSocketError(ws){await this.disconnected(ws);try{ws.close();}catch{}}
 async alarm(){
   const meta=await this.metadata();if(!meta)return;
   if(Date.now()>=meta.expiresAt){this.broadcast({type:'stop',reason:'room_expired'});for(const ws of this.ctx.getWebSockets())ws.close(4001,'Sala caducada');await this.ctx.storage.deleteAll();return;}
   if(meta.running){if(Date.now()-meta.lastHeartbeat>15000){meta.running=false;meta.revision++;await this.ctx.storage.put('meta',meta);this.broadcast({type:'pause',reason:'heartbeat_timeout',revision:meta.revision});}else{await this.ctx.storage.setAlarm(Date.now()+7000);return;}}
   await this.ctx.storage.setAlarm(meta.expiresAt);
 }
}
