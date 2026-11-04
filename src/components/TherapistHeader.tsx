import React, { useState } from 'react';

interface TherapistHeaderProps {
  roomId: string;
  timerFormatted: string;
  onResetTimer: () => void;
  syncStatus: string;
  peerConnected: boolean;
  onOpenTemplates: () => void;
  onToggleSidebar: () => void;
  isSidebarOpen: boolean;
  onOpenReport: () => void;
  onOpenRemoteModal: () => void;
}

export const TherapistHeader: React.FC<TherapistHeaderProps> = ({
  roomId,
  timerFormatted,
  onResetTimer,
  syncStatus,
  peerConnected,
  onOpenTemplates,
  onToggleSidebar,
  isSidebarOpen,
  onOpenReport,
  onOpenRemoteModal
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const copyPatientLink = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const url = `${window.location.origin}${window.location.pathname}?role=patient&room=${encodeURIComponent(
      roomId
    )}`;
    try {
      await navigator.clipboard.writeText(url);
      setShowTooltip(true);
      setTimeout(() => setShowTooltip(false), 2000);
    } catch {
      window.prompt('Copia este enlace para el paciente:', url);
    }
  };

  return (
    <header className="h-14 bg-white/95 backdrop-blur-md border-b border-[#DCE3DC] px-4 sm:px-6 flex items-center justify-between shrink-0 z-30 transition-all select-none">
      {/* Zona Izquierda: Identidad y Sala Unificada */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-[#1B3B2B] text-white flex items-center justify-center shadow-xs">
            <span className="material-symbols-outlined text-[17px]">all_inclusive</span>
          </div>
          <span className="font-display font-bold text-sm tracking-tight text-[#17231D]">
            EMDR Prisma
          </span>
        </div>

        <div className="h-3.5 w-[1px] bg-[#DCE3DC] mx-1"></div>

        {/* Badge Unificado de Sala */}
        <div className="relative inline-flex items-center">
          <div
            onClick={onOpenRemoteModal}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#EFF2EE] hover:bg-[#E2ECE5] text-[#17231D] text-xs transition-colors cursor-pointer border border-[#DCE3DC]"
            title={`Estado: ${syncStatus}. Haz clic para gestionar la sala.`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                peerConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            <span className="font-mono text-[11px] font-semibold text-[#1B3B2B]">
              {roomId}
            </span>
            <button
              onClick={copyPatientLink}
              className="text-[#5B6960] hover:text-[#1B3B2B] p-0.5 ml-0.5 rounded hover:bg-white/80 transition-colors"
              title="Copiar enlace para paciente"
            >
              <span className="material-symbols-outlined text-[14px]">content_copy</span>
            </button>
          </div>

          {showTooltip && (
            <div className="absolute left-1/2 -translate-x-1/2 top-full mt-1.5 z-50 pointer-events-none bg-[#1B3B2B] text-white text-[11px] py-1 px-2.5 rounded-lg shadow-md whitespace-nowrap flex items-center gap-1 animate-in fade-in">
              <span className="material-symbols-outlined text-[13px] text-emerald-400">check_circle</span>
              <span>Enlace de paciente copiado</span>
            </div>
          )}
        </div>
      </div>

      {/* Zona Centro: Cronómetro Sereno */}
      <div className="flex items-center gap-2 bg-[#EFF2EE]/70 px-3 py-1 rounded-lg border border-[#DCE3DC]/70 font-mono text-[#5B6960] text-xs">
        <span className="material-symbols-outlined text-[14px] text-[#5B6960]">timer</span>
        <span className="font-bold text-[#1B3B2B]">{timerFormatted}</span>
        <button
          onClick={onResetTimer}
          className="hover:text-[#1B3B2B] transition-colors text-[#5B6960]/60 p-0.5 rounded hover:bg-white cursor-pointer"
          title="Reiniciar cronómetro"
        >
          <span className="material-symbols-outlined text-[13px]">restart_alt</span>
        </button>
      </div>

      {/* Zona Derecha: Herramientas */}
      <div className="flex items-center gap-2">
        {/* Botón de Plantillas en la cabecera (en lugar de Guía) */}
        <button
          onClick={onOpenTemplates}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold font-display border border-[#DCE3DC] bg-white hover:bg-[#EFF2EE] text-[#17231D] transition-all cursor-pointer shadow-2xs"
          title="Ver y cargar plantillas clínicas"
        >
          <span className="material-symbols-outlined text-[16px] text-[#1B3B2B]">bookmarks</span>
          <span>Plantillas</span>
        </button>

        {/* Botón de Ajustes */}
        <button
          onClick={onToggleSidebar}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold font-display border transition-all cursor-pointer shadow-2xs ${
            isSidebarOpen
              ? 'bg-[#1B3B2B] text-white border-[#1B3B2B]'
              : 'bg-[#E8F0EB] hover:bg-[#E2ECE5] text-[#1B3B2B] border-[#2A5B44]/20'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">tune</span>
          <span>Ajustes</span>
        </button>

        {/* Botón de Informe Clínico */}
        <button
          onClick={onOpenReport}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-[#5B6960] hover:text-[#17231D] hover:bg-[#EFF2EE] border border-transparent hover:border-[#DCE3DC] transition-colors cursor-pointer"
          title="Ver informe clínico y SUDs"
        >
          <span className="material-symbols-outlined text-[16px]">clinical_notes</span>
          <span className="hidden lg:inline">Informe</span>
        </button>
      </div>
    </header>
  );
};
