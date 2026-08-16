import React, { useEffect, useState } from 'react';
import { X, Lock, ShieldCheck, Calendar, UserCheck, Building2, Tag, AlertTriangle, Sparkles, Trash2 } from 'lucide-react';
import type { HealthReport, DecryptedReportDetails } from '../../types/health';
import { decryptData } from '../../lib/crypto';
import { formatDate } from '../../lib/utils';

interface ViewReportModalProps {
  report: HealthReport;
  encryptionKey: CryptoKey | null;
  onClose: () => void;
  onAnalyzeWithAI?: (reportId: string) => void;
  onDeleteReport?: (reportId: string) => void;
}

export const ViewReportModal: React.FC<ViewReportModalProps> = ({
  report,
  encryptionKey,
  onClose,
  onAnalyzeWithAI,
  onDeleteReport,
}) => {
  const [details, setDetails] = useState<DecryptedReportDetails | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);

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

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 dark:bg-black/70 backdrop-blur-md flex items-center justify-center p-3.5 sm:p-4">
      <div className="bg-white dark:bg-stone-900 max-w-2xl w-full rounded-2xl sm:rounded-[2.5rem] border border-stone-200 dark:border-stone-800 shadow-2xl p-4 sm:p-6 sm:p-8 max-h-[92vh] overflow-y-auto text-stone-900 dark:text-stone-100">
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-stone-100 dark:border-stone-800">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold uppercase rounded-md tracking-wider border border-emerald-200/60 dark:border-emerald-800/60">
                Decrypted Locally
              </span>
              <span className="text-xs text-stone-400 font-mono">IV: {report.iv.slice(0, 10)}...</span>
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
          <div className="p-12 text-center text-stone-500 font-medium">
            <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <span>Decrypting AES-256-GCM ciphertext in browser memory...</span>
          </div>
        ) : error ? (
          <div className="p-6 bg-red-50 border border-red-200 rounded-2xl text-red-800">
            <div className="flex items-center gap-2 font-bold mb-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <span>Decryption Error</span>
            </div>
            <p className="text-sm">{error}</p>
          </div>
        ) : details ? (
          <div className="space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-stone-50 rounded-2xl border border-stone-100 text-xs text-stone-700">
              <div>
                <span className="text-stone-400 font-bold uppercase text-[10px] block mb-1">Date</span>
                <span className="font-semibold text-stone-900 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-stone-400" />
                  {formatDate(report.date)}
                </span>
              </div>

              {report.doctorName && (
                <div>
                  <span className="text-stone-400 font-bold uppercase text-[10px] block mb-1">Physician</span>
                  <span className="font-semibold text-stone-900 flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-stone-400" />
                    {report.doctorName}
                  </span>
                </div>
              )}

              {details.facility && (
                <div>
                  <span className="text-stone-400 font-bold uppercase text-[10px] block mb-1">Facility</span>
                  <span className="font-semibold text-stone-900 flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-stone-400" />
                    {details.facility}
                  </span>
                </div>
              )}
            </div>

            {/* Results Table */}
            {details.results && Object.keys(details.results).length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-3">
                  Clinical Measurements & Findings
                </h3>
                <div className="border border-stone-200 rounded-2xl overflow-hidden shadow-2xs">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-stone-50 text-stone-400 font-bold uppercase text-[10px] tracking-widest border-b border-stone-100">
                      <tr>
                        <th className="px-4 py-2.5">Parameter / Test</th>
                        <th className="px-4 py-2.5">Result</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {Object.entries(details.results).map(([param, val]) => (
                        <tr key={param} className="hover:bg-stone-50/50">
                          <td className="px-4 py-3 font-semibold text-stone-800">{param}</td>
                          <td className="px-4 py-3 font-mono text-xs text-stone-900">{String(val)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Notes */}
            {details.notes && (
              <div>
                <h3 className="text-xs font-bold text-stone-500 uppercase tracking-widest mb-2">
                  Physician Impression & Notes
                </h3>
                <p className="p-4 bg-stone-50 rounded-2xl border border-stone-100 text-stone-800 text-sm leading-relaxed">
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
                    className="inline-flex items-center gap-1 px-3 py-1 bg-stone-100 text-stone-700 rounded-full text-xs font-semibold"
                  >
                    <Tag className="w-3 h-3 text-stone-400" />
                    {tag}
                  </span>
                ))}
              </div>
            )}

            <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 flex items-center justify-between text-xs text-emerald-900">
              <span className="flex items-center gap-1.5 font-semibold">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                Decrypted in browser memory via Web Crypto API
              </span>
              <span className="text-emerald-700 font-mono text-[10px]">Zero Network Transmission</span>
            </div>
          </div>
        ) : null}

        <div className="mt-6 pt-4 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            {onAnalyzeWithAI && (
              <button
                onClick={() => {
                  onClose();
                  onAnalyzeWithAI(report.id);
                }}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-2 shadow-xs"
              >
                <Sparkles className="w-4 h-4 text-emerald-200" />
                <span>Get AI Diet Plan</span>
              </button>
            )}

            {onDeleteReport && (
              isConfirmingDelete ? (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      onDeleteReport(report.id);
                      onClose();
                    }}
                    className="px-3 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-2xs"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Confirm Delete?</span>
                  </button>
                  <button
                    onClick={() => setIsConfirmingDelete(false)}
                    className="p-2 bg-stone-100 hover:bg-stone-200 text-stone-600 rounded-xl transition-colors border border-stone-200"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setIsConfirmingDelete(true)}
                  className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5"
                >
                  <Trash2 className="w-4 h-4 text-rose-600" />
                  <span>Delete Report</span>
                </button>
              )
            )}
          </div>

          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-sm font-bold transition-colors ml-auto"
          >
            Close View
          </button>
        </div>
      </div>
    </div>
  );
};
