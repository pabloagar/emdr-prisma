import { PaletteDef, PaletteKey, PresetTemplate, TrajectoryType } from './types';
export { DEFAULT_SETTINGS } from './validation';


export const PALETTES: Record<PaletteKey, PaletteDef> = {
  salvia: {
    key: 'salvia',
    name: 'Paleta 01 · Salvia',
    bg: '#faf8f5',
    primary: '#1B3B2B',
    accent: '#2A5B44',
    subtle: '#E8F0EB',
    muted: '#5B6960',
    description: 'Máxima atenuación del sistema nervioso simpático. Especialmente diseñada para procesamiento de traumas complejos en consulta privada.'
  },
  bruma: {
    key: 'bruma',
    name: 'Paleta 02 · Bruma',
    bg: '#F4F7F9',
    primary: '#1C364A',
    accent: '#2F6FA3',
    subtle: '#E3EDF5',
    muted: '#586A78',
    description: 'Azul zafiro costero con marfil limpio. Aporta precisión neurológica y frescura visual para pacientes con fatiga atencional.'
  },
  lino: {
    key: 'lino',
    name: 'Paleta 03 · Lino',
    bg: '#EFECE6',
    primary: '#2E2822',
    accent: '#6B5A49',
    subtle: '#E4DDD3',
    muted: '#70675E',
    description: 'Cálida, orgánica y protectora. Simula texturas de papel y algodón puro, ideal para pacientes con hipersensibilidad a pantallas.'
  }
};

export const QUICK_BG_OPTIONS = [
  { label: 'Salvia L.', bg: '#faf8f5', textLight: false },
  { label: 'Bruma L.', bg: '#F4F7F9', textLight: false },
  { label: 'Lino L.', bg: '#EFECE6', textLight: false },
  { label: 'Penumbra', bg: '#1F2723', textLight: true }
];

export const PRESET_TEMPLATES: Record<string, PresetTemplate> = {
  'trauma-agudo': {
    id: 'trauma-agudo',
    name: 'Trauma Agudo & Regulación',
    palette: 'salvia',
    bg: '#faf8f5',
    stimulus: 'circle',
    dotSize: 32,
    trajectory: 'horizontal',
    level: 6,
    frequency: 0.65,
    amplitude: 0.80,
    soundActive: true,
    soundType: 'heartbeat'
  },
  'foco-nitido': {
    id: 'foco-nitido',
    name: 'Foco Nítido & Desbloqueo',
    palette: 'bruma',
    bg: '#F4F7F9',
    stimulus: 'sweep',
    dotSize: 30,
    trajectory: 'infinity',
    level: 10,
    frequency: 0.95,
    amplitude: 0.90,
    soundActive: true,
    soundType: 'tibetan'
  },
  'hipersensibilidad': {
    id: 'hipersensibilidad',
    name: 'Hipersensibilidad & Calma Táctil',
    palette: 'lino',
    bg: '#EFECE6',
    stimulus: 'led-bar',
    dotSize: 28,
    trajectory: 'pendulum',
    level: 5,
    frequency: 0.55,
    amplitude: 0.70,
    soundActive: true,
    soundType: 'water'
  },
  'alternancia-rapida': {
    id: 'alternancia-rapida',
    name: 'Alternancia Rápida / Fobia',
    palette: 'salvia',
    bg: '#1F2723',
    stimulus: 'edges',
    dotSize: 34,
    trajectory: 'alternate',
    level: 12,
    frequency: 1.15,
    amplitude: 0.95,
    soundActive: true,
    soundType: 'click'
  }
};

export interface TrajDefinition {
  name: string;
  badge: string;
  axis?: 'x' | 'y';
  fn: (t: number) => [number, number, number?];
}

export const TRAJECTORIES: Record<TrajectoryType, TrajDefinition> = {
  horizontal: {
    name: 'Horizontal',
    badge: 'con estudios',
    fn: (t) => [Math.sin(t), 0]
  },
  vertical: {
    name: 'Vertical',
    badge: 'con estudios',
    axis: 'y',
    fn: (t) => [0, Math.sin(t) * 0.9, Math.sin(t)]
  },
  diagonal: {
    name: 'Diagonal',
    badge: 'poco evaluada',
    fn: (t) => [Math.sin(t), -0.75 * Math.sin(t)]
  },
  alternate: {
    name: 'Alternante',
    badge: 'uso online',
    fn: (t) => [Math.sin(t) >= 0 ? 1 : -1, 0]
  },
  infinity: {
    name: 'Infinito',
    badge: 'comercial',
    fn: (t) => [Math.sin(t), 0.55 * Math.sin(2 * t)]
  },
  circular: {
    name: 'Circular',
    badge: 'comercial',
    fn: (t) => [Math.sin(t), 0.65 * (1 - Math.cos(t)) - 0.325]
  },
  pendulum: {
    name: 'Péndulo',
    badge: 'comercial',
    fn: (t) => {
      const x = Math.sin(t);
      return [x, 0.38 * (x * x)];
    }
  },
  arc: {
    name: 'Arco',
    badge: 'comercial',
    fn: (t) => {
      const x = Math.sin(t);
      return [x, -0.38 * (x * x)];
    }
  },
  zigzag: {
    name: 'Zigzag',
    badge: 'experimental',
    fn: (t) => {
      const x = Math.sin(t);
      const phase = ((t / (Math.PI * 2)) * 3) % 1;
      const tri = phase < 0.5 ? (phase * 4 - 1) : (3 - phase * 4);
      return [x, 0.45 * tri];
    }
  },
  bounce: {
    name: 'Rebote',
    badge: 'experimental',
    fn: (t) => {
      const x = Math.sin(t);
      return [x, -0.55 * Math.abs(Math.sin(t))];
    }
  },
  'smooth-random': {
    name: 'Aleatorio suave',
    badge: 'experimental',
    fn: (t) => [
      Math.sin(t) * 0.75 + Math.sin(t * 0.5) * 0.25,
      Math.sin(t * 1.5) * 0.3 + Math.sin(t * 0.7) * 0.2
    ]
  }
};

export function frequencyFromLevel(lvl: number): number {
  const bounded = Math.max(1, Math.min(20, lvl));
  return 0.20 + ((bounded - 1) / 19) * 1.60;
}
