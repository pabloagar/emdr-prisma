import React, { useState, useEffect, useRef } from 'react';
import { TrajectoryType, StimulationModality, SoundType } from '../types';

interface BottomBarProps {
  isPlaying: boolean;
  isStoppingSmoothly: boolean;
  onPlayToggle: () => void;
  level: number;
  frequency: number;
  onLevelChange: (newLevel: number) => void;
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
  activeTrajectory,
  onSelectTrajectory,
  modality,
  onToggleModality,
  soundType,
  onSelectSound
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const collapseTimerRef = useRef<number | null>(null);

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

  let playButtonLabel = 'Iniciar';
  let playButtonIcon = 'play_arrow';
  let playButtonBg = 'bg-[#1B3B2B] hover:bg-[#2A5B44]';

  if (isPlaying && !isStoppingSmoothly) {
    playButtonLabel = 'Pausar (al centro)';
    playButtonIcon = 'pause';
    playButtonBg = 'bg-[#593E2B] hover:bg-[#724e37]';
  } else if (isStoppingSmoothly) {
    playButtonLabel = 'Volviendo al centro...';
    playButtonIcon = 'hourglass_top';
    playButtonBg = 'bg-amber-600';
  } else {
    playButtonLabel = 'Iniciar';
    playButtonIcon = 'play_arrow';
    playButtonBg = 'bg-[#1B3B2B] hover:bg-[#2A5B44]';
  }

  const isAudioOnly = modality === 'audio-only';

