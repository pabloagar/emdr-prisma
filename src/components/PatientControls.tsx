import React from 'react';

interface PatientControlsProps {
  syncStatus: string;
  peerConnected: boolean;
  isAudioUnlocked: boolean;
  onEnableAudio: () => void;
  onEmergencyStop: () => void;
  showDisconnectedOverlay: boolean;
  onDismissOverlay: () => void;
}

export const PatientControls: React.FC<PatientControlsProps> = ({
  syncStatus,
  peerConnected,
  isAudioUnlocked,
  onEnableAudio,
  onEmergencyStop,
  showDisconnectedOverlay,
  onDismissOverlay
}) => {
  return (
    <>
      {/* Barra de control flotante inferior para el paciente */}
      <div className="fixed z-50 left-1/2 bottom-5 -translate-x-1/2 flex items-center gap-3 px-4 py-2.5 rounded-2xl bg-[#182D26]/90 backdrop-blur-md text-white font-sans text-xs shadow-xl border border-white/10 select-none">
        <div className="flex items-center gap-2">
          <span
            className={`w-2 h-2 rounded-full ${
              peerConnected ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'
            }`}
          />
          <span className="font-medium text-[11px] text-emerald-100">{syncStatus}</span>
        </div>

        <button
          onClick={onEnableAudio}
          className={`px-3 py-1.5 rounded-xl font-semibold text-xs transition-colors cursor-pointer ${
            isAudioUnlocked
              ? 'bg-emerald-700/60 text-emerald-100 cursor-default'
              : 'bg-white text-[#1B3B2B] hover:bg-emerald-50'
          }`}
        >
          {isAudioUnlocked ? 'Sonido habilitado' : 'Activar sonido'}
        </button>

        <button
          onClick={onEmergencyStop}
          className="bg-[#A42B32] hover:bg-[#b8333b] text-white px-3.5 py-1.5 rounded-xl font-bold text-xs shadow-xs transition-colors cursor-pointer"
        >
          DETENER
        </button>
      </div>

      {/* Overlay modal de desconexión / pausa de seguridad */}
      {showDisconnectedOverlay && (
        <div className="fixed inset-0 z-[10000] grid place-items-center bg-[#17231D]/90 backdrop-blur-sm text-white text-center p-5 font-sans select-none animate-in fade-in duration-200">
          <div className="max-w-md w-full bg-[#1F332A] p-6 rounded-2xl border border-white/10 shadow-2xl">
            <span className="material-symbols-outlined text-amber-400 text-4xl mb-2">pause_circle</span>
            <h2 className="text-xl font-bold font-display mb-2">Sesión en pausa</h2>
            <p className="text-xs text-neutral-300 leading-relaxed mb-5">
              No se ha confirmado una conexión activa con el profesional. Los estímulos bilaterales se
              encuentran detenidos por seguridad.
            </p>
            <button
              onClick={onDismissOverlay}
              className="w-full bg-white text-[#17231D] hover:bg-neutral-100 font-semibold text-xs py-2.5 px-4 rounded-xl shadow-sm transition-colors cursor-pointer"
            >
              Cerrar aviso
            </button>
          </div>
        </div>
      )}
    </>
  );
};
