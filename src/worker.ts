/// <reference types="@cloudflare/workers-types" />
// Backend único de EMDR Prisma: Worker de Cloudflare + Durable Object por sala.
// Sirve la app React compilada (dist/) y las rutas /api/*.
// Modo demostración: cualquiera puede crear salas; no usar con datos clínicos reales.
import { DurableObject } from 'cloudflare:workers';
import { cleanSettings, safeParse, DEFAULT_SETTINGS } from './validation';
import type { SessionSettings } from './types';

interface Env {
  ROOMS: DurableObjectNamespace<SessionRoom>;
  ASSETS: Fetcher;
  ALLOWED_ORIGIN?: string;
  DEV_LOCAL_ORIGIN?: string;
}

interface RoomMeta {
  roomId: string;
  clinicianHash: string;
  patientHash: string;
  expiresAt: number;
  settings: SessionSettings;
  running: boolean;
  revision: number;
  lastHeartbeat: number;
}

type Role = 'therapist' | 'patient';

const ROOM_TTL = 2 * 60 * 60 * 1000;
const HEARTBEAT_CHECK = 7000;
const HEARTBEAT_TIMEOUT = 15000;
// Un cliente envía latidos cada 4 s; sin mensajes en este plazo se considera desconectado.
const PEER_STALE_MS = 15000;
const ROOM_ID = /^[a-f0-9-]{36}$/;
const TOKEN = /^[a-f0-9]{64}$/;
const encoder = new TextEncoder();

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
  });

const hex = (bytes: ArrayBuffer | Uint8Array) =>
  Array.from(new Uint8Array(bytes), (x) => x.toString(16).padStart(2, '0')).join('');
const newToken = () => hex(crypto.getRandomValues(new Uint8Array(32)));
const digest = async (value: string) => hex(await crypto.subtle.digest('SHA-256', encoder.encode(value)));

function timingSafeEqual(a: unknown, b: unknown): boolean {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function originAllowed(request: Request, env: Env): boolean {
  const origin = request.headers.get('Origin');
  if (!origin) return true;
  const site = new URL(request.url).origin;
  return (
    origin === site ||
    (Boolean(env.ALLOWED_ORIGIN) && origin === env.ALLOWED_ORIGIN) ||
    (env.DEV_LOCAL_ORIGIN === 'true' && /^http:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin))
  );
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/api/health') return json({ ok: true, service: 'EMDR Prisma Rooms' });

    if (url.pathname === '/api/rooms' && request.method === 'POST') {
      if (!originAllowed(request, env)) return json({ error: 'Origen no autorizado' }, 403);
      const roomId = crypto.randomUUID();
      const clinicianToken = newToken();
      const patientToken = newToken();
      const expiresAt = Date.now() + ROOM_TTL;
      const result = await env.ROOMS.getByName(roomId).fetch('https://internal/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roomId,
          clinicianHash: await digest(clinicianToken),
          patientHash: await digest(patientToken),
          expiresAt
        })
      });
      if (!result.ok) return json({ error: 'No se pudo crear la sala' }, 500);
      return json({ roomId, clinicianToken, patientToken, expiresAt }, 201);
    }

    const match = url.pathname.match(/^\/api\/rooms\/([a-f0-9-]{36})\/ws$/);
    if (match && request.method === 'GET') {
      if (!originAllowed(request, env)) return json({ error: 'Origen no autorizado' }, 403);
      if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
        return json({ error: 'Se requiere WebSocket' }, 426);
      }
      const role = url.searchParams.get('role');
      const credential = url.searchParams.get('token');
      if ((role !== 'therapist' && role !== 'patient') || !credential || !TOKEN.test(credential)) {
        return json({ error: 'Acceso inválido' }, 401);
      }
      const headers = new Headers(request.headers);
      headers.set('X-Role', role);
      headers.set('X-Credential-Hash', await digest(credential));
      url.searchParams.delete('token');
      return env.ROOMS.getByName(match[1]).fetch(new Request(url.toString(), { method: 'GET', headers }));
    }

    if (url.pathname.startsWith('/api/')) return json({ error: 'No encontrado' }, 404);
    return env.ASSETS.fetch(request);
  }
} satisfies ExportedHandler<Env>;

