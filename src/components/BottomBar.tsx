import React, { useState, useEffect, useRef } from 'react';
import { TrajectoryType, StimulationModality, SoundType } from '../types';
import { TRAJECTORIES } from '../constants';

interface BottomBarProps {
  isPlaying: boolean;
  isStoppingSmoothly: boolean;
  onPlayToggle: () => void;
  level: number;
  frequency: number;
  onLevelChange: (newLevel: number) => void;
  dotSize: number;
  onDotSizeChange: (size: number) => void;
  activeTrajectory: TrajectoryType;
  onSelectTrajectory: (t: TrajectoryType) => void;
  modality: StimulationModality;
  onToggleModality?: () => void;
  soundType: SoundType;
  onSelectSound: (s: SoundType) => void;
}

export const BottomBar: React.FC<BottomBarProps> = ({
  isPlaying,
  isStoppingSmoothly,
  onPlayToggle,
  level,
  frequency,
  onLevelChange,
  dotSize,
  onDotSizeChange,
  activeTrajectory,
  onSelectTrajectory,
  modality,
  onToggleModality,
  soundType,
  onSelectSound
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isTrajMenuOpen, setIsTrajMenuOpen] = useState(false);
  const collapseTimerRef = useRef<number | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const expandAccordion = () => {
    setIsExpanded(true);
    if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
    collapseTimerRef.current = window.setTimeout(() => {
      setIsExpanded(false);
    }, 2800);
  };

  useEffect(() => {
    return () => {
      if (collapseTimerRef.current) clearTimeout(collapseTimerRef.current);
    };
  }, []);

  // Cerrar menú de trayectorias al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setIsTrajMenuOpen(false);
      }
    };
    if (isTrajMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isTrajMenuOpen]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    onLevelChange(val);
    expandAccordion();
  };

  const stepMinus = () => {
    onLevelChange(level - 1);
    expandAccordion();
  };

  const stepPlus = () => {
    onLevelChange(level + 1);
    expandAccordion();
  };

  const stepSizeMinus = () => {
    onDotSizeChange(Math.max(16, dotSize - 4));
  };

  const stepSizePlus = () => {
    onDotSizeChange(Math.min(120, dotSize + 4));
  };

  let playButtonLabel = 'Iniciar';
  let playButtonIcon = 'play_arrow';
  let playButtonBg = 'bg-[#1B3B2B] hover:bg-[#2A5B44]';

  if (isPlaying && !isStoppingSmoothly) {
    playButtonLabel = 'Pausar';
    playButtonIcon = 'pause';
    playButtonBg = 'bg-[#593E2B] hover:bg-[#724e37]';
  } else if (isStoppingSmoothly) {
    playButtonLabel = 'Al centro...';
    playButtonIcon = 'hourglass_top';
    playButtonBg = 'bg-amber-600';
  } else {
    playButtonLabel = 'Iniciar';
    playButtonIcon = 'play_arrow';
    playButtonBg = 'bg-[#1B3B2B] hover:bg-[#2A5B44]';
  }

  const isAudioOnly = modality === 'audio-only';
  const currentTrajDef = TRAJECTORIES[activeTrajectory] || TRAJECTORIES.horizontal;

  const getTrajIcon = (tKey: TrajectoryType) => {
    switch (tKey) {
      case 'horizontal':
        return 'swap_horiz';
      case 'vertical':
        return 'swap_vert';
      case 'diagonal':
        return 'north_east';
      case 'alternate':
        return 'sync_alt';
      case 'infinity':
        return 'all_inclusive';
      case 'circular':
        return 'refresh';
      case 'pendulum':
        return 'waves';
      case 'arc':
        return 'airline_stops';
      case 'zigzag':
        return 'show_chart';
      case 'bounce':
        return 'expand_circle_down';
      case 'smooth-random':
        return 'grain';
      default:
        return 'swap_horiz';
    }
  };

  return (
    <div className="absolute bottom-3 inset-x-3 sm:inset-x-6 z-20 pointer-events-none flex justify-center">
      <div className="pointer-events-auto bg-white/95 backdrop-blur-md border border-[#DCE3DC] rounded-2xl px-3 sm:px-4 py-2.5 shadow-md flex items-center justify-between gap-2.5 max-w-4xl w-full transition-all duration-300">
        {/* 1. Botón Iniciar / Pausar */}
        <button
          onClick={onPlayToggle}
          className={`h-10 px-4 rounded-xl ${playButtonBg} active:scale-[0.98] text-white font-display font-semibold text-xs shadow-sm flex items-center justify-center gap-1.5 transition-all shrink-0 cursor-pointer`}
        >
          <span className="material-symbols-outlined text-[20px]">{playButtonIcon}</span>
          <span className="tracking-tight text-xs font-semibold">{playButtonLabel}</span>
        </button>

        {/* 2. Control de Velocidad / Frecuencia (Slider elástico con acordeón) */}
        <div
          id="speed-accordion-wrapper"
          className={`flex-1 min-w-[130px] flex items-center gap-2 transition-all duration-300 ${
            isExpanded ? 'expanded' : ''
          }`}
        >
          <div className="flex flex-col gap-0.5 w-full">
            <div className="flex items-center justify-between text-xs leading-none">
              <span className="text-[9px] font-semibold uppercase tracking-wider text-[#5B6960] flex items-center gap-1 font-mono">
                {isAudioOnly ? 'Frecuencia' : 'Velocidad'}
              </span>
              <div className="flex items-center gap-1 font-mono">
                <span className="font-bold text-[11px] text-[#1B3B2B]">Nvl {level}</span>
                <span className="text-neutral-400 text-[9px]">{frequency.toFixed(2)} Hz</span>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={stepMinus}
                className="text-[#5B6960] hover:text-[#1B3B2B] w-5 h-5 rounded flex items-center justify-center hover:bg-[#EFF2EE] font-bold text-xs select-none cursor-pointer"
              >
                −
              </button>
              <input
                type="range"
                min={1}
                max={20}
                value={level}
                onChange={handleSliderChange}
                onFocus={expandAccordion}
                className="w-full h-2 bg-[#EFF2EE] rounded-lg accent-[#1B3B2B] cursor-pointer transition-all"
              />
              <button
                type="button"
                onClick={stepPlus}
                className="text-[#5B6960] hover:text-[#1B3B2B] w-5 h-5 rounded flex items-center justify-center hover:bg-[#EFF2EE] font-bold text-xs select-none cursor-pointer"
              >
                +
              </button>
            </div>

            {/* Micro-pips acordeón visible al interactuar */}
            {isExpanded && (
              <div className="flex items-center justify-between gap-1 pt-1 overflow-hidden">
                {Array.from({ length: 20 }, (_, idx) => idx + 1).map((lvl) => (
                  <div
                    key={lvl}
                    className={`step-pip h-1.5 flex-1 rounded-full transition-all ${
                      lvl <= level ? 'bg-[#1B3B2B] active' : 'bg-neutral-300'
                    }`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 3. Barra de Tamaño de la figura (solo en modo visual) */}
        {!isAudioOnly && (
          <div className="hidden sm:flex flex-col gap-0.5 w-28 lg:w-32 shrink-0 border-l border-[#DCE3DC]/60 pl-2.5">
            <div className="flex items-center justify-between text-xs leading-none">
              <span className="text-[9px] font-semibold uppercase tracking-wider text-[#5B6960] font-mono">
                Tamaño
              </span>
              <span className="font-mono text-[10px] font-bold text-[#1B3B2B]">{dotSize}px</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={stepSizeMinus}
                className="text-[#5B6960] hover:text-[#1B3B2B] w-5 h-5 rounded flex items-center justify-center hover:bg-[#EFF2EE] font-bold text-xs select-none cursor-pointer"
                title="Reducir tamaño"
              >
                −
              </button>
              <input
                type="range"
                min={16}
                max={120}
                value={dotSize}
                onChange={(e) => onDotSizeChange(parseInt(e.target.value, 10))}
                className="w-full h-2 bg-[#EFF2EE] rounded-lg accent-[#1B3B2B] cursor-pointer"
              />
              <button
                type="button"
                onClick={stepSizePlus}
                className="text-[#5B6960] hover:text-[#1B3B2B] w-5 h-5 rounded flex items-center justify-center hover:bg-[#EFF2EE] font-bold text-xs select-none cursor-pointer"
                title="Aumentar tamaño"
              >
                +
              </button>
            </div>
          </div>
        )}

        {/* 4. Selector de Dirección / Trayectoria con Popover (en vez de 3 botones fijos) */}
        {!isAudioOnly && (
          <div className="relative shrink-0" ref={menuRef}>
            <button
              type="button"
              onClick={() => setIsTrajMenuOpen((prev) => !prev)}
              className={`h-9 px-3 rounded-xl border flex items-center gap-1.5 transition-all cursor-pointer shadow-2xs ${
                isTrajMenuOpen
                  ? 'bg-[#1B3B2B] text-white border-[#1B3B2B]'
                  : 'bg-[#EFF2EE] hover:bg-white text-[#17231D] border-[#DCE3DC]'
              }`}
              title="Cambiar dirección o trayectoria del estímulo"
            >
              <span
                className={`material-symbols-outlined text-[16px] ${
                  isTrajMenuOpen ? 'text-white' : 'text-[#1B3B2B]'
                }`}
              >
                {getTrajIcon(activeTrajectory)}
              </span>
              <span className="text-xs font-semibold">{currentTrajDef.name}</span>
              <span className="material-symbols-outlined text-[15px] opacity-60">
                {isTrajMenuOpen ? 'arrow_drop_up' : 'arrow_drop_down'}
              </span>
            </button>

            {/* Menú Desplegable con las 11 direcciones */}
            {isTrajMenuOpen && (
              <div className="absolute bottom-full mb-2 right-0 w-64 bg-white rounded-2xl shadow-xl border border-[#DCE3DC] p-2 grid grid-cols-2 gap-1.5 z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="col-span-2 px-2 py-1 text-[10px] font-mono uppercase font-semibold text-[#5B6960] border-b border-[#DCE3DC]/60 flex items-center justify-between">
                  <span>Dirección del Estímulo</span>
                  <span className="text-[#1B3B2B]">11 trayectorias</span>
                </div>
                {(Object.keys(TRAJECTORIES) as TrajectoryType[]).map((tKey) => {
                  const def = TRAJECTORIES[tKey];
                  const isSel = activeTrajectory === tKey;
                  return (
                    <button
                      key={tKey}
                      type="button"
                      onClick={() => {
                        onSelectTrajectory(tKey);
                        setIsTrajMenuOpen(false);
                      }}
                      className={`p-1.5 rounded-lg text-left flex items-center gap-1.5 transition-colors cursor-pointer ${
                        isSel
                          ? 'bg-[#1B3B2B] text-white font-semibold'
                          : 'hover:bg-[#EFF2EE] text-[#17231D]'
                      }`}
                    >
                      <span className="material-symbols-outlined text-[15px]">
                        {getTrajIcon(tKey)}
                      </span>
                      <span className="text-[11px] truncate">{def.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* 5. Selector de Timbres Acústicos (solo si es modo solo auditivo) */}
        {isAudioOnly && (
          <div className="hidden sm:flex items-center gap-1 bg-[#EFF2EE] p-1 rounded-xl border border-[#DCE3DC]/50 shrink-0">
            {[
              { key: 'heartbeat', icon: 'favorite', label: 'Latido' },
              { key: 'tibetan', icon: 'notifications', label: 'Cuenco' },
              { key: 'water', icon: 'water_drop', label: 'Gota' },
              { key: 'click', icon: 'touch_app', label: 'Click' }
            ].map((s) => (
              <button
                key={s.key}
                type="button"
                onClick={() => onSelectSound(s.key as SoundType)}
                className={`p-1.5 rounded-lg text-[11px] font-medium flex items-center gap-1 px-2 transition-all cursor-pointer ${
                  soundType === s.key
                    ? 'text-[#1B3B2B] bg-white shadow-2xs font-semibold'
                    : 'text-[#5B6960] hover:text-[#17231D]'
                }`}
              >
                <span className="material-symbols-outlined text-[14px]">{s.icon}</span>
                <span className="hidden md:inline">{s.label}</span>
              </button>
            ))}
          </div>
        )}

        {/* 6. Botón Alternar Modalidad (Visual / Solo Auditivo) */}
        {onToggleModality && (
          <button
            type="button"
            onClick={onToggleModality}
            title={isAudioOnly ? 'Cambiar a Visual + Audio' : 'Cambiar a Solo Auditivo'}
            className={`h-9 p-1.5 rounded-xl border flex items-center gap-1 px-2.5 transition-all cursor-pointer shrink-0 ${
              isAudioOnly
                ? 'bg-[#1B3B2B] text-white border-[#1B3B2B] shadow-2xs font-semibold'
                : 'bg-[#EFF2EE] text-[#1B3B2B] border-[#DCE3DC] hover:bg-white'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">
              {isAudioOnly ? 'headphones' : 'visibility'}
            </span>
            <span className="text-[11px] font-medium hidden md:inline">
              {isAudioOnly ? 'Solo Auditivo' : 'Visual'}
            </span>
          </button>
        )}
      </div>
    </div>
  );
};
