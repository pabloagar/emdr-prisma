import React, { useState } from 'react';
import { StimulationBlock, TechnicalSessionReport, StimulationModality } from '../types';
import { TRAJECTORIES } from '../constants';

interface ClinicalReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: TechnicalSessionReport;
}

export const ClinicalReportModal: React.FC<ClinicalReportModalProps> = ({
  isOpen,
  onClose,
  report
}) => {
  const [isAccordionOpen, setIsAccordionOpen] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  if (!isOpen) return null;

  const formatSeconds = (sec: number) => {
    const s = Math.round(sec);
    const m = String(Math.floor(s / 60)).padStart(2, '0');
    const rem = String(s % 60).padStart(2, '0');
    return `${m}:${rem}`;
  };

  const getModalityLabel = (mod: StimulationModality) => {
    switch (mod) {
      case 'both':
        return 'Visual + Auditiva';
      case 'audio-only':
        return 'Solo Auditiva';
      case 'visual-only':
        return 'Solo Visual';
      default:
        return 'Combinada';
    }
  };

  const showCopyToast = (msg: string) => {
    setCopyFeedback(msg);
    setTimeout(() => setCopyFeedback(null), 2400);
  };

  // Generar texto para «Copiar resumen»
  const generateSummaryText = () => {
    const lines = [
      '========================================',
      'INFORME TÉCNICO DE ESTIMULACIÓN BILATERAL',
      'Plataforma EMDR Prisma',
      `Fecha y hora: ${new Date().toLocaleString()}`,
      '========================================',
      '',
      '--- RESUMEN GENERAL ---',
      `• Tiempo total de estimulación activa: ${formatSeconds(report.totalActiveSeconds)}`,
      `• Número total de bloques: ${report.totalBlocks}`,
      `• Ciclos bilaterales completos: ${report.totalCycles}`,
      `• Frecuencia predominante: ${report.predominantFrequency.toFixed(2)} Hz`,
      `• Rango de frecuencia: ${report.frequencyRange.min.toFixed(2)} Hz – ${report.frequencyRange.max.toFixed(2)} Hz`,
      '',
      '--- MODALIDADES UTILIZADAS ---',
      ...report.modalitiesUsed.map((m) => {
        const stat = report.modalityStats[m];
        return `• ${getModalityLabel(m)}: ${stat.blocks} bloque(s) | Tiempo acumulado: ${formatSeconds(stat.seconds)}`;
      }),
      '',
      'Registro técnico automático libre de datos clínicos confidenciales.'
    ];
    return lines.join('\n');
  };

  // Generar texto para «Copiar con detalle»
  const generateDetailedText = () => {
    const summary = generateSummaryText();
    const tableHeader = [
      '',
      '--- DETALLE DE BLOQUES ---',
      '# | Modalidad         | Duración | Ciclos | Frecuencia       | Trayectoria / Estímulo',
      '----------------------------------------------------------------------------------'
    ];
    const tableRows = report.blocks.map((b) => {
      const freqStr =
        b.minFrequency === b.maxFrequency
          ? `${b.initialFrequency.toFixed(2)} Hz`
          : `${b.minFrequency.toFixed(2)} – ${b.maxFrequency.toFixed(2)} Hz`;
      const trajName = TRAJECTORIES[b.trajectory]?.name || b.trajectory;
      const num = String(b.blockNumber).padStart(2, '0');
      const mod = getModalityLabel(b.modality).padEnd(16, ' ');
      const dur = formatSeconds(b.durationSeconds).padEnd(8, ' ');
      const cyc = String(b.cycles).padEnd(6, ' ');
      const freq = freqStr.padEnd(16, ' ');
      return `${num} | ${mod} | ${dur} | ${cyc} | ${freq} | ${trajName} (${b.stimulus})`;
    });

    return `${summary}\n${tableHeader.join('\n')}\n${tableRows.join('\n')}`;
  };

  const handleCopySummary = async () => {
    try {
      await navigator.clipboard.writeText(generateSummaryText());
      showCopyToast('Resumen técnico copiado al portapapeles');
    } catch {
      showCopyToast('Error al copiar');
    }
  };

  const handleCopyDetail = async () => {
    try {
      await navigator.clipboard.writeText(generateDetailedText());
      showCopyToast('Informe técnico detallado copiado al portapapeles');
    } catch {
      showCopyToast('Error al copiar');
    }
  };

  const handleExport = () => {
    try {
      const text = generateDetailedText();
      const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `registro-estimulacion-emdr-${new Date().toISOString().slice(0, 10)}.txt`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      showCopyToast('Informe exportado con éxito');
    } catch {
      showCopyToast('Error al exportar');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/45 backdrop-blur-xs z-50 flex items-center justify-center p-3 sm:p-4 select-none">
      <div className="bg-white max-w-2xl w-full rounded-2xl sm:rounded-3xl shadow-2xl border border-[#DCE3DC] overflow-hidden flex flex-col max-h-[90vh] animate-in fade-in zoom-in-95 duration-150">
        {/* Cabecera del Informe */}
        <div className="px-5 py-4 border-b border-[#DCE3DC] flex items-center justify-between bg-[#EFF2EE]/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#1B3B2B] text-white flex items-center justify-center shadow-xs">
              <span className="material-symbols-outlined text-[17px]">bar_chart</span>
            </div>
            <div>
              <h3 className="font-display font-bold text-sm text-[#17231D]">
                Registro Técnico de Estimulación Bilateral
              </h3>
              <p className="text-[11px] text-[#5B6960]">
                Métricas del motor cinético y acústico (exclusivamente técnico)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#5B6960] hover:text-[#17231D] p-1.5 rounded-lg hover:bg-white text-xs flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Contenido desplazable */}
        <div className="p-5 overflow-y-auto flex flex-col gap-5 hide-scrollbar text-xs">
          {/* 3 Métricas Principales Destacadas */}
          <div className="grid grid-cols-3 gap-3">
            <div className="p-3.5 rounded-2xl bg-[#F7F8F6] border border-[#DCE3DC] flex flex-col gap-1 shadow-2xs">
              <span className="text-[10px] uppercase font-mono font-semibold text-[#5B6960]">
                Tiempo Estimulación
              </span>
              <span className="font-mono text-2xl font-bold text-[#1B3B2B]">
                {formatSeconds(report.totalActiveSeconds)}
              </span>
              <span className="text-[10px] text-neutral-400 font-mono">Tiempo activo real</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#F7F8F6] border border-[#DCE3DC] flex flex-col gap-1 shadow-2xs">
              <span className="text-[10px] uppercase font-mono font-semibold text-[#5B6960]">
                Total Bloques
              </span>
              <span className="font-mono text-2xl font-bold text-[#17231D]">
                {report.totalBlocks}
              </span>
              <span className="text-[10px] text-neutral-400 font-mono">Series ejecutadas</span>
            </div>

            <div className="p-3.5 rounded-2xl bg-[#F7F8F6] border border-[#DCE3DC] flex flex-col gap-1 shadow-2xs">
              <span className="text-[10px] uppercase font-mono font-semibold text-[#5B6960]">
                Ciclos Bilaterales
              </span>
              <span className="font-mono text-2xl font-bold text-[#2A5B44]">
                {report.totalCycles}
              </span>
              <span className="text-[10px] text-neutral-400 font-mono">Alternancias L/R</span>
            </div>
          </div>

          {/* Frecuencias y Modalidades */}
          <div className="p-4 rounded-2xl bg-[#EFF2EE]/70 border border-[#DCE3DC] flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-[#DCE3DC]/70">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[17px] text-[#1B3B2B]">speed</span>
                <span className="font-semibold text-xs text-[#17231D]">Frecuencia Predominante:</span>
                <span className="font-mono font-bold text-xs text-[#1B3B2B] bg-white px-2 py-0.5 rounded border border-[#DCE3DC]">
                  {report.predominantFrequency.toFixed(2)} Hz
                </span>
              </div>
              <div className="text-[11px] font-mono text-[#5B6960]">
                Rango utilizado:{' '}
                <strong className="text-[#17231D]">
                  {report.frequencyRange.min.toFixed(2)} Hz – {report.frequencyRange.max.toFixed(2)} Hz
                </strong>
              </div>
            </div>

            {/* Desglose por modalidad */}
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-mono uppercase font-semibold text-[#5B6960]">
                Modalidades Utilizadas & Desglose
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                {(['both', 'audio-only', 'visual-only'] as StimulationModality[]).map((m) => {
                  const stat = report.modalityStats[m];
                  const wasUsed = stat.blocks > 0;
                  return (
                    <div
                      key={m}
                      className={`p-2.5 rounded-xl border flex flex-col gap-0.5 ${
                        wasUsed
                          ? 'bg-white border-[#1B3B2B]/30 shadow-2xs'
                          : 'bg-white/40 border-neutral-200 opacity-60'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 font-medium text-[11px] text-[#17231D]">
                        <span className="material-symbols-outlined text-[14px] text-[#1B3B2B]">
                          {m === 'audio-only'
                            ? 'headphones'
                            : m === 'visual-only'
                            ? 'visibility'
                            : 'sync_alt'}
                        </span>
                        <span>{getModalityLabel(m)}</span>
                      </div>
                      <div className="flex items-center justify-between font-mono text-[10px] text-[#5B6960] mt-1">
                        <span>{stat.blocks} {stat.blocks === 1 ? 'bloque' : 'bloques'}</span>
                        <span className="font-bold text-[#1B3B2B]">{formatSeconds(stat.seconds)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Acordeón «Ver detalle de bloques» (Cerrado por defecto) */}
          <div className="rounded-2xl border border-[#DCE3DC] overflow-hidden bg-white">
            <button
              type="button"
              onClick={() => setIsAccordionOpen((prev) => !prev)}
              className="w-full px-4 py-3 bg-[#F7F8F6] hover:bg-[#EFF2EE] flex items-center justify-between transition-colors cursor-pointer text-xs font-semibold text-[#17231D]"
            >
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-[18px] text-[#1B3B2B]">
                  {isAccordionOpen ? 'unfold_less' : 'unfold_more'}
                </span>
                <span>Ver detalle de bloques ({report.blocks.length})</span>
              </div>
              <span className="text-[11px] font-mono text-[#5B6960]">
                {isAccordionOpen ? 'Ocultar tabla' : 'Desplegar tabla técnica'}
              </span>
            </button>

            {isAccordionOpen && (
              <div className="p-3 overflow-x-auto border-t border-[#DCE3DC]">
                {report.blocks.length === 0 ? (
                  <p className="text-[11px] text-[#5B6960] text-center py-4 italic">
                    Aún no se han completado bloques en esta sesión. Los bloques se registran automáticamente al Iniciar y Pausar.
                  </p>
                ) : (
                  <table className="w-full text-left font-mono text-[11px]">
                    <thead>
                      <tr className="border-b border-[#DCE3DC] text-[#5B6960] text-[10px] uppercase">
                        <th className="py-2 px-2">#</th>
                        <th className="py-2 px-2">Modalidad</th>
                        <th className="py-2 px-2">Duración</th>
                        <th className="py-2 px-2">Ciclos</th>
                        <th className="py-2 px-2">Frecuencia</th>
                        <th className="py-2 px-2">Trayectoria / Estímulo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#DCE3DC]/60">
                      {report.blocks.map((b) => (
                        <tr key={b.blockNumber} className="hover:bg-[#F7F8F6]">
                          <td className="py-2 px-2 font-bold text-[#1B3B2B]">
                            #{String(b.blockNumber).padStart(2, '0')}
                          </td>
                          <td className="py-2 px-2 text-[#17231D] font-sans">
                            {getModalityLabel(b.modality)}
                          </td>
                          <td className="py-2 px-2 text-[#17231D] font-bold">
                            {formatSeconds(b.durationSeconds)}
                          </td>
                          <td className="py-2 px-2 text-[#2A5B44] font-bold">
                            {b.cycles}
                          </td>
                          <td className="py-2 px-2 text-[#5B6960]">
                            {b.minFrequency === b.maxFrequency
                              ? `${b.initialFrequency.toFixed(2)} Hz`
                              : `${b.minFrequency.toFixed(2)} - ${b.maxFrequency.toFixed(2)} Hz`}
                          </td>
                          <td className="py-2 px-2 text-[#17231D] font-sans">
                            {TRAJECTORIES[b.trajectory]?.name || b.trajectory} · <span className="capitalize">{b.stimulus}</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Barra de Acciones */}
        <div className="px-5 py-3.5 bg-[#EFF2EE]/70 border-t border-[#DCE3DC] flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <div className="flex items-center gap-1.5">
            {copyFeedback && (
              <span className="text-[11px] font-mono text-emerald-800 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg flex items-center gap-1 animate-in fade-in">
                <span className="material-symbols-outlined text-[14px] text-emerald-700">check_circle</span>
                <span>{copyFeedback}</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopySummary}
              className="px-3 py-1.5 bg-white hover:bg-neutral-50 text-[#17231D] border border-[#DCE3DC] rounded-xl font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              title="Copiar texto resumen al portapapeles"
            >
              <span className="material-symbols-outlined text-[15px] text-[#1B3B2B]">content_copy</span>
              <span>Copiar resumen</span>
            </button>

            <button
              type="button"
              onClick={handleCopyDetail}
              className="px-3 py-1.5 bg-white hover:bg-neutral-50 text-[#17231D] border border-[#DCE3DC] rounded-xl font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
              title="Copiar informe completo con detalle de bloques al portapapeles"
            >
              <span className="material-symbols-outlined text-[15px] text-[#1B3B2B]">table_chart</span>
              <span>Copiar con detalle</span>
            </button>

            <button
              type="button"
              onClick={handleExport}
              className="px-3.5 py-1.5 bg-[#1B3B2B] hover:bg-[#2A5B44] text-white rounded-xl font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
              title="Exportar archivo de texto técnico"
            >
              <span className="material-symbols-outlined text-[15px]">download</span>
              <span>Exportar informe</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
