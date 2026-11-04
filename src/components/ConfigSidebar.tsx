import React, { useState } from 'react';
import {
  SessionSettings,
  PaletteKey,
  StimulusType,
  TrajectoryType,
  SoundType,
  CustomTemplate,
  PresetTemplate
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
  initialTab?: 'templates' | 'palettes' | 'stimuli' | 'traj' | 'audio';
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
  initialTab = 'templates'
}) => {
  const [activeTab, setActiveTab] = useState<'templates' | 'palettes' | 'stimuli' | 'traj' | 'audio'>(
    initialTab
  );
  const [customNameInput, setCustomNameInput] = useState('');

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

  return (
    <aside className="w-full md:w-[480px] lg:w-[520px] shrink-0 bg-white border border-[#DCE3DC] rounded-2xl sm:rounded-3xl shadow-lg flex flex-col overflow-hidden transition-all duration-300 z-30 select-none">
      {/* Header */}
      <div className="p-4 border-b border-[#DCE3DC] flex items-center justify-between bg-[#EFF2EE]/50 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#1B3B2B] text-white flex items-center justify-center">
            <span className="material-symbols-outlined text-[16px]">tune</span>
          </div>
          <div>
            <h2 className="font-display font-bold text-xs text-[#17231D] uppercase tracking-wide">
              Configuración Total
            </h2>
            <p className="text-[11px] text-[#5B6960]">Lógica de paletas y física de estímulos en vivo</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="text-[#5B6960] hover:text-[#17231D] p-1.5 rounded-lg hover:bg-white text-xs flex items-center gap-1 transition-colors cursor-pointer"
        >
          <span className="text-[11px] font-medium hidden sm:inline">Colapsar</span>
          <span className="material-symbols-outlined text-[18px]">chevron_right</span>
        </button>
      </div>

      {/* Pestañas */}
      <div className="flex border-b border-[#DCE3DC] bg-white text-xs font-medium shrink-0">
        <button
          onClick={() => setActiveTab('templates')}
          className={`tab-btn flex-1 py-2.5 text-center border-b-2 flex items-center justify-center gap-1 cursor-pointer transition-colors ${
            activeTab === 'templates'
              ? 'border-[#1B3B2B] text-[#1B3B2B] font-semibold'
              : 'border-transparent text-[#5B6960] hover:text-[#17231D]'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">bookmarks</span>
          <span>Plantillas</span>
        </button>
        <button
          onClick={() => setActiveTab('palettes')}
          className={`tab-btn flex-1 py-2.5 text-center border-b-2 flex items-center justify-center gap-1 cursor-pointer transition-colors ${
            activeTab === 'palettes'
              ? 'border-[#1B3B2B] text-[#1B3B2B] font-semibold'
              : 'border-transparent text-[#5B6960] hover:text-[#17231D]'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">palette</span>
          <span>Paletas</span>
        </button>
        <button
          onClick={() => setActiveTab('stimuli')}
          className={`tab-btn flex-1 py-2.5 text-center border-b-2 flex items-center justify-center gap-1 cursor-pointer transition-colors ${
            activeTab === 'stimuli'
              ? 'border-[#1B3B2B] text-[#1B3B2B] font-semibold'
              : 'border-transparent text-[#5B6960] hover:text-[#17231D]'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">wb_sunny</span>
          <span>Estímulos</span>
        </button>
        <button
          onClick={() => setActiveTab('traj')}
          className={`tab-btn flex-1 py-2.5 text-center border-b-2 flex items-center justify-center gap-1 cursor-pointer transition-colors ${
            activeTab === 'traj'
              ? 'border-[#1B3B2B] text-[#1B3B2B] font-semibold'
              : 'border-transparent text-[#5B6960] hover:text-[#17231D]'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">gesture</span>
          <span>Trayectorias</span>
        </button>
        <button
          onClick={() => setActiveTab('audio')}
          className={`tab-btn flex-1 py-2.5 text-center border-b-2 flex items-center justify-center gap-1 cursor-pointer transition-colors ${
            activeTab === 'audio'
              ? 'border-[#1B3B2B] text-[#1B3B2B] font-semibold'
              : 'border-transparent text-[#5B6960] hover:text-[#17231D]'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">headphones</span>
          <span>Audio</span>
        </button>
      </div>

      {/* Contenido Pestañas */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col gap-6 hide-scrollbar">
        {/* PESTAÑA 1: PLANTILLAS */}
        {activeTab === 'templates' && (
          <section className="flex flex-col gap-4">
            <div>
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[#5B6960] font-mono">
                  Plantillas Clínicas Preconfiguradas
                </h3>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
                  EMDR Standard
                </span>
              </div>
              <p className="text-[11px] text-[#5B6960]">
                Protocolos clínicos validados con combinaciones de paleta, cinemática, velocidad y audio optimizadas.
              </p>
            </div>

            <div className="flex flex-col gap-2.5">
              {Object.values(PRESET_TEMPLATES).map((tpl) => {
                const isActive = activeTemplateId === tpl.id;
                const pal = PALETTES[tpl.palette];
                return (
                  <div
                    key={tpl.id}
                    className={`p-3.5 rounded-xl border-2 transition-all flex flex-col gap-2.5 ${
                      isActive
                        ? 'border-[#1B3B2B] bg-[#FBF9F5] shadow-xs'
                        : 'border-[#DCE3DC] bg-white hover:border-[#1B3B2B]/40'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span
                            className="w-2.5 h-2.5 rounded-full"
                            style={{ backgroundColor: pal.primary }}
                          />
                          <span
                            className={`font-display font-bold text-xs ${
                              isActive ? 'text-[#1B3B2B]' : 'text-[#17231D]'
                            }`}
                          >
                            {tpl.name}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#5B6960] mt-0.5 leading-relaxed">
                          {tpl.id === 'trauma-agudo' &&
                            'Suave atenuación somática. Ideal para estabilización y fases iniciales de reprocesamiento.'}
                          {tpl.id === 'foco-nitido' &&
                            'Láser continuo lineal para reactivar seguimiento visual en bloqueos o disociación.'}
                          {tpl.id === 'hipersensibilidad' &&
                            'Textura visual orgánica y bajo brillo. Adecuado para fotofobia o neurodivergencia.'}
                          {tpl.id === 'alternancia-rapida' &&
                            'Luces de borde con corte on/off binario para desensibilización bilateral contundente.'}
                        </p>
                      </div>
                      <button
                        onClick={() => onApplyPreset(tpl)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold shrink-0 shadow-2xs transition-all cursor-pointer ${
                          isActive
                            ? 'bg-[#1B3B2B] text-white hover:bg-[#2A5B44]'
                            : 'bg-[#EFF2EE] hover:bg-[#1B3B2B] hover:text-white text-[#17231D]'
                        }`}
                      >
                        {isActive ? 'Activa' : 'Cargar'}
                      </button>
                    </div>

                    <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[#DCE3DC]/50">
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white border border-[#DCE3DC] text-[#17231D]">
                        {pal.name.split('·')[1]?.trim() || pal.name}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white border border-[#DCE3DC] text-[#17231D]">
                        {tpl.stimulus === 'circle'
                          ? 'Esfera Sólida'
                          : tpl.stimulus === 'laser'
                          ? 'Haz Láser'
                          : tpl.stimulus === 'led-bar'
                          ? 'Barra LED'
                          : 'Luces de Borde'}
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white border border-[#DCE3DC] text-[#17231D]">
                        {TRAJECTORIES[tpl.trajectory]?.name} ({tpl.frequency.toFixed(2)} Hz)
                      </span>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white border border-[#DCE3DC] text-[#17231D]">
                        {tpl.soundType === 'heartbeat'
                          ? 'Latido Somático'
                          : tpl.soundType === 'tibetan'
                          ? 'Cuenco Zen'
                          : tpl.soundType === 'water'
                          ? 'Gota de Loto'
                          : 'Click Metrónomo'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Guardar plantilla personalizada */}
            <div className="pt-3 border-t border-[#DCE3DC]/70 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#17231D] flex items-center gap-1.5 font-mono uppercase tracking-wide">
                  <span className="material-symbols-outlined text-[16px] text-[#1B3B2B]">save</span>
                  <span>Guardar Plantilla de Paciente</span>
                </span>
                <span className="text-[10px] text-[#5B6960] font-mono">Configuración actual</span>
              </div>
              <form onSubmit={handleSaveCustom} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Ej. Paciente M. G. · Sesión 4"
                  value={customNameInput}
                  onChange={(e) => setCustomNameInput(e.target.value)}
                  className="flex-1 text-xs px-3 py-2 bg-[#EFF2EE] border border-[#DCE3DC] rounded-xl focus:ring-1 focus:ring-[#1B3B2B] focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-3.5 py-2 bg-[#1B3B2B] hover:bg-[#2A5B44] text-white font-medium text-xs rounded-xl shadow-xs flex items-center gap-1 shrink-0 transition-all cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[16px]">bookmark_add</span>
                  <span>Guardar</span>
                </button>
              </form>

              {/* Lista de plantillas personalizadas */}
              <div className="flex flex-col gap-2">
                {customTemplates.length === 0 ? (
                  <div className="text-[11px] text-[#5B6960] italic">
                    No hay perfiles personalizados guardados aún.
                  </div>
                ) : (
                  customTemplates.map((item) => (
                    <div
                      key={item.id}
                      className="p-2.5 rounded-xl border border-[#DCE3DC] bg-white flex items-center justify-between gap-2 shadow-2xs"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-[#17231D] truncate">{item.name}</div>
                        <div className="text-[10px] text-[#5B6960] font-mono truncate">
                          Nvl {item.level} · {item.trajectory} · {item.stimulus}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => onApplyCustomTemplate(item)}
                          className="px-2 py-0.5 rounded bg-[#EFF2EE] hover:bg-[#1B3B2B] hover:text-white text-[11px] font-semibold transition-all cursor-pointer"
                        >
                          Cargar
                        </button>
                        <button
                          onClick={() => onDeleteCustomTemplate(item.id)}
                          className="text-[#5B6960] hover:text-red-600 p-1 text-xs cursor-pointer"
                          title="Eliminar plantilla"
                        >
                          <span className="material-symbols-outlined text-[15px]">delete</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>
        )}

        {/* PESTAÑA 2: PALETAS */}
        {activeTab === 'palettes' && (
          <section className="flex flex-col gap-4">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#5B6960] font-mono mb-1">
                Paletas Oficiales de Bilateral
              </h3>
              <p className="text-[11px] text-[#5B6960]">
                Basadas en el sistema de diseño clínico: Salvia, Bruma marina y Lino orgánico.
              </p>
            </div>

            {(['salvia', 'bruma', 'lino'] as PaletteKey[]).map((key) => {
              const pal = PALETTES[key];
              const isSel = settings.palette === key;
              return (
                <div
                  key={key}
                  onClick={() => onUpdateSettings({ palette: key, bg: pal.bg })}
                  className={`palette-card p-3.5 rounded-xl border-2 transition-all flex flex-col gap-2.5 cursor-pointer ${
                    isSel
                      ? 'border-[#1B3B2B] bg-[#FBF9F5]'
                      : 'border-[#DCE3DC] bg-white hover:border-[#1B3B2B]/40'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-3.5 h-3.5 rounded-full"
                        style={{ backgroundColor: pal.primary }}
                      />
                      <span
                        className={`font-display font-bold text-xs ${
                          isSel ? 'text-[#1B3B2B]' : 'text-[#17231D]'
                        }`}
                      >
                        {pal.name}
                      </span>
                    </div>
                    <span
                      className={`badge-status text-[9px] font-mono px-2 py-0.5 rounded font-semibold ${
                        isSel ? 'bg-[#1B3B2B] text-white' : 'bg-[#EFF2EE] text-[#5B6960]'
                      }`}
                    >
                      {isSel ? 'ACTIVA' : 'APLICAR'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className="w-6 h-6 rounded-md border border-black/10"
                      style={{ backgroundColor: pal.bg }}
                      title={`Fondo: ${pal.bg}`}
                    />
                    <span
                      className="w-6 h-6 rounded-md"
                      style={{ backgroundColor: pal.primary }}
                      title={`Primario: ${pal.primary}`}
                    />
                    <span
                      className="w-6 h-6 rounded-md"
                      style={{ backgroundColor: pal.accent }}
                      title={`Acento: ${pal.accent}`}
                    />
                    <span
                      className="w-6 h-6 rounded-md"
                      style={{ backgroundColor: pal.subtle }}
                      title={`Subtle: ${pal.subtle}`}
                    />
                    <span
                      className="w-6 h-6 rounded-md"
                      style={{ backgroundColor: pal.muted }}
                      title={`Muted: ${pal.muted}`}
                    />
                  </div>

                  <p className="text-[11px] text-[#5B6960] leading-relaxed">{pal.description}</p>
                </div>
              );
            })}

            {/* Selector de fondo rápido */}
            <div className="flex flex-col gap-2 pt-2 border-t border-[#DCE3DC]/60">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#5B6960] font-mono">Tono de Fondo Rápido</span>
                <span className="text-[11px] text-[#1B3B2B] font-medium font-mono">{settings.bg}</span>
              </div>
              <div className="grid grid-cols-4 gap-2">
                {QUICK_BG_OPTIONS.map((opt) => (
                  <button
                    key={opt.bg}
                    onClick={() => onUpdateSettings({ bg: opt.bg })}
                    className={`btn-quick-bg p-2 rounded-lg border text-center text-xs font-medium cursor-pointer transition-transform hover:scale-105 ${
                      opt.textLight ? 'text-white' : 'text-[#17231D]'
                    }`}
                    style={{ backgroundColor: opt.bg, borderColor: '#DCE3DC' }}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </section>
        )}

        {/* PESTAÑA 3: ESTÍMULOS */}
        {activeTab === 'stimuli' && (
          <section className="flex flex-col gap-5">
            {/* Clásicos */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-semibold uppercase tracking-wider text-[#5B6960] font-mono flex items-center justify-between">
                <span>Estímulos Clásicos (Movimiento Armónico)</span>
                <span className="text-[10px] text-neutral-400 font-normal">Sin cambio de física</span>
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  aria-pressed={settings.stimulus === 'circle'}
                  onClick={() => onUpdateSettings({ stimulus: 'circle' })}
                  className="stim-card"
                >
                  <span className="w-4 h-4 rounded-full bg-[#1B3B2B] mb-1.5" />
                  <span className="stim-title text-xs font-semibold text-[#17231D]">Sólido</span>
                </button>
                <button
                  aria-pressed={settings.stimulus === 'soft'}
                  onClick={() => onUpdateSettings({ stimulus: 'soft' })}
                  className="stim-card"
                >
                  <span className="w-4 h-4 rounded-full bg-[#1B3B2B] blur-[1.5px] mb-1.5" />
                  <span className="stim-title text-xs font-semibold text-[#17231D]">Bruma</span>
                </button>
                <button
                  aria-pressed={settings.stimulus === 'ring'}
                  onClick={() => onUpdateSettings({ stimulus: 'ring' })}
                  className="stim-card"
                >
                  <span className="w-4 h-4 rounded-full border-2 border-[#1B3B2B] mb-1.5" />
                  <span className="stim-title text-xs font-semibold text-[#17231D]">Anillo</span>
                </button>
              </div>
            </div>

            {/* Experimentales */}
            <div className="flex flex-col gap-2 pt-2 border-t border-[#DCE3DC]/60">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold uppercase tracking-wider text-[#5B6960] font-mono flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[16px] text-[#2A5B44]">science</span>
                  <span>Estímulos Experimentales</span>
                </label>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200">
                  Física Especial
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                {/* Barra LED */}
                <button
                  aria-pressed={settings.stimulus === 'led-bar'}
                  onClick={() => onUpdateSettings({ stimulus: 'led-bar' })}
                  className="stim-card"
                >
                  <div className="h-6 flex items-center justify-center mb-1">
                    <svg fill="none" height="12" viewBox="0 0 68 12" width="68" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="6" cy="6" fill="#BCC5BD" r="2" />
                      <circle cx="16" cy="6" fill="#BCC5BD" r="2" />
                      <circle cx="26" cy="6" fill="#BCC5BD" r="2" />
                      <circle cx="34" cy="6" fill="#1B3B2B" r="3.2" />
                      <circle cx="42" cy="6" fill="#BCC5BD" r="2" />
                      <circle cx="52" cy="6" fill="#BCC5BD" r="2" />
                      <circle cx="62" cy="6" fill="#BCC5BD" r="2" />
                    </svg>
                  </div>
                  <span className="stim-title text-xs font-semibold text-[#17231D]">Barra LED</span>
                  <span className="text-[9px] text-neutral-400 font-mono mt-0.5">Traslación continua</span>
                </button>

                {/* Línea de barrido */}
                <button
                  aria-pressed={settings.stimulus === 'sweep'}
                  onClick={() => onUpdateSettings({ stimulus: 'sweep' })}
                  className="stim-card"
                >
                  <div className="h-6 flex items-center justify-center mb-1">
                    <svg fill="none" height="20" viewBox="0 0 40 20" width="40" xmlns="http://www.w3.org/2000/svg">
                      <line stroke="#BCC5BD" strokeDasharray="2 2" strokeWidth="1.5" x1="8" x2="14" y1="10" y2="10" />
                      <line stroke="#1B3B2B" strokeLinecap="round" strokeWidth="2.2" x1="20" x2="20" y1="2" y2="18" />
                      <line stroke="#BCC5BD" strokeDasharray="2 2" strokeWidth="1.5" x1="26" x2="32" y1="10" y2="10" />
                    </svg>
                  </div>
                  <span className="stim-title text-xs font-semibold text-[#17231D]">Línea de barrido</span>
                  <span className="text-[9px] text-neutral-400 font-mono mt-0.5">Velocidad lineal (sin ease)</span>
                </button>

                {/* Haz láser */}
                <button
                  aria-pressed={settings.stimulus === 'laser'}
                  onClick={() => onUpdateSettings({ stimulus: 'laser' })}
                  className="stim-card"
                >
                  <div className="h-6 flex items-center justify-center mb-1">
                    <svg fill="none" height="22" viewBox="0 0 40 22" width="40" xmlns="http://www.w3.org/2000/svg">
                      <line stroke="#1B3B2B" strokeLinecap="round" strokeWidth="2" x1="12" x2="26" y1="18" y2="6" />
                      <circle cx="27" cy="5" fill="#BCC5BD" r="3.5" />
                      <circle cx="27" cy="5" fill="#1B3B2B" r="1.8" />
                    </svg>
                  </div>
                  <span className="stim-title text-xs font-semibold text-[#17231D]">Haz láser</span>
                  <span className="text-[9px] text-neutral-400 font-mono mt-0.5">Haz focal continuo</span>
                </button>

                {/* Luces de borde */}
                <button
                  aria-pressed={settings.stimulus === 'edges'}
                  onClick={() => onUpdateSettings({ stimulus: 'edges' })}
                  className="stim-card"
                >
                  <div className="h-6 flex items-center justify-center mb-1">
                    <svg fill="none" height="22" viewBox="0 0 50 22" width="50" xmlns="http://www.w3.org/2000/svg">
                      <path d="M16 4C11.5 4 8 7.5 8 11C8 14.5 11.5 18 16 18V4Z" fill="#1B3B2B" />
                      <path d="M34 4C38.5 4 42 7.5 42 11C42 14.5 38.5 18 34 18V4Z" fill="#D3DDD5" />
                    </svg>
                  </div>
                  <span className="stim-title text-xs font-semibold text-[#17231D]">Luces de borde</span>
                  <span className="text-[9px] text-emerald-700 font-mono mt-0.5 font-semibold">
                    Alternancia On/Off binaria
                  </span>
                </button>
              </div>

              {/* Guía clínica de movimiento */}
              <div className="p-3 bg-[#EFF2EE] rounded-xl border border-[#DCE3DC]/80 flex flex-col gap-1.5 text-xs text-[#5B6960] leading-relaxed">
                <div className="font-semibold text-[#17231D] flex items-center gap-1">
                  <span className="material-symbols-outlined text-[15px] text-[#1B3B2B]">info</span>
                  <span>Reglas de movimiento activadas:</span>
                </div>
                <ul className="list-disc pl-4 space-y-1 text-[11px]">
                  <li>
                    <strong className="text-[#17231D]">Traslación Continua Lineal (Barrido, Láser, Barra LED):</strong>{' '}
                    Ping-pong a velocidad constante, cero aceleración en bordes (<code className="font-mono text-[#1B3B2B]">linear, sin ease</code>).
                  </li>
                  <li>
                    <strong className="text-[#17231D]">Alternancia Binaria Instantánea (Luces de Borde):</strong>{' '}
                    Aparece en extremo izquierdo, desaparece, y aparece en extremo derecho (<code className="font-mono text-[#1B3B2B]">On/Off instantáneo</code>).
                  </li>
                  <li>
                    <strong className="text-[#17231D]">Pelota / Esfera Clásica:</strong> Mantiene la cinemática armónica tradicional.
                  </li>
                </ul>
              </div>
            </div>

            {/* Calibre / Diámetro */}
            <div className="flex flex-col gap-1.5 pt-2 border-t border-[#DCE3DC]/60">
              <div className="flex justify-between text-xs">
                <span className="font-medium text-[#5B6960]">Calibre / Grosor</span>
                <span className="font-mono font-bold text-[#1B3B2B]">{settings.dotSize} px</span>
              </div>
              <input
                type="range"
                min={16}
                max={52}
                value={settings.dotSize}
                onChange={(e) => onUpdateSettings({ dotSize: parseInt(e.target.value, 10) })}
                className="w-full h-1.5 bg-[#EFF2EE] rounded-lg accent-[#1B3B2B] cursor-pointer"
              />
            </div>
          </section>
        )}

        {/* PESTAÑA 4: TRAYECTORIAS */}
        {activeTab === 'traj' && (
          <section className="flex flex-col gap-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#5B6960] font-mono">
                11 Trayectorias Clínicas
              </h3>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#EFF2EE] text-[#5B6960]">
                Sincronizado
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              {(Object.keys(TRAJECTORIES) as TrajectoryType[]).map((tKey) => {
                const def = TRAJECTORIES[tKey];
                const isSel = settings.trajectory === tKey;
                return (
                  <button
                    key={tKey}
                    aria-pressed={isSel}
                    onClick={() => onUpdateSettings({ trajectory: tKey })}
                    className="traj-card"
                  >
                    <div className="h-6 flex items-center justify-center mb-1">
                      {tKey === 'horizontal' && (
                        <svg fill="none" height="12" viewBox="0 0 44 12" width="44" xmlns="http://www.w3.org/2000/svg">
                          <line stroke="#2D3B32" strokeWidth="2" x1="6" x2="38" y1="6" y2="6" />
                          <circle cx="6" cy="6" fill="#2D3B32" r="2.5" />
                          <circle cx="38" cy="6" fill="#2D3B32" r="2.5" />
                        </svg>
                      )}
                      {tKey === 'vertical' && (
                        <svg fill="none" height="24" viewBox="0 0 20 24" width="20" xmlns="http://www.w3.org/2000/svg">
                          <line stroke="#2D3B32" strokeWidth="2" x1="10" x2="10" y1="4" y2="20" />
                          <circle cx="10" cy="4" fill="#2D3B32" r="2.5" />
                          <circle cx="10" cy="20" fill="#2D3B32" r="2.5" />
                        </svg>
                      )}
                      {tKey === 'diagonal' && (
                        <svg fill="none" height="22" viewBox="0 0 38 22" width="38" xmlns="http://www.w3.org/2000/svg">
                          <line stroke="#2D3B32" strokeWidth="2" x1="6" x2="32" y1="17" y2="5" />
                          <circle cx="6" cy="17" fill="#2D3B32" r="2.5" />
                          <circle cx="32" cy="5" fill="#2D3B32" r="2.5" />
                        </svg>
                      )}
                      {tKey === 'alternate' && (
                        <svg fill="none" height="12" viewBox="0 0 44 12" width="44" xmlns="http://www.w3.org/2000/svg">
                          <circle cx="6" cy="6" fill="#2D3B32" r="3" />
                          <line stroke="#2D3B32" strokeDasharray="3 3" strokeWidth="1.8" x1="13" x2="31" y1="6" y2="6" />
                          <circle cx="38" cy="6" fill="none" r="3" stroke="#2D3B32" strokeWidth="1.8" />
                        </svg>
                      )}
                      {tKey === 'infinity' && (
                        <svg fill="none" height="20" viewBox="0 0 40 20" width="40" xmlns="http://www.w3.org/2000/svg">
                          <path
                            d="M10 5C6 5 4 7.5 4 10C4 12.5 6 15 10 15C15 15 18 10 20 10C22 10 25 15 30 15C34 15 36 12.5 36 10C36 7.5 34 5 30 5C25 5 22 10 20 10C18 10 15 5 10 5Z"
                            stroke="#2D3B32"
                            strokeLinejoin="round"
                            strokeWidth="2"
                          />
                        </svg>
                      )}
                      {tKey === 'circular' && (
                        <svg fill="none" height="20" viewBox="0 0 40 20" width="40" xmlns="http://www.w3.org/2000/svg">
                          <ellipse cx="20" cy="10" rx="14" ry="7" stroke="#2D3B32" strokeWidth="2" />
                        </svg>
                      )}
                      {tKey === 'pendulum' && (
                        <svg fill="none" height="20" viewBox="0 0 40 20" width="40" xmlns="http://www.w3.org/2000/svg">
                          <path d="M6 8C12 16 28 16 34 8" stroke="#2D3B32" strokeLinecap="round" strokeWidth="2" />
                          <circle cx="6" cy="8" fill="#2D3B32" r="2.5" />
                          <circle cx="34" cy="8" fill="#2D3B32" r="2.5" />
                        </svg>
                      )}
                      {tKey === 'arc' && (
                        <svg fill="none" height="20" viewBox="0 0 40 20" width="40" xmlns="http://www.w3.org/2000/svg">
                          <path d="M6 14C12 6 28 6 34 14" stroke="#2D3B32" strokeLinecap="round" strokeWidth="2" />
                          <circle cx="6" cy="14" fill="#2D3B32" r="2.5" />
                          <circle cx="34" cy="14" fill="#2D3B32" r="2.5" />
                        </svg>
                      )}
                      {tKey === 'zigzag' && (
                        <svg fill="none" height="20" viewBox="0 0 40 20" width="40" xmlns="http://www.w3.org/2000/svg">
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
                        <svg fill="none" height="20" viewBox="0 0 42 20" width="42" xmlns="http://www.w3.org/2000/svg">
                          <path
                            d="M5 14C8 6 15 6 19 14C23 6 30 6 37 14"
                            stroke="#2D3B32"
                            strokeLinecap="round"
                            strokeWidth="2"
                          />
                        </svg>
                      )}
                      {tKey === 'smooth-random' && (
                        <svg fill="none" height="20" viewBox="0 0 42 20" width="42" xmlns="http://www.w3.org/2000/svg">
                          <path
                            d="M6 13C10 13 12 7 17 8C22 9 24 5 29 7C34 9 34 5 36 6"
                            stroke="#2D3B32"
                            strokeLinecap="round"
                            strokeWidth="2"
                          />
                        </svg>
                      )}
                    </div>
                    <span className="traj-title text-xs font-semibold text-[#17231D]">{def.name}</span>
                    <span className="text-[10px] text-neutral-400 font-normal mt-0.5">{def.badge}</span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* PESTAÑA 5: AUDIO BILATERAL */}
        {activeTab === 'audio' && (
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
      </div>
    </aside>
  );
};