  return (
    <div className="absolute bottom-3 inset-x-3 sm:inset-x-6 z-20 pointer-events-none flex justify-center">
      <div className="pointer-events-auto bg-white/95 backdrop-blur-md border border-[#DCE3DC] rounded-2xl px-4 py-2.5 shadow-md flex items-center justify-between gap-3 max-w-3xl w-full transition-all duration-300">
        {/* Botón Iniciar / Pausa suave */}
        <button
          onClick={onPlayToggle}
          className={`h-11 px-5 rounded-xl ${playButtonBg} active:scale-[0.98] text-white font-display font-semibold text-xs shadow-sm flex items-center justify-center gap-2 transition-all shrink-0 cursor-pointer`}
        >
          <span className="material-symbols-outlined text-[22px]">{playButtonIcon}</span>
          <span className="tracking-tight text-xs font-semibold">{playButtonLabel}</span>
        </button>

        {/* SECCIÓN DE VELOCIDAD CON EXPANSIÓN TIPO ACORDEÓN */}
        <div
          id="speed-accordion-wrapper"
          className={`flex-1 flex items-center gap-3 transition-all duration-300 ${
            isExpanded ? 'expanded' : ''
          }`}
        >
          <div className="flex flex-col gap-1 w-full">
            <div className="flex items-center justify-between text-xs leading-none">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-[#5B6960] flex items-center gap-1 font-mono">
                {isAudioOnly ? 'Frecuencia de Audio Bilateral' : 'Velocidad / Frecuencia'}
              </span>
              <div className="flex items-center gap-1.5 font-mono">
                <span className="font-bold text-xs text-[#1B3B2B]">Nvl {level}</span>
                <span className="text-neutral-400 text-[10px]">{frequency.toFixed(2)} Hz</span>
              </div>
            </div>

            {/* Barra con deslizador interactivo */}
            <div className="flex items-center gap-2">
              <button
                onClick={stepMinus}
                className="text-[#5B6960] hover:text-[#1B3B2B] w-6 h-6 rounded flex items-center justify-center hover:bg-[#EFF2EE] font-bold text-sm select-none cursor-pointer"
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
                className="w-full h-2.5 bg-[#EFF2EE] rounded-lg accent-[#1B3B2B] cursor-pointer transition-all"
              />
              <button
                onClick={stepPlus}
                className="text-[#5B6960] hover:text-[#1B3B2B] w-6 h-6 rounded flex items-center justify-center hover:bg-[#EFF2EE] font-bold text-sm select-none cursor-pointer"
              >
                +
              </button>
            </div>

            {/* Micro-medidor acordeón de niveles (1-20) visible al expandir */}
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

        {/* SELECTOR RÁPIDO CONTEXTUAL: Trayectorias si es visual, o Timbres de sonido si es solo auditivo */}
        {!isAudioOnly ? (
          <div className="hidden sm:flex items-center gap-1 bg-[#EFF2EE] p-1 rounded-xl border border-[#DCE3DC]/50 shrink-0">
            <button
              onClick={() => onSelectTrajectory('horizontal')}
              className={`p-1.5 rounded-lg text-[11px] font-medium flex items-center gap-1 px-2.5 transition-all cursor-pointer ${
                activeTrajectory === 'horizontal'
                  ? 'text-[#1B3B2B] bg-white shadow-2xs font-semibold'
                  : 'text-[#5B6960] hover:text-[#17231D]'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">swap_horiz</span>
              <span>Horizontal</span>
            </button>
            <button
              onClick={() => onSelectTrajectory('infinity')}
              className={`p-1.5 rounded-lg text-[11px] font-medium flex items-center gap-1 px-2.5 transition-all cursor-pointer ${
                activeTrajectory === 'infinity'
                  ? 'text-[#1B3B2B] bg-white shadow-2xs font-semibold'
                  : 'text-[#5B6960] hover:text-[#17231D]'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">all_inclusive</span>
              <span>Infinito</span>
            </button>
            <button
              onClick={() => onSelectTrajectory('vertical')}
              className={`p-1.5 rounded-lg text-[11px] font-medium flex items-center gap-1 px-2.5 transition-all cursor-pointer ${
                activeTrajectory === 'vertical'
                  ? 'text-[#1B3B2B] bg-white shadow-2xs font-semibold'
                  : 'text-[#5B6960] hover:text-[#17231D]'
              }`}
            >
              <span className="material-symbols-outlined text-[15px]">swap_vert</span>
              <span>Vertical</span>
            </button>
          </div>
        ) : (
          <div className="hidden sm:flex items-center gap-1 bg-[#EFF2EE] p-1 rounded-xl border border-[#DCE3DC]/50 shrink-0">
            <button
              onClick={() => onSelectSound('heartbeat')}
              className={`p-1.5 rounded-lg text-[11px] font-medium flex items-center gap-1 px-2.5 transition-all cursor-pointer ${
                soundType === 'heartbeat'
                  ? 'text-[#1B3B2B] bg-white shadow-2xs font-semibold'
                  : 'text-[#5B6960] hover:text-[#17231D]'
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">favorite</span>
              <span>Latido</span>
            </button>
            <button
              onClick={() => onSelectSound('tibetan')}
              className={`p-1.5 rounded-lg text-[11px] font-medium flex items-center gap-1 px-2.5 transition-all cursor-pointer ${
                soundType === 'tibetan'
                  ? 'text-[#1B3B2B] bg-white shadow-2xs font-semibold'
                  : 'text-[#5B6960] hover:text-[#17231D]'
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">notifications</span>
              <span>Cuenco</span>
            </button>
            <button
              onClick={() => onSelectSound('water')}
              className={`p-1.5 rounded-lg text-[11px] font-medium flex items-center gap-1 px-2.5 transition-all cursor-pointer ${
                soundType === 'water'
                  ? 'text-[#1B3B2B] bg-white shadow-2xs font-semibold'
                  : 'text-[#5B6960] hover:text-[#17231D]'
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">water_drop</span>
              <span>Gota</span>
            </button>
            <button
              onClick={() => onSelectSound('click')}
              className={`p-1.5 rounded-lg text-[11px] font-medium flex items-center gap-1 px-2.5 transition-all cursor-pointer ${
                soundType === 'click'
                  ? 'text-[#1B3B2B] bg-white shadow-2xs font-semibold'
                  : 'text-[#5B6960] hover:text-[#17231D]'
              }`}
            >
              <span className="material-symbols-outlined text-[14px]">touch_app</span>
              <span>Click</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
