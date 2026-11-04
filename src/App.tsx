import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  SessionSettings,
  Role,
  PresetTemplate,
  CustomTemplate
} from './types';
import {
  DEFAULT_SETTINGS,
  PALETTES,
  PRESET_TEMPLATES,
  frequencyFromLevel
} from './constants';
import { audioEngine } from './audio';
import { TherapistHeader } from './components/TherapistHeader';
import { StageViewport } from './components/StageViewport';
import { BottomBar } from './components/BottomBar';
import { ConfigSidebar } from './components/ConfigSidebar';
import { ClinicalReportModal } from './components/ClinicalReportModal';
import { PatientControls } from './components/PatientControls';
import { RemoteRoomModal } from './components/RemoteRoomModal';
import { useRealtimeSync } from './hooks/useRealtimeSync';

export const App: React.FC = () => {
  // Detección de rol y sala desde query params o fragment
  const [role, setRole] = useState<Role>('therapist');
  const [roomId, setRoomId] = useState<string>('EMDR-2368');

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const rawRole = (urlParams.get('role') || urlParams.get('mode') || '').toLowerCase();
    const isPat = rawRole === 'patient';
    setRole(isPat ? 'patient' : 'therapist');

    const paramRoom = urlParams.get('room');
    if (paramRoom) {
      setRoomId(paramRoom);
    } else {
      const fragment = new URLSearchParams(window.location.hash.slice(1));
      const hashRoom = fragment.get('room');
      if (hashRoom) {
        setRoomId(hashRoom);
      }
    }
  }, []);

  const isPatient = role === 'patient';

  // Configuración de la sesión
  const [settings, setSettings] = useState<SessionSettings>(DEFAULT_SETTINGS);
  const [activeTemplateId, setActiveTemplateId] = useState<string>('trauma-agudo');
  const [activeTemplateName, setActiveTemplateName] = useState<string>('Trauma Agudo · Calma');

  // Estado cinético
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isStoppingSmoothly, setIsStoppingSmoothly] = useState<boolean>(false);
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [passes, setPasses] = useState<number>(0);

  // Modales y paneles
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [sidebarTab, setSidebarTab] = useState<'stimuli' | 'traj' | 'audio' | 'palettes' | 'templates'>('stimuli');
  const [isReportModalOpen, setIsReportModalOpen] = useState<boolean>(false);
  const [isRemoteModalOpen, setIsRemoteModalOpen] = useState<boolean>(false);
  const [showDisconnectedOverlay, setShowDisconnectedOverlay] = useState<boolean>(false);
  const [isAudioUnlocked, setIsAudioUnlocked] = useState<boolean>(false);

  // Plantillas personalizadas de localStorage
  const [customTemplates, setCustomTemplates] = useState<CustomTemplate[]>(() => {
    try {
      const saved = localStorage.getItem('bilateral_custom_templates');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const timerIntervalRef = useRef<number | null>(null);

  // Manejo del cronómetro
  useEffect(() => {
    if (isPlaying && !isStoppingSmoothly) {
      if (!timerIntervalRef.current) {
        timerIntervalRef.current = window.setInterval(() => {
          setTimerSeconds((prev) => prev + 1);
        }, 1000);
      }
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    }
    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
        timerIntervalRef.current = null;
      }
    };
  }, [isPlaying, isStoppingSmoothly]);

  // Formato mm:ss
  const formatTimer = (sec: number) => {
    const m = String(Math.floor(sec / 60)).padStart(2, '0');
    const s = String(sec % 60).padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleResetTimer = () => {
    if (isPlaying) {
      setIsStoppingSmoothly(true);
    }
    setTimerSeconds(0);
    setPasses(0);
  };

  // Desbloqueo de Audio
  const handleAudioUnlock = useCallback(() => {
    audioEngine.unlock();
    setIsAudioUnlocked(true);
  }, []);

  // Sincronización Remota
  const handleApplyRemoteSettings = useCallback((patch: Partial<SessionSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      if (patch.level !== undefined && patch.frequency === undefined) {
        next.frequency = frequencyFromLevel(patch.level);
      }
      return next;
    });
  }, []);

  const handleRemoteStart = useCallback(() => {
    audioEngine.unlock();
    setIsAudioUnlocked(true);
    setIsStoppingSmoothly(false);
    setIsPlaying(true);
    setShowDisconnectedOverlay(false);
  }, []);

  const handleRemotePause = useCallback(() => {
    setIsStoppingSmoothly(true);
  }, []);

  const handleRemoteStop = useCallback((reason?: string) => {
    setIsPlaying(false);
    setIsStoppingSmoothly(false);
    if (isPatient && reason === 'disconnected') {
      setShowDisconnectedOverlay(true);
    }
  }, [isPatient]);

  const {
    syncStatus,
    peerConnected,
    latencyMs,
    credentials,
    createRoom,
    reconnect,
    sendStart,
    sendPause,
    sendStop,
    isCreating
  } = useRealtimeSync({
    role,
    roomId,
    settings,
    onApplyRemoteSettings: handleApplyRemoteSettings,
    onRemoteStart: handleRemoteStart,
    onRemotePause: handleRemotePause,
    onRemoteStop: handleRemoteStop
  });

  // Toggle Iniciar / Pausa suave
  const handlePlayToggle = () => {
    audioEngine.unlock();
    setIsAudioUnlocked(true);

    if (isPlaying && !isStoppingSmoothly) {
      setIsStoppingSmoothly(true);
      sendPause();
    } else {
      setIsStoppingSmoothly(false);
      setIsPlaying(true);
      sendStart();
    }
  };

  const handleSmoothStopFinished = useCallback(() => {
    setIsStoppingSmoothly(false);
    setIsPlaying(false);
  }, []);

  const handlePassIncrement = useCallback(() => {
    setPasses((prev) => prev + 1);
  }, []);

  // Actualizar settings locales
  const handleUpdateSettings = (patch: Partial<SessionSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      if (patch.level !== undefined) {
        next.frequency = frequencyFromLevel(patch.level);
      }
      return next;
    });
  };

  // Nivel de velocidad
  const handleLevelChange = (lvl: number) => {
    const bound = Math.max(1, Math.min(20, lvl));
    handleUpdateSettings({ level: bound, frequency: frequencyFromLevel(bound) });
  };

  // Cargar Presets
  const handleApplyPreset = (preset: PresetTemplate) => {
    setActiveTemplateId(preset.id);
    setActiveTemplateName(preset.name);
    setSettings((prev) => ({
      ...prev,
      palette: preset.palette,
      bg: preset.bg,
      stimulus: preset.stimulus,
      dotSize: preset.dotSize,
      trajectory: preset.trajectory,
      level: preset.level,
      frequency: preset.frequency,
      amplitude: preset.amplitude,
      soundActive: preset.soundActive,
      soundType: preset.soundType
    }));
  };

  // Guardar y Cargar plantillas personalizadas
  const handleSaveCustomTemplate = (name: string) => {
    const newTpl: CustomTemplate = {
      id: 'custom-' + Date.now(),
      name,
      palette: settings.palette,
      bg: settings.bg,
      stimulus: settings.stimulus,
      dotSize: settings.dotSize,
      trajectory: settings.trajectory,
      level: settings.level,
      soundActive: settings.soundActive,
      soundType: settings.soundType,
      createdAt: Date.now()
    };
    const updated = [newTpl, ...customTemplates];
    setCustomTemplates(updated);
    try {
      localStorage.setItem('bilateral_custom_templates', JSON.stringify(updated));
    } catch {}
    setActiveTemplateName(name);
  };

  const handleDeleteCustomTemplate = (id: string) => {
    const updated = customTemplates.filter((t) => t.id !== id);
    setCustomTemplates(updated);
    try {
      localStorage.setItem('bilateral_custom_templates', JSON.stringify(updated));
    } catch {}
  };

  const handleApplyCustomTemplate = (tpl: CustomTemplate) => {
    setActiveTemplateName(tpl.name);
    setSettings((prev) => ({
      ...prev,
      palette: tpl.palette,
      bg: tpl.bg,
      stimulus: tpl.stimulus,
      dotSize: tpl.dotSize,
      trajectory: tpl.trajectory,
      level: tpl.level,
      frequency: frequencyFromLevel(tpl.level),
      soundActive: tpl.soundActive,
      soundType: tpl.soundType
    }));
  };

  // Atajos de teclado
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        handlePlayToggle();
      } else if (e.code === 'ArrowUp' || e.key === '+') {
        e.preventDefault();
        handleLevelChange(settings.level + 1);
      } else if (e.code === 'ArrowDown' || e.key === '-') {
        e.preventDefault();
        handleLevelChange(settings.level - 1);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPlaying, isStoppingSmoothly, settings.level]);

  // Copiar enlace paciente
  const handleCopyPatientLink = async () => {
    const url = `${window.location.origin}${window.location.pathname}?role=patient&room=${encodeURIComponent(
      credentials?.roomId || roomId
    )}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt('Copia este enlace para el paciente:', url);
    }
  };

  const currentPaletteDef = PALETTES[settings.palette] || PALETTES.salvia;

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#F7F8F6] text-[#17231D]">
      {/* Cabecera clínica (solo visible en modo profesional) */}
      {!isPatient && (
        <TherapistHeader
          roomId={credentials?.roomId || roomId}
          timerFormatted={formatTimer(timerSeconds)}
          onResetTimer={handleResetTimer}
          syncStatus={syncStatus}
          peerConnected={peerConnected}
          onOpenTemplates={() => {
            setSidebarTab('templates');
            setIsSidebarOpen(true);
          }}
          onToggleSidebar={() => {
            setSidebarTab('stimuli');
            setIsSidebarOpen((prev) => !prev);
          }}
          isSidebarOpen={isSidebarOpen}
          onOpenReport={() => setIsReportModalOpen(true)}
          onOpenRemoteModal={() => setIsRemoteModalOpen(true)}
        />
      )}

      {/* Contenedor Principal */}
      <main
        className={`flex-1 w-full overflow-hidden relative flex gap-3 ${
          isPatient ? 'p-0' : 'p-2 sm:p-3'
        }`}
      >
        {/* Viewport del estímulo */}
        <StageViewport
          settings={settings}
          palette={currentPaletteDef}
          isPlaying={isPlaying}
          isStoppingSmoothly={isStoppingSmoothly}
          onSmoothStopFinished={handleSmoothStopFinished}
          onPassIncrement={handlePassIncrement}
          isPatient={isPatient}
          onAudioUnlock={handleAudioUnlock}
          isAudioUnlocked={isAudioUnlocked}
        />

        {/* Barra inferior de control (solo en modo profesional) */}
        {!isPatient && (
          <BottomBar
            isPlaying={isPlaying}
            isStoppingSmoothly={isStoppingSmoothly}
            onPlayToggle={handlePlayToggle}
            level={settings.level}
            frequency={settings.frequency}
            onLevelChange={handleLevelChange}
            activeTrajectory={settings.trajectory}
            onSelectTrajectory={(t) => handleUpdateSettings({ trajectory: t })}
            modality={settings.modality}
            soundType={settings.soundType}
            onSelectSound={(s) => handleUpdateSettings({ soundType: s })}
          />
        )}

        {/* Panel lateral "Ajustes de Sesión" */}
        {!isPatient && (
          <ConfigSidebar
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
            settings={settings}
            onUpdateSettings={handleUpdateSettings}
            activeTemplateId={activeTemplateId}
            onApplyPreset={handleApplyPreset}
            customTemplates={customTemplates}
            onSaveCustomTemplate={handleSaveCustomTemplate}
            onDeleteCustomTemplate={handleDeleteCustomTemplate}
            onApplyCustomTemplate={handleApplyCustomTemplate}
            activeTab={sidebarTab}
            onTabChange={setSidebarTab}
          />
        )}
      </main>

      {/* Controles del Paciente (solo en modo paciente) */}
      {isPatient && (
        <PatientControls
          syncStatus={syncStatus}
          peerConnected={peerConnected}
          isAudioUnlocked={isAudioUnlocked}
          onEnableAudio={handleAudioUnlock}
          onEmergencyStop={() => {
            setIsPlaying(false);
            setIsStoppingSmoothly(false);
            sendStop('patient');
          }}
          showDisconnectedOverlay={showDisconnectedOverlay}
          onDismissOverlay={() => setShowDisconnectedOverlay(false)}
        />
      )}

      {/* Modal de Informe Clínico */}
      <ClinicalReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        passes={passes}
        timeFormatted={formatTimer(timerSeconds)}
      />

      {/* Modal de Gestión de Sala Remota */}
      <RemoteRoomModal
        isOpen={isRemoteModalOpen}
        onClose={() => setIsRemoteModalOpen(false)}
        credentials={credentials}
        onCreateRoom={createRoom}
        onReconnect={reconnect}
        syncStatus={syncStatus}
        peerConnected={peerConnected}
        latencyMs={latencyMs}
        onCopyPatientLink={handleCopyPatientLink}
        isCreating={isCreating}
      />
    </div>
  );
};
export default App;
