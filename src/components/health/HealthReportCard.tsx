import React, { useState, useEffect } from 'react';
import { Lock, Eye, Calendar, UserCheck, Trash2, X, Download, FileDown, Loader2, FileText, Image as ImageIcon } from 'lucide-react';
import jsPDF from 'jspdf';
import type { HealthReport, DecryptedReportDetails } from '../../types/health';
import { formatDate, formatFileSize } from '../../lib/utils';
import { decryptData } from '../../lib/crypto';
import { getOrEnsureCryptoKey } from '../../lib/key-management';

interface HealthReportCardProps {
  report: HealthReport;
  onViewDetails: (report: HealthReport) => void;
  onDeleteReport?: (reportId: string) => void;
  isUnlocked: boolean;
  encryptionKey?: CryptoKey | null;
}

export const HealthReportCard: React.FC<HealthReportCardProps> = ({
  report,
  onViewDetails,
  onDeleteReport,
  isUnlocked,
  encryptionKey,
}) => {
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [decryptedDetails, setDecryptedDetails] = useState<DecryptedReportDetails | null>(null);

  // Decrypt report metadata for live card summary when unlocked
  useEffect(() => {
    let isMounted = true;
    async function fetchDetails() {
      if (!isUnlocked || !encryptionKey) {
        setDecryptedDetails(null);
        return;
      }
      try {
        const activeKey = await getOrEnsureCryptoKey(encryptionKey);
        const jsonStr = await decryptData(report.encryptedData, report.iv, activeKey);
        const parsed = JSON.parse(jsonStr) as DecryptedReportDetails;
        if (isMounted) {
          setDecryptedDetails(parsed);
        }
      } catch {
        if (isMounted) {
          setDecryptedDetails(null);
        }
      }
    }

    fetchDetails();
    return () => {
      isMounted = false;
    };
  }, [report, isUnlocked, encryptionKey]);

  const getBadgeStyle = (type: string) => {
    switch (type) {
      case 'cbc':
        return 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/60';
      case 'imaging':
        return 'bg-amber-50 dark:bg-amber-950/60 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800/60';
      case 'cardiology':
        return 'bg-purple-50 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/60';
      default:
        return 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'cbc':
        return 'Blood Work (CBC)';
      case 'imaging':
        return 'Radiology (MRI/CT)';
      case 'cardiology':
        return 'Cardiology (ECG)';
      default:
        return 'General Health';
    }
  };

  const handleDeleteClick = () => {
    if (isConfirmingDelete) {
      if (onDeleteReport) {
        onDeleteReport(report.id);
      }
      setIsConfirmingDelete(false);
    } else {
      setIsConfirmingDelete(true);
    }
  };

  /**
   * ISSUE 3: Export the EXACT ORIGINAL FILE (PDF, PNG, JPG, WEBP) if preserved.
   * If legacy record without original file, gracefully fall back to summary PDF.
   */
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const activeKey = await getOrEnsureCryptoKey(encryptionKey);
      let details = decryptedDetails;
      if (!details) {
        try {
          const decryptedJson = await decryptData(report.encryptedData, report.iv, activeKey);
          details = JSON.parse(decryptedJson) as DecryptedReportDetails;
        } catch (err) {
          console.error('Decryption failed during export:', err);
        }
      }

      // 1. If original file is preserved in ciphertext, export the exact original file!
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

      // 2. Backward compatibility fallback: Generate structured summary PDF for legacy records
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
      doc.text(`Date of Record: ${formatDate(report.date)}`, 14, y);
      if (report.doctorName) {
        doc.text(`Physician: ${report.doctorName}`, 110, y);
      }

      y += 6;
      if (details?.facility) {
        doc.text(`Facility / Lab: ${details.facility}`, 14, y);
        y += 6;
      }

      y += 4;
      doc.setDrawColor(226, 232, 240);
      doc.line(14, y, 196, y);
      y += 10;

      doc.setFontSize(12);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text('Clinical Metrics & Results', 14, y);
      y += 8;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');

      if (details?.results && Object.keys(details.results).length > 0) {
        Object.entries(details.results).forEach(([key, val]) => {
          if (y > 270) {
            doc.addPage();
            y = 20;
          }
          doc.setFont('helvetica', 'bold');
          doc.setTextColor(51, 65, 85);
          doc.text(`${key}:`, 18, y);

          doc.setFont('helvetica', 'normal');
          doc.setTextColor(15, 23, 42);
          doc.text(`${val}`, 85, y);
          y += 7;
        });
      } else {
        doc.setTextColor(100, 116, 139);
        doc.text('No quantitative metrics listed in record.', 18, y);
        y += 7;
      }

      if (details?.notes) {
        y += 6;
        if (y > 250) {
          doc.addPage();
          y = 20;
        }
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text('Clinical Findings & Notes', 14, y);
        y += 8;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 65, 85);
        const splitNotes = doc.splitTextToSize(details.notes, 180);
        doc.text(splitNotes, 14, y);
        y += splitNotes.length * 6;
      }

      const pageCount = (doc as any).internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(
          `Exported from Vital Diaries | Zero-Knowledge Vault | Date: ${new Date().toLocaleDateString()}`,
          14,
          288
        );
        doc.text(`Page ${i} of ${pageCount}`, 180, 288);
      }

      const safeFileName = `${report.title.toLowerCase().replace(/[^a-z0-9]/g, '_')}_summary.pdf`;
      doc.save(safeFileName);
    } catch (err) {
      console.error('Failed to export record:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const hasOriginalFile = Boolean(decryptedDetails?.fileBase64 || decryptedDetails?.fileDataUrl);
  const metricsSnippet = decryptedDetails?.results
    ? Object.entries(decryptedDetails.results)
        .slice(0, 4)
        .map(([k, v]) => `${k}: ${v}`)
        .join(' • ')
    : '';

  return (
    <tr className="hover:bg-stone-50/80 dark:hover:bg-stone-800/50 transition-colors">
      <td className="px-4 sm:px-6 py-4 font-medium text-stone-900 dark:text-stone-100 text-xs sm:text-sm whitespace-nowrap align-top">
        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-stone-400 dark:text-stone-500 shrink-0" />
          <span>{formatDate(report.date)}</span>
        </div>
      </td>

      <td className="px-4 sm:px-6 py-4 min-w-[220px] align-top">
        <div className="flex flex-col gap-1.5">
          <span className="font-bold text-stone-900 dark:text-stone-100 text-xs sm:text-sm">
            {report.title}
          </span>

          <div className="flex items-center gap-2 flex-wrap">
            <span className={`px-2 py-0.5 rounded-md text-[10px] sm:text-[11px] font-bold border ${getBadgeStyle(report.type)}`}>
              {getTypeLabel(report.type)}
            </span>

            {report.doctorName && (
              <span className="text-[11px] sm:text-xs text-stone-500 dark:text-stone-400 flex items-center gap-1">
                <UserCheck className="w-3 h-3 text-stone-400" />
                {report.doctorName}
              </span>
            )}

            {decryptedDetails?.fileName && (
              <span className="inline-flex items-center gap-1 text-[10px] sm:text-[11px] font-semibold text-stone-600 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 px-2 py-0.5 rounded-md border border-stone-200 dark:border-stone-700">
                {decryptedDetails.fileType?.includes('pdf') ? (
                  <FileText className="w-3 h-3 text-red-500 shrink-0" />
                ) : (
                  <ImageIcon className="w-3 h-3 text-blue-500 shrink-0" />
                )}
                <span className="truncate max-w-[140px]">{decryptedDetails.fileName}</span>
                {decryptedDetails.fileSize ? (
                  <span className="text-[9px] text-stone-400">({formatFileSize(decryptedDetails.fileSize)})</span>
                ) : null}
              </span>
            )}
          </div>

          {/* Decrypted Metric Snippet under Title */}
          {isUnlocked && metricsSnippet ? (
            <p className="text-[11px] text-stone-600 dark:text-stone-300 font-mono line-clamp-2 bg-stone-50/80 dark:bg-stone-800/60 px-2.5 py-1 rounded-lg border border-stone-100 dark:border-stone-800 mt-0.5">
              {metricsSnippet}
              {Object.keys(decryptedDetails?.results || {}).length > 4 ? ` • +${Object.keys(decryptedDetails?.results || {}).length - 4} more` : ''}
            </p>
          ) : isUnlocked && decryptedDetails?.notes ? (
            <p className="text-[11px] text-stone-500 dark:text-stone-400 line-clamp-1 italic mt-0.5">
              {decryptedDetails.notes}
            </p>
          ) : !isUnlocked ? (
            <span className="text-[10px] text-stone-400 dark:text-stone-500 italic">
              Encrypted (Unlock vault to view metrics)
            </span>
          ) : null}
        </div>
      </td>

      <td className="px-4 sm:px-6 py-4 whitespace-nowrap align-top">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-full text-[11px] sm:text-xs font-semibold border border-emerald-200 dark:border-emerald-800/60">
          <Lock className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
          <span>AES-GCM Encrypted</span>
        </span>
      </td>

      <td className="px-4 sm:px-6 py-4 text-right whitespace-nowrap align-top">
        <div className="flex items-center justify-end gap-1.5 sm:gap-2">
          <button
            onClick={() => onViewDetails(report)}
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 rounded-xl text-xs font-bold transition-colors border border-stone-200 dark:border-stone-700 cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline">{isUnlocked ? 'Decrypt & View' : 'Unlock to View'}</span>
            <span className="sm:hidden">View</span>
          </button>

          <button
            onClick={handleExport}
            disabled={isExporting}
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-bold transition-colors border border-emerald-200 dark:border-emerald-800/60 disabled:opacity-50 cursor-pointer"
            title={hasOriginalFile ? `Export original file (${decryptedDetails?.fileName})` : 'Export decrypted summary PDF'}
          >
            {isExporting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600 dark:text-emerald-400" />
            ) : hasOriginalFile ? (
              <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            ) : (
              <FileDown className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            )}
            <span className="hidden sm:inline">
              {isExporting ? 'Exporting...' : hasOriginalFile ? 'Export File' : 'Export PDF'}
            </span>
            <span className="sm:hidden">{hasOriginalFile ? 'Export' : 'PDF'}</span>
          </button>

          {onDeleteReport && (
            isConfirmingDelete ? (
              <div className="inline-flex items-center gap-1">
                <button
                  onClick={handleDeleteClick}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs cursor-pointer"
                  title="Confirm deletion"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Confirm?</span>
                </button>
                <button
                  onClick={() => setIsConfirmingDelete(false)}
                  className="p-1.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 rounded-xl transition-colors border border-stone-200 dark:border-stone-700 cursor-pointer"
                  title="Cancel"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleDeleteClick}
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 hover:text-rose-800 rounded-xl text-xs font-bold transition-colors border border-rose-200 dark:border-rose-800/60 cursor-pointer"
                title="Delete health report"
              >
                <Trash2 className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
                <span className="hidden sm:inline">Delete</span>
              </button>
            )
          )}
        </div>
      </td>
    </tr>
  );
};
