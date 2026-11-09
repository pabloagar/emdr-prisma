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
  onCopyPatientLink: () => Promise<boolean>;
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
  onOpenRemoteModal,
  onCopyPatientLink
}) => {
  const [showTooltip, setShowTooltip] = useState(false);

  const handleQuickCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const copied = await onCopyPatientLink();
    if (!copied) return;
    setShowTooltip(true);
    setTimeout(() => setShowTooltip(false), 2400);
  };

  return (
    <header className="h-14 bg-white/95 backdrop-blur-md border-b border-[#DCE3DC] px-3 sm:px-6 flex items-center justify-between shrink-0 z-30 transition-all select-none">
      {/* Zona Izquierda: Identidad y Sala Paciente Intuitiva */}
      <div className="flex items-center gap-2 sm:gap-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-[#1B3B2B] text-white flex items-center justify-center shadow-xs">
            <span className="material-symbols-outlined text-[19px]">all_inclusive</span>
          </div>
          <span className="font-display font-bold text-sm tracking-tight text-[#17231D] hidden md:inline">
            EMDR Prisma
          </span>
        </div>

        <div className="h-4 w-[1px] bg-[#DCE3DC] mx-0.5 sm:mx-1"></div>

        {/* BOTÓN INTUITIVO Y LLAMATIVO PARA AGREGAR / SINCRONIZAR PACIENTE */}
        <div className="relative inline-flex items-center">
          <div
            onClick={onOpenRemoteModal}
            className={`group flex items-center gap-2 pl-2.5 pr-1 py-1 rounded-xl border transition-all cursor-pointer shadow-xs ${
              peerConnected
                ? 'bg-emerald-50 border-emerald-300 hover:bg-emerald-100/80 text-emerald-950'
                : 'bg-[#EFF2EE] border-[#1B3B2B]/30 hover:border-[#1B3B2B] hover:bg-[#E8F0EB] text-[#17231D]'
            }`}
            title={`Estado: ${syncStatus}. Clic para abrir el panel de conexión con el paciente.`}
          >
            {/* Ícono llamativo y pulso */}
            <div className="flex items-center gap-1.5">
              <span
                className={`w-2 h-2 rounded-full ${
                  peerConnected ? 'bg-emerald-600 animate-ping' : 'bg-amber-500 animate-pulse'
                }`}
              />
              <span className="material-symbols-outlined text-[17px] text-[#1B3B2B]">
                {peerConnected ? 'sensors' : 'person_add'}
              </span>
            </div>

            {/* Texto de acción claro para el psicólogo */}
            <div className="flex items-baseline gap-1.5">
              <span className="font-display font-semibold text-xs text-[#17231D]">
                {peerConnected ? 'Paciente Conectado' : 'Invitar Paciente'}
              </span>
              <span className="font-mono text-[10px] font-bold text-[#1B3B2B] bg-white px-1.5 py-0.5 rounded border border-[#DCE3DC]">
                {roomId}
              </span>
            </div>

            {/* Botón rápido de copiar enlace con diseño distinguible */}
            <button
              type="button"
              onClick={handleQuickCopy}
              className="p-1 rounded-lg bg-white hover:bg-[#1B3B2B] hover:text-white text-[#1B3B2B] border border-[#DCE3DC] transition-all shadow-2xs ml-0.5 cursor-pointer flex items-center justify-center"
              title="Copiar enlace directo para el paciente"
            >
              <span className="material-symbols-outlined text-[15px]">content_copy</span>
            </button>
          </div>

          {/* Notificación flotante de confirmación */}
          {showTooltip && (
            <div className="absolute left-0 top-full mt-2 z-50 pointer-events-none bg-[#1B3B2B] text-white text-[11px] py-1.5 px-3 rounded-xl shadow-lg whitespace-nowrap flex items-center gap-1.5 animate-in fade-in slide-in-from-top-1">
              <span className="material-symbols-outlined text-[15px] text-emerald-400">check_circle</span>
              <span>¡Enlace del paciente copiado al portapapeles!</span>
            </div>
          )}
        </div>
      </div>

      {/* Zona Centro: Cronómetro */}
      <div className="hidden sm:flex items-center gap-2 bg-[#EFF2EE]/70 px-3 py-1 rounded-xl border border-[#DCE3DC]/70 font-mono text-[#5B6960] text-xs">
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

      {/* Zona Derecha: Herramientas Clínicas */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Plantillas */}
        <button
          onClick={onOpenTemplates}
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold font-display border border-[#DCE3DC] bg-white hover:bg-[#EFF2EE] text-[#17231D] transition-all cursor-pointer shadow-2xs"
          title="Ver y cargar plantillas clínicas"
        >
          <span className="material-symbols-outlined text-[16px] text-[#1B3B2B]">bookmarks</span>
          <span className="hidden md:inline">Plantillas</span>
        </button>

        {/* Ajustes */}
        <button
          onClick={onToggleSidebar}
          className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold font-display border transition-all cursor-pointer shadow-2xs ${
            isSidebarOpen
              ? 'bg-[#1B3B2B] text-white border-[#1B3B2B]'
              : 'bg-[#E8F0EB] hover:bg-[#E2ECE5] text-[#1B3B2B] border-[#2A5B44]/20'
          }`}
        >
          <span className="material-symbols-outlined text-[16px]">tune</span>
          <span className="hidden md:inline">Ajustes</span>
        </button>

        {/* Registro Técnico / Informe */}
        <button
          onClick={onOpenReport}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-[#17231D] bg-[#EFF2EE] hover:bg-white border border-[#DCE3DC] transition-colors cursor-pointer shadow-2xs"
          title="Abrir registro técnico de estimulación"
        >
          <span className="material-symbols-outlined text-[16px] text-[#1B3B2B]">bar_chart</span>
          <span>Informe</span>
        </button>
      </div>
    </header>
  );
};
