import React, { useState } from 'react';
import {
  SessionSettings,
  PaletteKey,
  StimulusShape,
  TrajectoryType,
  SoundType,
  CustomTemplate,
  PresetTemplate,
  StimulationModality
} from '../types';
import { PALETTES, QUICK_BG_OPTIONS, PRESET_TEMPLATES, TRAJECTORIES } from '../constants';
import { audioEngine } from '../audio';

interface ConfigSidebarProps {
  isOpen: boolean;
  onClose: () => void;
  settings: SessionSettings;
  onUpdateSettings: (patch: Partial<SessionSettings>) => void;
  activeTemplateId: string;
  onApplyPreset: (preset: PresetTemplate) => void;
  customTemplates: CustomTemplate[];
  onSaveCustomTemplate: (name: string) => void;
  onDeleteCustomTemplate: (id: string) => void;
  onApplyCustomTemplate: (tpl: CustomTemplate) => void;
  activeTab?: 'stimuli' | 'traj' | 'audio' | 'palettes' | 'templates';
  onTabChange?: (tab: 'stimuli' | 'traj' | 'audio' | 'palettes' | 'templates') => void;
}

export const ConfigSidebar: React.FC<ConfigSidebarProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  activeTemplateId,
  onApplyPreset,
  customTemplates,
  onSaveCustomTemplate,
  onDeleteCustomTemplate,
  onApplyCustomTemplate,
  activeTab: controlledTab,
  onTabChange
}) => {
  const [internalTab, setInternalTab] = useState<'stimuli' | 'traj' | 'audio' | 'palettes' | 'templates'>('stimuli');
  const [customNameInput, setCustomNameInput] = useState('');

  const currentTab = controlledTab ?? internalTab;

  const handleTabClick = (tab: 'stimuli' | 'traj' | 'audio' | 'palettes' | 'templates') => {
    setInternalTab(tab);
    onTabChange?.(tab);
  };

  if (!isOpen) return null;

  const handleSaveCustom = (e: React.FormEvent) => {
    e.preventDefault();
    const name = customNameInput.trim() || `Perfil Paciente ${customTemplates.length + 1}`;
    onSaveCustomTemplate(name);
    setCustomNameInput('');
  };

  const handleTestSound = () => {
    audioEngine.playSound('L', settings.soundType, true);
    setTimeout(() => {
      audioEngine.playSound('R', settings.soundType, true);
    }, 260);
  };

  const colorPresets = [
    { label: 'Esmeralda', hex: '#1B3B2B' },
    { label: 'Zafiro', hex: '#1C364A' },
    { label: 'Terracota', hex: '#8C3A27' },
    { label: 'Amatista', hex: '#54366A' },
    { label: 'Ámbar', hex: '#9E6B1F' },
    { label: 'Carbón', hex: '#17231D' },
    { label: 'Verde Menta', hex: '#2A5B44' },
    { label: 'Ciruela', hex: '#7A233D' },
    { label: 'Oro Suave', hex: '#C29744' }
  ];

  const currentStimulusColor = settings.stimulusColor || PALETTES[settings.palette]?.primary || '#1B3B2B';

  return (
    <aside className="w-full md:w-[480px] lg:w-[520px] shrink-0 bg-white border border-[#DCE3DC] rounded-2xl sm:rounded-3xl shadow-xl flex flex-col overflow-hidden transition-all duration-300 z-30 select-none">
      {/* Header */}
      <div className="p-4 border-b border-[#DCE3DC] flex items-center justify-between bg-[#EFF2EE]/50 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#1B3B2B] text-white flex items-center justify-center">
            <span className="material-symbols-outlined text-[16px]">tune</span>
          </div>
          <div>
            <h2 className="font-display font-bold text-xs text-[#17231D] uppercase tracking-wide">
              Ajustes de Sesión
            </h2>
            <p className="text-[11px] text-[#5B6960]">Estímulos, audio, recorrido y figuras</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-[#5B6960] hover:text-[#17231D] p-1.5 rounded-lg hover:bg-white text-xs flex items-center gap-1 transition-colors cursor-pointer"
        >
          <span className="text-[11px] font-medium hidden sm:inline">Cerrar</span>
          <span className="material-symbols-outlined text-[18px]">close</span>
        </button>
      </div>

      {/* Pestañas Reordenadas */}
      <div className="flex border-b border-[#DCE3DC] bg-white text-xs font-medium shrink-0 overflow-x-auto hide-scrollbar">
        <button
          onClick={() => handleTabClick('stimuli')}
          className={`tab-btn flex-1 min-w-[85px] py-2.5 text-center border-b-2 flex items-center justify-center gap-1 cursor-pointer transition-colors ${
            currentTab === 'stimuli'
              ? 'border-[#1B3B2B] text-[#1B3B2B] font-semibold'
              : 'border-transparent text-[#5B6960] hover:text-[#17231D]'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">shapes</span>
          <span>Estímulos</span>
        </button>

        <button
          onClick={() => handleTabClick('traj')}
          className={`tab-btn flex-1 min-w-[85px] py-2.5 text-center border-b-2 flex items-center justify-center gap-1 cursor-pointer transition-colors ${
            currentTab === 'traj'
              ? 'border-[#1B3B2B] text-[#1B3B2B] font-semibold'
              : 'border-transparent text-[#5B6960] hover:text-[#17231D]'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">gesture</span>
          <span>Trayectorias</span>
        </button>

        <button
          onClick={() => handleTabClick('audio')}
          className={`tab-btn flex-1 min-w-[75px] py-2.5 text-center border-b-2 flex items-center justify-center gap-1 cursor-pointer transition-colors ${
            currentTab === 'audio'
              ? 'border-[#1B3B2B] text-[#1B3B2B] font-semibold'
              : 'border-transparent text-[#5B6960] hover:text-[#17231D]'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">headphones</span>
          <span>Audio</span>
        </button>

        <button
          onClick={() => handleTabClick('palettes')}
          className={`tab-btn flex-1 min-w-[75px] py-2.5 text-center border-b-2 flex items-center justify-center gap-1 cursor-pointer transition-colors ${
            currentTab === 'palettes'
              ? 'border-[#1B3B2B] text-[#1B3B2B] font-semibold'
              : 'border-transparent text-[#5B6960] hover:text-[#17231D]'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">palette</span>
          <span>Paletas</span>
        </button>

        <button
          onClick={() => handleTabClick('templates')}
          className={`tab-btn flex-1 min-w-[85px] py-2.5 text-center border-b-2 flex items-center justify-center gap-1 cursor-pointer transition-colors ${
            currentTab === 'templates'
              ? 'border-[#1B3B2B] text-[#1B3B2B] font-semibold'
              : 'border-transparent text-[#5B6960] hover:text-[#17231D]'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">bookmarks</span>
          <span>Plantillas</span>
        </button>
      </div>

      {/* Contenido Pestañas */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-6 hide-scrollbar">
        {/* ========================================================= */}
        {/* PESTAÑA 1: ESTÍMULOS, FIGURAS, COLOR Y RECORRIDO          */}
        {/* ========================================================= */}
        {currentTab === 'stimuli' && (
          <section className="flex flex-col gap-5">
            {/* Modalidad de Estimulación: Prioridad Solo Auditivo, luego Visual + Audio, luego Solo Visual */}
            <div className="flex flex-col gap-2 p-3 rounded-xl bg-[#EFF2EE] border border-[#DCE3DC]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#17231D] flex items-center gap-1 font-mono uppercase tracking-wide">
                  <span className="material-symbols-outlined text-[16px] text-[#1B3B2B]">tune</span>
                  <span>Modalidad de Estimulación</span>
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white text-[#1B3B2B] font-bold">
                  {settings.modality === 'audio-only'
                    ? 'Solo Auditivo'
                    : settings.modality === 'visual-only'
                    ? 'Solo Visual'
                    : 'Visual + Audio'}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2 mt-1">
                {/* 1. Solo Auditivo (Prioridad) */}
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ modality: 'audio-only', soundActive: true })}
                  className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                    settings.modality === 'audio-only'
                      ? 'border-[#1B3B2B] bg-white shadow-2xs text-[#1B3B2B] ring-1 ring-[#1B3B2B]'
                      : 'border-[#DCE3DC] bg-[#EFF2EE]/70 text-[#5B6960] hover:bg-white'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-[#17231D]">
                    <span className="material-symbols-outlined text-[17px] text-[#1B3B2B]">headphones</span>
                    <span>Solo Auditivo</span>
                  </div>
                  <div className="text-[10px] text-[#5B6960] leading-tight">Sin pelota ni distracción</div>
                </button>

                {/* 2. Visual + Audio */}
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ modality: 'both', soundActive: true })}
                  className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                    settings.modality === 'both'
                      ? 'border-[#1B3B2B] bg-white shadow-2xs text-[#1B3B2B] ring-1 ring-[#1B3B2B]'
                      : 'border-[#DCE3DC] bg-[#EFF2EE]/70 text-[#5B6960] hover:bg-white'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-[#17231D]">
                    <span className="material-symbols-outlined text-[17px] text-[#1B3B2B]">visibility</span>
                    <span>Visual + Audio</span>
                  </div>
                  <div className="text-[10px] text-[#5B6960] leading-tight">Figura + sonido L/R</div>
                </button>

                {/* 3. Solo Visual */}
                <button
                  type="button"
                  onClick={() => onUpdateSettings({ modality: 'visual-only', soundActive: false })}
                  className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all cursor-pointer ${
                    settings.modality === 'visual-only'
                      ? 'border-[#1B3B2B] bg-white shadow-2xs text-[#1B3B2B] ring-1 ring-[#1B3B2B]'
                      : 'border-[#DCE3DC] bg-[#EFF2EE]/70 text-[#5B6960] hover:bg-white'
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-[#17231D]">
                    <span className="material-symbols-outlined text-[17px] text-[#1B3B2B]">motion_mode</span>
                    <span>Solo Visual</span>
                  </div>
                  <div className="text-[10px] text-[#5B6960] leading-tight">Silencioso</div>
                </button>
              </div>
            </div>

            {/* SELECCIÓN DE FIGURAS (Solo si no es solo-auditivo) */}
            {settings.modality !== 'audio-only' && (
              <>
                {/* Figuras & Siluetas Compactas (Círculo, Gota, Corazón, Rombo, Estrella) */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold uppercase tracking-wider text-[#5B6960] font-mono">
                      Figuras & Siluetas
                    </label>
                    <span className="text-[10px] text-neutral-400 font-normal">
                      Formas clínicas sin distracción
                    </span>
                  </div>

                  <div className="grid grid-cols-5 gap-1.5">
                    {[
                      { key: 'circle', label: 'Círculo' },
                      { key: 'drop', label: 'Gota' },
                      { key: 'heart', label: 'Corazón' },
                      { key: 'diamond', label: 'Rombo' },
                      { key: 'star', label: 'Estrella' }
                    ].map((f) => {
                      const isSel = settings.stimulus === f.key;
                      return (
                        <button
                          key={f.key}
                          type="button"
                          aria-pressed={isSel}
                          onClick={() => onUpdateSettings({ stimulus: f.key as StimulusShape })}
                          className={`h-14 rounded-xl border flex flex-col items-center justify-center p-1 transition-all cursor-pointer ${
                            isSel
                              ? 'border-2 border-[#1B3B2B] bg-[#F1F5F2] shadow-xs'
                              : 'border-[#DCE3DC] bg-white hover:border-[#A3B5A8] hover:bg-[#FBFDFB]'
                          }`}
                        >
                          <div
                            className="w-5 h-5 flex items-center justify-center mb-0.5"
                            style={{ color: currentStimulusColor }}
                          >
                            {f.key === 'circle' && (
                              <div
                                className="w-3.5 h-3.5 rounded-full"
                                style={{ backgroundColor: currentStimulusColor }}
                              />
                            )}
                            {f.key === 'drop' && (
                              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                                <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
                              </svg>
                            )}
                            {f.key === 'heart' && (
                              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                              </svg>
                            )}
                            {f.key === 'diamond' && (
                              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                                <path d="M12 2L2 12l10 10 10-10L12 2z" />
                              </svg>
                            )}
                            {f.key === 'star' && (
                              <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                              </svg>
                            )}
                          </div>
                          <span
                            className={`text-[11px] font-semibold leading-tight ${
                              isSel ? 'text-[#17231D]' : 'text-[#5B6960]'
                            }`}
                          >
                            {f.label}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Estímulos Cinéticos Especiales: 3 modos (sin láser) */}
                <div className="flex flex-col gap-2 pt-2 border-t border-[#DCE3DC]/60">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold uppercase tracking-wider text-[#5B6960] font-mono">
                      3 Estímulos Cinéticos
                    </label>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200">
                      Física Especial
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      aria-pressed={settings.stimulus === 'led-bar'}
                      onClick={() => onUpdateSettings({ stimulus: 'led-bar' })}
                      className="stim-card"
                    >
                      <div className="h-5 flex items-center justify-center mb-0.5">
                        <svg fill="none" height="10" viewBox="0 0 68 12" width="50">
                          <circle cx="6" cy="6" fill="#BCC5BD" r="2" />
                          <circle cx="16" cy="6" fill="#BCC5BD" r="2" />
                          <circle cx="26" cy="6" fill="#BCC5BD" r="2" />
                          <circle cx="34" cy="6" fill={currentStimulusColor} r="3" />
                          <circle cx="42" cy="6" fill="#BCC5BD" r="2" />
                          <circle cx="52" cy="6" fill="#BCC5BD" r="2" />
                        </svg>
                      </div>
                      <span className="stim-title text-[11px] font-semibold text-[#17231D] leading-tight">Barra LED</span>
                      <span className="text-[9px] text-neutral-400 font-mono mt-0.5">Continua</span>
                    </button>

                    <button
                      type="button"
                      aria-pressed={settings.stimulus === 'sweep'}
                      onClick={() => onUpdateSettings({ stimulus: 'sweep' })}
                      className="stim-card"
                    >
                      <div className="h-5 flex items-center justify-center mb-0.5">
                        <svg fill="none" height="16" viewBox="0 0 40 18" width="30">
                          <line stroke="#BCC5BD" strokeDasharray="2 2" strokeWidth="1.5" x1="8" x2="14" y1="9" y2="9" />
                          <line stroke={currentStimulusColor} strokeLinecap="round" strokeWidth="2.2" x1="20" x2="20" y1="2" y2="16" />
                          <line stroke="#BCC5BD" strokeDasharray="2 2" strokeWidth="1.5" x1="26" x2="32" y1="9" y2="9" />
                        </svg>
                      </div>
                      <span className="stim-title text-[11px] font-semibold text-[#17231D] leading-tight">Barrido</span>
                      <span className="text-[9px] text-neutral-400 font-mono mt-0.5">Lineal</span>
                    </button>

                    <button
                      type="button"
                      aria-pressed={settings.stimulus === 'edges'}
                      onClick={() => onUpdateSettings({ stimulus: 'edges' })}
                      className="stim-card"
                    >
                      <div className="h-5 flex items-center justify-center mb-0.5">
                        <svg fill="none" height="16" viewBox="0 0 44 18" width="32">
                          <path d="M14 3C10 3 7 6 7 9C7 12 10 15 14 15V3Z" fill={currentStimulusColor} />
                          <path d="M30 3C34 3 37 6 37 9C37 12 34 15 30 15V3Z" fill="#D3DDD5" />
                        </svg>
                      </div>
                      <span className="stim-title text-[11px] font-semibold text-[#17231D] leading-tight">Luces Borde</span>
                      <span className="text-[9px] text-emerald-700 font-mono mt-0.5 font-semibold">Binaria L/R</span>
                    </button>
                  </div>
                </div>

                {/* COLOR DE LA PELOTA / FIGURA */}
                <div className="flex flex-col gap-2.5 pt-2 border-t border-[#DCE3DC]/60">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-[#5B6960] font-mono">
                      Color de la Figura
                    </span>
                    <div className="flex items-center gap-1.5 font-mono text-[11px]">
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-black/10 shadow-2xs"
                        style={{ backgroundColor: currentStimulusColor }}
                      />
                      <span className="text-[#17231D] font-semibold">{currentStimulusColor}</span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {colorPresets.map((c) => (
                      <button
                        key={c.hex}
                        type="button"
                        onClick={() => onUpdateSettings({ stimulusColor: c.hex })}
                        className={`w-7 h-7 rounded-xl border transition-all cursor-pointer shadow-2xs ${
                          settings.stimulusColor === c.hex ? 'scale-115 ring-2 ring-[#1B3B2B] ring-offset-1' : 'hover:scale-105'
                        }`}
                        style={{ backgroundColor: c.hex, borderColor: '#DCE3DC' }}
                        title={c.label}
                      />
                    ))}

                    {/* Selector de color nativo */}
                    <label
                      className="w-7 h-7 rounded-xl border border-[#DCE3DC] bg-white flex items-center justify-center cursor-pointer hover:bg-[#EFF2EE] transition-all"
                      title="Elegir color personalizado"
                    >
                      <input
                        type="color"
                        value={currentStimulusColor}
                        onChange={(e) => onUpdateSettings({ stimulusColor: e.target.value })}
                        className="sr-only"
                      />
                      <span className="material-symbols-outlined text-[15px] text-[#5B6960]">colorize</span>
                    </label>

                    {/* Botón reset a paleta */}
                    {settings.stimulusColor && (
                      <button
                        type="button"
                        onClick={() => onUpdateSettings({ stimulusColor: null })}
                        className="text-[10px] text-[#5B6960] hover:text-[#17231D] px-2 py-1 rounded bg-[#EFF2EE] hover:bg-white border border-[#DCE3DC] transition-colors ml-auto cursor-pointer"
                        title="Restablecer al color primario de la paleta activa"
                      >
                        Reset a Paleta
                      </button>
                    )}
                  </div>
                </div>

                {/* PARED TEÓRICA / RECORRIDO HORIZONTAL (%) */}
                <div className="flex flex-col gap-2 pt-2 border-t border-[#DCE3DC]/60">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-[#5B6960] font-mono">
                        Pared Teórica / Recorrido
                      </span>
                      <p className="text-[10px] text-[#5B6960]">Amplitud horizontal del barrido visual</p>
                    </div>
                    <span className="font-mono font-bold text-xs text-[#1B3B2B] bg-[#E8F0EB] px-2 py-0.5 rounded">
                      {Math.round(settings.amplitude * 100)}%
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min={50}
                      max={98}
                      value={Math.round(settings.amplitude * 100)}
                      onChange={(e) => onUpdateSettings({ amplitude: parseInt(e.target.value, 10) / 100 })}
                      className="w-full h-2 bg-[#EFF2EE] rounded-lg accent-[#1B3B2B] cursor-pointer"
                    />
                  </div>

                  <div className="grid grid-cols-4 gap-1.5 pt-0.5">
                    {[
                      { label: '94% Amplio', val: 0.94 },
                      { label: '85% Estándar', val: 0.85 },
                      { label: '75% Medio', val: 0.75 },
                      { label: '60% Reducido', val: 0.60 }
                    ].map((p) => {
                      const isSel = Math.round(settings.amplitude * 100) === Math.round(p.val * 100);
                      return (
                        <button
                          key={p.val}
                          type="button"
                          onClick={() => onUpdateSettings({ amplitude: p.val })}
                          className={`py-1 text-[10px] rounded-lg border font-mono transition-colors cursor-pointer text-center ${
                            isSel
                              ? 'bg-[#1B3B2B] text-white border-[#1B3B2B] font-semibold'
                              : 'bg-white text-[#5B6960] hover:bg-[#EFF2EE] border-[#DCE3DC]'
                          }`}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Calibre / Tamaño de la figura */}
                <div className="flex flex-col gap-1.5 pt-2 border-t border-[#DCE3DC]/60">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-[#5B6960]">Calibre / Tamaño</span>
                    <span className="font-mono font-bold text-[#1B3B2B]">{settings.dotSize} px</span>
                  </div>
                  <input
                    type="range"
                    min={16}
                    max={120}
                    value={settings.dotSize}
                    onChange={(e) => onUpdateSettings({ dotSize: parseInt(e.target.value, 10) })}
                    className="w-full h-1.5 bg-[#EFF2EE] rounded-lg accent-[#1B3B2B] cursor-pointer"
                  />
                </div>
              </>
            )}
          </section>
        )}

        {/* ========================================================= */}
        {/* PESTAÑA 2: TRAYECTORIAS Y GUÍAS DE LIENZO                */}
        {/* ========================================================= */}
        {currentTab === 'traj' && (
          <section className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#5B6960] font-mono">
                11 Trayectorias Clínicas
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#EFF2EE] text-[#5B6960]">
                Arranque central (0, 0)
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(TRAJECTORIES) as TrajectoryType[]).map((tKey) => {
                const def = TRAJECTORIES[tKey];
                const isSel = settings.trajectory === tKey;
                return (
                  <button
                    key={tKey}
                    type="button"
                    aria-pressed={isSel}
                    onClick={() => onUpdateSettings({ trajectory: tKey })}
                    className="traj-card"
                  >
                    <div className="h-5 flex items-center justify-center mb-0.5">
                      {tKey === 'horizontal' && (
                        <svg fill="none" height="10" viewBox="0 0 44 12" width="38">
                          <line stroke="#2D3B32" strokeWidth="2" x1="6" x2="38" y1="6" y2="6" />
                          <circle cx="6" cy="6" fill="#2D3B32" r="2.5" />
                          <circle cx="38" cy="6" fill="#2D3B32" r="2.5" />
                        </svg>
                      )}
                      {tKey === 'vertical' && (
                        <svg fill="none" height="18" viewBox="0 0 20 24" width="16">
                          <line stroke="#2D3B32" strokeWidth="2" x1="10" x2="10" y1="4" y2="20" />
                          <circle cx="10" cy="4" fill="#2D3B32" r="2.5" />
                          <circle cx="10" cy="20" fill="#2D3B32" r="2.5" />
                        </svg>
                      )}
                      {tKey === 'diagonal' && (
                        <svg fill="none" height="18" viewBox="0 0 38 22" width="30">
                          <line stroke="#2D3B32" strokeWidth="2" x1="6" x2="32" y1="17" y2="5" />
                          <circle cx="6" cy="17" fill="#2D3B32" r="2.5" />
                          <circle cx="32" cy="5" fill="#2D3B32" r="2.5" />
                        </svg>
                      )}
                      {tKey === 'alternate' && (
                        <svg fill="none" height="10" viewBox="0 0 44 12" width="38">
                          <circle cx="6" cy="6" fill="#2D3B32" r="3" />
                          <line stroke="#2D3B32" strokeDasharray="3 3" strokeWidth="1.8" x1="13" x2="31" y1="6" y2="6" />
                          <circle cx="38" cy="6" fill="none" r="3" stroke="#2D3B32" strokeWidth="1.8" />
                        </svg>
                      )}
                      {tKey === 'infinity' && (
                        <svg fill="none" height="16" viewBox="0 0 40 20" width="32">
                          <path
                            d="M10 5C6 5 4 7.5 4 10C4 12.5 6 15 10 15C15 15 18 10 20 10C22 10 25 15 30 15C34 15 36 12.5 36 10C36 7.5 34 5 30 5C25 5 22 10 20 10C18 10 15 5 10 5Z"
                            stroke="#2D3B32"
                            strokeLinejoin="round"
                            strokeWidth="2"
                          />
                        </svg>
                      )}
                      {tKey === 'circular' && (
                        <svg fill="none" height="16" viewBox="0 0 40 20" width="32">
                          <ellipse cx="20" cy="10" rx="14" ry="7" stroke="#2D3B32" strokeWidth="2" />
                        </svg>
                      )}
                      {tKey === 'pendulum' && (
                        <svg fill="none" height="16" viewBox="0 0 40 20" width="32">
                          <path d="M6 8C12 16 28 16 34 8" stroke="#2D3B32" strokeLinecap="round" strokeWidth="2" />
                          <circle cx="6" cy="8" fill="#2D3B32" r="2.5" />
                          <circle cx="34" cy="8" fill="#2D3B32" r="2.5" />
                        </svg>
                      )}
                      {tKey === 'arc' && (
                        <svg fill="none" height="16" viewBox="0 0 40 20" width="32">
                          <path d="M6 14C12 6 28 6 34 14" stroke="#2D3B32" strokeLinecap="round" strokeWidth="2" />
                          <circle cx="6" cy="14" fill="#2D3B32" r="2.5" />
                          <circle cx="34" cy="14" fill="#2D3B32" r="2.5" />
                        </svg>
                      )}
                      {tKey === 'zigzag' && (
                        <svg fill="none" height="16" viewBox="0 0 40 20" width="32">
                          <polyline
                            points="5,15 12,5 20,15 28,5 35,15"
                            stroke="#2D3B32"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth="2"
                          />
                        </svg>
                      )}
                      {tKey === 'bounce' && (
                        <svg fill="none" height="16" viewBox="0 0 42 20" width="34">
                          <path d="M5 14C8 6 15 6 19 14C23 6 30 6 37 14" stroke="#2D3B32" strokeLinecap="round" strokeWidth="2" />
                        </svg>
                      )}
                      {tKey === 'smooth-random' && (
                        <svg fill="none" height="16" viewBox="0 0 42 20" width="34">
                          <path d="M6 13C10 13 12 7 17 8C22 9 24 5 29 7C34 9 34 5 36 6" stroke="#2D3B32" strokeLinecap="round" strokeWidth="2" />
                        </svg>
                      )}
                    </div>
                    <span className="traj-title text-[11px] font-semibold text-[#17231D] leading-tight">{def.name}</span>
                  </button>
                );
              })}
            </div>

            {/* Opciones de Demarcación del Lienzo (Línea de guía y punto central) */}
            <div className="flex flex-col gap-2.5 pt-3 border-t border-[#DCE3DC]/60">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#5B6960] font-mono">
                Demarcación del Lienzo
              </span>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#EFF2EE]/70 border border-[#DCE3DC]/70">
                <div>
                  <div className="text-xs font-semibold text-[#17231D]">Línea Guía de Trayectoria</div>
                  <div className="text-[10px] text-[#5B6960]">Camino punteado en el centro del eje</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.showGuideLine}
                    onChange={(e) => onUpdateSettings({ showGuideLine: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-neutral-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1B3B2B]" />
                </label>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#EFF2EE]/70 border border-[#DCE3DC]/70">
                <div>
                  <div className="text-xs font-semibold text-[#17231D]">Punto Central de Reposo</div>
                  <div className="text-[10px] text-[#5B6960]">Ancla neutral al centro del lienzo</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settings.showCenterAnchor}
                    onChange={(e) => onUpdateSettings({ showCenterAnchor: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-9 h-5 bg-neutral-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#1B3B2B]" />
                </label>
              </div>
            </div>
          </section>
        )}

        {/* ========================================================= */}
        {/* PESTAÑA 3: AUDIO BILATERAL L/R                            */}
        {/* ========================================================= */}
        {currentTab === 'audio' && (
          <section className="flex flex-col gap-5">
            <div className="flex items-center justify-between p-3 rounded-xl bg-[#EFF2EE] border border-[#DCE3DC]/80">
              <div>
                <div className="text-xs font-semibold text-[#17231D]">Audio Estéreo Bilateral L/R</div>
                <div className="text-[11px] text-[#5B6960]">
                  Panorámica auditiva sincronizada al golpear extremos
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={settings.soundActive}
                  onChange={(e) => onUpdateSettings({ soundActive: e.target.checked })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-neutral-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-neutral-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#1B3B2B]" />
              </label>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#5B6960] font-mono">
                Timbre Acústico
              </label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { key: 'heartbeat', icon: 'favorite', title: 'Latido Somático', desc: 'Grave orgánico' },
                  { key: 'tibetan', icon: 'notifications', title: 'Cuenco Zen', desc: '440 Hz resonante' },
                  { key: 'water', icon: 'water_drop', title: 'Gota de Loto', desc: 'Acuático sereno' },
                  { key: 'click', icon: 'touch_app', title: 'Click Metrónomo', desc: 'Precisión seca' }
                ].map((s) => {
                  const isSel = settings.soundType === s.key;
                  return (
                    <button
                      key={s.key}
                      aria-pressed={isSel}
                      onClick={() => {
                        onUpdateSettings({ soundType: s.key as SoundType });
                        audioEngine.playSound('L', s.key as SoundType, true);
                      }}
                      className="traj-card p-3 flex flex-row items-center gap-2.5 text-left transition-all cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[20px] text-[#1B3B2B]">{s.icon}</span>
                      <div>
                        <div className="text-xs font-semibold">{s.title}</div>
                        <div className="text-[10px] text-[#5B6960]">{s.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                onClick={handleTestSound}
                className="text-xs font-medium text-[#1B3B2B] bg-[#E8F0EB] hover:bg-[#E2ECE5] px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span className="material-symbols-outlined text-[15px]">volume_up</span>
                <span>Test L / R Inmediato</span>
              </button>
              <span className="text-[11px] text-[#5B6960] font-mono">WebAudio Pan Stereo</span>
            </div>
          </section>
        )}

        {/* ========================================================= */}
        {/* PESTAÑA 4: PALETAS Y FONDOS (SIMPLES Y COMPACTAS)         */}
        {/* ========================================================= */}
        {currentTab === 'palettes' && (
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#5B6960] font-mono">
                Paletas Clínicas
              </h3>
              <span className="text-[10px] text-[#5B6960] font-mono">3 Armonías</span>
            </div>

            <div className="flex flex-col gap-2">
              {(['salvia', 'bruma', 'lino'] as PaletteKey[]).map((key) => {
                const pal = PALETTES[key];
                const isSel = settings.palette === key;
                return (
                  <div
                    key={key}
                    onClick={() => onUpdateSettings({ palette: key, bg: pal.bg })}
                    className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-3 cursor-pointer ${
                      isSel
                        ? 'border-2 border-[#1B3B2B] bg-[#F1F5F2] shadow-2xs'
                        : 'border-[#DCE3DC] bg-white hover:border-[#A3B5A8]'
                    }`}
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-3.5 h-3.5 rounded-full shrink-0"
                        style={{ backgroundColor: pal.primary }}
                      />
                      <span
                        className={`font-display font-semibold text-xs truncate ${
                          isSel ? 'text-[#1B3B2B]' : 'text-[#17231D]'
                        }`}
                      >
                        {pal.name.split('·')[1]?.trim() || pal.name}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className="w-4 h-4 rounded-full border border-black/10"
                        style={{ backgroundColor: pal.bg }}
                        title="Fondo"
                      />
                      <span
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: pal.primary }}
                        title="Primario"
                      />
                      <span
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: pal.accent }}
                        title="Acento"
                      />
                      <span
                        className="w-4 h-4 rounded-full"
                        style={{ backgroundColor: pal.subtle }}
                        title="Suave"
                      />
                    </div>

                    <span
                      className={`text-[9px] font-mono px-2 py-0.5 rounded font-semibold shrink-0 ${
                        isSel ? 'bg-[#1B3B2B] text-white' : 'bg-[#EFF2EE] text-[#5B6960]'
                      }`}
                    >
                      {isSel ? 'ACTIVA' : 'APLICAR'}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Selector de fondo rápido */}
            <div className="flex flex-col gap-2 pt-2 border-t border-[#DCE3DC]/60">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-[#5B6960] font-mono">Fondo Rápido</span>
                <span className="text-[10px] text-[#1B3B2B] font-mono">{settings.bg}</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {QUICK_BG_OPTIONS.map((opt) => (
                  <button
                    key={opt.bg}
                    type="button"
                    onClick={() => onUpdateSettings({ bg: opt.bg })}
                    className={`py-1.5 px-1 rounded-lg border text-center text-[11px] font-medium cursor-pointer transition-transform hover:scale-102 ${
                      opt.textLight ? 'text-white' : 'text-[#17231D]'
                    } ${settings.bg === opt.bg ? 'ring-2 ring-[#1B3B2B]' : ''}`}
                    style={{ backgroundColor: opt.bg, borderColor: '#DCE3DC' }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* ========================================================= */}
        {/* PESTAÑA 5: PLANTILLAS (ORDEN: MODALIDAD -> AUDIO -> FIGURA -> MOVIMIENTO) */}
        {/* ========================================================= */}
        {currentTab === 'templates' && (
          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#5B6960] font-mono">
                Plantillas Clínicas
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                Compactas
              </span>
            </div>

            {/* Helper de figura pequeña */}
            <div className="flex flex-col gap-2">
              {Object.values(PRESET_TEMPLATES).map((tpl) => {
                const isActive = activeTemplateId === tpl.id;
                const pal = PALETTES[tpl.palette] || PALETTES.salvia;
                const modLabel = tpl.modality === 'audio-only'
                  ? 'Auditivo'
                  : tpl.modality === 'visual-only'
                  ? 'Visual'
                  : 'Ambos';
                const soundLabel = tpl.soundType === 'heartbeat'
                  ? 'Latido'
                  : tpl.soundType === 'tibetan'
                  ? 'Cuenco'
                  : tpl.soundType === 'water'
                  ? 'Gota'
                  : 'Click';

                return (
                  <div
                    key={tpl.id}
                    className={`p-2.5 rounded-xl border transition-all flex flex-col gap-2 ${
                      isActive
                        ? 'border-2 border-[#1B3B2B] bg-[#F1F5F2] shadow-2xs'
                        : 'border-[#DCE3DC] bg-white hover:border-[#A3B5A8]'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: pal.primary }}
                        />
                        <span
                          className={`font-display font-semibold text-xs truncate ${
                            isActive ? 'text-[#1B3B2B] font-bold' : 'text-[#17231D]'
                          }`}
                        >
                          {tpl.name}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => onApplyPreset(tpl)}
                        className={`px-2 py-0.5 rounded-lg text-[10px] font-semibold shrink-0 transition-all cursor-pointer ${
                          isActive
                            ? 'bg-[#1B3B2B] text-white'
                            : 'bg-[#EFF2EE] hover:bg-[#1B3B2B] hover:text-white text-[#17231D]'
                        }`}
                      >
                        {isActive ? 'Activa' : 'Cargar'}
                      </button>
                    </div>

                    {/* Fila de 4 Elementos Clave en Orden Exacto Solicitado:
                        1) Modalidad -> 2) Sonido (Frecuencia) -> 3) Figura -> 4) Movimiento */}
                    <div className="grid grid-cols-4 gap-1 text-[10px] font-mono pt-1 border-t border-[#DCE3DC]/60 items-center">
                      {/* 1. Modalidad */}
                      <div className="flex items-center gap-1 bg-[#EFF2EE] px-1.5 py-0.5 rounded text-[#17231D]" title="Modalidad de estimulación">
                        <span className="material-symbols-outlined text-[13px] text-[#1B3B2B]">
                          {modLabel === 'Auditivo' ? 'headphones' : modLabel === 'Visual' ? 'visibility' : 'sync_alt'}
                        </span>
                        <span className="truncate">{modLabel}</span>
                      </div>

                      {/* 2. Sonido (Frecuencia) */}
                      <div className="flex items-center gap-1 bg-[#EFF2EE] px-1.5 py-0.5 rounded text-[#17231D]" title="Timbre de audio y frecuencia">
                        <span className="truncate">{soundLabel} · {tpl.frequency.toFixed(2)}Hz</span>
                      </div>

                      {/* 3. Forma mostrada de la figura */}
                      <div className="flex items-center justify-center gap-1 bg-[#EFF2EE] px-1.5 py-0.5 rounded text-[#17231D]" title={`Figura: ${tpl.stimulus}`}>
                        {tpl.stimulus === 'circle' && <div className="w-2.5 h-2.5 rounded-full bg-[#1B3B2B]" />}
                        {tpl.stimulus === 'drop' && (
                          <svg viewBox="0 0 24 24" className="w-3 h-3 text-[#1B3B2B]" fill="currentColor">
                            <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
                          </svg>
                        )}
                        {tpl.stimulus === 'heart' && (
                          <svg viewBox="0 0 24 24" className="w-3 h-3 text-[#1B3B2B]" fill="currentColor">
                            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                          </svg>
                        )}
                        {tpl.stimulus === 'diamond' && (
                          <svg viewBox="0 0 24 24" className="w-3 h-3 text-[#1B3B2B]" fill="currentColor">
                            <path d="M12 2L2 12l10 10 10-10L12 2z" />
                          </svg>
                        )}
                        {tpl.stimulus === 'star' && (
                          <svg viewBox="0 0 24 24" className="w-3 h-3 text-[#1B3B2B]" fill="currentColor">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                        )}
                        {tpl.stimulus === 'led-bar' && (
                          <span className="text-[9px] font-bold text-[#1B3B2B]">LED</span>
                        )}
                        {tpl.stimulus === 'sweep' && (
                          <span className="text-[9px] font-bold text-[#1B3B2B]">Barrido</span>
                        )}
                        {tpl.stimulus === 'edges' && (
                          <span className="text-[9px] font-bold text-[#1B3B2B]">Borde</span>
                        )}
                        <span className="capitalize truncate text-[9px]">{tpl.stimulus}</span>
                      </div>

                      {/* 4. Movimiento / Trayectoria */}
                      <div className="flex items-center gap-1 bg-[#EFF2EE] px-1.5 py-0.5 rounded text-[#17231D]" title="Trayectoria cinemática">
                        <span className="material-symbols-outlined text-[12px] text-[#1B3B2B]">gesture</span>
                        <span className="truncate">{TRAJECTORIES[tpl.trajectory]?.name || tpl.trajectory}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Guardar plantilla personalizada compacta */}
            <div className="pt-2 border-t border-[#DCE3DC]/70 flex flex-col gap-2">
              <span className="text-xs font-semibold text-[#17231D] flex items-center gap-1 font-mono uppercase tracking-wide">
                <span className="material-symbols-outlined text-[15px] text-[#1B3B2B]">save</span>
                <span>Guardar Personalizada</span>
              </span>
              <form onSubmit={handleSaveCustom} className="flex gap-1.5">
                <input
                  type="text"
                  placeholder="Ej. Paciente M.G. · Sesión 3"
                  value={customNameInput}
                  onChange={(e) => setCustomNameInput(e.target.value)}
                  className="flex-1 text-xs px-2.5 py-1.5 bg-[#EFF2EE] border border-[#DCE3DC] rounded-xl focus:ring-1 focus:ring-[#1B3B2B] focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-3 py-1.5 bg-[#1B3B2B] hover:bg-[#2A5B44] text-white font-medium text-xs rounded-xl shadow-xs flex items-center gap-1 shrink-0 transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[14px]">bookmark_add</span>
                  <span>Guardar</span>
                </button>
              </form>

              {/* Lista de personalizadas compacta */}
              <div className="flex flex-col gap-1.5">
                {customTemplates.length === 0 ? (
                  <div className="text-[10px] text-[#5B6960] italic py-1">
                    No hay plantillas personalizadas guardadas.
                  </div>
                ) : (
                  customTemplates.map((item) => (
                    <div
                      key={item.id}
                      className="p-2 rounded-xl border border-[#DCE3DC] bg-white flex items-center justify-between gap-2 shadow-2xs"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-[#17231D] truncate">{item.name}</div>
                        <div className="text-[10px] text-[#5B6960] font-mono truncate">
                          {item.modality === 'audio-only' ? 'Auditivo' : 'Visual'} · {item.soundType} · {item.stimulus} · {item.trajectory}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => onApplyCustomTemplate(item)}
                          className="px-2 py-0.5 rounded bg-[#EFF2EE] hover:bg-[#1B3B2B] hover:text-white text-[10px] font-semibold transition-all cursor-pointer"
                        >
                          Cargar
                        </button>
                        <button
                          type="button"
                          onClick={() => onDeleteCustomTemplate(item.id)}
                          className="text-[#5B6960] hover:text-red-600 p-1 text-xs cursor-pointer"
                          title="Eliminar plantilla"
                        >
                          <span className="material-symbols-outlined text-[14px]">delete</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        )}
      </div>
    </aside>
  );
};
