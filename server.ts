import http from 'node:http';
import express, { Request, Response } from 'express';
import { WebSocketServer, WebSocket } from 'ws';
import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { cleanSettings, DEFAULT_SETTINGS, safeParse } from './src/validation';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ noServer: true });

interface RoomData {
  roomId: string;
  clinicianToken: string;
  patientToken: string;
  expiresAt: number;
  settings: typeof DEFAULT_SETTINGS;
  revision: number;
  running: boolean;
  therapistSocket: WebSocket | null;
  patientSocket: WebSocket | null;
  lastHeartbeat: number;
}

const rooms = new Map<string, RoomData>();

// Limpieza periódica de salas caducadas
setInterval(() => {
  const now = Date.now();
  for (const [id, room] of rooms.entries()) {
    if (now > room.expiresAt) {
      if (room.therapistSocket) room.therapistSocket.close(4001, 'Sala caducada');
      if (room.patientSocket) room.patientSocket.close(4001, 'Sala caducada');
      rooms.delete(id);
    }
  }
}, 60000);

// Health check
app.get('/api/health', (_req: Request, res: Response) => {
  res.json({ ok: true, service: 'EMDR Prisma Rooms' });
});

// Crear sala de sesión
app.post('/api/rooms', (_req: Request, res: Response) => {
  const roomId = crypto.randomUUID();
  const clinicianToken = crypto.randomBytes(32).toString('hex');
  const patientToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + 2 * 60 * 60 * 1000; // 2 horas

  rooms.set(roomId, {
    roomId,
    clinicianToken,
    patientToken,
    expiresAt,
    settings: { ...DEFAULT_SETTINGS },
    revision: 0,
    running: false,
    therapistSocket: null,
    patientSocket: null,
    lastHeartbeat: Date.now()
  });

  res.status(201).json({
    roomId,
    clinicianToken,
    patientToken,
    expiresAt
  });
});

// Broadcast helper
function broadcastRoom(room: RoomData, payload: Record<string, unknown>) {
  const msg = JSON.stringify(payload);
  if (room.therapistSocket && room.therapistSocket.readyState === WebSocket.OPEN) {
    room.therapistSocket.send(msg);
  }
  if (room.patientSocket && room.patientSocket.readyState === WebSocket.OPEN) {
    room.patientSocket.send(msg);
  }
}

// WebSocket Upgrade Handler
server.on('upgrade', (request, socket, head) => {
  const url = new URL(request.url || '', `http://${request.headers.host}`);
  const match = url.pathname.match(/^\/api\/rooms\/([a-zA-Z0-9-]+)\/ws$/);

  if (!match) {
    socket.destroy();
    return;
  }

  const roomId = match[1];
  const role = url.searchParams.get('role');
  const token = url.searchParams.get('token');

  // Si la sala no existe en memoria, creamos una de prueba automáticamente
  let room = rooms.get(roomId);
  if (!room) {
    room = {
      roomId,
      clinicianToken: token || 'clinician',
      patientToken: token || 'patient',
      expiresAt: Date.now() + 2 * 60 * 60 * 1000,
      settings: { ...DEFAULT_SETTINGS },
      revision: 0,
      running: false,
      therapistSocket: null,
      patientSocket: null,
      lastHeartbeat: Date.now()
    };
    rooms.set(roomId, room);
  }

  wss.handleUpgrade(request, socket, head, (ws) => {
    wss.emit('connection', ws, request, { room, role });
  });
});

// WebSocket Connection Logic
wss.on('connection', (ws: WebSocket, _req, extra: { room: RoomData; role: string | null }) => {
  const { room, role } = extra;
  const isTherapist = role === 'therapist';

  if (isTherapist) {
    if (room.therapistSocket && room.therapistSocket.readyState === WebSocket.OPEN) {
      room.therapistSocket.close(4009, 'Nueva conexión');
    }
    room.therapistSocket = ws;
  } else {
    if (room.patientSocket && room.patientSocket.readyState === WebSocket.OPEN) {
      room.patientSocket.close(4009, 'Nueva conexión');
    }
    room.patientSocket = ws;
  }

  // Enviar snapshot inicial
  ws.send(
    JSON.stringify({
      type: 'snapshot',
      running: room.running,
      settings: room.settings,
      revision: room.revision,
      expiresAt: room.expiresAt,
      serverNow: Date.now(),
      peerConnected: Boolean(isTherapist ? room.patientSocket : room.therapistSocket)
    })
  );

  // Anunciar presencia a ambos
  broadcastRoom(room, {
    type: 'presence',
    therapist: Boolean(room.therapistSocket && room.therapistSocket.readyState === WebSocket.OPEN),
    patient: Boolean(room.patientSocket && room.patientSocket.readyState === WebSocket.OPEN)
  });

  ws.on('message', (raw: Buffer | string) => {
    try {
      const data = safeParse<Record<string, unknown>>(raw.toString());

      if (data.type === 'ping') {
        ws.send(
          JSON.stringify({
            type: 'pong',
            clientSent: data.clientSent,
            serverNow: Date.now()
          })
        );
        return;
      }

      if (data.type === 'stop') {
        room.running = false;
        room.revision += 1;
        broadcastRoom(room, {
          type: 'stop',
          reason: isTherapist ? 'therapist' : 'patient',
          revision: room.revision,
          serverNow: Date.now()
        });
        return;
      }

      // Comandos que solo puede emitir el profesional
      if (!isTherapist) {
        ws.send(JSON.stringify({ type: 'error', message: 'Permiso denegado' }));
        return;
      }

      if (data.type === 'settings' && data.settings) {
        try {
          const cleaned = cleanSettings(data.settings as Record<string, unknown>);
          room.settings = { ...room.settings, ...cleaned };
          room.revision += 1;
          broadcastRoom(room, {
            type: 'settings',
            settings: room.settings,
            revision: room.revision,
            serverNow: Date.now()
          });
        } catch {
          ws.send(JSON.stringify({ type: 'error', message: 'Parámetros inválidos' }));
        }
        return;
      }

      if (data.type === 'start') {
        room.running = true;
        room.lastHeartbeat = Date.now();
        room.revision += 1;
        broadcastRoom(room, {
          type: 'start',
          revision: room.revision,
          serverNow: Date.now()
        });
        return;
      }

      if (data.type === 'pause') {
        room.running = false;
        room.revision += 1;
        broadcastRoom(room, {
          type: 'pause',
          revision: room.revision,
          serverNow: Date.now()
        });
        return;
      }
    } catch {
      ws.send(JSON.stringify({ type: 'error', message: 'Mensaje no procesable' }));
    }
  });

  const handleDisconnect = () => {
    if (isTherapist && room.therapistSocket === ws) {
      room.therapistSocket = null;
      if (room.running) {
        room.running = false;
        room.revision += 1;
        broadcastRoom(room, {
          type: 'pause',
          reason: 'therapist_disconnected',
          revision: room.revision,
          serverNow: Date.now()
        });
      }
    } else if (!isTherapist && room.patientSocket === ws) {
      room.patientSocket = null;
    }

    broadcastRoom(room, {
      type: 'presence',
      therapist: Boolean(room.therapistSocket && room.therapistSocket.readyState === WebSocket.OPEN),
      patient: Boolean(room.patientSocket && room.patientSocket.readyState === WebSocket.OPEN)
    });
  };

  ws.on('close', handleDisconnect);
  ws.on('error', handleDisconnect);
});

// Iniciar servidor Vite middleware o estático
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true, host: '0.0.0.0', port: 3000 },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;
  server.listen(PORT, '0.0.0.0', () => {
    console.log(`EMDR Prisma server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
