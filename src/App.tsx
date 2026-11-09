import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  SessionSettings,
  Role,
  PresetTemplate,
  CustomTemplate,
  StimulationBlock,
  TechnicalSessionReport,
  StimulationModality
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
  // Detección de rol desde la URL (la sala y su credencial las lee useRealtimeSync)
  const [role] = useState<Role>(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const rawRole = (urlParams.get('role') || urlParams.get('mode') || '').toLowerCase();
    return rawRole === 'patient' ? 'patient' : 'therapist';
  });

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

  // REGISTRO TÉCNICO DE BLOQUES DE ESTIMULACIÓN (datos reales sin simulación)
  const [sessionBlocks, setSessionBlocks] = useState<StimulationBlock[]>([]);
  const activeBlockRef = useRef<{
    blockNumber: number;
    modality: StimulationModality;
    startTime: number;
    startPasses: number;
    initialFrequency: number;
    finalFrequency: number;
    minFrequency: number;
    maxFrequency: number;
    trajectory: SessionSettings['trajectory'];
    stimulus: SessionSettings['stimulus'];
  } | null>(null);

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

  // Manejo del cronómetro (solo tiempo activo, nunca pausa)
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
    setSessionBlocks([]);
    activeBlockRef.current = null;
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

    // Iniciar registro de bloque técnico
    activeBlockRef.current = {
      blockNumber: sessionBlocks.length + 1,
      modality: settings.modality,
      startTime: Date.now(),
      startPasses: passes,
      initialFrequency: settings.frequency,
      finalFrequency: settings.frequency,
      minFrequency: settings.frequency,
      maxFrequency: settings.frequency,
      trajectory: settings.trajectory,
      stimulus: settings.stimulus
    };
  }, [passes, sessionBlocks.length, settings]);

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
    patientLink,
    createRoom,
    reconnect,
    sendStart,
    sendPause,
    sendStop,
    isCreating
  } = useRealtimeSync({
    role,
    settings,
    onApplyRemoteSettings: handleApplyRemoteSettings,
    onRemoteStart: handleRemoteStart,
    onRemotePause: handleRemotePause,
    onRemoteStop: handleRemoteStop
  });

  // Código corto para mostrar en la cabecera (el identificador real es un UUID).
  const roomLabel = credentials?.roomId ? credentials.roomId.slice(0, 8).toUpperCase() : 'Sin sala';

  // Toggle Iniciar / Pausa suave y gestión de bloques técnicos
  const handlePlayToggle = () => {
    audioEngine.unlock();
    setIsAudioUnlocked(true);

    if (isPlaying && !isStoppingSmoothly) {
      // Pausar y cerrar bloque actual
      setIsStoppingSmoothly(true);
      sendPause();
      finalizeCurrentBlock();
    } else {
      // Iniciar nuevo bloque técnico
      setIsStoppingSmoothly(false);
      setIsPlaying(true);
      sendStart();

      activeBlockRef.current = {
        blockNumber: sessionBlocks.length + 1,
        modality: settings.modality,
        startTime: Date.now(),
        startPasses: passes,
        initialFrequency: settings.frequency,
        finalFrequency: settings.frequency,
        minFrequency: settings.frequency,
        maxFrequency: settings.frequency,
        trajectory: settings.trajectory,
        stimulus: settings.stimulus
      };
    }
  };

  const finalizeCurrentBlock = useCallback(() => {
    if (!activeBlockRef.current) return;
    const now = Date.now();
    const durSec = Math.max(1, (now - activeBlockRef.current.startTime) / 1000);
    const blockCycles = Math.max(0, passes - activeBlockRef.current.startPasses);

    const completedBlock: StimulationBlock = {
      blockNumber: activeBlockRef.current.blockNumber,
      modality: activeBlockRef.current.modality,
      durationSeconds: durSec,
      cycles: blockCycles,
      initialFrequency: activeBlockRef.current.initialFrequency,
      finalFrequency: activeBlockRef.current.finalFrequency,
      minFrequency: activeBlockRef.current.minFrequency,
      maxFrequency: activeBlockRef.current.maxFrequency,
      trajectory: activeBlockRef.current.trajectory,
      stimulus: activeBlockRef.current.stimulus,
      startTime: activeBlockRef.current.startTime,
      endTime: now
    };

    setSessionBlocks((prev) => [...prev, completedBlock]);
    activeBlockRef.current = null;
  }, [passes]);

  const handleSmoothStopFinished = useCallback(() => {
    setIsStoppingSmoothly(false);
    setIsPlaying(false);
    finalizeCurrentBlock();
  }, [finalizeCurrentBlock]);

  const handlePassIncrement = useCallback(() => {
    setPasses((prev) => prev + 1);
  }, []);

  // Actualizar settings locales y actualizar bloque activo si está corriendo
  const handleUpdateSettings = (patch: Partial<SessionSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      if (patch.level !== undefined && patch.frequency === undefined) {
        next.frequency = frequencyFromLevel(patch.level);
      }

      // Si hay un bloque activo, actualizar su registro de frecuencia
      if (activeBlockRef.current && next.frequency) {
        activeBlockRef.current.finalFrequency = next.frequency;
        activeBlockRef.current.minFrequency = Math.min(activeBlockRef.current.minFrequency, next.frequency);
        activeBlockRef.current.maxFrequency = Math.max(activeBlockRef.current.maxFrequency, next.frequency);
        if (patch.trajectory) activeBlockRef.current.trajectory = patch.trajectory;
        if (patch.stimulus) activeBlockRef.current.stimulus = patch.stimulus;
        if (patch.modality) activeBlockRef.current.modality = patch.modality;
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
      stimulusColor: settings.stimulusColor,
      modality: settings.modality,
      dotSize: settings.dotSize,
      trajectory: settings.trajectory,
      level: settings.level,
      soundActive: settings.soundActive,
      soundType: settings.soundType,
      amplitude: settings.amplitude,
      createdAt: Date.now()
    };
    const nextList = [newTpl, ...customTemplates];
    setCustomTemplates(nextList);
    try {
      localStorage.setItem('bilateral_custom_templates', JSON.stringify(nextList));
    } catch {}
  };

  const handleDeleteCustomTemplate = (id: string) => {
    const nextList = customTemplates.filter((t) => t.id !== id);
    setCustomTemplates(nextList);
    try {
      localStorage.setItem('bilateral_custom_templates', JSON.stringify(nextList));
    } catch {}
  };

  const handleApplyCustomTemplate = (tpl: CustomTemplate) => {
    setActiveTemplateId(tpl.id);
    setActiveTemplateName(tpl.name);
    setSettings((prev) => ({
      ...prev,
      palette: tpl.palette,
      bg: tpl.bg,
      stimulus: tpl.stimulus,
      stimulusColor: tpl.stimulusColor || null,
      modality: tpl.modality || 'both',
      dotSize: tpl.dotSize,
      trajectory: tpl.trajectory,
      level: tpl.level,
      frequency: frequencyFromLevel(tpl.level),
      amplitude: tpl.amplitude || 0.85,
      soundActive: tpl.soundActive,
      soundType: tpl.soundType
    }));
  };

  // Teclado (espacio: pausa, flechas: velocidad)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const activeTag = document.activeElement?.tagName.toLowerCase();
      if (activeTag === 'input' || activeTag === 'textarea') return;

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

  // Copiar enlace paciente. Sin sala creada, abre el panel para crearla.
  const handleCopyPatientLink = async (): Promise<boolean> => {
    if (!patientLink) {
      setIsRemoteModalOpen(true);
      return false;
    }
    try {
      await navigator.clipboard.writeText(patientLink);
    } catch {
      window.prompt('Copia este enlace para el paciente:', patientLink);
    }
    return true;
  };

  // Cálculo del reporte técnico en tiempo real
  const technicalReport: TechnicalSessionReport = useMemo(() => {
    const allBlocks = [...sessionBlocks];
    if (isPlaying && activeBlockRef.current) {
      const liveSec = (Date.now() - activeBlockRef.current.startTime) / 1000;
      const liveCycles = Math.max(0, passes - activeBlockRef.current.startPasses);
      allBlocks.push({
        blockNumber: activeBlockRef.current.blockNumber,
        modality: activeBlockRef.current.modality,
        durationSeconds: liveSec,
        cycles: liveCycles,
        initialFrequency: activeBlockRef.current.initialFrequency,
        finalFrequency: activeBlockRef.current.finalFrequency,
        minFrequency: activeBlockRef.current.minFrequency,
        maxFrequency: activeBlockRef.current.maxFrequency,
        trajectory: activeBlockRef.current.trajectory,
        stimulus: activeBlockRef.current.stimulus,
        startTime: activeBlockRef.current.startTime,
        endTime: Date.now()
      });
    }

    const totalActiveSeconds = allBlocks.reduce((acc, b) => acc + b.durationSeconds, 0);
    const totalBlocks = allBlocks.length;
    const totalCycles = passes; // Conteo real de pasadas bilaterales no duplicadas

    let minF = settings.frequency;
    let maxF = settings.frequency;
    let sumWeightedF = 0;
    let sumDur = 0;

    const modalityStats: Record<StimulationModality, { blocks: number; seconds: number }> = {
      both: { blocks: 0, seconds: 0 },
      'audio-only': { blocks: 0, seconds: 0 },
      'visual-only': { blocks: 0, seconds: 0 }
    };
    const modalitiesSet = new Set<StimulationModality>();

    allBlocks.forEach((b) => {
      minF = Math.min(minF, b.minFrequency);
      maxF = Math.max(maxF, b.maxFrequency);
      const avgF = (b.initialFrequency + b.finalFrequency) / 2;
      sumWeightedF += avgF * b.durationSeconds;
      sumDur += b.durationSeconds;

      modalitiesSet.add(b.modality);
      modalityStats[b.modality].blocks += 1;
      modalityStats[b.modality].seconds += b.durationSeconds;
    });

    const predominantFrequency = sumDur > 0 ? sumWeightedF / sumDur : settings.frequency;

    return {
      totalActiveSeconds,
      totalBlocks,
      totalCycles,
      predominantFrequency,
      frequencyRange: { min: minF, max: maxF },
      modalitiesUsed: Array.from(modalitiesSet),
      modalityStats,
      blocks: sessionBlocks
    };
  }, [sessionBlocks, isPlaying, passes, settings.frequency]);

  const currentPaletteDef = PALETTES[settings.palette] || PALETTES.salvia;

  return (
    <div className="h-full flex flex-col overflow-hidden bg-[#F7F8F6] text-[#17231D]">
      {/* Cabecera clínica con botón de sala llamativo y copiar directo */}
      {!isPatient && (
        <TherapistHeader
          roomId={roomLabel}
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
          onCopyPatientLink={handleCopyPatientLink}
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

        {/* Barra inferior de control con barra de tamaño y cambio de dirección */}
        {!isPatient && (
          <BottomBar
            isPlaying={isPlaying}
            isStoppingSmoothly={isStoppingSmoothly}
            onPlayToggle={handlePlayToggle}
            level={settings.level}
            frequency={settings.frequency}
            onLevelChange={handleLevelChange}
            dotSize={settings.dotSize}
            onDotSizeChange={(sz) => handleUpdateSettings({ dotSize: sz })}
            activeTrajectory={settings.trajectory}
            onSelectTrajectory={(t) => handleUpdateSettings({ trajectory: t })}
            modality={settings.modality}
            onToggleModality={() =>
              handleUpdateSettings({
                modality: settings.modality === 'audio-only' ? 'both' : 'audio-only',
                soundActive: true
              })
            }
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
          showDisconnectedOverlay={showDisconnectedOverlay}
          onDismissOverlay={() => setShowDisconnectedOverlay(false)}
        />
      )}

      {/* Modal de Registro Técnico de la Sesión */}
      <ClinicalReportModal
        isOpen={isReportModalOpen}
        onClose={() => setIsReportModalOpen(false)}
        report={technicalReport}
      />

      {/* Modal de Gestión de Sala Remota */}
      <RemoteRoomModal
        isOpen={isRemoteModalOpen}
        onClose={() => setIsRemoteModalOpen(false)}
        credentials={credentials}
        patientLink={patientLink}
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
