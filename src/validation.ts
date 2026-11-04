import { SessionSettings } from './types';

export const allowedTrajectories = [
  'horizontal',
  'vertical',
  'diagonal',
  'infinity',
  'circle',
  'circular',
  'ellipse',
  'figure-eight',
  'pendulum',
  'alternate',
  'random',
  'spiral',
  'arc',
  'zigzag',
  'bounce',
  'smooth-random'
];

export const allowedStimuli = ['circle', 'soft', 'ring', 'sweep', 'laser', 'led-bar', 'edges'];
export const allowedSounds = ['heartbeat', 'tibetan', 'water', 'click', 'wood', 'soft', 'tone', 'silence'];
export const hexRegex = /^#[0-9a-fA-F]{6}$/;

export function cleanSettings(value: Record<string, unknown>): Partial<SessionSettings> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error('Configuración inválida');
  }
  const number = (v: unknown, min: number, max: number): v is number =>
    typeof v === 'number' && Number.isFinite(v) && v >= min && v <= max;

  const out: Record<string, unknown> = {};

  if (value.level !== undefined) {
    if (!Number.isInteger(value.level) || !number(value.level, 1, 20)) {
      throw new Error('Nivel inválido');
    }
    out.level = value.level;
  }
  if (value.frequency !== undefined) {
    if (!number(value.frequency, 0.1, 5.0)) throw new Error('Frecuencia inválida');
    out.frequency = value.frequency;
  }
  if (value.trajectory !== undefined) {
    if (
      typeof value.trajectory !== 'string' ||
      value.trajectory.length > 40 ||
      !/^[a-z0-9-]+$/.test(value.trajectory)
    ) {
      throw new Error('Trayectoria inválida');
    }
    out.trajectory = value.trajectory;
  }
  if (value.stimulus !== undefined) {
    if (typeof value.stimulus !== 'string' || !allowedStimuli.includes(value.stimulus)) {
      throw new Error('Estímulo inválido');
    }
    out.stimulus = value.stimulus;
  }
  if (value.soundType !== undefined) {
    if (
      typeof value.soundType !== 'string' ||
      value.soundType.length > 40 ||
      !/^[a-z0-9-]+$/.test(value.soundType)
    ) {
      throw new Error('Sonido inválido');
    }
    out.soundType = value.soundType;
  }
  if (value.soundActive !== undefined) {
    if (typeof value.soundActive !== 'boolean') throw new Error('Audio inválido');
    out.soundActive = value.soundActive;
  }
  if (value.dotSize !== undefined) {
    if (!number(value.dotSize, 5, 150)) throw new Error('Tamaño inválido');
    out.dotSize = value.dotSize;
  }
  if (value.palette !== undefined) {
    if (!['salvia', 'bruma', 'lino'].includes(value.palette as string)) {
      throw new Error('Paleta inválida');
    }
    out.palette = value.palette;
  }
  if (value.bg !== undefined) {
    if (typeof value.bg !== 'string' || !hexRegex.test(value.bg)) {
      throw new Error('Color inválido');
    }
    out.bg = value.bg;
  }
  if (value.amplitude !== undefined && number(value.amplitude, 0.1, 1)) {
    out.amplitude = value.amplitude;
  }
  if (value.posY !== undefined && ['top', 'center', 'bottom'].includes(value.posY as string)) {
    out.posY = value.posY;
  }

  if (Object.keys(out).length === 0) throw new Error('No hay parámetros');
  return out as Partial<SessionSettings>;
}

export const DEFAULT_SETTINGS: SessionSettings = {
  level: 8,
  frequency: 0.79,
  trajectory: 'horizontal',
  stimulus: 'circle',
  soundActive: true,
  soundType: 'heartbeat',
  dotSize: 32,
  palette: 'salvia',
  bg: '#faf8f5',
  amplitude: 0.85,
  posY: 'center'
};

export function safeParse<T = unknown>(text: string): T {
  if (typeof text !== 'string' || text.length > 4096) {
    throw new Error('Mensaje demasiado grande');
  }
  return JSON.parse(text) as T;
}
