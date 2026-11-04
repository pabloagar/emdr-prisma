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
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [activeSide, setActiveSide] = useState<'L' | 'R' | null>(null);
  const [currentPos, setCurrentPos] = useState({ fx: 0.5, fy: 0.5, nx: 0, ny: 0, lat: 0 });

  const animIdRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const lastTimestampRef = useRef<number | null>(null);
  const lastSideRef = useRef<'left' | 'right' | 'center'>('center');
  const stopProgressRef = useRef(0);
  const stopStartPosRef = useRef({ nx: 0, ny: 0 });

  const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

  const getEffectiveKinetics = useCallback(() => {
    if (settings.stimulus === 'edges') return 'binary-instant';
    if (['sweep', 'laser', 'led-bar'].includes(settings.stimulus)) return 'linear-pingpong';
    return 'harmonic-classic';
  }, [settings.stimulus]);

  const centerFrac = useCallback(() => {
    return settings.posY === 'top' ? 0.32 : settings.posY === 'bottom' ? 0.68 : 0.5;
  }, [settings.posY]);

  // Posición de paro suave
  useEffect(() => {
    if (isStoppingSmoothly) {
      stopProgressRef.current = 0;
      stopStartPosRef.current = { nx: currentPos.nx, ny: currentPos.ny };
    }
  }, [isStoppingSmoothly, currentPos.nx, currentPos.ny]);

  // Reset al iniciar o detener
  useEffect(() => {
    if (isPlaying && !isStoppingSmoothly) {
      startTimeRef.current = null;
      lastTimestampRef.current = null;
    }
  }, [isPlaying, isStoppingSmoothly]);

  // Loop de animación principal
  useEffect(() => {
    if (!isPlaying && !isStoppingSmoothly) {
      if (animIdRef.current) cancelAnimationFrame(animIdRef.current);
      return;
    }

    const render = (timestamp: number) => {
      if (!startTimeRef.current) startTimeRef.current = timestamp;
      if (!lastTimestampRef.current) lastTimestampRef.current = timestamp;
      const delta = (timestamp - lastTimestampRef.current) / 1000;
      lastTimestampRef.current = timestamp;

      let nx = 0;
      let ny = 0;
      let lat = 0;
      let thr = 0.88;

      if (isStoppingSmoothly) {
        stopProgressRef.current += delta * 1.5;
        if (stopProgressRef.current >= 1) {
          setCurrentPos({ fx: 0.5, fy: centerFrac(), nx: 0, ny: 0, lat: 0 });
          onSmoothStopFinished();
          return;
        } else {
          const ease = 1 - Math.pow(1 - stopProgressRef.current, 3);
          nx = stopStartPosRef.current.nx * (1 - ease);
          ny = stopStartPosRef.current.ny * (1 - ease);
          lat = nx;
        }
      } else {
        const elapsed = (timestamp - startTimeRef.current) / 1000;
        const kinetics = getEffectiveKinetics();
        const cycle = 2 * Math.PI * settings.frequency * elapsed;

        if (kinetics === 'binary-instant') {
          const phase = Math.sin(cycle);
          nx = phase >= 0 ? 1 : -1;
          ny = 0;
          lat = nx;
          thr = 0.5;
        } else if (kinetics === 'linear-pingpong') {
          const p = (settings.frequency * elapsed) % 1;
          const tri = p < 0.5 ? p * 4 - 1 : 3 - p * 4;
          nx = tri;
          ny = 0;
          lat = nx;
          thr = 0.95;
        } else {
          const T = TRAJECTORIES[settings.trajectory] || TRAJECTORIES.horizontal;
          const r = T.fn(cycle);
          nx = r[0];
          ny = r[1];
          lat = r.length > 2 && r[2] !== undefined ? r[2] : T.axis === 'y' ? r[1] : r[0];
          thr = 0.88;
        }
      }

      const cy = centerFrac();
      const fx = clamp(0.5 + nx * 0.5 * settings.amplitude, 0.03, 0.97);
      const fy = clamp(cy + ny * 0.38, 0.05, 0.95);

      setCurrentPos({ fx, fy, nx, ny, lat });

      // Detección L/R y Audio
      if (!isStoppingSmoothly) {
        if (lat <= -thr && lastSideRef.current !== 'left') {
          lastSideRef.current = 'left';
          onPassIncrement();
          setActiveSide('L');
          audioEngine.playSound('L', settings.soundType, settings.soundActive);
          setTimeout(() => setActiveSide(null), 130);
        } else if (lat >= thr && lastSideRef.current !== 'right') {
          lastSideRef.current = 'right';
          onPassIncrement();
          setActiveSide('R');
          audioEngine.playSound('R', settings.soundType, settings.soundActive);
          setTimeout(() => setActiveSide(null), 130);
        }
      }

      animIdRef.current = requestAnimationFrame(render);
    };

    animIdRef.current = requestAnimationFrame(render);

    return () => {
      if (animIdRef.current) cancelAnimationFrame(animIdRef.current);
    };
  }, [
    isPlaying,
    isStoppingSmoothly,
    settings.frequency,
    settings.trajectory,
    settings.stimulus,
    settings.amplitude,
    settings.soundActive,
    settings.soundType,
    centerFrac,
    getEffectiveKinetics,
    onPassIncrement,
    onSmoothStopFinished
  ]);

  // Dibujar Canvas Láser cuando se use el estímulo 'laser'
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const W = canvas.clientWidth;
    const H = canvas.clientHeight;
    if (!W || !H) return;

    const dpr = window.devicePixelRatio || 1;
    if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) {
      canvas.width = Math.round(W * dpr);
      canvas.height = Math.round(H * dpr);
    }
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, W, H);

    if (settings.stimulus === 'laser') {
      const ox = W * 0.5;
      const oy = H * 0.04;
      const tx = currentPos.fx * W;
      const ty = currentPos.fy * H;
      const col = palette.primary;

      ctx.save();
      ctx.strokeStyle = col;
      ctx.globalAlpha = 0.25;
      ctx.lineWidth = Math.max(3, settings.dotSize * 0.35);
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(tx, ty);
      ctx.stroke();

      ctx.globalAlpha = 0.95;
      ctx.lineWidth = Math.max(1.5, settings.dotSize * 0.12);
      ctx.strokeStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.moveTo(ox, oy);
      ctx.lineTo(tx, ty);
      ctx.stroke();

      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(tx, ty, Math.max(5, settings.dotSize * 0.22), 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }, [currentPos, settings.stimulus, settings.dotSize, palette.primary]);

  // Etiqueta de estado
  let statusText = 'En Reposo';
  let statusClass = 'w-2 h-2 rounded-full bg-neutral-400';
  let statusPillClass =
    'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-black/5 text-[#17231D] border border-black/5';

  if (isPlaying && !isStoppingSmoothly) {
    statusText = 'Estimulando';
    statusClass = 'w-2 h-2 rounded-full bg-emerald-500 animate-ping';
    statusPillClass =
      'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-900 border border-emerald-200/60 shadow-xs';
  } else if (isStoppingSmoothly) {
    statusText = 'Retornando al centro...';
    statusClass = 'w-2 h-2 rounded-full bg-amber-500 animate-pulse';
    statusPillClass =
      'inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-amber-50 text-amber-900 border border-amber-200/60 shadow-xs';
  }

  const kineticsDescription =
    settings.stimulus === 'edges'
      ? 'Binario On/Off instantáneo'
      : ['sweep', 'laser', 'led-bar'].includes(settings.stimulus)
      ? 'Traslación continua lineal (ping-pong)'
      : `${TRAJECTORIES[settings.trajectory]?.name || 'Horizontal'} armónico`;

  const isClassicBall =
    settings.stimulus === 'circle' || settings.stimulus === 'soft' || settings.stimulus === 'ring';

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
      {/* Micro-barra superior del lienzo */}
      <div className="absolute top-0 inset-x-0 h-10 px-4 flex items-center justify-between text-xs z-20 pointer-events-none select-none">
        <div className="flex items-center gap-2 pointer-events-auto">
          <div className={statusPillClass}>
            <span className={statusClass}></span>
            <span>{statusText}</span>
          </div>
          <span className="text-neutral-400 text-xs hidden sm:inline">·</span>
          <span className="text-neutral-600 font-mono text-[11px] hidden sm:inline">
            {TRAJECTORIES[settings.trajectory]?.name || 'Horizontal'} (
            {TRAJECTORIES[settings.trajectory]?.badge || 'estándar'})
          </span>
          <span className="text-neutral-400 text-xs hidden sm:inline">·</span>
          <span className="text-neutral-700 font-mono text-[10px] px-1.5 py-0.5 rounded bg-black/5 hidden md:inline">
            {kineticsDescription}
          </span>
        </div>

        {/* Indicador estéreo L / R */}
        <div className="flex items-center gap-1 font-mono text-[10px] font-semibold text-neutral-400 pointer-events-auto">
          <span
            className="w-6 h-5 rounded flex items-center justify-center transition-all duration-100"
            style={{
              backgroundColor: activeSide === 'L' ? palette.primary : 'rgba(0,0,0,0.06)',
              color: activeSide === 'L' ? '#FFFFFF' : 'inherit'
            }}
          >
            L
          </span>
          <span
            className="w-6 h-5 rounded flex items-center justify-center transition-all duration-100"
            style={{
              backgroundColor: activeSide === 'R' ? palette.primary : 'rgba(0,0,0,0.06)',
              color: activeSide === 'R' ? '#FFFFFF' : 'inherit'
            }}
          >
            R
          </span>
        </div>
      </div>

      {/* Escenario Activo */}
      <div className="relative flex-1 w-full h-full overflow-hidden">
        {/* Guía horizontal y ancla de centro */}
        <div
          className="absolute inset-x-8 -translate-y-1/2 h-[1px] border-b border-dashed border-[#1B3B2B]/15 pointer-events-none"
          style={{ top: `${centerFrac() * 100}%` }}
        />
        <div
          className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 w-2 h-2 rounded-full pointer-events-none transition-opacity duration-300"
          style={{
            top: `${centerFrac() * 100}%`,
            backgroundColor: `${palette.primary}40`,
            opacity: isPlaying && !isStoppingSmoothly ? 0 : 1
          }}
        />

        {/* Canvas FX para láser */}
        <canvas ref={canvasRef} className="fx-canvas" />

        {/* Barra LED (15 puntos cinéticos) */}
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
                bg = palette.primary;
                scale = 'scale(1.45)';
                shadow = `0 0 12px ${palette.primary}`;
              } else if (dist < 1.6) {
                bg = palette.primary;
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
              backgroundColor: palette.primary,
              width: `${Math.max(3, Math.round(settings.dotSize / 7))}px`,
              boxShadow: `0 0 14px ${palette.primary}`
            }}
          />
        )}

        {/* Luces de borde (edges on/off instantáneas) */}
        {settings.stimulus === 'edges' && (
          <>
            <div
              className="edge-light-left"
              style={{
                backgroundColor: palette.primary,
                width: `${Math.max(20, settings.dotSize * 0.9)}px`,
                opacity: currentPos.lat <= 0 ? 1 : 0.04,
                transform: currentPos.lat <= 0 ? 'scale(1.15)' : 'scale(1)',
                boxShadow: currentPos.lat <= 0 ? `0 0 20px ${palette.primary}` : 'none'
              }}
            />
            <div
              className="edge-light-right"
              style={{
                backgroundColor: palette.primary,
                width: `${Math.max(20, settings.dotSize * 0.9)}px`,
                opacity: currentPos.lat > 0 ? 1 : 0.04,
                transform: currentPos.lat > 0 ? 'scale(1.15)' : 'scale(1)',
                boxShadow: currentPos.lat > 0 ? `0 0 20px ${palette.primary}` : 'none'
              }}
            />
          </>
        )}

        {/* Bola / Estímulo Cinético Principal (Sólido, Bruma, Anillo) */}
        {isClassicBall && (
          <div
            className="absolute -translate-x-1/2 -translate-y-1/2 shadow-sm will-change-transform rounded-full transition-shadow duration-75"
            style={{
              left: `${currentPos.fx * 100}%`,
              top: `${currentPos.fy * 100}%`,
              width: `${settings.dotSize}px`,
              height: `${settings.dotSize}px`,
              backgroundColor: settings.stimulus === 'ring' ? 'transparent' : palette.primary,
              border:
                settings.stimulus === 'ring'
                  ? `${Math.max(2, Math.round(settings.dotSize / 7))}px solid ${palette.primary}`
                  : 'none',
              filter: settings.stimulus === 'soft' ? 'blur(3.5px)' : 'none'
            }}
          />
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
