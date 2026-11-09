import React, { useEffect, useState } from 'react';
import { RemoteCredentials } from '../types';

interface RemoteRoomModalProps {
  isOpen: boolean;
  onClose: () => void;
  credentials: RemoteCredentials | null;
  patientLink: string | null;
  onCreateRoom: () => Promise<void>;
  onReconnect: () => void;
  syncStatus: string;
  peerConnected: boolean;
  latencyMs: number | null;
  onCopyPatientLink: () => Promise<boolean>;
  isCreating: boolean;
}

export const RemoteRoomModal: React.FC<RemoteRoomModalProps> = ({
  isOpen,
  onClose,
  credentials,
  patientLink,
  onCreateRoom,
  onReconnect,
  syncStatus,
  peerConnected,
  latencyMs,
  onCopyPatientLink,
  isCreating
}) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleCopy = async () => {
    if (!(await onCopyPatientLink())) return;
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const patientUrl = patientLink;

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 select-none">
      <div className="bg-white max-w-md w-full rounded-2xl shadow-xl border border-[#DCE3DC] overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-4 border-b border-[#DCE3DC] flex items-center justify-between bg-[#EFF2EE]/50">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[#1B3B2B] text-[20px]">cell_tower</span>
            <h3 className="font-display font-bold text-sm text-[#17231D]">
              EMDR Prisma · Sala Remota
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
          {/* Estado actual */}
          <div className="p-3.5 rounded-xl bg-[#EFF2EE] border border-[#DCE3DC]/70 flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-semibold text-[#5B6960] block font-mono">
                Estado de la Conexión
              </span>
              <div className="flex items-center gap-2 mt-1">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    peerConnected ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
                  }`}
                />
                <span className="font-bold text-xs text-[#17231D]">{syncStatus}</span>
              </div>
            </div>
            {latencyMs !== null && (
              <div className="text-right">
                <span className="text-[10px] text-[#5B6960] block font-mono">Latencia</span>
                <span className="font-mono font-bold text-xs text-emerald-700">~{latencyMs}ms</span>
              </div>
            )}
          </div>

          {/* Sala activa */}
          {credentials ? (
            <div className="flex flex-col gap-2">
              <label className="font-medium text-[#17231D]">Enlace Privado del Paciente:</label>
              <div className="flex gap-2 items-center">
                <input
                  type="text"
                  readOnly
                  value={patientUrl || ''}
                  className="flex-1 text-[11px] font-mono px-3 py-2 bg-[#EFF2EE] border border-[#DCE3DC] rounded-xl text-[#17231D] select-all focus:outline-none"
                />
                <button
                  onClick={handleCopy}
                  className="px-3 py-2 bg-[#1B3B2B] hover:bg-[#2A5B44] text-white rounded-xl font-medium text-xs flex items-center gap-1 shrink-0 transition-colors cursor-pointer"
                >
                  <span className="material-symbols-outlined text-[15px]">
                    {copied ? 'check' : 'content_copy'}
                  </span>
                  <span>{copied ? 'Copiado' : 'Copiar'}</span>
                </button>
              </div>
              <p className="text-[11px] text-[#5B6960] leading-relaxed">
                Sala activa: <strong className="text-[#17231D] font-mono">{credentials.roomId.slice(0, 8).toUpperCase()}</strong>. El enlace incluye la llave de acceso del paciente y caduca en 2 horas.
                Comparte este enlace únicamente a través de un canal clínico seguro.
              </p>
            </div>
          ) : (
            <div className="text-center py-3 text-[#5B6960]">
              <span className="material-symbols-outlined text-3xl text-[#5B6960]/60 mb-1">lock_open</span>
              <p className="text-xs">No hay una sala remota inicializada actualmente.</p>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-[#DCE3DC]/60">
            <button
              disabled={isCreating}
              onClick={onCreateRoom}
              className="flex-1 py-2.5 px-4 bg-[#1B3B2B] hover:bg-[#2A5B44] text-white rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-[17px]">add_circle</span>
              <span>{isCreating ? 'Creando sala...' : credentials ? 'Crear Sala Nueva' : 'Crear Sala Segura'}</span>
            </button>
            <button
              onClick={onReconnect}
              className="py-2.5 px-4 bg-[#E8F0EB] hover:bg-[#E2ECE5] text-[#1B3B2B] rounded-xl font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[17px]">sync</span>
              <span>Reconectar</span>
            </button>
          </div>

          <p className="text-[10px] text-[#5B6960] text-center">
            Salas efímeras con caducidad automática de 2 horas. No se almacenan notas confidenciales en el servidor.
          </p>
        </div>
      </div>
    </div>
  );
};
