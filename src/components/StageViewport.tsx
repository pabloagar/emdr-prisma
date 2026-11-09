import React, { useEffect, useRef, useState, useCallback } from 'react';
import { SessionSettings, PaletteDef } from '../types';
import { TRAJECTORIES } from '../constants';
import { audioEngine } from '../audio';

interface StageViewportProps {
  settings: SessionSettings;
  palette: PaletteDef;
  isPlaying: boolean;
  isStoppingSmoothly: boolean;
  onSmoothStopFinished: () => void;
  onPassIncrement: () => void;
  isPatient: boolean;
  onAudioUnlock: () => void;
  isAudioUnlocked: boolean;
}

export const StageViewport: React.FC<StageViewportProps> = ({
  settings,
  palette,
  isPlaying,
  isStoppingSmoothly,
  onSmoothStopFinished,
  onPassIncrement,
  isPatient,
  onAudioUnlock,
  isAudioUnlocked
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  const [activeSide, setActiveSide] = useState<'L' | 'R' | null>(null);
  const [currentPos, setCurrentPos] = useState({ fx: 0.5, fy: 0.5, nx: 0, ny: 0, lat: 0 });

  const currentPosRef = useRef({ fx: 0.5, fy: 0.5, nx: 0, ny: 0, lat: 0 });
  const animIdRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number | null>(null);
  const lastSideRef = useRef<'left' | 'right' | 'center'>('center');

  const settingsRef = useRef(settings);
  settingsRef.current = settings;

  const onPassIncrementRef = useRef(onPassIncrement);
  onPassIncrementRef.current = onPassIncrement;

  const onSmoothStopFinishedRef = useRef(onSmoothStopFinished);
  onSmoothStopFinishedRef.current = onSmoothStopFinished;

  // Acumulador continuo de fase
  const phaseRef = useRef<number>(0);
  const startEntranceProgressRef = useRef<number>(1);

  // Control estricto de paro suave (sin reseteos accidentales)
  const wasStoppingRef = useRef<boolean>(false);
  const stopProgressRef = useRef<number>(0);
  const stopStartPosRef = useRef<{ nx: number; ny: number }>({ nx: 0, ny: 0 });

  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

  const getCenterFrac = (posY: 'top' | 'center' | 'bottom') => {
    return posY === 'top' ? 0.32 : posY === 'bottom' ? 0.68 : 0.5;
  };

  const centerFrac = useCallback(() => {
    return getCenterFrac(settings.posY);
  }, [settings.posY]);

  // Color efectivo del estímulo (personalizado o de la paleta)
  const stimulusColor = settings.stimulusColor || palette.primary;

  // Al solicitar pausa suave, registrar posición de origen UNA SOLA VEZ
  useEffect(() => {
    if (isStoppingSmoothly && !wasStoppingRef.current) {
      stopProgressRef.current = 0;
      stopStartPosRef.current = {
        nx: currentPosRef.current.nx,
        ny: currentPosRef.current.ny
      };
    }
    wasStoppingRef.current = isStoppingSmoothly;
  }, [isStoppingSmoothly]);

  // Al iniciar, arrancar desde el centro (0, 0)
  useEffect(() => {
    if (isPlaying && !isStoppingSmoothly) {
      phaseRef.current = 0;
      startEntranceProgressRef.current = 0;
      lastTimestampRef.current = null;
      lastSideRef.current = 'center';
    }
  }, [isPlaying, isStoppingSmoothly]);

  // Bucle de animación continuo y suave
  useEffect(() => {
    if (!isPlaying && !isStoppingSmoothly) {
      if (animIdRef.current) {
        cancelAnimationFrame(animIdRef.current);
        animIdRef.current = null;
      }
      return;
    }

    const render = (timestamp: number) => {
      const s = settingsRef.current;
      if (!lastTimestampRef.current) lastTimestampRef.current = timestamp;
      const delta = Math.min((timestamp - lastTimestampRef.current) / 1000, 0.06);
      lastTimestampRef.current = timestamp;

      let nx = 0;
      let ny = 0;
      let lat = 0;
      let thr = 0.88;

      if (isStoppingSmoothly) {
        // Desaceleración gradual al centro (dura aprox 0.85s)
        stopProgressRef.current += delta * 1.2;
        if (stopProgressRef.current >= 1) {
          nx = 0;
          ny = 0;
          lat = 0;
          const cy = getCenterFrac(s.posY);
          const finalPos = { fx: 0.5, fy: cy, nx: 0, ny: 0, lat: 0 };
          currentPosRef.current = finalPos;
          setCurrentPos(finalPos);
          onSmoothStopFinishedRef.current();
          return;
        } else {
          const ease = 1 - Math.pow(1 - stopProgressRef.current, 3);
          nx = stopStartPosRef.current.nx * (1 - ease);
          ny = stopStartPosRef.current.ny * (1 - ease);
          lat = nx;
        }
      } else {
        // Acumular fase continuamente para que cambiar velocidad no dé saltos
        phaseRef.current += delta * s.frequency * 2 * Math.PI;
        const cycle = phaseRef.current;

        // Rampa suave de arranque desde centro
        startEntranceProgressRef.current = Math.min(1, startEntranceProgressRef.current + delta * 2.5);
        const entranceEase = 1 - Math.pow(1 - startEntranceProgressRef.current, 2);

        if (s.stimulus === 'edges') {
          const phase = Math.sin(cycle);
          nx = phase >= 0 ? 1 : -1;
          ny = 0;
          lat = nx;
          thr = 0.5;
        } else if (['sweep', 'led-bar'].includes(s.stimulus)) {
          const normPhase = ((cycle / (2 * Math.PI)) % 1 + 1) % 1;
          const tri = normPhase < 0.5 ? normPhase * 4 - 1 : 3 - normPhase * 4;
          nx = tri * entranceEase;
          ny = 0;
          lat = nx;
          thr = 0.95;
        } else {
          const T = TRAJECTORIES[s.trajectory] || TRAJECTORIES.horizontal;
          const r = T.fn(cycle);
          nx = r[0] * entranceEase;
          ny = r[1] * entranceEase;
          lat = r.length > 2 && r[2] !== undefined ? r[2] : T.axis === 'y' ? r[1] : r[0];
          thr = 0.88;
        }
      }

      const cy = getCenterFrac(s.posY);
      const fx = clamp(0.5 + nx * 0.5 * s.amplitude, 0.02, 0.98);
      const fy = clamp(cy + ny * 0.38, 0.05, 0.95);

      const nextPos = { fx, fy, nx, ny, lat };
      currentPosRef.current = nextPos;
      setCurrentPos(nextPos);

      // Detección L/R: cuenta pasadas en todas las modalidades; el audio no suena en «solo visual».
      if (!isStoppingSmoothly) {
        const withSound = s.modality !== 'visual-only';
        if (lat <= -thr && lastSideRef.current !== 'left') {
          lastSideRef.current = 'left';
          onPassIncrementRef.current();
          setActiveSide('L');
          if (withSound) audioEngine.playSound('L', s.soundType, s.soundActive);
          setTimeout(() => setActiveSide(null), 120);
        } else if (lat >= thr && lastSideRef.current !== 'right') {
          lastSideRef.current = 'right';
          onPassIncrementRef.current();
          setActiveSide('R');
          if (withSound) audioEngine.playSound('R', s.soundType, s.soundActive);
          setTimeout(() => setActiveSide(null), 120);
        }
      }

      animIdRef.current = requestAnimationFrame(render);
    };

    animIdRef.current = requestAnimationFrame(render);

    return () => {
      if (animIdRef.current) {
        cancelAnimationFrame(animIdRef.current);
        animIdRef.current = null;
      }
    };
  }, [isPlaying, isStoppingSmoothly]);

  const isAudioOnly = settings.modality === 'audio-only';
  const isExperimental = ['led-bar', 'sweep', 'edges'].includes(settings.stimulus);

  // Renderizador de figuras geométricas y siluetas
  const renderShapeContent = () => {
    const col = stimulusColor;

    switch (settings.stimulus) {
      case 'circle':
        return (
          <div
            className="w-full h-full rounded-full shadow-xs"
            style={{ backgroundColor: col }}
          />
        );
      case 'drop':
        return (
          <svg viewBox="0 0 24 24" className="w-full h-full drop-shadow-xs" style={{ color: col }}>
            <path fill="currentColor" d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
          </svg>
        );
      case 'heart':
        return (
          <svg viewBox="0 0 24 24" className="w-full h-full drop-shadow-xs" style={{ color: col }}>
            <path
              fill="currentColor"
              d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"
            />
          </svg>
        );
      case 'diamond':
        return (
          <svg viewBox="0 0 24 24" className="w-full h-full drop-shadow-xs" style={{ color: col }}>
            <path fill="currentColor" d="M12 2L2 12l10 10 10-10L12 2z" />
          </svg>
        );
      case 'star':
        return (
          <svg viewBox="0 0 24 24" className="w-full h-full drop-shadow-xs" style={{ color: col }}>
            <path
              fill="currentColor"
              d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"
            />
          </svg>
        );
      default:
        return (
          <div
            className="w-full h-full rounded-full shadow-xs"
            style={{ backgroundColor: col }}
          />
        );
    }
  };

  return (
    <div
      ref={containerRef}
      className={`flex-1 h-full flex flex-col relative overflow-hidden transition-colors duration-300 select-none ${
        isPatient ? 'rounded-none border-none' : 'rounded-2xl sm:rounded-3xl border border-[#DCE3DC] shadow-sm'
      }`}
      style={{ backgroundColor: settings.bg }}
      onClick={() => {
        if (!isAudioUnlocked) onAudioUnlock();
      }}
    >
      {/* Micro-barra superior del lienzo (estado y L/R): solo para el profesional */}
      {!isPatient && (
        <div className="absolute top-0 inset-x-0 h-10 px-4 flex items-center justify-between text-xs z-20 pointer-events-none select-none">
          <div className="flex items-center gap-2 pointer-events-auto">
            {/* Indicador de estado discreto */}
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-black/5 text-[#17231D]/80 border border-black/5">
              <span
                className={`w-2 h-2 rounded-full ${
                  isPlaying && !isStoppingSmoothly
                    ? 'bg-emerald-500 animate-ping'
                    : isStoppingSmoothly
                    ? 'bg-amber-500 animate-pulse'
                    : 'bg-neutral-400'
                }`}
              />
              <span>
                {isAudioOnly ? (
                  isPlaying && !isStoppingSmoothly ? (
                    'Audio Bilateral Activo'
                  ) : isStoppingSmoothly ? (
                    'Pausando audio...'
                  ) : (
                    'Audio en Reposo'
                  )
                ) : isPlaying && !isStoppingSmoothly ? (
                  'Estimulando'
                ) : isStoppingSmoothly ? (
                  'Volviendo al centro...'
                ) : (
                  'En reposo'
                )}
              </span>
            </div>

            {!isAudioOnly && (
              <>
                <span className="text-neutral-400 text-xs hidden sm:inline">·</span>
                <span className="text-neutral-500 text-[11px] font-medium hidden sm:inline">
                  {TRAJECTORIES[settings.trajectory]?.name || 'Horizontal'}
                </span>
              </>
            )}

            {isAudioOnly && (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                Solo Auditivo
              </span>
            )}
          </div>

          {/* Indicador estéreo L / R */}
          <div className="flex items-center gap-1 font-mono text-[10px] font-semibold text-neutral-400 pointer-events-auto">
            <span
              className="w-5 h-5 rounded flex items-center justify-center transition-all duration-100"
              style={{
                backgroundColor: activeSide === 'L' ? stimulusColor : 'rgba(0,0,0,0.06)',
                color: activeSide === 'L' ? '#FFFFFF' : 'inherit'
              }}
            >
              L
            </span>
            <span
              className="w-5 h-5 rounded flex items-center justify-center transition-all duration-100"
              style={{
                backgroundColor: activeSide === 'R' ? stimulusColor : 'rgba(0,0,0,0.06)',
                color: activeSide === 'R' ? '#FFFFFF' : 'inherit'
              }}
            >
              R
            </span>
          </div>
        </div>
      )}

      {/* Escenario Activo */}
      <div className="relative flex-1 w-full h-full overflow-hidden">
        {/* Guía horizontal opcional (solo en modo visual) */}
        {settings.showGuideLine && !isAudioOnly && (!isPatient || !isAudioOnly) && (
          <div
            className="absolute -translate-y-1/2 h-[1px] border-b border-dashed border-[#1B3B2B]/20 pointer-events-none transition-all duration-300"
            style={{
              top: `${centerFrac() * 100}%`,
              left: `${(1 - settings.amplitude) * 50}%`,
              right: `${(1 - settings.amplitude) * 50}%`
            }}
          />
        )}

        {/* Punto central discreto (solo en modo visual) */}
        {settings.showCenterAnchor && !isAudioOnly && (
          <div
            className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full pointer-events-none transition-opacity duration-300"
            style={{
              top: `${centerFrac() * 100}%`,
              backgroundColor: `${stimulusColor}35`,
              opacity: isPlaying && !isStoppingSmoothly ? 0 : 0.6
            }}
          />
        )}

        {/* MODO SOLO AUDITIVO */}
        {isAudioOnly && !isPatient && (
          /* Terapeuta: monitor visual discreto para supervisar la alternancia estéreo */
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none select-none text-center px-4">
            <div className="relative flex items-center justify-center mb-3">
              {/* Pulso Izquierdo */}
              <div
                className={`w-12 h-12 rounded-full border-2 border-dashed flex items-center justify-center transition-all duration-150 mr-2 ${
                  activeSide === 'L' ? 'scale-125 opacity-100 shadow-md' : 'scale-95 opacity-25'
                }`}
                style={{
                  borderColor: stimulusColor,
                  backgroundColor: activeSide === 'L' ? `${stimulusColor}15` : 'transparent'
                }}
              >
                <span className="font-mono text-xs font-bold" style={{ color: stimulusColor }}>L</span>
              </div>

              {/* Centro: Auriculares */}
              <div className="w-16 h-16 rounded-full bg-white/80 backdrop-blur-xs border border-[#DCE3DC] shadow-xs flex items-center justify-center z-10">
                <span
                  className="material-symbols-outlined text-[32px] transition-transform duration-150"
                  style={{
                    color: isPlaying ? stimulusColor : '#5B6960',
                    transform: activeSide ? (activeSide === 'L' ? 'scale(1.15) rotate(-6deg)' : 'scale(1.15) rotate(6deg)') : 'scale(1)'
                  }}
                >
                  headphones
                </span>
              </div>

              {/* Pulso Derecho */}
              <div
                className={`w-12 h-12 rounded-full border-2 border-dashed flex items-center justify-center transition-all duration-150 ml-2 ${
                  activeSide === 'R' ? 'scale-125 opacity-100 shadow-md' : 'scale-95 opacity-25'
                }`}
                style={{
                  borderColor: stimulusColor,
                  backgroundColor: activeSide === 'R' ? `${stimulusColor}15` : 'transparent'
                }}
              >
                <span className="font-mono text-xs font-bold" style={{ color: stimulusColor }}>R</span>
              </div>
            </div>

            <span className="text-xs font-semibold text-[#17231D]">
              Modo Solo Auditivo Activo
            </span>
            <span className="text-[11px] text-[#5B6960] mt-0.5">
              {isPlaying
                ? activeSide === 'L'
                  ? '← Estimulación en oído izquierdo'
                  : activeSide === 'R'
                  ? 'Estimulación en oído derecho →'
                  : 'Alternancia bilateral activa'
                : 'Pulsa Iniciar para emitir el audio bilateral'}
            </span>
            <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full mt-2">
              El paciente escucha la estimulación y no ve ningún estímulo en su pantalla
            </span>
          </div>
        )}

        {/* MODO VISUAL: Elementos Cinéticos */}
        {!isAudioOnly && (
          <>
            {/* Barra LED */}
            {settings.stimulus === 'led-bar' && (
              <div
                className="led-bar-track"
                style={{
                  top: `${centerFrac() * 100}%`,
                  left: `${(1 - settings.amplitude) * 50}%`,
                  right: `${(1 - settings.amplitude) * 50}%`
                }}
              >
                {Array.from({ length: 15 }).map((_, idx) => {
                  const normIdx = ((currentPos.nx + 1) / 2) * 14;
                  const dist = Math.abs(idx - normIdx);
                  let bg = 'rgba(0,0,0,0.12)';
                  let scale = 'scale(1)';
                  let shadow = 'none';
                  let opacity = 1;

                  if (dist < 0.75) {
                    bg = stimulusColor;
                    scale = 'scale(1.45)';
                    shadow = `0 0 12px ${stimulusColor}`;
                  } else if (dist < 1.6) {
                    bg = stimulusColor;
                    opacity = 0.35;
                    scale = 'scale(1.08)';
                  }

                  return (
                    <div
                      key={idx}
                      className="led-bar-dot"
                      style={{
                        backgroundColor: bg,
                        transform: scale,
                        boxShadow: shadow,
                        opacity
                      }}
                    />
                  );
                })}
              </div>
            )}

            {/* Línea de barrido (sweep) */}
            {settings.stimulus === 'sweep' && (
              <div
                className="sweep-line"
                style={{
                  left: `${currentPos.fx * 100}%`,
                  backgroundColor: stimulusColor,
                  width: `${Math.max(3, Math.round(settings.dotSize / 7))}px`,
                  boxShadow: `0 0 14px ${stimulusColor}`
                }}
              />
            )}

            {/* Luces de borde (edges on/off instantáneas con lado contralateral 100% apagado) */}
            {settings.stimulus === 'edges' && (
              <>
                <div
                  className="edge-light-left"
                  style={{
                    backgroundColor: stimulusColor,
                    width: `${Math.max(20, settings.dotSize * 0.9)}px`,
                    opacity: isStoppingSmoothly ? 0 : currentPos.lat <= 0 ? 1 : 0,
                    transform: currentPos.lat <= 0 && !isStoppingSmoothly ? 'scale(1.15)' : 'scale(1)',
                    boxShadow:
                      currentPos.lat <= 0 && !isStoppingSmoothly ? `0 0 24px ${stimulusColor}` : 'none'
                  }}
                />
                <div
                  className="edge-light-right"
                  style={{
                    backgroundColor: stimulusColor,
                    width: `${Math.max(20, settings.dotSize * 0.9)}px`,
                    opacity: isStoppingSmoothly ? 0 : currentPos.lat > 0 ? 1 : 0,
                    transform: currentPos.lat > 0 && !isStoppingSmoothly ? 'scale(1.15)' : 'scale(1)',
                    boxShadow:
                      currentPos.lat > 0 && !isStoppingSmoothly ? `0 0 24px ${stimulusColor}` : 'none'
                  }}
                />
              </>
            )}

            {/* Figura Cinética Principal (Círculo, Gota, Corazón, Rombo, Estrella) */}
            {!isExperimental && (
              <div
                className="absolute -translate-x-1/2 -translate-y-1/2 will-change-transform flex items-center justify-center pointer-events-none"
                style={{
                  left: `${currentPos.fx * 100}%`,
                  top: `${currentPos.fy * 100}%`,
                  width: `${settings.dotSize}px`,
                  height: `${settings.dotSize}px`,
                  transition: 'none'
                }}
              >
                {renderShapeContent()}
              </div>
            )}
          </>
        )}

        {/* Prompt para desbloquear audio en paciente */}
        {isPatient && !isAudioUnlocked && (
          <div
            onClick={(e) => {
              e.stopPropagation();
              onAudioUnlock();
            }}
            className="absolute top-4 left-1/2 -translate-x-1/2 z-30 bg-white/95 backdrop-blur-md px-4 py-2 rounded-full border border-black/10 shadow-sm text-xs text-[#1B3B2B] font-medium flex items-center gap-2 cursor-pointer pointer-events-auto hover:bg-white"
          >
            <span className="material-symbols-outlined text-[18px]">volume_up</span>
            <span>Haz clic aquí para activar el sonido bilateral</span>
          </div>
        )}
      </div>
    </div>
  );
};
