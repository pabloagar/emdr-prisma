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

export type StimulusShape =
  | 'circle'
  | 'drop'
  | 'heart'
  | 'diamond'
  | 'star'
  | 'led-bar'
  | 'sweep'
  | 'laser'
  | 'edges';

export type StimulationModality = 'both' | 'audio-only' | 'visual-only';

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
  stimulus: StimulusShape;
  stimulusColor: string | null;
  modality: StimulationModality;
  soundActive: boolean;
  soundType: SoundType;
  dotSize: number;
  palette: PaletteKey;
  bg: string;
  amplitude: number;
  posY: 'top' | 'center' | 'bottom';
  showGuideLine: boolean;
  showCenterAnchor: boolean;
}

export interface PresetTemplate {
  id: string;
  name: string;
  palette: PaletteKey;
  bg: string;
  stimulus: StimulusShape;
  stimulusColor?: string | null;
  modality?: StimulationModality;
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
  stimulus: StimulusShape;
  stimulusColor?: string | null;
  modality?: StimulationModality;
  dotSize: number;
  trajectory: TrajectoryType;
  level: number;
  soundActive: boolean;
  soundType: SoundType;
  amplitude?: number;
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
