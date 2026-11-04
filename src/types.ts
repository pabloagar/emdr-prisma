export type TrajectoryType =
  | 'horizontal'
  | 'vertical'
  | 'diagonal'
  | 'alternate'
  | 'infinity'
  | 'circular'
  | 'pendulum'
  | 'arc'
  | 'zigzag'
  | 'bounce'
  | 'smooth-random';

export type StimulusType =
  | 'circle'
  | 'soft'
  | 'ring'
  | 'led-bar'
  | 'sweep'
  | 'laser'
  | 'edges';

export type SoundType = 'heartbeat' | 'tibetan' | 'water' | 'click';

export type PaletteKey = 'salvia' | 'bruma' | 'lino';

export interface PaletteDef {
  key: PaletteKey;
  name: string;
  bg: string;
  primary: string;
  accent: string;
  subtle: string;
  muted: string;
  description: string;
}

export interface SessionSettings {
  level: number;
  frequency: number;
  trajectory: TrajectoryType;
  stimulus: StimulusType;
  soundActive: boolean;
  soundType: SoundType;
  dotSize: number;
  palette: PaletteKey;
  bg: string;
  amplitude: number;
  posY: 'top' | 'center' | 'bottom';
}

export interface PresetTemplate {
  id: string;
  name: string;
  palette: PaletteKey;
  bg: string;
  stimulus: StimulusType;
  dotSize: number;
  trajectory: TrajectoryType;
  level: number;
  frequency: number;
  amplitude: number;
  soundActive: boolean;
  soundType: SoundType;
}

export interface CustomTemplate {
  id: string;
  name: string;
  palette: PaletteKey;
  bg: string;
  stimulus: StimulusType;
  dotSize: number;
  trajectory: TrajectoryType;
  level: number;
  soundActive: boolean;
  soundType: SoundType;
  createdAt?: number;
}

export interface RemoteCredentials {
  roomId: string;
  token: string;
  patientToken?: string;
  expiresAt?: number;
}

export type Role = 'therapist' | 'patient';

export type KineticType = 'binary-instant' | 'linear-pingpong' | 'harmonic-classic';
