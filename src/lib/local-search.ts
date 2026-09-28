/**
 * Vital Diaries — Local Health Record Search Engine
 *
 * 100% Client-Side In-Memory Search over already-decrypted medical records.
 * Zero Network Requests | Zero Cloud Database Queries | Zero AI / LLM APIs
 */

import type { HealthReport, DecryptedReportDetails } from '../types/health';

export interface MatchedDataPoint {
  id: string;
  reportId: string;
  reportTitle: string;
  reportType: string;
  reportDate: string;
  uploadedAt?: string;
  doctorName?: string;
  facility?: string;
  markerName: string;
  value: string | number | boolean;
  unit?: string;
  displayValue: string;
  referenceRange?: string;
  status?: 'low' | 'normal' | 'high' | 'unknown' | 'low-normal' | 'high-normal';
  matchReason: 'biomarker' | 'result' | 'note' | 'title' | 'tag';
  rawReport: HealthReport;
}

/**
 * Normalizes a date string or timestamp to a valid Unix epoch for sorting.
 */
function parseDateForSort(dateStr?: string, fallbackTimestamp?: string): number {
  if (dateStr) {
    const d = new Date(dateStr).getTime();
    if (!isNaN(d)) return d;
  }
  if (fallbackTimestamp) {
    const d = new Date(fallbackTimestamp).getTime();
    if (!isNaN(d)) return d;
  }
  return 0;
}

/**
 * Searches local decrypted reports and extracts specific matching data points/values.
 * Results are sorted chronologically with the MOST RECENT at the top.
 */
export function searchLocalDataPoints(
  reports: HealthReport[],
  decryptedReports: Record<string, DecryptedReportDetails>,
  query: string
): MatchedDataPoint[] {
  if (!reports || reports.length === 0) return [];
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return [];

  const matchedPoints: MatchedDataPoint[] = [];

  for (const report of reports) {
    const details = decryptedReports[report.id];
    let hasReportSpecificMatch = false;

    // 1. Search in structured metrics (highest fidelity values)
    if (details?.metrics && Array.isArray(details.metrics)) {
      for (const metric of details.metrics) {
        const nameMatch =
          (metric.name && metric.name.toLowerCase().includes(normalizedQuery)) ||
          (metric.rawName && metric.rawName.toLowerCase().includes(normalizedQuery));
        const valMatch =
          (metric.displayValue && String(metric.displayValue).toLowerCase().includes(normalizedQuery)) ||
          (metric.value !== undefined && String(metric.value).toLowerCase().includes(normalizedQuery));

        if (nameMatch || valMatch) {
          hasReportSpecificMatch = true;
          let refStr: string | undefined;
          if (metric.referenceRange) {
            if (metric.referenceRange.rawText) {
              refStr = metric.referenceRange.rawText;
            } else if (metric.referenceRange.low !== undefined && metric.referenceRange.high !== undefined) {
              refStr = `${metric.referenceRange.low} - ${metric.referenceRange.high} ${metric.referenceRange.unit || metric.unit || ''}`.trim();
            }
          }

          matchedPoints.push({
            id: `${report.id}_metric_${metric.name}_${metric.value}`,
            reportId: report.id,
            reportTitle: report.title,
            reportType: report.type,
            reportDate: report.date,
            uploadedAt: details.uploadedAt || report.createdAt,
            doctorName: report.doctorName,
            facility: details.facility,
            markerName: metric.name || metric.rawName || 'Measured Marker',
            value: metric.value,
            unit: metric.unit,
            displayValue: metric.displayValue || `${metric.value} ${metric.unit || ''}`.trim(),
            referenceRange: refStr,
            status: metric.status || metric.ocrStatus || 'normal',
            matchReason: 'biomarker',
            rawReport: report,
          });
        }
      }
    }

    // 2. Search in raw key-value results if no duplicate structured metric was added
    if (details?.results && typeof details.results === 'object') {
      for (const [key, val] of Object.entries(details.results)) {
        const keyMatch = key && key.toLowerCase().includes(normalizedQuery);
        const valMatch = val !== undefined && String(val).toLowerCase().includes(normalizedQuery);

        if (keyMatch || valMatch) {
          // Avoid duplicate if already covered by metric
          const alreadyAdded = matchedPoints.some(
            (p) => p.reportId === report.id && p.markerName.toLowerCase() === key.toLowerCase()
          );

          if (!alreadyAdded) {
            hasReportSpecificMatch = true;
            matchedPoints.push({
              id: `${report.id}_result_${key}`,
              reportId: report.id,
              reportTitle: report.title,
              reportType: report.type,
              reportDate: report.date,
              uploadedAt: details.uploadedAt || report.createdAt,
              doctorName: report.doctorName,
              facility: details.facility,
              markerName: key,
              value: val,
              displayValue: String(val),
              status: 'normal',
              matchReason: 'result',
              rawReport: report,
            });
          }
        }
      }
    }

    // 3. Fallback: if search matched title, notes, tags, doctor, or facility, but no individual metric was isolated
    if (!hasReportSpecificMatch) {
      const titleMatch = report.title && report.title.toLowerCase().includes(normalizedQuery);
      const doctorMatch = report.doctorName && report.doctorName.toLowerCase().includes(normalizedQuery);
      const facilityMatch = details?.facility && details.facility.toLowerCase().includes(normalizedQuery);
      const notesMatch = details?.notes && details.notes.toLowerCase().includes(normalizedQuery);
      const tagMatch = details?.tags && details.tags.some((t) => t && t.toLowerCase().includes(normalizedQuery));

      if (titleMatch || doctorMatch || facilityMatch || notesMatch || tagMatch) {
        matchedPoints.push({
          id: `${report.id}_report_summary`,
          reportId: report.id,
          reportTitle: report.title,
          reportType: report.type,
          reportDate: report.date,
          uploadedAt: details?.uploadedAt || report.createdAt,
          doctorName: report.doctorName,
          facility: details?.facility,
          markerName: report.title,
          value: details?.reportType || report.type,
          displayValue: `${details?.metrics?.length || Object.keys(details?.results || {}).length || 0} recorded biomarkers`,
          status: 'normal',
          matchReason: titleMatch ? 'title' : notesMatch ? 'note' : 'tag',
          rawReport: report,
        });
      }
    }
  }

  // Sort matched data points chronologically: MOST RECENT at top
  return matchedPoints.sort((a, b) => {
    const timeA = parseDateForSort(a.reportDate, a.uploadedAt);
    const timeB = parseDateForSort(b.reportDate, b.uploadedAt);
    return timeB - timeA;
  });
}

