import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Role, RemoteCredentials, SessionSettings } from '../types';

interface UseRealtimeSyncProps {
  role: Role;
  settings: SessionSettings;
  /** Solo profesional: si está estimulando, se publica al (re)conectar para que el paciente entre sincronizado. */
  isPlaying?: boolean;
  onApplyRemoteSettings: (next: Partial<SessionSettings>) => void;
  onRemoteStart: () => void;
  onRemotePause: (reason?: string) => void;
  onRemoteStop: (reason?: string) => void;
}

const STORAGE_KEY: Record<Role, string> = { therapist: 'emdr_therapist', patient: 'emdr_patient' };
const RECONNECT_DELAYS = [1000, 2000, 4000, 8000, 15000];
// Cierres en los que reintentar no sirve: la sala caducó o la credencial no vale.
const FATAL_CLOSE_CODES = new Set([4001]);

/**
 * Credenciales iniciales.
 * - Paciente: del enlace `?role=patient#room=<id>&patient=<token>` (el token va en el
 *   fragmento para que no llegue a logs del servidor) o de la sesión del navegador.
 * - Profesional: solo de la sesión del navegador; si no hay, debe crear una sala.
 */
function readInitialCredentials(role: Role): RemoteCredentials | null {
  if (typeof window === 'undefined') return null;
  if (role === 'patient') {
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const query = new URLSearchParams(window.location.search);
    const roomId = hash.get('room') || query.get('room');
    const token = hash.get('patient') || query.get('token');
    if (roomId && token) {
      const creds = { roomId, token };
      try {
        sessionStorage.setItem(STORAGE_KEY.patient, JSON.stringify(creds));
        // Quitar el token de la barra de direcciones tras leerlo.
        history.replaceState(null, '', `${window.location.pathname}?role=patient`);
      } catch {
        /* sin almacenamiento */
      }
      return creds;
    }
  }
  try {
    const saved = sessionStorage.getItem(STORAGE_KEY[role]);
    if (saved) {
      const parsed = JSON.parse(saved) as RemoteCredentials;
      if (parsed.roomId && parsed.token && (!parsed.expiresAt || parsed.expiresAt > Date.now())) return parsed;
    }
  } catch {
    /* sin almacenamiento */
  }
  return null;
}

