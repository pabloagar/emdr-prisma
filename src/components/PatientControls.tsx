import React from 'react';

// Vista del paciente sin controles: solo el aviso de pausa por desconexión.
// El inicio, la pausa y la detención los maneja exclusivamente el profesional.
interface PatientControlsProps {
  showDisconnectedOverlay: boolean;
  onDismissOverlay: () => void;
}

export const PatientControls: React.FC<PatientControlsProps> = ({
  showDisconnectedOverlay,
  onDismissOverlay
}) => {
  return (
    <>
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
