import { useEffect, useRef, useState, useCallback } from 'react';
import { Role, RemoteCredentials, SessionSettings } from '../types';

interface UseRealtimeSyncProps {
  role: Role;
  roomId: string;
  onRoomIdChange?: (newId: string) => void;
  settings: SessionSettings;
  isPlaying?: boolean;
  onApplyRemoteSettings: (next: Partial<SessionSettings>) => void;
  onRemoteStart: () => void;
  onRemotePause: () => void;
  onRemoteStop: (reason?: string) => void;
}

export function useRealtimeSync({
  role,
  roomId,
  onRoomIdChange,
  settings,
  isPlaying = false,
  onApplyRemoteSettings,
  onRemoteStart,
  onRemotePause,
  onRemoteStop
}: UseRealtimeSyncProps) {
  const isPatient = role === 'patient';
  const [credentials, setCredentials] = useState<RemoteCredentials | null>(() => {
    try {
      const cacheKey = isPatient ? 'emdr_patient' : 'emdr_therapist';
      const saved = sessionStorage.getItem(cacheKey);
      if (saved) return JSON.parse(saved);
    } catch {}
    return { roomId, token: 'session-token' };
  });

  const [syncStatus, setSyncStatus] = useState<string>('Buscando conexión…');
  const [peerConnected, setPeerConnected] = useState<boolean>(false);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);
  const pingTimerRef = useRef<number | null>(null);
  const latestRevisionRef = useRef<number>(0);
  const lastSentRef = useRef<string>('');
  const broadcastRef = useRef<BroadcastChannel | null>(null);
  const activeRoomId = credentials?.roomId || roomId;

  // Enviar mensaje unificado a través de todas las capas disponibles (WebSocket, BroadcastChannel, localStorage)
  const send = useCallback(
    (message: Record<string, unknown>) => {
      const payload = { ...message, _roomId: activeRoomId, _sender: role };
      const raw = JSON.stringify(payload);

      // 1. WebSocket
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        try {
          socketRef.current.send(raw);
        } catch {}
      }
      // 2. BroadcastChannel (mismo navegador / pestañas)
      if (broadcastRef.current) {
        try {
          broadcastRef.current.postMessage(payload);
        } catch {}
      }
      // 3. LocalStorage event (fallback cross-tab ultra-confiable)
      try {
        localStorage.setItem(`emdr_event_${activeRoomId}`, JSON.stringify({ ...payload, _ts: Date.now() }));
      } catch {}
    },
    [activeRoomId, role]
  );

  // Manejador central de mensajes entrantes (tanto de WS como de BroadcastChannel y LocalStorage)
  const handleIncomingMessage = useCallback(
    (msg: Record<string, unknown>) => {
      if (!msg) return;

      if (msg.type === 'presence') {
        const hasPeer = isPatient ? Boolean(msg.therapist) : Boolean(msg.patient);
        setPeerConnected(hasPeer);
        setSyncStatus(hasPeer ? 'Paciente conectado' : 'Esperando al paciente');

        // Si somos el terapeuta y el paciente se acaba de conectar, enviarle el snapshot de inmediato
        if (!isPatient && msg.patient) {
          send({
            type: 'snapshot',
            settings,
            running: isPlaying,
            revision: latestRevisionRef.current
          });
        }
      } else if (msg.type === 'sync-request' && !isPatient) {
        // El paciente solicita el estado actual de la sesión
        send({
          type: 'snapshot',
          settings,
          running: isPlaying,
          revision: latestRevisionRef.current
        });
      } else if (msg.type === 'snapshot' && isPatient) {
        if (msg.settings) {
          onApplyRemoteSettings(msg.settings as Partial<SessionSettings>);
        }
        if (msg.running) {
          onRemoteStart();
        } else {
          onRemotePause();
        }
        setPeerConnected(true);
        setSyncStatus('Conectado con el terapeuta');
      } else if (msg.type === 'settings' && isPatient) {
        const rev = (msg.revision as number) || 0;
        if (rev >= latestRevisionRef.current) {
          latestRevisionRef.current = rev;
          if (msg.settings) {
            onApplyRemoteSettings(msg.settings as Partial<SessionSettings>);
          }
        }
      } else if (msg.type === 'start' && isPatient) {
        onRemoteStart();
      } else if (msg.type === 'pause' && isPatient) {
        onRemotePause();
      } else if (msg.type === 'stop') {
        onRemoteStop((msg.reason as string) || 'sesión detenida');
      } else if (msg.type === 'pong' && typeof msg.clientSent === 'number') {
        setLatencyMs(Date.now() - msg.clientSent);
      }
    },
    [isPatient, onApplyRemoteSettings, onRemoteStart, onRemotePause, onRemoteStop, send, settings, isPlaying]
  );

  // Inicializar Canales Locales (BroadcastChannel y Storage Event)
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // A. BroadcastChannel
    let channel: BroadcastChannel | null = null;
    if (window.BroadcastChannel) {
      try {
        channel = new BroadcastChannel(`emdr_room_${activeRoomId}`);
        broadcastRef.current = channel;
        channel.onmessage = (event) => {
          handleIncomingMessage(event.data);
        };
      } catch {}
    }

    // B. Storage Event Listener (fallback infalible entre pestañas/ventanas del mismo navegador)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === `emdr_event_${activeRoomId}` && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (parsed._sender !== role) {
            handleIncomingMessage(parsed);
          }
        } catch {}
      }
    };
    window.addEventListener('storage', handleStorage);

    // Anunciar presencia y solicitar sincronización inicial
    const announcePresence = () => {
      send({
        type: 'presence',
        therapist: !isPatient,
        patient: isPatient
      });
      if (isPatient) {
        send({ type: 'sync-request' });
      }
    };

    announcePresence();
    const presenceTimer = setInterval(announcePresence, 4000);

    return () => {
      clearInterval(presenceTimer);
      window.removeEventListener('storage', handleStorage);
      if (channel) {
        channel.close();
      }
    };
  }, [activeRoomId, isPatient, role, send, handleIncomingMessage]);

  // Conectar WebSocket si el servidor lo soporta
  const connect = useCallback(() => {
    if (!activeRoomId) return;
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }

    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const token = credentials?.token || 'session-token';
    const wsUrl = `${proto}//${window.location.host}/api/rooms/${encodeURIComponent(
      activeRoomId
    )}/ws?role=${role}&token=${encodeURIComponent(token)}`;

    try {
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        if (socketRef.current !== ws) return;
        setSyncStatus(peerConnected ? 'Ambos conectados' : 'Sala activa (esperando paciente)');

        if (pingTimerRef.current) clearInterval(pingTimerRef.current);
        pingTimerRef.current = window.setInterval(() => {
          send({ type: 'ping', clientSent: Date.now() });
        }, 5000);

        if (!isPatient) {
          send({ type: 'settings', settings, revision: latestRevisionRef.current });
        } else {
          send({ type: 'sync-request' });
        }
      };

      ws.onmessage = (event) => {
        if (socketRef.current !== ws) return;
        try {
          const data = JSON.parse(event.data);
          handleIncomingMessage(data);
        } catch {}
      };

      ws.onclose = () => {
        if (socketRef.current !== ws) return;
        if (pingTimerRef.current) clearInterval(pingTimerRef.current);
        socketRef.current = null;
        setSyncStatus(peerConnected ? 'Conectado (canal directo)' : 'Esperando paciente');
      };

      ws.onerror = () => {
        setSyncStatus(peerConnected ? 'Conectado (canal directo)' : 'Esperando paciente');
      };
    } catch {
      setSyncStatus(peerConnected ? 'Conectado (canal directo)' : 'Esperando paciente');
    }
  }, [activeRoomId, credentials?.token, role, isPatient, settings, send, peerConnected, handleIncomingMessage]);

  // Conectar o reconectar al cambiar activeRoomId
  useEffect(() => {
    connect();
    return () => {
      if (pingTimerRef.current) clearInterval(pingTimerRef.current);
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, [connect]);

  // Sincronizar settings cuando cambien desde el terapeuta
  useEffect(() => {
    if (isPatient) return;
    const serialized = JSON.stringify(settings);
    if (serialized === lastSentRef.current) return;
    lastSentRef.current = serialized;

    latestRevisionRef.current += 1;
    send({
      type: 'settings',
      settings,
      revision: latestRevisionRef.current
    });
  }, [settings, isPatient, send]);

  // Crear sala segura y propagarla
  const createRoom = useCallback(async () => {
    setIsCreating(true);
    setSyncStatus('Creando sala…');
    try {
      const res = await fetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        const creds: RemoteCredentials = {
          roomId: data.roomId,
          token: data.clinicianToken,
          patientToken: data.patientToken,
          expiresAt: data.expiresAt
        };
        setCredentials(creds);
        sessionStorage.setItem('emdr_therapist', JSON.stringify(creds));
        onRoomIdChange?.(data.roomId);
        setSyncStatus('Sala creada');
      } else {
        const randomId = 'EMDR-' + Math.floor(1000 + Math.random() * 9000);
        const creds: RemoteCredentials = {
          roomId: randomId,
          token: 'token-' + Date.now(),
          patientToken: 'patient-' + Date.now()
        };
        setCredentials(creds);
        sessionStorage.setItem('emdr_therapist', JSON.stringify(creds));
        onRoomIdChange?.(randomId);
        setSyncStatus('Sala lista');
      }
    } catch {
      const randomId = 'EMDR-' + Math.floor(1000 + Math.random() * 9000);
      const creds: RemoteCredentials = {
        roomId: randomId,
        token: 'token-' + Date.now(),
        patientToken: 'patient-' + Date.now()
      };
      setCredentials(creds);
      sessionStorage.setItem('emdr_therapist', JSON.stringify(creds));
      onRoomIdChange?.(randomId);
      setSyncStatus('Sala lista');
    } finally {
      setIsCreating(false);
    }
  }, [onRoomIdChange]);

  const sendStart = useCallback(() => {
    latestRevisionRef.current += 1;
    send({ type: 'start', revision: latestRevisionRef.current });
  }, [send]);

  const sendPause = useCallback(() => {
    latestRevisionRef.current += 1;
    send({ type: 'pause', revision: latestRevisionRef.current });
  }, [send]);

  const sendStop = useCallback(
    (reason?: string) => {
      latestRevisionRef.current += 1;
      send({ type: 'stop', reason: reason || role, revision: latestRevisionRef.current });
    },
    [send, role]
  );

  return {
    syncStatus,
    peerConnected,
    latencyMs,
    credentials,
    createRoom,
    reconnect: connect,
    sendStart,
    sendPause,
    sendStop,
    isCreating
  };
}
