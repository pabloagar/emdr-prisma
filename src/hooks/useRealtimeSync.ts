import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Role, RemoteCredentials, SessionSettings } from '../types';

interface UseRealtimeSyncProps {
  role: Role;
  settings: SessionSettings;
  onApplyRemoteSettings: (next: Partial<SessionSettings>) => void;
  onRemoteStart: () => void;
  onRemotePause: () => void;
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
          if (isPatient) h.onRemotePause();
          if (msg.reason === 'heartbeat_timeout' || msg.reason === 'therapist_disconnected') {
            setSyncStatus('Pausa automática: se perdió la conexión del terapeuta');
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

      ws.onopen = () => {
        attempt = 0;
        setSyncStatus(isPatient ? 'Esperando al terapeuta' : 'Sala activa · esperando al paciente');
        pingTimer = window.setInterval(() => send({ type: 'ping', clientSent: Date.now() }), 5000);
        send({ type: 'ping', clientSent: Date.now() });
        if (!isPatient) {
          // Al (re)conectar, el profesional publica su configuración actual.
          send({ type: 'settings', settings: settingsRef.current });
        }
      };

      ws.onmessage = (event) => {
        try {
          handleMessage(JSON.parse(event.data as string));
        } catch {
          /* mensaje no JSON */
        }
      };

      ws.onclose = (event) => {
        window.clearInterval(pingTimer);
        if (socketRef.current === ws) socketRef.current = null;
        setPeerConnected(false);
        if (disposed) return;
        if (event.code === 4009) {
          setSyncStatus('Sesión abierta en otra pestaña o dispositivo');
          return;
        }
        if (FATAL_CLOSE_CODES.has(event.code) || attempt >= RECONNECT_DELAYS.length) {
          setSyncStatus(
            isPatient
              ? 'No se pudo entrar a la sala. Pide un enlace nuevo al terapeuta.'
              : 'Sala no disponible. Crea una sala nueva.'
          );
          return;
        }
        retryTimer = window.setTimeout(open, RECONNECT_DELAYS[attempt++]);
      };
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