export class SessionRoom extends DurableObject<Env> {
  private async meta(): Promise<RoomMeta | undefined> {
    return this.ctx.storage.get<RoomMeta>('meta');
  }

  private attachment(ws: WebSocket): { role?: Role; lastSeen?: number } {
    return (ws.deserializeAttachment() as { role?: Role; lastSeen?: number } | null) ?? {};
  }

  private roleOf(ws: WebSocket): Role | undefined {
    return this.attachment(ws).role;
  }

  private isStale(ws: WebSocket): boolean {
    const seen = this.attachment(ws).lastSeen ?? 0;
    return Date.now() - seen > PEER_STALE_MS;
  }

  private has(role: Role, except?: WebSocket): boolean {
    return this.ctx.getWebSockets().some((ws) => ws !== except && this.roleOf(ws) === role && !this.isStale(ws));
  }

  /** Cierra conexiones que dejaron de responder (red caída sin cierre) y avisa del cambio. */
  private async pruneStale() {
    const stale = this.ctx.getWebSockets().filter((ws) => this.isStale(ws));
    if (!stale.length) return;
    for (const ws of stale) {
      await this.disconnected(ws);
      try {
        ws.close(4008, 'Sin respuesta');
      } catch {
        /* ya cerrada */
      }
    }
  }

  private send(ws: WebSocket, payload: Record<string, unknown>) {
    try {
      ws.send(JSON.stringify(payload));
    } catch {
      /* socket cerrado */
    }
  }

  private broadcast(payload: Record<string, unknown>) {
    for (const ws of this.ctx.getWebSockets()) this.send(ws, payload);
  }

  private presence(except?: WebSocket) {
    this.broadcast({ type: 'presence', therapist: this.has('therapist', except), patient: this.has('patient', except) });
  }

  private snapshot(ws: WebSocket, meta: RoomMeta) {
    this.send(ws, {
      type: 'snapshot',
      running: meta.running,
      settings: meta.settings,
      revision: meta.revision,
      expiresAt: meta.expiresAt,
      serverNow: Date.now()
    });
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/init' && request.method === 'POST') {
      if (await this.meta()) return json({ error: 'Sala existente' }, 409);
      const body = (await request.json()) as Partial<RoomMeta>;
      if (
        typeof body.roomId !== 'string' ||
        !ROOM_ID.test(body.roomId) ||
        typeof body.clinicianHash !== 'string' ||
        typeof body.patientHash !== 'string' ||
        typeof body.expiresAt !== 'number'
      ) {
        return json({ error: 'Datos inválidos' }, 400);
      }
      const meta: RoomMeta = {
        roomId: body.roomId,
        clinicianHash: body.clinicianHash,
        patientHash: body.patientHash,
        expiresAt: body.expiresAt,
        settings: { ...DEFAULT_SETTINGS },
        running: false,
        revision: 0,
        lastHeartbeat: 0
      };
      await this.ctx.storage.put('meta', meta);
      await this.ctx.storage.setAlarm(meta.expiresAt);
      return json({ ok: true });
    }

    const meta = await this.meta();
    if (!meta || Date.now() > meta.expiresAt) return json({ error: 'Sala inexistente o caducada' }, 410);

    const role = request.headers.get('X-Role') as Role;
    const hash = request.headers.get('X-Credential-Hash');
    if (!timingSafeEqual(hash, role === 'therapist' ? meta.clinicianHash : meta.patientHash)) {
      return json({ error: 'Acceso denegado' }, 403);
    }

    // Una sola conexión por rol: la nueva reemplaza a la anterior (recargas, cambio de red).
    for (const old of this.ctx.getWebSockets()) {
      if (this.roleOf(old) === role) {
        try {
          old.close(4009, 'Reemplazada por una nueva conexión');
        } catch {
          /* ya cerrada */
        }
      }
    }

