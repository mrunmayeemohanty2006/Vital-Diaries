import React, { useEffect, useState } from 'react';
import { X, Lock, ShieldCheck, Calendar, UserCheck, Building2, Tag, AlertTriangle, Sparkles, Trash2, Download, FileText, Image as ImageIcon, Loader2, Activity } from 'lucide-react';
import jsPDF from 'jspdf';
import type { HealthReport, DecryptedReportDetails } from '../../types/health';
import { decryptData } from '../../lib/crypto';
import { formatDate, formatFileSize } from '../../lib/utils';
import { getOrEnsureCryptoKey } from '../../lib/key-management';
import { extractReferenceRangeFromLine } from '../../lib/health-extractor';
import { evaluateHealthMarker } from '../../health-engine/evaluator/evaluate-marker';
import { HealthInsightCard } from './HealthInsightCard';
import type { HealthInsight } from '../../health-engine/types';

interface ViewReportModalProps {
  report: HealthReport;
  encryptionKey: CryptoKey | null;
  onClose: () => void;
  onGetInsights?: (reportId: string) => void;
  onAnalyzeWithAI?: (reportId: string) => void;
  onDeleteReport?: (reportId: string) => void;
}

export const ViewReportModal: React.FC<ViewReportModalProps> = ({
  report,
  encryptionKey,
  onClose,
  onGetInsights,
  onAnalyzeWithAI,
  onDeleteReport,
}) => {
  const [details, setDetails] = useState<DecryptedReportDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    async function performDecryption() {
      if (!encryptionKey) {
        setError('Vault is currently locked. Unlock your vault to view decrypted health data.');
        setIsLoading(false);
        return;
      }

      try {
        const decryptedJson = await decryptData(report.encryptedData, report.iv, encryptionKey);
        const parsed = JSON.parse(decryptedJson) as DecryptedReportDetails;
        setDetails(parsed);
      } catch (err: any) {
        setError('Failed to decrypt report: Invalid key or corrupted data.');
      } finally {
        setIsLoading(false);
      }
    }

    performDecryption();
  }, [report, encryptionKey]);

  /**
   * ISSUE 3: Export exact original file (or summary PDF for legacy)
   */
  const handleExportOriginalOrSummary = async () => {
    setIsExporting(true);
    try {
      if (details && (details.fileBase64 || details.fileDataUrl)) {
        const rawBase64 = details.fileBase64 || (details.fileDataUrl ? details.fileDataUrl.split(',')[1] : '');
        const mimeType = details.fileType || 'application/octet-stream';
        const fileName = details.fileName || `${report.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;

        const byteCharacters = atob(rawBase64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: mimeType });

        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        return;
      }

      // Legacy fallback
      const doc = new jsPDF();
      doc.setFillColor(16, 185, 129);
      doc.rect(0, 0, 210, 28, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('VITAL DIARIES', 14, 18);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Decrypted Health Record Summary', 120, 18);

      let y = 38;
      doc.setTextColor(30, 41, 59);
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(report.title, 14, y);

      y += 7;
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(`Date: ${formatDate(report.date)}`, 14, y);
      if (report.doctorName) doc.text(`Doctor: ${report.doctorName}`, 110, y);

      const safeFileName = `${report.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_summary.pdf`;
      doc.save(safeFileName);
    } catch (err) {
      console.error('Export error in modal:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const derivedDataUrl = details?.fileDataUrl || (details?.fileBase64 ? `data:${details.fileType || 'application/octet-stream'};base64,${details.fileBase64}` : undefined);
  const hasOriginalFile = Boolean(details?.fileBase64 || details?.fileDataUrl);
  const isImageFile = Boolean(details?.fileType?.startsWith('image/') && (details?.fileBase64 || details?.fileDataUrl));

  // Deterministic Hemoglobin Health Insight evaluation (Phase 1)
  const hemoglobinEntry = details?.results
    ? Object.entries(details.results).find(([k]) =>
        ['hemoglobin', 'hgb', 'hb', 'haemoglobin'].includes(k.trim().toLowerCase())
      )
    : null;

  let hemoglobinInsight: HealthInsight | null = null;
  if (hemoglobinEntry) {
    const rawValStr = String(hemoglobinEntry[1]);
    const valMatch = rawValStr.match(/^(\d+(?:[.,]\d+)?)\s*([a-zA-Z%\/]+)?/);
    if (valMatch) {
      const val = parseFloat(valMatch[1].replace(',', '.'));
      const unit = valMatch[2] || 'g/dL';

      const refRange =
        extractReferenceRangeFromLine(rawValStr, val) ||
        (details?.notes ? extractReferenceRangeFromLine(details.notes, val) : undefined);

      hemoglobinInsight = evaluateHealthMarker({
        name: hemoglobinEntry[0],
        value: val,
        unit,
        referenceRange: refRange,
      });
    }
  }

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 dark:bg-black/75 backdrop-blur-md flex items-center justify-center p-3.5 sm:p-4">
      <div className="bg-white dark:bg-stone-900 max-w-2xl w-full rounded-2xl sm:rounded-[2.5rem] border border-stone-200 dark:border-stone-800 shadow-2xl p-4 sm:p-6 sm:p-8 max-h-[92vh] overflow-y-auto text-stone-900 dark:text-stone-100">
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-stone-100 dark:border-stone-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold uppercase rounded-md tracking-wider border border-emerald-200/60 dark:border-emerald-800/60">
                Decrypted Locally
              </span>
              <span className="text-xs text-stone-400 dark:text-stone-500 font-mono">IV: {report.iv.slice(0, 10)}...</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-100">{report.title}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isLoading ? (
          <div className="p-12 text-center text-stone-500 dark:text-stone-400 font-medium">
            <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <span>Decrypting AES-256-GCM ciphertext in browser memory...</span>
          </div>
        ) : error ? (
          <div className="p-6 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 rounded-2xl text-red-800 dark:text-red-200">
            <div className="flex items-center gap-2 font-bold mb-2">
              <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
              <span>Decryption Error</span>
            </div>
            <p className="text-sm">{error}</p>
          </div>
        ) : details ? (
          <div className="space-y-6">
            {/* Metadata Card */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-stone-50 dark:bg-stone-800/60 rounded-2xl border border-stone-200 dark:border-stone-700/80 text-xs text-stone-700 dark:text-stone-300">
              <div>
                <span className="text-stone-400 dark:text-stone-400 font-bold uppercase text-[10px] block mb-1">Report Date</span>
                <span className="font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-stone-400" />
                  {formatDate(report.date)}
                </span>
              </div>

              {report.doctorName && (
                <div>
                  <span className="text-stone-400 dark:text-stone-400 font-bold uppercase text-[10px] block mb-1">Physician</span>
                  <span className="font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-stone-400" />
                    {report.doctorName}
                  </span>
                </div>
              )}

              {details.facility && (
                <div>
                  <span className="text-stone-400 dark:text-stone-400 font-bold uppercase text-[10px] block mb-1">Facility / Lab</span>
                  <span className="font-semibold text-stone-900 dark:text-stone-100 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-stone-400" />
                    {details.facility}
                  </span>
                </div>
              )}

              {details.fileLastModified && (
                <div>
                  <span className="text-stone-400 dark:text-stone-400 font-bold uppercase text-[10px] block mb-1">File Modified</span>
                  <span className="font-mono text-[11px] text-stone-800 dark:text-stone-200">
                    {formatDate(details.fileLastModified)}
                  </span>
                </div>
              )}
            </div>

            {/* Preserved Original File Banner */}
            {hasOriginalFile && (
              <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center text-emerald-700 dark:text-emerald-300 shrink-0">
                    {details.fileType?.includes('pdf') ? (
                      <FileText className="w-5 h-5 text-red-500" />
                    ) : (
                      <ImageIcon className="w-5 h-5 text-blue-500" />
                    )}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-stone-900 dark:text-stone-100 block">
                      {details.fileName || 'Original Medical Document'}
                    </span>
                    <span className="text-[11px] text-stone-500 dark:text-stone-400 font-mono">
                      {details.fileType || 'Document'} • {formatFileSize(details.fileSize)} • Preserved in ciphertext
                    </span>
                  </div>
                </div>

                <button
                  onClick={handleExportOriginalOrSummary}
                  disabled={isExporting}
                  className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center justify-center gap-1.5 shadow-2xs shrink-0 cursor-pointer disabled:opacity-50"
                >
                  {isExporting ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Download className="w-3.5 h-3.5" />
                  )}
                  <span>Download Original File</span>
                </button>
              </div>
            )}

            {/* Image Preview if Image Document */}
            {isImageFile && derivedDataUrl && (
              <div className="border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden bg-stone-50 dark:bg-stone-950/50 p-2 text-center">
                <img
                  src={derivedDataUrl}
                  alt={details.fileName || 'Decrypted Medical Document'}
                  className="max-h-64 sm:max-h-80 mx-auto rounded-xl object-contain shadow-xs"
                />
              </div>
            )}

            {/* Dynamic Decrypted Clinical Measurements Table */}
            {(() => {
              const rawMetricsList = Array.isArray(details.metrics) && details.metrics.length > 0
                ? details.metrics
                : details.results
                ? Object.entries(details.results).map(([key, value]) => ({
                    name: key,
                    value: String(value),
                    unit: '',
                    displayValue: String(value),
                    status: 'unknown' as const,
                  }))
                : [];

              const getStatusBadge = (status?: string) => {
                switch (status) {
                  case 'low':
                    return (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60">
                        Low
                      </span>
                    );
                  case 'high':
                    return (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                        High
                      </span>
                    );
                  case 'normal':
                    return (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
                        Normal
                      </span>
                    );
                  case 'low-normal':
                    return (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60">
                        Low-Normal
                      </span>
                    );
                  case 'high-normal':
                    return (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
                        High-Normal
                      </span>
                    );
                  default:
                    return (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-bold bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 border border-stone-200 dark:border-stone-700">
                        Unknown
                      </span>
                    );
                }
              };

              const formatRefRange = (ref?: { low?: number; high?: number; rawText?: string; unit?: string }) => {
                if (!ref) return <span className="text-stone-400 dark:text-stone-500 italic text-xs">Not provided</span>;
                if (ref.rawText) return <span className="font-mono text-xs">{ref.rawText}</span>;
                if (ref.low !== undefined && ref.high !== undefined) {
                  if (ref.high === Infinity) return <span className="font-mono text-xs">{`> ${ref.low} ${ref.unit || ''}`.trim()}</span>;
                  if (ref.low === 0) return <span className="font-mono text-xs">{`< ${ref.high} ${ref.unit || ''}`.trim()}</span>;
                  return <span className="font-mono text-xs">{`${ref.low} - ${ref.high} ${ref.unit || ''}`.trim()}</span>;
                }
                return <span className="text-stone-400 dark:text-stone-500 italic text-xs">Not provided</span>;
              };

              if (rawMetricsList.length === 0) return null;

              return (
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest">
                      Clinical Measurements & Findings ({rawMetricsList.length})
                    </h3>
                    <span className="text-[11px] text-stone-400 dark:text-stone-500 font-mono">
                      Document Source of Truth
                    </span>
                  </div>
                  <div className="border border-stone-200 dark:border-stone-800 rounded-2xl overflow-x-auto shadow-2xs">
                    <table className="w-full text-left text-sm min-w-[560px]">
                      <thead className="bg-stone-50 dark:bg-stone-800/80 text-stone-500 dark:text-stone-400 font-bold uppercase text-[10px] tracking-widest border-b border-stone-200 dark:border-stone-800">
                        <tr>
                          <th className="px-4 py-2.5">Parameter / Biomarker</th>
                          <th className="px-4 py-2.5">Observed Result</th>
                          <th className="px-4 py-2.5">Reference Range</th>
                          <th className="px-4 py-2.5">Status</th>
                          <th className="px-4 py-2.5">Method</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                        {rawMetricsList.map((m, idx) => (
                          <tr key={`${m.name}-${idx}`} className="hover:bg-stone-50/50 dark:hover:bg-stone-800/40">
                            <td className="px-4 py-3 align-top">
                              <div className="font-semibold text-stone-900 dark:text-stone-100 text-xs sm:text-sm">
                                {m.name}
                              </div>
                              {m.needsVerification && (
                                <span
                                  className="inline-flex items-center gap-1 text-[10px] text-amber-700 dark:text-amber-400 font-medium mt-0.5"
                                  title={m.verificationReason || 'Needs verification against original report'}
                                >
                                  <AlertTriangle className="w-2.5 h-2.5" />
                                  <span>Verify in report</span>
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 align-top font-mono text-xs sm:text-sm text-stone-900 dark:text-stone-100 font-bold">
                              {m.displayValue || (m.unit ? `${m.value} ${m.unit}` : String(m.value))}
                            </td>
                            <td className="px-4 py-3 align-top text-stone-600 dark:text-stone-300">
                              {formatRefRange(m.referenceRange)}
                            </td>
                            <td className="px-4 py-3 align-top">
                              {getStatusBadge(m.status)}
                            </td>
                            <td className="px-4 py-3 align-top text-xs text-stone-500 dark:text-stone-400">
                              {m.method || <span className="text-stone-300 dark:text-stone-600">—</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}

            {/* Deterministic Hemoglobin Health Insight Card (Phase 1) */}
            {hemoglobinInsight && (
              <div className="pt-2">
                <HealthInsightCard insight={hemoglobinInsight} />
              </div>
            )}

            {/* Notes */}
            {details.notes && (
              <div>
                <h3 className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest mb-2">
                  Physician Impression & Notes
                </h3>
                <p className="p-4 bg-stone-50 dark:bg-stone-800/60 rounded-2xl border border-stone-200 dark:border-stone-700/80 text-stone-900 dark:text-stone-200 text-sm leading-relaxed">
                  {details.notes}
                </p>
              </div>
            )}

            {/* Tags */}
            {details.tags && details.tags.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {details.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex items-center gap-1 px-3 py-1 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 rounded-full text-xs font-semibold border border-stone-200/60 dark:border-stone-700"
                  >
                    <Tag className="w-3 h-3 text-stone-400" />
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div className="p-4 bg-emerald-50 dark:bg-emerald-950/60 rounded-2xl border border-emerald-100 dark:border-emerald-800/60 flex items-center justify-between text-xs text-emerald-900 dark:text-emerald-200">
              <span className="flex items-center gap-1.5 font-semibold">
                <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                Decrypted in browser memory via Web Crypto API
              </span>
              <span className="text-emerald-700 dark:text-emerald-400 font-mono text-[10px]">Zero Network Transmission</span>
            </div>
          </div>
        ) : null}

        <div className="mt-6 pt-4 border-t border-stone-100 dark:border-stone-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {(onGetInsights || onAnalyzeWithAI) && (
              <button
                onClick={() => {
                  onClose();
                  if (onGetInsights) onGetInsights(report.id);
                  else if (onAnalyzeWithAI) onAnalyzeWithAI(report.id);
                }}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-2 shadow-xs cursor-pointer"
              >
                <Activity className="w-4 h-4 text-emerald-200" />
                <span>Get Lab Insights</span>
              </button>
            )}

            <button
              onClick={handleExportOriginalOrSummary}
              disabled={isExporting}
              className="px-3.5 py-2.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />
              ) : hasOriginalFile ? (
                <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              )}
              <span>{hasOriginalFile ? 'Export Original' : 'Export Summary PDF'}</span>
            </button>

            {onDeleteReport && (
              isConfirmingDelete ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      onDeleteReport(report.id);
                      onClose();
                    }}
                    className="px-3 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Confirm Delete?</span>
                  </button>
                  <button
                    onClick={() => setIsConfirmingDelete(false)}
                    className="p-2 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 rounded-xl transition-colors border border-stone-200 dark:border-stone-700 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsConfirmingDelete(true)}
                  className="px-3.5 py-2.5 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800/60 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-4 h-4 text-rose-600 dark:text-rose-400" />
                  <span>Delete Report</span>
                </button>
              )
            )}
          </div>

          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-stone-900 dark:bg-stone-100 hover:bg-stone-800 dark:hover:bg-stone-200 text-white dark:text-stone-900 rounded-xl text-sm font-bold transition-colors ml-auto cursor-pointer"
          >
            Close View
          </button>
        </div>
      </div>
    </div>
  );
};