export function useRealtimeSync({
  role,
  settings,
  isPlaying = false,
  onApplyRemoteSettings,
  onRemoteStart,
  onRemotePause,
  onRemoteStop
}: UseRealtimeSyncProps) {
  const isPatient = role === 'patient';
  const [credentials, setCredentials] = useState<RemoteCredentials | null>(() => readInitialCredentials(role));
  const [syncStatus, setSyncStatus] = useState<string>(
    isPatient ? 'Conectando con el terapeuta…' : 'Sin sala remota'
  );
  const [peerConnected, setPeerConnected] = useState(false);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [connectNonce, setConnectNonce] = useState(0);

  // Refs para leer el estado más reciente sin volver a abrir el WebSocket en cada cambio.
  const settingsRef = useRef(settings);
  const isPlayingRef = useRef(isPlaying);
  isPlayingRef.current = isPlaying;
  const handlersRef = useRef({ onApplyRemoteSettings, onRemoteStart, onRemotePause, onRemoteStop });
  settingsRef.current = settings;
  handlersRef.current = { onApplyRemoteSettings, onRemoteStart, onRemotePause, onRemoteStop };

  const socketRef = useRef<WebSocket | null>(null);
  const latestRevisionRef = useRef(0);

  const send = useCallback((message: Record<string, unknown>) => {
    const ws = socketRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return false;
    try {
      ws.send(JSON.stringify(message));
      return true;
    } catch {
      return false;
    }
  }, []);

  const handleMessage = useCallback(
    (msg: Record<string, unknown>) => {
      const h = handlersRef.current;
      switch (msg.type) {
        case 'presence': {
          const hasPeer = isPatient ? Boolean(msg.therapist) : Boolean(msg.patient);
          setPeerConnected(hasPeer);
          if (isPatient) setSyncStatus(hasPeer ? 'Conectado con el terapeuta' : 'Esperando al terapeuta');
          else setSyncStatus(hasPeer ? 'Paciente conectado' : 'Sala activa · esperando al paciente');
          break;
        }
        case 'snapshot':
        case 'settings': {
          const rev = typeof msg.revision === 'number' ? msg.revision : 0;
          if (rev > latestRevisionRef.current) latestRevisionRef.current = rev;
          // El profesional es la fuente de verdad de la configuración.
          if (isPatient && msg.settings) h.onApplyRemoteSettings(msg.settings as Partial<SessionSettings>);
          if (isPatient && msg.type === 'snapshot') {
            if (msg.running) h.onRemoteStart();
            else h.onRemotePause();
          }
          break;
        }
        case 'start':
          if (isPatient) h.onRemoteStart();
          break;
        case 'pause':
          if (msg.reason === 'heartbeat_timeout' || msg.reason === 'therapist_disconnected') {
            if (isPatient) h.onRemotePause('disconnected');
            setSyncStatus('Pausa automática: se perdió la conexión del terapeuta');
          } else if (isPatient) {
            h.onRemotePause();
          }
          break;
        case 'stop':
          h.onRemoteStop(typeof msg.reason === 'string' ? msg.reason : 'sesión detenida');
          if (msg.reason === 'room_expired') setSyncStatus('La sala caducó');
          break;
        case 'pong':
          if (typeof msg.clientSent === 'number') setLatencyMs(Date.now() - msg.clientSent);
          break;
        case 'error':
          if (typeof msg.message === 'string') setSyncStatus(msg.message);
          break;
      }
    },
    [isPatient]
  );

  // Conexión WebSocket con reintentos. Solo depende de la sala y del rol.
  useEffect(() => {
    if (!credentials?.roomId || !credentials.token) {
      setPeerConnected(false);
      return;
    }
    let disposed = false;
    let attempt = 0;
    let retryTimer: number | undefined;
    let pingTimer: number | undefined;

    const open = () => {
      if (disposed) return;
      setSyncStatus(attempt === 0 ? 'Conectando…' : 'Reconectando…');
      const url = new URL(`/api/rooms/${encodeURIComponent(credentials.roomId)}/ws`, window.location.origin);
      url.protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      url.searchParams.set('role', role);
      url.searchParams.set('token', credentials.token);

      const ws = new WebSocket(url);
      socketRef.current = ws;
      let lastHeardAt = Date.now();
      let dropped = false;
      // Si la conexión no se abre en 8 s (red caída), se descarta y se reintenta.
      const connectTimer = window.setTimeout(() => {
        if (ws.readyState === WebSocket.CONNECTING) {
          onDropped(1006);
          try {
            ws.close();
          } catch {
            /* nada que cerrar */
          }
        }
      }, 8000);

      // Conexión perdida (cierre normal o detectado por el vigilante).
      const onDropped = (code: number) => {
        if (dropped) return;
        dropped = true;
        window.clearTimeout(connectTimer);
        window.clearInterval(pingTimer);
        if (socketRef.current === ws) socketRef.current = null;
        setPeerConnected(false);
        if (disposed) return;
        // Seguridad: si el paciente pierde su propia conexión, detiene suavemente el estímulo.
        if (isPatient) handlersRef.current.onRemotePause('disconnected');
        if (code === 4009) {
          setSyncStatus('Sesión abierta en otra pestaña o dispositivo');
          return;
        }
        if (FATAL_CLOSE_CODES.has(code)) {
          setSyncStatus(isPatient ? 'La sala caducó. Pide un enlace nuevo al terapeuta.' : 'La sala caducó. Crea una sala nueva.');
          return;
        }
        if (attempt >= RECONNECT_DELAYS.length) {
          setSyncStatus(
            isPatient
              ? 'Sin conexión con la sala. Reintentando… (si persiste, pide un enlace nuevo)'
              : 'Sin conexión con la sala. Reintentando… (si persiste, crea una sala nueva)'
          );
        }
        // Reintentos indefinidos con espera creciente (máximo 15 s).
        const delay = RECONNECT_DELAYS[Math.min(attempt, RECONNECT_DELAYS.length - 1)];
        attempt++;
        retryTimer = window.setTimeout(open, delay);
      };

      ws.onopen = () => {
        window.clearTimeout(connectTimer);
        attempt = 0;
        setSyncStatus(isPatient ? 'Esperando al terapeuta' : 'Sala activa · esperando al paciente');
        lastHeardAt = Date.now();
        pingTimer = window.setInterval(() => {
          // Vigilante: una red caída no siempre cierra el WebSocket; sin respuesta en 12 s se da por perdida.
          if (Date.now() - lastHeardAt > 12000) {
            onDropped(1006);
            try {
              ws.close();
            } catch {
              /* ya cerrada */
            }
            return;
          }
          send({ type: 'ping', clientSent: Date.now() });
          // Resincroniza la presencia por si se perdió algún aviso.
          send({ type: 'presence' });
        }, 4000);
        send({ type: 'ping', clientSent: Date.now() });
        if (!isPatient) {
          // Al (re)conectar, el profesional publica su configuración actual.
          send({ type: 'settings', settings: settingsRef.current });
          if (isPlayingRef.current) send({ type: 'start' });
        }
      };

      ws.onmessage = (event) => {
        lastHeardAt = Date.now();
        try {
          handleMessage(JSON.parse(event.data as string));
        } catch {
          /* mensaje no JSON */
        }
      };

      ws.onclose = (event) => onDropped(event.code);
    };

    open();
    return () => {
      disposed = true;
      window.clearTimeout(retryTimer);
      window.clearInterval(pingTimer);
      socketRef.current?.close(1000, 'cierre local');
      socketRef.current = null;
    };
  }, [credentials?.roomId, credentials?.token, role, isPatient, send, handleMessage, connectNonce]);

  // El profesional envía cada cambio de configuración.
  const lastSentRef = useRef('');
  useEffect(() => {
    if (isPatient) return;
    const serialized = JSON.stringify(settings);
    if (serialized === lastSentRef.current) return;
    if (send({ type: 'settings', settings })) lastSentRef.current = serialized;
  }, [settings, isPatient, send]);

  const createRoom = useCallback(async () => {
    setIsCreating(true);
    setSyncStatus('Creando sala…');
    try {
      const res = await fetch('/api/rooms', { method: 'POST', headers: { 'Content-Type': 'application/json' } });
      const data = res.ok
        ? ((await res.json().catch(() => null)) as Partial<RemoteCredentials & { clinicianToken: string }> | null)
        : null;
      if (!data?.roomId || !data?.clinicianToken || !data?.patientToken) {
        // No se inventa una sala local: sin servidor, el paciente no podría entrar.
        throw new Error(`HTTP ${res.status}`);
      }
      const creds: RemoteCredentials = {
        roomId: data.roomId,
        token: data.clinicianToken,
        patientToken: data.patientToken,
        expiresAt: data.expiresAt
      };
      try {
        sessionStorage.setItem(STORAGE_KEY.therapist, JSON.stringify(creds));
      } catch {
        /* sin almacenamiento */
      }
      latestRevisionRef.current = 0;
      lastSentRef.current = '';
      setCredentials(creds);
    } catch {
      setSyncStatus('No se pudo crear la sala: el servidor de salas no responde');
    } finally {
      setIsCreating(false);
    }
  }, []);

  const patientLink = useMemo(() => {
    if (isPatient || !credentials?.patientToken || typeof window === 'undefined') return null;
    return `${window.location.origin}/?role=patient#room=${encodeURIComponent(
      credentials.roomId
    )}&patient=${encodeURIComponent(credentials.patientToken)}`;
  }, [isPatient, credentials]);

  const reconnect = useCallback(() => setConnectNonce((n) => n + 1), []);
  const sendStart = useCallback(() => send({ type: 'start' }), [send]);
  const sendPause = useCallback(() => send({ type: 'pause' }), [send]);
  const sendStop = useCallback((reason?: string) => send({ type: 'stop', reason: reason || role }), [send, role]);

  return {
    syncStatus,
    peerConnected,
    latencyMs,
    credentials,
    patientLink,
    createRoom,
    reconnect,
    sendStart,
    sendPause,
    sendStop,
    isCreating
  };
}
