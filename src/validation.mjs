export const allowedTrajectories = ['horizontal','vertical','diagonal','infinity','circle','ellipse','figure-eight','pendulum','alternate','random','spiral'];
export const allowedStimuli = ['circle','soft','ring','sweep','laser','led-bar','edges'];
export const allowedSounds = ['heartbeat','tibetan','water','click','wood','soft','tone','silence'];
export const hex = /^#[0-9a-fA-F]{6}$/;
export function cleanSettings(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Configuración inválida');
  const number = (v,min,max) => typeof v === 'number' && Number.isFinite(v) && v>=min && v<=max;
  const out = {};
  if (value.level !== undefined) { if (!Number.isInteger(value.level) || !number(value.level,1,20)) throw new Error('Nivel inválido'); out.level=value.level; }
  if (value.trajectory !== undefined) { if (typeof value.trajectory!=='string' || value.trajectory.length>40 || !/^[a-z0-9-]+$/.test(value.trajectory)) throw new Error('Trayectoria inválida'); out.trajectory=value.trajectory; }
  if (value.stimulus !== undefined) { if (typeof value.stimulus!=='string'|| !allowedStimuli.includes(value.stimulus)) throw new Error('Estímulo inválido'); out.stimulus=value.stimulus; }
  if (value.soundType !== undefined) { if (typeof value.soundType!=='string' || value.soundType.length>40 || !/^[a-z0-9-]+$/.test(value.soundType)) throw new Error('Sonido inválido'); out.soundType=value.soundType; }
  if (value.soundActive !== undefined) { if (typeof value.soundActive !== 'boolean') throw new Error('Audio inválido'); out.soundActive=value.soundActive; }
  if (value.dotSize !== undefined) { if(!number(value.dotSize,5,150)) throw new Error('Tamaño inválido'); out.dotSize=value.dotSize; }
  if (value.palette !== undefined) { if (!['salvia','bruma','lino'].includes(value.palette)) throw new Error('Paleta inválida'); out.palette=value.palette; }
  if (value.bg !== undefined) { if (typeof value.bg !== 'string'||!hex.test(value.bg)) throw new Error('Color inválido'); out.bg=value.bg; }
  if (Object.keys(out).length===0) throw new Error('No hay parámetros');
  return out;
}
export const DEFAULT_SETTINGS = {level:8,trajectory:'horizontal',stimulus:'circle',soundActive:false,soundType:'heartbeat',dotSize:32,palette:'salvia',bg:'#faf8f5'};
export function safeParse(text) { if(typeof text !== 'string'||text.length>4096) throw new Error('Mensaje demasiado grande'); return JSON.parse(text); }
