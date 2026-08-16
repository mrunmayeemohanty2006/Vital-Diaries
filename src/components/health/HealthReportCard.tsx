import React, { useState } from 'react';
import { Lock, Eye, Calendar, UserCheck, Trash2, X, FileDown, Loader2 } from 'lucide-react';
import jsPDF from 'jspdf';
import type { HealthReport, DecryptedReportDetails } from '../../types/health';
import { formatDate } from '../../lib/utils';
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

  const getBadgeStyle = (type: string) => {
    switch (type) {
      case 'cbc':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'imaging':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'cardiology':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      default:
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
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

  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      const activeKey = await getOrEnsureCryptoKey(encryptionKey);
      let details: DecryptedReportDetails | null = null;
      try {
        const decryptedJson = await decryptData(report.encryptedData, report.iv, activeKey);
        details = JSON.parse(decryptedJson) as DecryptedReportDetails;
      } catch (err) {
        console.error('Decryption failed during PDF export:', err);
      }

      const doc = new jsPDF();

      // Top Emerald Banner Header
      doc.setFillColor(16, 185, 129); // Emerald-600
      doc.rect(0, 0, 210, 28, 'F');

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('VITAL DIARIES', 14, 18);

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text('Decrypted Health Record Summary', 120, 18);

      // Report Main Metadata
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

      // Divider Line
      y += 4;
      doc.setDrawColor(226, 232, 240);
      doc.line(14, y, 196, y);
      y += 10;

      // Clinical Results Section
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

      // Clinical Notes / Findings
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

      // Recommendations
      if (details?.recommendations && details.recommendations.length > 0) {
        y += 6;
        if (y > 250) {
          doc.addPage();
          y = 20;
        }
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(15, 23, 42);
        doc.text('Recommendations & Follow-up', 14, y);
        y += 8;

        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(51, 65, 85);
        details.recommendations.forEach((rec) => {
          const splitRec = doc.splitTextToSize(`• ${rec}`, 180);
          doc.text(splitRec, 14, y);
          y += splitRec.length * 6;
        });
      }

      // Footer Stamp
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
      console.error('Failed to export PDF:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <tr className="hover:bg-stone-50/80 dark:hover:bg-stone-800/50 transition-colors">
      <td className="px-4 sm:px-6 py-4 font-medium text-stone-900 dark:text-stone-100 text-xs sm:text-sm whitespace-nowrap">
        <div className="flex items-center gap-2">
          <Calendar className="w-3.5 h-3.5 text-stone-400" />
          <span>{formatDate(report.date)}</span>
        </div>
      </td>

      <td className="px-4 sm:px-6 py-4 min-w-[160px]">
        <div className="flex flex-col gap-1">
          <span className="font-bold text-stone-800 dark:text-stone-100 text-xs sm:text-sm">{report.title}</span>
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
          </div>
        </div>
      </td>

      <td className="px-4 sm:px-6 py-4 whitespace-nowrap">
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 rounded-full text-[11px] sm:text-xs font-semibold border border-emerald-200 dark:border-emerald-800/60">
          <Lock className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
          <span>AES-GCM Encrypted</span>
        </span>
      </td>

      <td className="px-4 sm:px-6 py-4 text-right whitespace-nowrap">
        <div className="flex items-center justify-end gap-1.5 sm:gap-2">
          <button
            onClick={() => onViewDetails(report)}
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 rounded-xl text-xs font-bold transition-colors border border-stone-200 dark:border-stone-700"
          >
            <Eye className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span className="hidden sm:inline">{isUnlocked ? 'Decrypt & View' : 'Unlock to View'}</span>
            <span className="sm:hidden">View</span>
          </button>

          <button
            onClick={handleExportPDF}
            disabled={isExporting}
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-bold transition-colors border border-emerald-200 dark:border-emerald-800/60 disabled:opacity-50"
            title="Export decrypted plain-text summary to PDF"
          >
            {isExporting ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600 dark:text-emerald-400" />
            ) : (
              <FileDown className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            )}
            <span className="hidden sm:inline">{isExporting ? 'Exporting...' : 'Export PDF'}</span>
            <span className="sm:hidden">PDF</span>
          </button>

          {onDeleteReport && (
            isConfirmingDelete ? (
              <div className="inline-flex items-center gap-1">
                <button
                  onClick={handleDeleteClick}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs"
                  title="Confirm deletion"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Confirm?</span>
                </button>
                <button
                  onClick={() => setIsConfirmingDelete(false)}
                  className="p-1.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-600 dark:text-stone-300 rounded-xl transition-colors border border-stone-200 dark:border-stone-700"
                  title="Cancel"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={handleDeleteClick}
                className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 hover:text-rose-800 rounded-xl text-xs font-bold transition-colors border border-rose-200 dark:border-rose-800/60"
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

