/**
 * Local Health Insights Summary PDF Generator
 * 
 * 100% Client-Side, Deterministic, AI-Free, and Local.
 * Generates an "Abnormal Results Summary" PDF containing only metrics that require attention:
 * - status === 'low'
 * - status === 'high'
 * - needsVerification === true
 * 
 * Excludes normal results and unflagged unknown results.
 */

import { jsPDF } from 'jspdf';
import type { HealthInsight, KnowledgeSource } from '../types';

export interface ExportInsightsPDFOptions {
  patientName?: string;
  reportTitle?: string;
  reportDate?: string;
  insights: HealthInsight[];
}

export function filterAbnormalInsights(insights: HealthInsight[]): HealthInsight[] {
  if (!insights || !Array.isArray(insights)) return [];
  return insights.filter((i) => {
    if (i.needsVerification === true) return true;
    if (i.status === 'low' || i.status === 'high') return true;
    return false;
  });
}

/**
 * Builds the PDF document using jsPDF entirely locally in memory.
 */
export function generateHealthInsightsPDF(options: ExportInsightsPDFOptions): jsPDF {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  let y = 18;

  const checkPageBreak = (spaceNeeded: number) => {
    if (y + spaceNeeded > pageHeight - 16) {
      doc.addPage();
      y = 18;
    }
  };

  // Header Banner
  doc.setFillColor(30, 41, 59); // Slate-800
  doc.rect(margin, y, contentWidth, 22, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(14);
  doc.text('VITAL DIARIES', margin + 6, y + 8);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text('Local Health Insights Summary', margin + 6, y + 15);

  const genDateStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
  doc.setFontSize(8);
  doc.text(`Generated: ${genDateStr}`, pageWidth - margin - 6, y + 15, { align: 'right' });

  y += 28;

  // Metadata Panel
  doc.setFillColor(248, 250, 252); // Slate-50
  doc.setDrawColor(226, 232, 240); // Slate-200
  doc.roundedRect(margin, y, contentWidth, 24, 2, 2, 'FD');

  doc.setTextColor(51, 65, 85);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Patient:', margin + 4, y + 6);
  doc.text('Report Title:', margin + 4, y + 12);

  doc.setFont('helvetica', 'normal');
  doc.text(options.patientName || 'Patient', margin + 22, y + 6);
  doc.text(options.reportTitle || 'Laboratory Health Report', margin + 27, y + 12);

  doc.setFont('helvetica', 'bold');
  doc.text('Report Date:', margin + 105, y + 6);
  doc.setFont('helvetica', 'normal');
  doc.text(options.reportDate || 'Not specified', margin + 128, y + 6);

  // Summary Metrics Breakdown
  const normalCount = options.insights.filter((i) => i.status === 'normal').length;
  const lowCount = options.insights.filter((i) => i.status === 'low').length;
  const highCount = options.insights.filter((i) => i.status === 'high').length;
  const verifyCount = options.insights.filter((i) => i.status === 'unknown' || i.needsVerification === true).length;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  doc.text(
    `Summary Breakdown:  ${normalCount} Normal  •  ${lowCount} Low  •  ${highCount} High  •  ${verifyCount} Needs Verification`,
    margin + 4,
    y + 19
  );

  y += 30;

  // Filter Abnormal / Flagged Insights
  const abnormalInsights = filterAbnormalInsights(options.insights);
  const collectedSources: KnowledgeSource[] = [];

  // Section Header: Results Requiring Attention
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(15, 23, 42); // Slate-900
  doc.text('RESULTS REQUIRING ATTENTION & CLINICAL INSIGHTS', margin, y);
  y += 4;

  doc.setDrawColor(203, 213, 225);
  doc.line(margin, y, margin + contentWidth, y);
  y += 6;

  if (abnormalInsights.length === 0) {
    // Normal / No-Flagged-Results State
    checkPageBreak(25);
    doc.setFillColor(240, 253, 244); // Green-50
    doc.setDrawColor(187, 247, 208); // Green-200
    doc.roundedRect(margin, y, contentWidth, 18, 2, 2, 'FD');

    doc.setTextColor(22, 101, 52); // Green-800
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.text(
      'No abnormal or verification-required results were identified from the analyzed markers.',
      margin + 6,
      y + 11
    );

    y += 24;
  } else {
    // Render Each Flagged Metric
    for (const insight of abnormalInsights) {
      // Collect sources
      if (insight.sources) {
        insight.sources.forEach((s) => {
          if (!collectedSources.some((cs) => cs.id === s.id)) {
            collectedSources.push(s);
          }
        });
      }

      checkPageBreak(55);

      // Card Header
      const isHigh = insight.status === 'high';
      const isLow = insight.status === 'low';
      const isVerify = insight.needsVerification === true;

      // Status pill color
      let statusLabel = 'ATTENTION REQUIRED';
      if (isVerify) {
        statusLabel = 'NEEDS VERIFICATION';
        doc.setFillColor(254, 243, 199); // Amber-100
        doc.setDrawColor(245, 158, 11);
      } else if (isHigh) {
        statusLabel = 'HIGH (ABOVE REFERENCE)';
        doc.setFillColor(254, 226, 226); // Red-100
        doc.setDrawColor(239, 68, 68);
      } else if (isLow) {
        statusLabel = 'LOW (BELOW REFERENCE)';
        doc.setFillColor(238, 242, 255); // Indigo-100
        doc.setDrawColor(99, 102, 241);
      }

      // Metric Card Background
      doc.setFillColor(255, 255, 255);
      doc.setDrawColor(226, 232, 240);
      doc.roundedRect(margin, y, contentWidth, 8, 1, 1, 'FD');

      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.text(insight.metric, margin + 4, y + 5.5);

      doc.setFontSize(8.5);
      doc.setTextColor(71, 85, 105);
      doc.text(`Status: ${statusLabel}`, pageWidth - margin - 4, y + 5.5, { align: 'right' });

      y += 11;

      // Values row
      const refStr = insight.referenceRange.low !== undefined && insight.referenceRange.high !== undefined
        ? `${insight.referenceRange.low} – ${insight.referenceRange.high} ${insight.unit}`
        : insight.referenceRange.rawText || (insight.referenceRange.high ? `< ${insight.referenceRange.high}` : 'Not specified in report');

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(30, 41, 59);
      doc.text('Observed Result:', margin + 4, y);
      doc.setFont('helvetica', 'normal');
      doc.text(insight.rawDisplayValue, margin + 34, y);

      doc.setFont('helvetica', 'bold');
      doc.text('Reference Interval:', margin + 85, y);
      doc.setFont('helvetica', 'normal');
      doc.text(refStr, margin + 117, y);

      y += 6;

      // What this can mean
      if (insight.interpretation?.meaning) {
        checkPageBreak(18);
        doc.setFont('helvetica', 'bold');
        doc.text('What This Can Mean:', margin + 4, y);
        y += 4;
        doc.setFont('helvetica', 'normal');
        const meaningLines = doc.splitTextToSize(insight.interpretation.meaning, contentWidth - 8);
        doc.text(meaningLines, margin + 4, y);
        y += meaningLines.length * 4.0 + 2;
      }

      // Possible Causes
      if (insight.possibleAssociations && insight.possibleAssociations.length > 0) {
        checkPageBreak(22);
        doc.setFont('helvetica', 'bold');
        doc.text('Possible Causes & Associations (Non-Diagnostic):', margin + 4, y);
        y += 4;
        doc.setFont('helvetica', 'normal');
        for (const assoc of insight.possibleAssociations.slice(0, 3)) {
          const assocLines = doc.splitTextToSize(`• ${assoc}`, contentWidth - 10);
          doc.text(assocLines, margin + 6, y);
          y += assocLines.length * 3.8;
        }
        y += 2;
      }

      // Nutrition / What to Eat
      if (insight.nutrition && insight.nutrition.length > 0) {
        checkPageBreak(18);
        doc.setFont('helvetica', 'bold');
        doc.text('What to Eat / Nutritional Guidance:', margin + 4, y);
        y += 4;
        doc.setFont('helvetica', 'normal');
        for (const nut of insight.nutrition.slice(0, 2)) {
          const nutLines = doc.splitTextToSize(`• ${nut}`, contentWidth - 10);
          doc.text(nutLines, margin + 6, y);
          y += nutLines.length * 3.8;
        }
        y += 2;
      }

      // What to Limit / Avoid
      if (insight.foodRestrictions && insight.foodRestrictions.length > 0) {
        checkPageBreak(16);
        doc.setFont('helvetica', 'bold');
        doc.text('What to Limit / Avoid:', margin + 4, y);
        y += 4;
        doc.setFont('helvetica', 'normal');
        for (const restr of insight.foodRestrictions.slice(0, 2)) {
          const restrLines = doc.splitTextToSize(`• ${restr}`, contentWidth - 10);
          doc.text(restrLines, margin + 6, y);
          y += restrLines.length * 3.8;
        }
        y += 2;
      }

      // Questions for Doctor
      if (insight.questionsForDoctor && insight.questionsForDoctor.length > 0) {
        checkPageBreak(18);
        doc.setFont('helvetica', 'bold');
        doc.text('Questions to Discuss with Healthcare Professional:', margin + 4, y);
        y += 4;
        doc.setFont('helvetica', 'normal');
        for (const q of insight.questionsForDoctor.slice(0, 2)) {
          const qLines = doc.splitTextToSize(`• ${q}`, contentWidth - 10);
          doc.text(qLines, margin + 6, y);
          y += qLines.length * 3.8;
        }
        y += 2;
      }

      // When to Seek Prompt Care
      if (insight.whenToSeekPromptCare && insight.whenToSeekPromptCare.length > 0) {
        checkPageBreak(16);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(190, 18, 60); // Rose-700
        doc.text('When to Seek Prompt Medical Attention:', margin + 4, y);
        y += 4;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(30, 41, 59);
        for (const alert of insight.whenToSeekPromptCare.slice(0, 2)) {
          const alertLines = doc.splitTextToSize(`! ${alert}`, contentWidth - 10);
          doc.text(alertLines, margin + 6, y);
          y += alertLines.length * 3.8;
        }
        y += 2;
      }

      y += 4;
      doc.setDrawColor(241, 245, 249);
      doc.line(margin, y, margin + contentWidth, y);
      y += 5;
    }
  }

  // Section Header: Sources
  checkPageBreak(35);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(15, 23, 42);
  doc.text('AUTHORITATIVE MEDICAL SOURCES & REFERENCES', margin, y);
  y += 4;

  doc.setDrawColor(203, 213, 225);
  doc.line(margin, y, margin + contentWidth, y);
  y += 6;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);

  if (collectedSources.length > 0) {
    for (const src of collectedSources) {
      checkPageBreak(8);
      doc.text(`• ${src.organization}: "${src.title}" (${src.url})`, margin + 2, y);
      y += 4;
    }
  } else {
    doc.text(
      '• World Health Organization (WHO) & MedlinePlus / National Library of Medicine Reference Standards',
      margin + 2,
      y
    );
    y += 4;
  }


  y += 4;

  // Disclaimer
  checkPageBreak(22);
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(margin, y, contentWidth, 16, 1, 1, 'FD');

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7);
  doc.setTextColor(100, 116, 139);
  const disclaimer =
    'DISCLAIMER: This summary is generated locally by Vital Diaries using deterministic reference intervals and curated clinical guidelines. It does NOT provide a medical diagnosis or treatment prescription. Always consult a qualified healthcare professional regarding any abnormal findings.';
  const discLines = doc.splitTextToSize(disclaimer, contentWidth - 6);
  doc.text(discLines, margin + 3, y + 5);

  return doc;
}

/**
 * Downloads the generated PDF directly in the user's browser.
 */
export function exportHealthInsightsPDF(options: ExportInsightsPDFOptions): void {
  const doc = generateHealthInsightsPDF(options);
  const cleanTitle = (options.reportTitle || 'Health_Report')
    .replace(/[^a-zA-Z0-9_\-]/g, '_')
    .toLowerCase();
  doc.save(`Vital_Diaries_Insights_${cleanTitle}.pdf`);
}