    const pair = new WebSocketPair();
    const [client, server] = [pair[0], pair[1]];
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ role, lastSeen: Date.now() });
    this.snapshot(server, meta);
    this.presence();
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer) {
    let data: Record<string, unknown>;
    try {
      data = safeParse<Record<string, unknown>>(typeof raw === 'string' ? raw : new TextDecoder().decode(raw));
    } catch {
      return this.send(ws, { type: 'error', message: 'Mensaje inválido' });
    }

    const role = this.roleOf(ws);
    ws.serializeAttachment({ role, lastSeen: Date.now() });
    await this.pruneStale();
    const meta = await this.meta();
    if (!meta || Date.now() > meta.expiresAt) {
      ws.close(4001, 'Sala caducada');
      return;
    }

    switch (data.type) {
      case 'ping':
        this.send(ws, { type: 'pong', clientSent: data.clientSent, serverNow: Date.now() });
        // El ping del profesional sirve de latido: si deja de llegar, la estimulación se pausa.
        if (role === 'therapist' && meta.running) {
          meta.lastHeartbeat = Date.now();
          await this.ctx.storage.put('meta', meta);
        }
        return;
      case 'presence':
        this.send(ws, { type: 'presence', therapist: this.has('therapist'), patient: this.has('patient') });
        return;
      case 'sync-request':
        this.snapshot(ws, meta);
        return;
      case 'stop':
        meta.running = false;
        meta.revision++;
        await this.ctx.storage.put('meta', meta);
        this.broadcast({ type: 'stop', reason: role, revision: meta.revision, serverNow: Date.now() });
        return;
    }

    if (role !== 'therapist') {
      return this.send(ws, { type: 'error', message: 'Sin permiso' });
    }

    if (data.type === 'settings') {
      try {
        meta.settings = { ...meta.settings, ...cleanSettings(data.settings as Record<string, unknown>) };
      } catch {
        return this.send(ws, { type: 'error', message: 'Parámetros inválidos' });
      }
      meta.revision++;
      await this.ctx.storage.put('meta', meta);
      this.broadcast({ type: 'settings', settings: meta.settings, revision: meta.revision, serverNow: Date.now() });
      return;
    }

    if (data.type === 'start' || data.type === 'pause') {
      meta.running = data.type === 'start';
      meta.lastHeartbeat = Date.now();
      meta.revision++;
      await this.ctx.storage.put('meta', meta);
      this.broadcast({ type: data.type, revision: meta.revision, serverNow: Date.now() });
      await this.ctx.storage.setAlarm(meta.running ? Date.now() + HEARTBEAT_CHECK : meta.expiresAt);
      return;
    }

    this.send(ws, { type: 'error', message: 'Comando desconocido' });
  }

  private async disconnected(ws: WebSocket) {
    const role = this.roleOf(ws);
    const meta = await this.meta();
    // Solo pausar si se fue el profesional y no hay otra conexión suya (p. ej. recarga).
    if (meta?.running && role === 'therapist' && !this.has('therapist', ws)) {
      meta.running = false;
      meta.revision++;
      await this.ctx.storage.put('meta', meta);
      this.broadcast({ type: 'pause', reason: 'therapist_disconnected', revision: meta.revision, serverNow: Date.now() });
    }
    this.presence(ws);
  }

  async webSocketClose(ws: WebSocket) {
    await this.disconnected(ws);
    try {
      ws.close();
    } catch {
      /* ya cerrada */
    }
  }

  async webSocketError(ws: WebSocket) {
    await this.disconnected(ws);
  }

  async alarm() {
    const meta = await this.meta();
    if (!meta) return;
    if (Date.now() >= meta.expiresAt) {
      this.broadcast({ type: 'stop', reason: 'room_expired' });
      for (const ws of this.ctx.getWebSockets()) ws.close(4001, 'Sala caducada');
      await this.ctx.storage.deleteAll();
      return;
    }
    if (meta.running) {
      if (Date.now() - meta.lastHeartbeat > HEARTBEAT_TIMEOUT) {
        meta.running = false;
        meta.revision++;
        await this.ctx.storage.put('meta', meta);
        this.broadcast({ type: 'pause', reason: 'heartbeat_timeout', revision: meta.revision });
      } else {
        await this.ctx.storage.setAlarm(Date.now() + HEARTBEAT_CHECK);
        return;
      }
    }
    await this.ctx.storage.setAlarm(meta.expiresAt);
  }
}
