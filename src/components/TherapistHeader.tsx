import React, { useState } from 'react';
import { PaletteDef } from '../types';

interface TherapistHeaderProps {
  roomId: string;
  palette: PaletteDef;
  timerFormatted: string;
  onResetTimer: () => void;
  syncStatus: string;
  peerConnected: boolean;
  latencyMs: number | null;
  activeTemplateName: string;
  onOpenTemplates: () => void;
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
  onOpenReport: () => void;
  onOpenRemoteModal: () => void;
  onCreateRoom: () => void;
}

export const TherapistHeader: React.FC<TherapistHeaderProps> = ({
  roomId,
  palette,
  timerFormatted,
  onResetTimer,
  syncStatus,
  peerConnected,
  latencyMs,
  activeTemplateName,
  onOpenTemplates,
  onToggleSidebar,
  isSidebarOpen,
  onOpenReport,
  onOpenRemoteModal
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const copyPatientLink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}${window.location.pathname}?role=patient&room=${encodeURIComponent(roomId)}`;
    try {
      await navigator.clipboard.writeText(url);
      setShowTooltip(true);
      setTimeout(() => setShowTooltip(false), 2500);
    } catch {
      window.prompt('Copia este enlace para el paciente:', url);
    }
  };

  return (
    <header className="h-14 bg-white border-b border-[#DCE3DC] px-4 sm:px-6 flex items-center justify-between shrink-0 z-30 transition-all select-none">
      <div className="flex items-center gap-3.5">
        <div className="w-8 h-8 rounded-xl bg-[#1B3B2B] text-white flex items-center justify-center shadow-sm">
          <span className="material-symbols-outlined text-[19px]">all_inclusive</span>
        </div>
        <div>
          <h1 className="font-display font-bold text-sm tracking-tight text-[#17231D] flex items-center gap-2">
            EMDR Prisma
            <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-md bg-[#EFF2EE] text-[#5B6960] uppercase tracking-wider hidden sm:inline">
              EMDR Pro 2.0
            </span>
          </h1>
        </div>
        <div className="h-4 w-[1px] bg-[#DCE3DC] mx-1 hidden sm:block"></div>
        <div className="flex items-center gap-2">
          {/* Badge de Sincronización */}
          <button
            onClick={onOpenRemoteModal}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200/70 text-xs font-medium hover:bg-emerald-100/60 transition-all cursor-pointer"
            title="Gestionar sala remota"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                peerConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span className="text-[11px] font-medium">{syncStatus}</span>
            {latencyMs !== null && (
              <span className="font-mono text-[10px] text-emerald-700/80 hidden lg:inline pl-1 border-l border-emerald-200">
                ~{latencyMs}ms
              </span>
            )}
          </button>

          <div className="hidden sm:flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#EFF2EE] text-[#5B6960] text-[11px] font-mono">
            <span className="material-symbols-outlined text-[14px]">person</span>
            <span>Sala remota</span>
          </div>

          {/* Enlace Paciente */}
          <div className="relative inline-block">
            <button
              onClick={copyPatientLink}
              className="text-xs text-[#5B6960] hover:text-[#1B3B2B] flex items-center gap-1.5 px-2.5 py-1 rounded-lg hover:bg-[#EFF2EE] border border-transparent hover:border-[#DCE3DC] transition-colors font-mono cursor-pointer"
              title="Copiar enlace para el paciente"
            >
              <span className="material-symbols-outlined text-[15px]">link</span>
              <span className="text-[11px] hidden md:inline">Enlace Paciente</span>
              <span className="text-[10px] px-1 py-0.2 rounded bg-[#E2ECE5] text-[#1B3B2B] font-bold">
                {roomId}
              </span>
            </button>
            {showTooltip && (
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 z-50 pointer-events-none bg-[#1B3B2B] text-white text-[11px] py-1 px-2.5 rounded-lg shadow-lg whitespace-nowrap flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px] text-emerald-400">check_circle</span>
                <span>Enlace copiado al portapapeles</span>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Indicador de Dirección Estética Rápido */}
        <div className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#EFF2EE] border border-[#DCE3DC] text-[11px]">
          <span
            className="w-2.5 h-2.5 rounded-full"
            style={{ backgroundColor: palette.primary }}
          />
          <span className="font-medium text-[#17231D]">{palette.name}</span>
        </div>

        {/* Cronómetro */}
        <div className="flex items-center gap-2 text-xs bg-[#EFF2EE] px-3 py-1.5 rounded-lg border border-[#DCE3DC]/60 font-mono text-[#5B6960]">
          <span className="material-symbols-outlined text-[15px]">timer</span>
          <span className="font-bold text-[#1B3B2B] text-xs">{timerFormatted}</span>
          <button
            onClick={onResetTimer}
            className="hover:text-[#1B3B2B] transition-colors text-[#5B6960]/70 p-0.5 rounded hover:bg-white cursor-pointer"
            title="Reiniciar tiempo"
          >
            <span className="material-symbols-outlined text-[13px]">restart_alt</span>
          </button>
        </div>

        {/* Plantillas y perfiles */}
        <div
          onClick={onOpenTemplates}
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#EFF2EE] hover:bg-[#E2ECE5] border border-[#DCE3DC] text-xs cursor-pointer transition-colors"
          title="Plantillas y perfiles de sesión"
        >
          <span className="material-symbols-outlined text-[17px] text-[#1B3B2B]">bookmarks</span>
          <span className="font-medium text-[#17231D]">{activeTemplateName}</span>
          <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white text-[#1B3B2B] font-bold shadow-2xs">
            Perfil
          </span>
        </div>

        {/* Toggle Configuración Total */}
        <button
          onClick={onToggleSidebar}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-[#E8F0EB] hover:bg-[#E2ECE5] text-[#1B3B2B] font-display font-semibold text-xs transition-all border border-[#2A5B44]/20 shadow-xs cursor-pointer"
        >
          <span className="material-symbols-outlined text-[17px]">tune</span>
          <span>{isSidebarOpen ? 'Cerrar Panel' : 'Configuración Total'}</span>
        </button>

        {/* Informe */}
        <button
          onClick={onOpenReport}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#5B6960] hover:text-[#17231D] hover:bg-[#EFF2EE] transition-colors cursor-pointer"
          title="Ver informe de sesión"
        >
          <span className="material-symbols-outlined text-[18px]">clinical_notes</span>
          <span className="hidden xl:inline">Informe</span>
        </button>
      </div>
    </header>
  );
};
