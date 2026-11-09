// Prueba del protocolo de salas con datos ficticios. No imprime tokens.
// Uso: node scripts/smoke.mjs [URL]   (por defecto http://127.0.0.1:8791)
import assert from 'node:assert/strict';

const base = process.argv[2] || process.env.EMDR_BASE_URL || 'http://127.0.0.1:8791';
const peers = [];

async function peer(role, room, token = role === 'therapist' ? room.clinicianToken : room.patientToken) {
  const url = new URL(`/api/rooms/${room.roomId}/ws`, base);
  url.protocol = url.protocol === 'https:' ? 'wss:' : 'ws:';
  url.searchParams.set('role', role);
  url.searchParams.set('token', token);
  const ws = new WebSocket(url);
  const messages = [];
  ws.addEventListener('message', (e) => messages.push(JSON.parse(e.data)));
  await new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(Error('WebSocket open timeout')), 10000);
    ws.addEventListener('open', () => { clearTimeout(t); resolve(); }, { once: true });
    ws.addEventListener('error', () => { clearTimeout(t); reject(Error('WebSocket handshake failed')); }, { once: true });
  });
  const p = { ws, messages, send: (data) => ws.send(JSON.stringify(data)) };
  peers.push(p);
  return p;
}

async function wait(p, predicate, label) {
  const end = Date.now() + 10000;
  while (Date.now() < end) {
    const i = p.messages.findIndex(predicate);
    if (i >= 0) return p.messages.splice(i, 1)[0];
    await new Promise((r) => setTimeout(r, 25));
  }
  throw Error(`No llegó el mensaje esperado: ${label}`);
}

const pass = (msg) => console.log('PASS', msg);

try {
  for (const path of ['/', '/?role=patient']) {
    const r = await fetch(new URL(path, base));
    assert.equal(r.status, 200);
    assert.match(await r.text(), /<div id="root"/);
    pass(`GET ${path} sirve la app React`);
  }
  const health = await fetch(new URL('/api/health', base));
  assert.equal(health.status, 200);
  assert.equal((await health.json()).ok, true);
  pass('GET /api/health responde JSON del Worker (no el HTML de la app)');

  const res = await fetch(new URL('/api/rooms', base), { method: 'POST' });
  assert.equal(res.status, 201);
  const room = await res.json();
  assert.match(room.roomId, /^[a-f0-9-]{36}$/);
  assert.match(room.patientToken, /^[a-f0-9]{64}$/);
  pass('POST /api/rooms crea una sala real');

  // Un token inventado no debe entrar.
  await assert.rejects(peer('patient', room, 'f'.repeat(64)));
  pass('token falso rechazado');

  const therapist = await peer('therapist', room);
  await wait(therapist, (m) => m.type === 'snapshot', 'snapshot profesional');
  // Mensajes que envía el cliente React al conectar no deben producir errores.
  therapist.send({ type: 'ping', clientSent: Date.now() });
  await wait(therapist, (m) => m.type === 'pong', 'pong');

  const patient = await peer('patient', room);
  await wait(patient, (m) => m.type === 'snapshot', 'snapshot paciente');
  await wait(therapist, (m) => m.type === 'presence' && m.therapist && m.patient, 'presencia de ambos');
  pass('profesional y paciente conectados a la misma sala');

  patient.send({ type: 'sync-request' });
  await wait(patient, (m) => m.type === 'snapshot', 'snapshot tras sync-request');
  patient.send({ type: 'start' });
  await wait(patient, (m) => m.type === 'error' && m.message === 'Sin permiso', 'error de permiso');
  pass('el paciente no puede iniciar');

  therapist.send({ type: 'settings', settings: { level: 5, trajectory: 'zigzag', stimulus: 'led-bar' } });
  await wait(patient, (m) => m.type === 'settings' && m.settings.level === 5 && m.settings.trajectory === 'zigzag', 'settings');
  pass('configuración (incluye trayectorias nuevas) llega al paciente');

  therapist.send({ type: 'start' });
  await wait(patient, (m) => m.type === 'start', 'start');
  therapist.send({ type: 'pause' });
  await wait(patient, (m) => m.type === 'pause', 'pause');
  pass('inicio y pausa');

  therapist.send({ type: 'start' });
  await wait(patient, (m) => m.type === 'start', 'start 2');
  patient.send({ type: 'stop' });
  await wait(therapist, (m) => m.type === 'stop' && m.reason === 'patient', 'stop del paciente');
  pass('parada de emergencia del paciente');

  therapist.send({ type: 'start' });
  await wait(patient, (m) => m.type === 'start', 'start 3');
  therapist.ws.close();
  await wait(patient, (m) => m.type === 'pause' && m.reason === 'therapist_disconnected', 'pausa por desconexión');
  pass('pausa al desconectarse el profesional');

  // Reconexión del profesional (recarga de página) con la misma credencial.
  const therapist2 = await peer('therapist', room);
  await wait(therapist2, (m) => m.type === 'snapshot', 'snapshot reconexión');
  await wait(patient, (m) => m.type === 'presence' && m.therapist, 'presencia tras reconexión');
  pass('el profesional puede reconectarse a su sala');
} catch (e) {
  console.error('FAIL', e.message);
  process.exitCode = 1;
} finally {
  for (const p of peers) p.ws.close();
}
