import React, { useState } from 'react';

interface ClinicalReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  passes: number;
  timeFormatted: string;
}

export const ClinicalReportModal: React.FC<ClinicalReportModalProps> = ({
  isOpen,
  onClose,
  passes,
  timeFormatted
}) => {
  const [notes, setNotes] = useState('');
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = () => {
    try {
      const historyRaw = localStorage.getItem('emdr_clinical_reports') || '[]';
      const history = JSON.parse(historyRaw);
      history.unshift({
        date: new Date().toISOString(),
        passes,
        duration: timeFormatted,
        notes
      });
      localStorage.setItem('emdr_clinical_reports', JSON.stringify(history));
      setSavedSuccess(true);
      setTimeout(() => {
        setSavedSuccess(false);
        onClose();
      }, 800);
    } catch {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-white max-w-lg w-full rounded-2xl shadow-xl border border-[#DCE3DC] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-4 border-b border-[#DCE3DC] flex items-center justify-between bg-[#EFF2EE]/50">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#1B3B2B] text-[20px]">clinical_notes</span>
            <h3 className="font-display font-bold text-sm text-[#17231D]">
              Informe Clínico de la Sesión EMDR
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-[#5B6960] hover:text-[#17231D] p-1 rounded-md cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4 text-xs">
          <div className="grid grid-cols-2 gap-3 p-3 bg-[#EFF2EE] rounded-xl border border-[#DCE3DC]/50">
            <div>
              <span className="text-[10px] uppercase font-semibold text-[#5B6960] block font-mono">
                Pasadas Bilaterales
              </span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="font-mono text-2xl font-bold text-[#1B3B2B]">{passes}</span>
                <span className="text-[#5B6960]">ciclos L/R</span>
              </div>
            </div>
            <div>
              <span className="text-[10px] uppercase font-semibold text-[#5B6960] block font-mono">
                Tiempo de Estimulación
              </span>
              <span className="font-mono text-2xl font-bold text-[#17231D] mt-0.5 block">
                {timeFormatted}
              </span>
            </div>
          </div>

          <div>
            <label className="font-medium text-[#17231D] block mb-1.5">
              Notas clínicas y SUDs (Unidades Subjetivas de Perturbación):
            </label>
            <textarea
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="SUDs inicial 8. Tras pasada continua lineal SUD desciende a 3..."
              className="w-full text-xs p-3 bg-[#EFF2EE] border border-[#DCE3DC] rounded-xl focus:ring-1 focus:ring-[#1B3B2B] focus:outline-none"
            />
          </div>
        </div>

        <div className="px-5 py-3 bg-[#EFF2EE]/60 border-t border-[#DCE3DC] flex justify-end gap-2 text-xs">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-[#DCE3DC] bg-white hover:bg-neutral-50 text-[#5B6960] rounded-lg font-medium cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-[#1B3B2B] hover:bg-[#2A5B44] text-white rounded-lg font-medium shadow-xs cursor-pointer flex items-center gap-1.5"
          >
            {savedSuccess ? (
              <>
                <span className="material-symbols-outlined text-[16px]">check</span>
                <span>Guardado</span>
              </>
            ) : (
              <span>Guardar al Historial</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