/**
 * Searches local decrypted health reports deterministically in memory.
 * Returns matching reports sorted with the most recent date at top.
 */
export function searchLocalReports(
  reports: HealthReport[],
  decryptedReports: Record<string, DecryptedReportDetails>,
  query: string
): HealthReport[] {
  if (!reports || reports.length === 0) return [];
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return [];

  const matched = reports.filter((report) => {
    if (report.title && report.title.toLowerCase().includes(normalizedQuery)) return true;
    if (report.type && report.type.toLowerCase().includes(normalizedQuery)) return true;
    if (report.doctorName && report.doctorName.toLowerCase().includes(normalizedQuery)) return true;
    if (report.date && report.date.toLowerCase().includes(normalizedQuery)) return true;

    const details = decryptedReports[report.id];
    if (!details) return false;

    if (details.facility && details.facility.toLowerCase().includes(normalizedQuery)) return true;
    if (details.notes && details.notes.toLowerCase().includes(normalizedQuery)) return true;
    if (details.reportType && details.reportType.toLowerCase().includes(normalizedQuery)) return true;

    if (Array.isArray(details.tags)) {
      for (const tag of details.tags) {
        if (tag && tag.toLowerCase().includes(normalizedQuery)) return true;
      }
    }

    if (Array.isArray(details.metrics)) {
      for (const metric of details.metrics) {
        if (metric.name && metric.name.toLowerCase().includes(normalizedQuery)) return true;
        if (metric.rawName && metric.rawName.toLowerCase().includes(normalizedQuery)) return true;
        if (metric.unit && metric.unit.toLowerCase().includes(normalizedQuery)) return true;
        if (metric.displayValue && String(metric.displayValue).toLowerCase().includes(normalizedQuery)) return true;
        if (metric.value !== undefined && String(metric.value).toLowerCase().includes(normalizedQuery)) return true;
      }
    }

    if (details.results && typeof details.results === 'object') {
      for (const [key, val] of Object.entries(details.results)) {
        if (key && key.toLowerCase().includes(normalizedQuery)) return true;
        if (val !== undefined && String(val).toLowerCase().includes(normalizedQuery)) return true;
      }
    }

    return false;
  });

  return matched.sort((a, b) => {
    const timeA = parseDateForSort(a.date, a.createdAt);
    const timeB = parseDateForSort(b.date, b.createdAt);
    return timeB - timeA;
  });
}
