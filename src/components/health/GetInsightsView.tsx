import React, { useState, useEffect, useMemo } from 'react';
import {
  Activity,
  FileText,
  Calendar,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  ArrowRight,
  ShieldCheck,
  Loader2,
  Download,
  Info,
  Layers,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import type { HealthReport, DecryptedReportDetails } from '../../types/health';
import { formatDate } from '../../lib/utils';
import { decryptData } from '../../lib/crypto';
import { getOrEnsureCryptoKey } from '../../lib/key-management';
import { extractReferenceRangeFromLine } from '../../lib/health-extractor';
import {
  evaluateHealthMarker,
  evaluateAllHealthMarkers,
  type MarkerInputData,
} from '../../health-engine/evaluator/evaluate-marker';
import { exportHealthInsightsPDF } from '../../health-engine/pdf/export-health-insight';
import { HealthInsightCard } from './HealthInsightCard';
import type { HealthInsight, MetricReferenceRange } from '../../health-engine/types';

interface GetInsightsViewProps {
  reports: HealthReport[];
  decryptedReports?: Record<string, DecryptedReportDetails>;
  encryptionKey?: CryptoKey | null;
  userName?: string;
  selectedReportId?: string;
  onSelectReport?: (reportId: string) => void;
  onViewReport?: (report: HealthReport) => void;
  onNavigateToUpload?: () => void;
}

/**
 * Backward-compatible helper to test if a key refers to Hemoglobin.
 */
export function isHemoglobinVariant(key: string): boolean {
  if (!key) return false;
  const clean = key.trim().toLowerCase();
  if (['hemoglobin', 'haemoglobin', 'hgb', 'hb'].includes(clean)) return true;
  if (/\b(hemoglobin|haemoglobin|hgb|hb)\b/i.test(clean)) return true;
  if (clean.includes('hemoglobin') || clean.includes('haemoglobin')) return true;
  return false;
}

/**
 * Backward-compatible helper to extract Hemoglobin information from decrypted report details.
 */
export function extractHemoglobinFromDecrypted(decrypted?: DecryptedReportDetails | null) {
  if (!decrypted) return null;
  if (decrypted.metrics && Array.isArray(decrypted.metrics) && decrypted.metrics.length > 0) {
    const matched = decrypted.metrics.find((m) => isHemoglobinVariant(m.name) || (m.rawName && isHemoglobinVariant(m.rawName)));
    if (matched && typeof matched.value === 'number') {
      let refRange: MetricReferenceRange | undefined = undefined;
      if (matched.referenceRange && typeof matched.referenceRange.low === 'number' && typeof matched.referenceRange.high === 'number') {
        refRange = {
          low: matched.referenceRange.low,
          high: matched.referenceRange.high,
          unit: matched.referenceRange.unit || matched.unit,
          rawText: matched.referenceRange.rawText,
          source: 'uploaded_report',
        };
      }
      return {
        source: 'structured_metric' as const,
        rawKey: matched.name,
        rawValue: matched.displayValue || `${matched.value} ${matched.unit}`,
        numericVal: matched.value,
        unit: matched.unit || 'g/dL',
        refRange,
      };
    }
  }

  if (decrypted.results && Object.keys(decrypted.results).length > 0) {
    const entry = Object.entries(decrypted.results).find(([k]) => isHemoglobinVariant(k));
    if (entry) {
      const rawKey = entry[0];
      const rawStr = String(entry[1]);
      const valMatch = rawStr.match(/(\d+(?:[.,]\d+)?)\s*([a-zA-Z%\/]+)?/);
      const numericVal = valMatch ? parseFloat(valMatch[1].replace(',', '.')) : null;
      const unit = valMatch?.[2] || 'g/dL';
      const parsedRef = extractReferenceRangeFromLine(rawStr, numericVal || undefined);
      return {
        source: 'results_dictionary' as const,
        rawKey,
        rawValue: rawStr,
        numericVal,
        unit,
        refRange: parsedRef ? { ...parsedRef, source: 'uploaded_report' as const } : undefined,
      };
    }
  }

  return null;
}


/**
 * Extracts all biomarker inputs from decrypted report details for multi-marker evaluation.
 * Generalized for arbitrary medical reports and biomarkers.
 */
export function extractAllMarkerInputsFromDecrypted(decrypted?: DecryptedReportDetails | null): MarkerInputData[] {
  if (!decrypted) return [];

  // PRIORITY 1: Structured metrics array preserved from generalized extractor
  if (decrypted.metrics && Array.isArray(decrypted.metrics) && decrypted.metrics.length > 0) {
    return decrypted.metrics.map((m) => {
      let refRange = m.referenceRange;
      if (!refRange && decrypted.notes && typeof m.value === 'number') {
        refRange = extractReferenceRangeFromLine(decrypted.notes, m.value);
      }
      return {
        name: m.name || m.rawName || 'Biomarker',
        value: m.value,
        unit: m.unit || '',
        referenceRange: refRange,
        needsVerification: m.needsVerification,
        verificationReason: m.verificationReason,
      };
    });
  }

  // PRIORITY 2: Fallback to parsing results dictionary
  if (decrypted.results && Object.keys(decrypted.results).length > 0) {
    const inputs: MarkerInputData[] = [];
    for (const [key, val] of Object.entries(decrypted.results)) {
      const rawStr = String(val);
      const valMatch = rawStr.match(/(\d+(?:[.,]\d+)?)\s*([a-zA-Z%\/]+)?/);
      if (valMatch) {
        const numericVal = parseFloat(valMatch[1].replace(',', '.'));
        const unit = valMatch[2] || '';
        const refRange =
          extractReferenceRangeFromLine(rawStr, numericVal) ||
          (decrypted.notes ? extractReferenceRangeFromLine(decrypted.notes, numericVal) : undefined);
        inputs.push({
          name: key,
          value: numericVal,
          unit,
          referenceRange: refRange,
        });
      }
    }
    return inputs;
  }

  return [];
}

export const GetInsightsView: React.FC<GetInsightsViewProps> = ({
  reports,
  decryptedReports: externalDecryptedReports,
  encryptionKey,
  userName = 'Patient',
  selectedReportId,
  onSelectReport,
  onViewReport,
  onNavigateToUpload,
}) => {
  // Sort reports newest to oldest
  const sortedReports = useMemo(
    () => [...reports].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()),
    [reports]
  );

  const [activeReportId, setActiveReportId] = useState<string>(
    selectedReportId || (sortedReports[0]?.id || '')
  );
  const [localDecryptedMap, setLocalDecryptedMap] = useState<Record<string, DecryptedReportDetails>>({});
  const [, setIsDecrypting] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [evaluatedInsight, setEvaluatedInsight] = useState<HealthInsight | null>(null);
  const [allEvaluatedInsights, setAllEvaluatedInsights] = useState<HealthInsight[]>([]);
  const [hasTriggeredAnalysis, setHasTriggeredAnalysis] = useState(false);
  const [activeTabMetric, setActiveTabMetric] = useState<string>('');
  const [filterMode, setFilterMode] = useState<'all' | 'abnormal'>('abnormal');

  // Sync selectedReportId prop
  useEffect(() => {
    if (selectedReportId) {
      setActiveReportId(selectedReportId);
      setHasTriggeredAnalysis(false);
      setEvaluatedInsight(null);
      setAllEvaluatedInsights([]);
    } else if (sortedReports[0]?.id && !activeReportId) {
      setActiveReportId(sortedReports[0].id);
    }
  }, [selectedReportId, sortedReports]);

  // Independent Local Decryption: Decrypt reports directly using active key
  useEffect(() => {
    let isMounted = true;

    async function decryptAllReportsLocally() {
      if (sortedReports.length === 0) return;

      setIsDecrypting(true);
      try {
        const activeKey = await getOrEnsureCryptoKey(encryptionKey || null);
        if (!activeKey) {
          if (isMounted) setIsDecrypting(false);
          return;
        }

        const newMap: Record<string, DecryptedReportDetails> = { ...localDecryptedMap };
        let anyNew = false;

        for (const rep of sortedReports) {
          if (!newMap[rep.id]) {
            try {
              const jsonStr = await decryptData(rep.encryptedData, rep.iv, activeKey);
              const parsed = JSON.parse(jsonStr) as DecryptedReportDetails;
              newMap[rep.id] = parsed;
              anyNew = true;
            } catch (e) {
              console.warn(`[GetInsights] Failed to decrypt report ${rep.id}:`, e);
            }
          }
        }

        if (isMounted && anyNew) {
          setLocalDecryptedMap(newMap);
        }
      } catch (err) {
        console.warn('[GetInsights] Decryption error:', err);
      } finally {
        if (isMounted) setIsDecrypting(false);
      }
    }

    decryptAllReportsLocally();

    return () => {
      isMounted = false;
    };
  }, [sortedReports, encryptionKey]);

  const activeReport = sortedReports.find((r) => r.id === activeReportId);
  // Merge locally decrypted payload with external prop fallback
  const activeDecrypted =
    (activeReportId ? localDecryptedMap[activeReportId] : null) ||
    (activeReportId && externalDecryptedReports ? externalDecryptedReports[activeReportId] : null);

  // Dynamic Metrics Summary Breakdown
  const markerInputs = useMemo(() => extractAllMarkerInputsFromDecrypted(activeDecrypted), [activeDecrypted]);

  // Handle local deterministic multi-marker analysis
  const handleRunAnalysis = () => {
    if (markerInputs.length === 0) {
      setEvaluatedInsight(null);
      setAllEvaluatedInsights([]);
      setHasTriggeredAnalysis(true);
      return;
    }

    setIsAnalyzing(true);
    setHasTriggeredAnalysis(true);

    // Run generalized dynamic evaluator
    setTimeout(() => {
      const allInsights = evaluateAllHealthMarkers(markerInputs);

      // Focus first abnormal insight (LOW or HIGH) if available, otherwise first insight
      const abnormalFirst = allInsights.find((i) => i.status === 'low' || i.status === 'high') || allInsights[0] || null;

      console.log('[GetInsights Dynamic Analysis Complete]', {
        totalEvaluated: allInsights.length,
        abnormalCount: allInsights.filter((i) => i.status === 'low' || i.status === 'high').length,
        metrics: allInsights.map((i) => ({
          metric: i.metric,
          value: i.value,
          status: i.status,
          needsVerification: i.needsVerification,
        })),
      });

      setAllEvaluatedInsights(allInsights);
      setEvaluatedInsight(abnormalFirst);
      if (abnormalFirst) {
        setActiveTabMetric(abnormalFirst.metric);
      }
      setIsAnalyzing(false);
    }, 200);
  };

  // Automatically trigger analysis on report selection if not yet run
  useEffect(() => {
    if (activeDecrypted && markerInputs.length > 0 && !hasTriggeredAnalysis) {
      handleRunAnalysis();
    }
  }, [activeReportId, activeDecrypted]);

  // Handle Export Abnormal Insights PDF
  const handleExportPDF = () => {
    if (!activeReport) return;
    exportHealthInsightsPDF({
      patientName: userName,
      reportTitle: activeReport.title,
      reportDate: activeReport.date,
      insights: allEvaluatedInsights,
    });
  };

  // Metrics Status Breakdown Stats
  const normalCount = allEvaluatedInsights.filter((i) => i.status === 'normal').length;
  const lowCount = allEvaluatedInsights.filter((i) => i.status === 'low').length;
  const highCount = allEvaluatedInsights.filter((i) => i.status === 'high').length;
  const unknownCount = allEvaluatedInsights.filter((i) => i.status === 'unknown' || i.needsVerification === true).length;
  const abnormalInsights = allEvaluatedInsights.filter((i) => i.status === 'low' || i.status === 'high');

  const displayedInsights = filterMode === 'abnormal' && abnormalInsights.length > 0 ? abnormalInsights : allEvaluatedInsights;

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12 text-stone-900 dark:text-stone-100">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1.5">
            <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              Personal Health Intelligence
            </span>
            <span className="text-xs text-stone-500 dark:text-stone-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              <span>100% Local & Evidence-Backed</span>
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100">
            Get Lab Insights
          </h1>
          <p className="text-xs sm:text-sm text-stone-600 dark:text-stone-400 mt-1">
            Dynamic abnormal-result research and clinical decision support for any medical report.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Export Insights PDF Button */}
          {hasTriggeredAnalysis && !isAnalyzing && (
            <button
              onClick={handleExportPDF}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs sm:text-sm font-bold shadow-sm transition-all flex items-center gap-2 cursor-pointer"
            >
              <Download className="w-4 h-4 text-emerald-100" />
              <span>Export Insights as PDF</span>
              {lowCount + highCount > 0 && (
                <span className="px-1.5 py-0.2 bg-emerald-800 text-[10px] rounded-full">
                  {lowCount + highCount} Abnormal
                </span>
              )}
            </button>
          )}

          <div className="p-3 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 rounded-2xl flex items-center gap-3 self-start md:self-auto">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 flex items-center justify-center text-emerald-700 dark:text-emerald-300 shrink-0">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-stone-900 dark:text-stone-100 block">
                Evidence-Based Research
              </span>
              <span className="text-[10px] text-stone-500 dark:text-stone-400 font-mono">
                Tier 1/2 Sources • Report Reference Intervals
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Empty State if No Reports */}
      {reports.length === 0 ? (
        <div className="p-8 sm:p-12 bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 text-center max-w-xl mx-auto space-y-4 shadow-xs">
          <div className="w-14 h-14 bg-stone-100 dark:bg-stone-800 rounded-2xl flex items-center justify-center mx-auto text-stone-400">
            <FileText className="w-7 h-7" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-stone-900 dark:text-stone-100">No Health Reports Available</h3>
            <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mt-1">
              Upload a health report PDF or image first to evaluate your laboratory results.
            </p>
          </div>
          {onNavigateToUpload && (
            <button
              onClick={onNavigateToUpload}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer inline-flex items-center gap-2 shadow-xs"
            >
              <span>Upload Medical Report</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Report Selection List (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest">
                Available Reports ({sortedReports.length})
              </h3>
              <span className="text-[10px] text-stone-400">Select to analyze</span>
            </div>

            <div className="space-y-2.5 max-h-[600px] overflow-y-auto pr-1">
              {sortedReports.map((report) => {
                const isSelected = report.id === activeReportId;
                const decrypted =
                  localDecryptedMap[report.id] ||
                  (externalDecryptedReports ? externalDecryptedReports[report.id] : null);
                const metricCount = decrypted?.metrics?.length || Object.keys(decrypted?.results || {}).length;

                return (
                  <div
                    key={report.id}
                    onClick={() => {
                      setActiveReportId(report.id);
                      onSelectReport?.(report.id);
                      setHasTriggeredAnalysis(false);
                      setEvaluatedInsight(null);
                      setAllEvaluatedInsights([]);
                    }}
                    className={`p-4 rounded-2xl border transition-all cursor-pointer text-left ${
                      isSelected
                        ? 'bg-emerald-50/70 dark:bg-emerald-950/40 border-emerald-500 dark:border-emerald-600 shadow-sm'
                        : 'bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 hover:border-emerald-300 dark:hover:border-emerald-700'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="overflow-hidden">
                        <span className="font-bold text-sm text-stone-900 dark:text-stone-100 truncate block">
                          {report.title}
                        </span>
                        <div className="flex items-center gap-2 text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-stone-400" />
                            {formatDate(report.date)}
                          </span>
                          {report.doctorName && (
                            <span className="flex items-center gap-1 truncate">
                              <UserCheck className="w-3 h-3 text-stone-400 shrink-0" />
                              {report.doctorName}
                            </span>
                          )}
                        </div>
                      </div>

                      <span className="px-2 py-0.5 rounded-md text-[10px] font-bold border uppercase shrink-0 bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 border-stone-200 dark:border-stone-700">
                        {report.type}
                      </span>
                    </div>

                    {/* Detection Badge */}
                    <div className="mt-2.5 pt-2 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between">
                      {metricCount > 0 ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                          <Layers className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                          <span>{metricCount} clinical measurements</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-[11px] text-stone-400 dark:text-stone-500">
                          <Info className="w-3 h-3" />
                          <span>No metrics in record</span>
                        </span>
                      )}

                      {onViewReport && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onViewReport(report);
                          }}
                          className="px-2.5 py-1 text-[11px] font-bold text-stone-700 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-lg border border-stone-200 dark:border-stone-700 transition-colors flex items-center gap-1 cursor-pointer"
                        >
                          <Eye className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                          <span>View</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right Column: Selected Report Insights & Abnormal Findings (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {activeReport ? (
              <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 p-5 sm:p-7 shadow-xs space-y-6">
                {/* Selected Report Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-stone-100 dark:border-stone-800">
                  <div>
                    <span className="text-[10px] font-bold text-stone-400 dark:text-stone-400 uppercase tracking-widest block mb-0.5">
                      Selected Health Report
                    </span>
                    <h2 className="text-xl font-bold text-stone-900 dark:text-stone-100">
                      {activeReport.title}
                    </h2>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">
                      Dated {formatDate(activeReport.date)} {activeReport.doctorName ? `• ${activeReport.doctorName}` : ''}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {onViewReport && (
                      <button
                        onClick={() => onViewReport(activeReport)}
                        className="px-3.5 py-2 rounded-xl text-xs font-bold text-stone-700 dark:text-stone-300 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 border border-stone-200 dark:border-stone-700 transition-colors inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Eye className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                        <span>View Document</span>
                      </button>
                    )}

                    <button
                      onClick={handleRunAnalysis}
                      disabled={isAnalyzing}
                      className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-stone-300 dark:disabled:bg-stone-800 disabled:text-stone-500 text-white rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-2 shadow-xs cursor-pointer disabled:cursor-not-allowed"
                    >
                      {isAnalyzing ? (
                        <Loader2 className="w-4 h-4 animate-spin text-white" />
                      ) : (
                        <Activity className="w-4 h-4 text-emerald-200" />
                      )}
                      <span>
                        {isAnalyzing
                          ? 'Researching...'
                          : allEvaluatedInsights.length > 0
                          ? 'Re-Evaluate Report'
                          : 'Get Insights'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* Status Summary Banner */}
                {allEvaluatedInsights.length > 0 && (
                  <div className="p-4 rounded-2xl bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700/80 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-stone-500 dark:text-stone-400 uppercase tracking-wider">
                        Report Breakdown ({allEvaluatedInsights.length} Measurements)
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => setFilterMode('abnormal')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                            filterMode === 'abnormal'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300'
                          }`}
                        >
                          Abnormal Only ({lowCount + highCount})
                        </button>
                        <button
                          onClick={() => setFilterMode('all')}
                          className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors cursor-pointer ${
                            filterMode === 'all'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-stone-200 dark:bg-stone-700 text-stone-700 dark:text-stone-300'
                          }`}
                        >
                          All ({allEvaluatedInsights.length})
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <div>
                          <div className="font-bold text-emerald-900 dark:text-emerald-200">{normalCount} Normal</div>
                          <div className="text-[10px] text-emerald-700 dark:text-emerald-400">Within reference</div>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 flex items-center gap-2">
                        <TrendingDown className="w-4 h-4 text-amber-600 shrink-0" />
                        <div>
                          <div className="font-bold text-amber-900 dark:text-amber-200">{lowCount} Low</div>
                          <div className="text-[10px] text-amber-700 dark:text-amber-400">Below reference</div>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800/60 flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-blue-600 shrink-0" />
                        <div>
                          <div className="font-bold text-blue-900 dark:text-blue-200">{highCount} High</div>
                          <div className="text-[10px] text-blue-700 dark:text-blue-400">Above reference</div>
                        </div>
                      </div>

                      <div className="p-2.5 rounded-xl bg-stone-100 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-stone-500 shrink-0" />
                        <div>
                          <div className="font-bold text-stone-800 dark:text-stone-200">{unknownCount} Review</div>
                          <div className="text-[10px] text-stone-500">Unspecified range</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Loading State during dynamic research */}
                {isAnalyzing && (
                  <div className="p-8 text-center text-stone-500 dark:text-stone-400 space-y-2">
                    <Loader2 className="w-7 h-7 animate-spin text-emerald-600 mx-auto" />
                    <p className="text-xs font-bold text-stone-800 dark:text-stone-200">
                      Evaluating report and synthesizing trusted clinical research...
                    </p>
                    <p className="text-[10px] text-stone-400 font-mono">
                      Consulting Tier 1/2 authoritative evidence against laboratory reference intervals
                    </p>
                  </div>
                )}

                {/* Evaluated Insights: Dynamic Marker Selector & Cards */}
                {!isAnalyzing && allEvaluatedInsights.length > 0 && (
                  <div className="space-y-4 pt-2">
                    {/* Marker Selector Tabs */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-2 border-b border-stone-200 dark:border-stone-800">
                      {displayedInsights.map((ins) => {
                        const isSelected =
                          (evaluatedInsight?.canonicalId || evaluatedInsight?.metric) === (ins.canonicalId || ins.metric) ||
                          activeTabMetric === ins.metric;
                        const isFlagged = ins.status === 'low' || ins.status === 'high';

                        return (
                          <button
                            key={ins.canonicalId || ins.metric}
                            onClick={() => {
                              setEvaluatedInsight(ins);
                              setActiveTabMetric(ins.metric);
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                              isSelected
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-stone-100 dark:bg-stone-800 text-stone-700 dark:text-stone-300 hover:bg-stone-200 dark:hover:bg-stone-700'
                            }`}
                          >
                            <span>{ins.metric}</span>
                            {isFlagged ? (
                              <span
                                className={`px-1.5 py-0.2 rounded text-[9px] font-black uppercase ${
                                  ins.status === 'high' ? 'bg-blue-500 text-white' : 'bg-amber-500 text-white'
                                }`}
                              >
                                {ins.status}
                              </span>
                            ) : ins.status === 'normal' ? (
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            ) : (
                              <span className="w-1.5 h-1.5 rounded-full bg-stone-400" />
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {/* Evaluated Health Insight Card */}
                    {evaluatedInsight ? (
                      <HealthInsightCard insight={evaluatedInsight} />
                    ) : (
                      <p className="text-xs text-stone-500 italic p-4 text-center">
                        Select a biomarker above to inspect its clinical insight.
                      </p>
                    )}
                  </div>
                )}

                {/* If analysis has not been triggered */}
                {!isAnalyzing && allEvaluatedInsights.length === 0 && (
                  <div className="p-8 text-center text-stone-500 dark:text-stone-400 space-y-3">
                    <p className="text-xs font-semibold">
                      Click "Get Insights" above to evaluate all measurements in this report against its laboratory reference intervals.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-12 bg-white dark:bg-stone-900 rounded-3xl border border-stone-200 dark:border-stone-800 text-center text-stone-500">
                <p className="text-sm font-semibold">Select a report from the list to view and analyze.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
