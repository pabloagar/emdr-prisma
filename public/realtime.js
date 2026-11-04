(() => {
  'use strict';
  const engine=window.EMDRPrismaEngine;
  if(!engine) return;
  const query=new URLSearchParams(location.search);
  const patient=query.get('role')==='patient';
  const fragment=new URLSearchParams(location.hash.slice(1));
  const cacheKey=patient?'emdr_patient':'emdr_therapist';
  const saved=JSON.parse(sessionStorage.getItem(cacheKey)||'null');
  let credentials=fragment.has('room') ? {roomId:fragment.get('room'),token:fragment.get(patient?'patient':'therapist')} : saved;
  if(fragment.has('room')) {
    if(credentials?.roomId && credentials?.token) sessionStorage.setItem(cacheKey,JSON.stringify(credentials));
    history.replaceState(null,'',location.pathname+location.search);
  }
  window.EMDRRemoteEnabled=Boolean(credentials?.roomId);
  window.EMDRPeerConnected=false;
  let socket=null, latestRevision=-1, lastPeer=false, reconnectTimer=null, pingTimer=null, closed=false, remoteApplying=false, lastSent='';
  const style=document.createElement('style');
  style.textContent=`#emdr-remote{position:fixed;right:18px;bottom:85px;z-index:9999;max-width:min(355px,calc(100vw - 32px));background:#fff;color:#17231d;border:1px solid #dce3dc;border-radius:14px;box-shadow:0 8px 32px #0002;padding:14px;font:13px Inter,Arial,sans-serif}#emdr-remote button{background:#1b3b2b;color:white;padding:9px 12px;border-radius:9px;margin:4px 3px;cursor:pointer}#emdr-remote button.secondary{background:#e8f0eb;color:#1b3b2b}#emdr-remote input{border:1px solid #bfc8bf;border-radius:8px;padding:8px;width:100%;margin:6px 0}#emdr-patient-controls{position:fixed;z-index:9999;left:50%;bottom:22px;transform:translateX(-50%);display:flex;align-items:center;gap:10px;padding:10px 14px;border-radius:16px;background:#182d26e8;color:white;font:13px Inter,Arial,sans-serif;box-shadow:0 8px 30px #0003}#emdr-patient-controls button{background:#fff;color:#1b3b2b;padding:10px 14px;border-radius:9px;font-weight:bold}#emdr-patient-controls button.stop{background:#a42b32;color:#fff}#emdr-disconnected{position:fixed;inset:0;display:none;place-items:center;z-index:10000;background:#17231deb;color:white;text-align:center;padding:20px;font:20px Inter,Arial,sans-serif}#emdr-disconnected button{background:white;color:#17231d;border-radius:8px;padding:12px;margin-top:18px}#emdr-remote small{display:block;line-height:1.4;color:#5b6960;margin:6px 0}`;
  document.head.append(style);
  const elt=(tag,attrs={},text='')=>{const e=document.createElement(tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));e.textContent=text;return e;};
  let status, createButton, connectButton;
  const pageBase=location.origin+location.pathname;
  function updateStatus(text,ok=false){if(status)status.textContent=text; const badge=document.getElementById('patient-sync-status');if(badge)badge.textContent=text; const dot=document.getElementById('sync-status-dot');if(dot){dot.className=`w-2 h-2 rounded-full ${ok?'bg-emerald-500':'bg-amber-500'}`;}const latency=document.getElementById('ws-latency-badge');if(latency)latency.textContent='';}
  function pauseLocal(reason){engine.stop();if(reason)updateStatus(reason);}
  function showLost(reason){pauseLocal(reason);if(patient){document.getElementById('emdr-disconnected').style.display='grid';}}
  function buildUI(){
    if(patient){
      const bar=elt('div',{id:'emdr-patient-controls'});
      status=elt('span',{},'Sin conexión');
      const audio=elt('button',{},'Activar sonido');audio.onclick=()=>{engine.enableAudio();audio.textContent='Sonido habilitado';};
      const stop=elt('button',{class:'stop'},'DETENER');stop.onclick=()=>{pauseLocal('Detenido por paciente');send({type:'stop'});};
      bar.append(status,audio,stop);document.body.append(bar);
      const lost=elt('div',{id:'emdr-disconnected'});
      const inside=elt('div');inside.append(elt('strong',{},'Sesión en pausa'));
      inside.append(elt('p',{},'No se ha confirmado una conexión activa. Los estímulos están detenidos.'));
      const close=elt('button',{},'Cerrar aviso');close.onclick=()=>lost.style.display='none';inside.append(close);lost.append(inside);document.body.append(lost);
    }else{
      const panel=elt('section',{id:'emdr-remote','aria-label':'Sala remota EMDR Prisma'});
      panel.append(elt('strong',{},'EMDR Prisma · Sala remota'));
      status=elt('div',{style:'margin:8px 0;color:#5b6960'},'Sin conexión');panel.append(status);
      createButton=elt('button',{},'Crear sala segura');createButton.onclick=createRoom;panel.append(createButton);
      connectButton=elt('button',{class:'secondary'},'Reconectar');connectButton.onclick=connect;panel.append(connectButton);
      const copy=elt('button',{class:'secondary'},'Copiar enlace paciente');copy.onclick=copyPatientLink;panel.append(copy);
      panel.append(elt('small',{},'Sala temporal (2 horas). Comparte el enlace solo por un canal privado. No se almacenan notas clínicas.'));
      document.body.append(panel);
      const oldCopy=document.getElementById('btn-copy-patient-link');if(oldCopy)oldCopy.onclick=e=>{e.preventDefault();copyPatientLink();};
    }
  }
  function patientLink(){if(!credentials?.patientToken)return null;return `${pageBase}?role=patient#room=${encodeURIComponent(credentials.roomId)}&patient=${encodeURIComponent(credentials.patientToken)}`;}
  async function copyPatientLink(){const url=patientLink();if(!url)return updateStatus('Primero crea una sala');try{await navigator.clipboard.writeText(url);updateStatus('Enlace del paciente copiado',true);}catch{window.prompt('Copia este enlace privado',url);}}
  async function createRoom(){
    createButton.disabled=true;updateStatus('Creando sala…');
    try{
      const res=await fetch('/api/rooms',{method:'POST',headers:{'Content-Type':'application/json'}});
      const data=await res.json();if(!res.ok)throw Error(data.error||'Error HTTP '+res.status);
      credentials={roomId:data.roomId,token:data.clinicianToken,patientToken:data.patientToken};
      window.EMDRRemoteEnabled=true;
      sessionStorage.setItem(cacheKey,JSON.stringify(credentials));
      connect();
      await copyPatientLink();
    }catch(error){updateStatus('Error: '+error.message);}finally{createButton.disabled=false;}
  }
  function wsUrl(){if(!credentials?.roomId||!credentials?.token)return null;const proto=location.protocol==='https:'?'wss:':'ws:';const u=new URL(`/api/rooms/${encodeURIComponent(credentials.roomId)}/ws`,location.origin);u.protocol=proto;u.searchParams.set('role',patient?'patient':'therapist');u.searchParams.set('token',credentials.token);return u.toString();}
  function send(message){if(socket?.readyState===WebSocket.OPEN)socket.send(JSON.stringify(message));}
  function connect(){
    if(!credentials?.roomId||!credentials?.token){updateStatus('No hay una sala autorizada');return;}
    closed=false;clearTimeout(reconnectTimer);
    if(socket){const previous=socket;socket=null;previous.onclose=null;previous.close();}
    const url=wsUrl();if(!url)return;
    updateStatus('Conectando…');
    const ws=new WebSocket(url);socket=ws;
    ws.onopen=()=>{if(socket!==ws)return;updateStatus('Conectado',true);pingTimer && clearInterval(pingTimer);pingTimer=setInterval(()=>send({type:'ping',clientSent:Date.now()}),5000);if(!patient)sendSettings(true);};
    ws.onmessage=event=>{if(socket!==ws)return;let msg;try{msg=JSON.parse(event.data);}catch{return;}handle(msg);};
    ws.onclose=event=>{if(socket!==ws)return;clearInterval(pingTimer);socket=null;window.EMDRPeerConnected=false;showLost(event.code===4001?'Sala caducada':'Conexión perdida: sesión detenida');if(!closed&&event.code!==4001)reconnectTimer=setTimeout(connect,4000);};
    ws.onerror=()=>updateStatus('Error de conexión');
  }
  function handle(message){
    if(message.type==='snapshot'){
      latestRevision=message.revision;
      if(patient){remoteApplying=true;try{engine.applySettings(message.settings);engine.stop();}finally{remoteApplying=false;}updateStatus('Conectado · en pausa',true);}
      else {if(message.settings && !lastSent)lastSent=JSON.stringify(message.settings);}
      return;
    }
    if(message.type==='presence'){lastPeer=Boolean(patient?message.therapist:message.patient);window.EMDRPeerConnected=lastPeer;if(!lastPeer&&patient)showLost('Profesional desconectado');else updateStatus(lastPeer?'Ambos conectados':'Esperando a la otra persona',lastPeer);return;}
    if(message.type==='settings'&&patient&&message.revision>latestRevision){latestRevision=message.revision;remoteApplying=true;try{engine.applySettings(message.settings);}finally{remoteApplying=false;}return;}
    if(message.type==='start'&&patient&&message.revision>latestRevision){latestRevision=message.revision;document.getElementById('emdr-disconnected').style.display='none';engine.start();return;}
    if((message.type==='pause'||message.type==='stop')&&patient){latestRevision=Math.max(latestRevision,message.revision||0);pauseLocal('Estímulos en pausa');return;}
    if(message.type==='stop'&&!patient){pauseLocal('Paciente detuvo la sesión');return;}
    if(message.type==='pong'){const rtt=Date.now()-message.clientSent;const badge=document.getElementById('ws-latency-badge');if(badge)badge.textContent=`~${rtt}ms`;return;}
    if(message.type==='error')updateStatus(message.message||'Error del servidor');
  }
  let scheduled=false;
  function sendSettings(force=false){
    if(patient||remoteApplying)return;
    const current=engine.settings(), serialized=JSON.stringify(current);
    if(!force&&serialized===lastSent)return;
    lastSent=serialized;send({type:'settings',settings:current});
  }
  buildUI();
  if(credentials?.roomId&&credentials?.token)connect();
  else if(patient)showLost('Enlace de paciente incompleto');
  window.addEventListener('emdr:settings-changed',()=>{if(scheduled)return;scheduled=true;setTimeout(()=>{scheduled=false;sendSettings();},120);});
  window.addEventListener('emdr:action',event=>{if(!patient)send({type:event.detail});});
  window.addEventListener('pagehide',()=>{closed=true;send({type:'pause'});socket?.close();});
  document.addEventListener('visibilitychange',()=>{if(patient&&document.hidden){engine.stop();send({type:'stop'});}});
})();
