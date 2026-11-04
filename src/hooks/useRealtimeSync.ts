import { useEffect, useRef, useState, useCallback } from 'react';
import { Role, RemoteCredentials, SessionSettings } from '../types';

interface UseRealtimeSyncProps {
  role: Role;
  roomId: string;
  settings: SessionSettings;
  onApplyRemoteSettings: (next: Partial<SessionSettings>) => void;
  onRemoteStart: () => void;
  onRemotePause: () => void;
  onRemoteStop: (reason?: string) => void;
}

export function useRealtimeSync({
  role,
  roomId,
  settings,
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
    return { roomId, token: 'local-token' };
  });

  const [syncStatus, setSyncStatus] = useState<string>('Sin conexión');
  const [peerConnected, setPeerConnected] = useState<boolean>(false);
  const [latencyMs, setLatencyMs] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);
  const pingTimerRef = useRef<number | null>(null);
  const latestRevisionRef = useRef<number>(0);
  const lastSentRef = useRef<string>('');
  const broadcastRef = useRef<BroadcastChannel | null>(null);

  // Inicializar BroadcastChannel para sincronización inter-pestañas instantánea
  useEffect(() => {
    if (typeof window === 'undefined' || !window.BroadcastChannel) return;
    const channel = new BroadcastChannel(`emdr_room_${roomId}`);
    broadcastRef.current = channel;

    channel.onmessage = (event) => {
      const msg = event.data;
      if (!msg) return;

      if (msg.type === 'presence') {
        const hasPeer = isPatient ? msg.therapist : msg.patient;
        setPeerConnected(Boolean(hasPeer));
        setSyncStatus(hasPeer ? 'Ambos conectados (local)' : 'Esperando a la otra persona');
      } else if (msg.type === 'settings' && isPatient) {
        onApplyRemoteSettings(msg.settings);
      } else if (msg.type === 'start' && isPatient) {
        onRemoteStart();
      } else if (msg.type === 'pause' && isPatient) {
        onRemotePause();
      } else if (msg.type === 'stop') {
        onRemoteStop(msg.reason);
      } else if (msg.type === 'ping-request') {
        channel.postMessage({
          type: 'presence',
          therapist: !isPatient,
          patient: isPatient
        });
      }
    };

    // Anunciar presencia
    channel.postMessage({
      type: 'presence',
      therapist: !isPatient,
      patient: isPatient
    });
    channel.postMessage({ type: 'ping-request' });

    return () => {
      channel.close();
    };
  }, [roomId, isPatient, onApplyRemoteSettings, onRemoteStart, onRemotePause, onRemoteStop]);

  const send = useCallback(
    (message: Record<string, unknown>) => {
      // 1. Enviar vía WebSocket si está abierto
      if (socketRef.current && socketRef.current.readyState === WebSocket.OPEN) {
        try {
          socketRef.current.send(JSON.stringify(message));
        } catch {}
      }
      // 2. Enviar vía BroadcastChannel para comunicación local instantánea
      if (broadcastRef.current) {
        try {
          broadcastRef.current.postMessage(message);
        } catch {}
      }
    },
    []
  );

  // Conectar WebSocket si hay servidor activo
  const connect = useCallback(() => {
    if (!roomId) return;
    if (socketRef.current) {
      socketRef.current.close();
      socketRef.current = null;
    }

    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const token = credentials?.token || 'session-token';
    const wsUrl = `${proto}//${window.location.host}/api/rooms/${encodeURIComponent(
      roomId
    )}/ws?role=${role}&token=${encodeURIComponent(token)}`;

    setSyncStatus('Conectando…');

    try {
      const ws = new WebSocket(wsUrl);
      socketRef.current = ws;

      ws.onopen = () => {
        if (socketRef.current !== ws) return;
        setSyncStatus('Conectado');
        if (pingTimerRef.current) clearInterval(pingTimerRef.current);
        pingTimerRef.current = window.setInterval(() => {
          send({ type: 'ping', clientSent: Date.now() });
        }, 5000);

        if (!isPatient) {
          send({ type: 'settings', settings, revision: latestRevisionRef.current });
        }
      };

      ws.onmessage = (event) => {
        if (socketRef.current !== ws) return;
        let data: Record<string, unknown>;
        try {
          data = JSON.parse(event.data);
        } catch {
          return;
        }

        if (data.type === 'snapshot') {
          latestRevisionRef.current = (data.revision as number) || 0;
          if (isPatient && data.settings) {
            onApplyRemoteSettings(data.settings as Partial<SessionSettings>);
          }
          setSyncStatus('Conectado');
        } else if (data.type === 'presence') {
          const peer = Boolean(isPatient ? data.therapist : data.patient);
          setPeerConnected(peer);
          setSyncStatus(peer ? 'Ambos conectados' : 'Esperando a la otra persona');
        } else if (data.type === 'settings' && isPatient) {
          const rev = (data.revision as number) || 0;
          if (rev >= latestRevisionRef.current) {
            latestRevisionRef.current = rev;
            onApplyRemoteSettings(data.settings as Partial<SessionSettings>);
          }
        } else if (data.type === 'start' && isPatient) {
          onRemoteStart();
        } else if (data.type === 'pause' && isPatient) {
          onRemotePause();
        } else if (data.type === 'stop') {
          onRemoteStop(data.reason as string);
        } else if (data.type === 'pong' && typeof data.clientSent === 'number') {
          const rtt = Date.now() - data.clientSent;
          setLatencyMs(rtt);
        } else if (data.type === 'error') {
          // Fallback a broadcast si websocket da 404 o no está habilitado
          setSyncStatus(peerConnected ? 'Ambos conectados (local)' : 'Esperando');
        }
      };

      ws.onclose = () => {
        if (socketRef.current !== ws) return;
        if (pingTimerRef.current) clearInterval(pingTimerRef.current);
        socketRef.current = null;
        // Si no hay ws, mantén presencia vía BroadcastChannel
        setSyncStatus(peerConnected ? 'Ambos conectados (local)' : 'Esperando a la otra persona');
      };

      ws.onerror = () => {
        // Fallback silencioso a BroadcastChannel
        setSyncStatus(peerConnected ? 'Ambos conectados (local)' : 'Esperando a la otra persona');
      };
    } catch {
      setSyncStatus(peerConnected ? 'Ambos conectados (local)' : 'Esperando a la otra persona');
    }
  }, [roomId, credentials?.token, role, isPatient, settings, send, onApplyRemoteSettings, onRemoteStart, onRemotePause, onRemoteStop, peerConnected]);

  // Conectar al montar
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

  // Crear sala segura en backend
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
        setSyncStatus('Sala creada');
      } else {
        // En caso de que se use sin worker backend, fallback con roomId aleatorio local
        const randomId = 'EMDR-' + Math.floor(1000 + Math.random() * 9000);
        const creds: RemoteCredentials = {
          roomId: randomId,
          token: 'token-' + Date.now()
        };
        setCredentials(creds);
        sessionStorage.setItem('emdr_therapist', JSON.stringify(creds));
        setSyncStatus('Sala local lista');
      }
    } catch {
      const randomId = 'EMDR-' + Math.floor(1000 + Math.random() * 9000);
      const creds: RemoteCredentials = {
        roomId: randomId,
        token: 'token-' + Date.now()
      };
      setCredentials(creds);
      sessionStorage.setItem('emdr_therapist', JSON.stringify(creds));
      setSyncStatus('Sala local lista');
    } finally {
      setIsCreating(false);
    }
  }, []);

  const sendStart = useCallback(() => {
    send({ type: 'start', revision: latestRevisionRef.current + 1 });
  }, [send]);

  const sendPause = useCallback(() => {
    send({ type: 'pause', revision: latestRevisionRef.current + 1 });
  }, [send]);

  const sendStop = useCallback(
    (reason?: string) => {
      send({ type: 'stop', reason: reason || role, revision: latestRevisionRef.current + 1 });
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
