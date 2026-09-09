import React, { useState, useEffect } from 'react';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  Heart,
  Droplets,
  Award,
  Sparkles,
  Info,
  CheckCircle2,
  AlertTriangle,
  PlusCircle,
  BarChart2,
  FileText,
  FileCheck,
  Zap,
} from 'lucide-react';
import { db } from '../../lib/db';
import { decryptData } from '../../lib/crypto';
import { getOrEnsureCryptoKey } from '../../lib/key-management';
import type { HealthReport } from '../../types/health';

interface MetricPoint {
  id?: string;
  date: string;
  score: number;
  bpSystolic: number;
  bpDiastolic: number;
  glucose: number;
  hemoglobin: number;
  sourceType: 'file_upload' | 'vitals_log';
  title: string;
  note?: string;
}

interface ConnectedRecord {
  id: string;
  title: string;
  date: string;
  type: string;
  summary: string;
  score: number;
}

interface HealthTrajectoryChartProps {
  encryptionKey?: CryptoKey | null;
  userId?: string;
  reports?: HealthReport[];
  onAddDataClick?: () => void;
}

type SelectedMetric = 'score' | 'bpSystolic' | 'glucose' | 'hemoglobin';

export const HealthTrajectoryChart: React.FC<HealthTrajectoryChartProps> = ({
  encryptionKey,
  userId,
  reports,
  onAddDataClick,
}) => {
  const [selectedMetric, setSelectedMetric] = useState<SelectedMetric>('score');
  const [chartData, setChartData] = useState<MetricPoint[]>([]);
  const [connectedRecords, setConnectedRecords] = useState<ConnectedRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Load real metric points from IndexedDB (ONLY uploaded health record files)
  useEffect(() => {
    loadRealMetricData();
  }, [encryptionKey, userId, reports]);

  const parseReportMetricsAndScore = (
    title: string,
    type: string,
    payload: any
  ): {
    sys: number;
    dia: number;
    glu: number;
    hb: number;
    score: number;
    extractedSummary: string;
  } => {
    let sys: number | null = null;
    let dia: number | null = null;
    let glu: number | null = null;
    let hb: number | null = null;

    const resultsMap: Record<string, string> = {};

    if (payload && payload.results) {
      if (Array.isArray(payload.results)) {
        payload.results.forEach((r: any) => {
          if (r && r.key) {
            resultsMap[String(r.key).toLowerCase()] = String(r.value || '');
          }
        });
      } else if (typeof payload.results === 'object') {
        Object.entries(payload.results).forEach(([k, v]) => {
          resultsMap[k.toLowerCase()] = String(v || '');
        });
      }
    }

    const combinedText = (
      title +
      ' ' +
      type +
      ' ' +
      (payload.notes || '') +
      ' ' +
      Object.entries(resultsMap)
        .map(([k, v]) => `${k}:${v}`)
        .join(' ')
    ).toLowerCase();

    // 1. Blood Pressure Extraction
    for (const [k, v] of Object.entries(resultsMap)) {
      if (k.includes('pressure') || k.includes('bp') || k.includes('blood pressure')) {
        const match = v.match(/(\d{2,3})\s*[\/\\]\s*(\d{2,3})/);
        if (match) {
          sys = Number(match[1]);
          dia = Number(match[2]);
        } else {
          const sysMatch = v.match(/\d{2,3}/);
          if (sysMatch) sys = Number(sysMatch[0]);
        }
      } else if (k.includes('systolic')) {
        const match = v.match(/\d{2,3}/);
        if (match) sys = Number(match[0]);
      } else if (k.includes('diastolic')) {
        const match = v.match(/\d{2,3}/);
        if (match) dia = Number(match[0]);
      }
    }

    if (!sys) {
      const bpMatch = combinedText.match(/(\d{2,3})\s*[\/\\]\s*(\d{2,3})/);
      if (bpMatch) {
        sys = Number(bpMatch[1]);
        dia = Number(bpMatch[2]);
      }
    }

    // 2. Fasting Blood Glucose
    for (const [k, v] of Object.entries(resultsMap)) {
      if (k.includes('glucose') || k.includes('sugar') || k.includes('hba1c')) {
        const match = v.match(/(\d{2,3}(\.\d+)?)/);
        if (match) glu = Number(match[1]);
      }
    }
    if (!glu) {
      const gluMatch = combinedText.match(/glucose[:\s]*(\d{2,3})/);
      if (gluMatch) glu = Number(gluMatch[1]);
    }

    // 3. Hemoglobin
    for (const [k, v] of Object.entries(resultsMap)) {
      if (k.includes('hemoglobin') || k.includes('hb') || k.includes('hgb')) {
        const match = v.match(/(\d{1,2}(\.\d+)?)/);
        if (match) hb = Number(match[1]);
      }
    }
    if (!hb) {
      const hbMatch = combinedText.match(/hemoglobin[:\s]*(\d{1,2}(\.\d+)?)/);
      if (hbMatch) hb = Number(hbMatch[2]);
    }

    const activeSys = sys || 120;
    const activeDia = dia || 80;
    const activeGlu = glu || 95;
    const activeHb = hb || 14.0;

    // Calculate Health Score
    let score = 80;

    if (sys) {
      if (sys <= 120) score += 7;
      else if (sys <= 129) score += 2;
      else if (sys <= 139) score -= 6;
      else score -= 14;
    }

    if (dia) {
      if (dia <= 80) score += 3;
      else if (dia <= 89) score -= 3;
      else score -= 8;
    }

    if (glu) {
      if (glu >= 70 && glu <= 99) score += 6;
      else if (glu >= 100 && glu <= 125) score -= 5;
      else if (glu > 125) score -= 14;
    }

    if (hb) {
      if (hb >= 12.0 && hb <= 16.5) score += 4;
      else score -= 8;
    }

    if (!sys && !glu && !hb) {
      if (type === 'cbc' || type === 'metabolic') score += 4;
      else if (type === 'vitals') score += 2;
      else score += 3;
    }

    score = Math.max(40, Math.min(100, score));

    const metricsFound: string[] = [];
    if (sys) metricsFound.push(`BP ${sys}/${activeDia} mmHg`);
    if (glu) metricsFound.push(`Glucose ${glu} mg/dL`);
    if (hb) metricsFound.push(`Hemoglobin ${hb} g/dL`);

    const extractedSummary =
      metricsFound.length > 0
        ? metricsFound.join(' | ')
        : payload.notes || `${title} lab record`;

    return {
      sys: activeSys,
      dia: activeDia,
      glu: activeGlu,
      hb: activeHb,
      score,
      extractedSummary,
    };
  };

  const loadRealMetricData = async () => {
    setLoading(true);
    try {
      const activeKey = await getOrEnsureCryptoKey(encryptionKey);
      const points: MetricPoint[] = [];
      const recordsSummaryList: ConnectedRecord[] = [];

      // Fetch & Decrypt ONLY Uploaded Health Record Files from db.reports
      const rawReports = await db.reports.orderBy('date').toArray();

      for (const rep of rawReports) {
        try {
          const rawJson = await decryptData(rep.encryptedData, rep.iv, activeKey);
          const parsed = JSON.parse(rawJson);

          const { sys, dia, glu, hb, score, extractedSummary } = parseReportMetricsAndScore(
            rep.title,
            rep.type,
            parsed
          );

          points.push({
            id: rep.id,
            date: rep.date || 'Record',
            score,
            bpSystolic: sys,
            bpDiastolic: dia,
            glucose: glu,
            hemoglobin: hb,
            sourceType: 'file_upload',
            title: rep.title,
            note: extractedSummary,
          });

          recordsSummaryList.push({
            id: rep.id,
            title: rep.title,
            date: rep.date || '',
            type: rep.type,
            summary: extractedSummary,
            score,
          });
        } catch {
          // Fallback if report decryption pending
          points.push({
            id: rep.id,
            date: rep.date || 'Record',
            score: 80,
            bpSystolic: 120,
            bpDiastolic: 80,
            glucose: 95,
            hemoglobin: 14.0,
            sourceType: 'file_upload',
            title: rep.title,
            note: 'Uploaded Encrypted Health Record',
          });
        }
      }

      // Sort chronological order by date
      points.sort((a, b) => a.date.localeCompare(b.date));
      setChartData(points);
      setConnectedRecords(recordsSummaryList);
    } catch (err) {
      console.error('Error loading trajectory data from uploaded records:', err);
      setChartData([]);
      setConnectedRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const hasData = chartData.length > 0;
  const totalUploadedRecords = chartData.length;
  const hasEnoughRecordsForComparison = totalUploadedRecords >= 2;

  // Placeholder empty data structure for blank chart rendering
  const blankData = [
    { date: 'Record 1', score: 0, bpSystolic: 0, glucose: 0, hemoglobin: 0 },
    { date: 'Record 2', score: 0, bpSystolic: 0, glucose: 0, hemoglobin: 0 },
  ];

  const displayData = hasData ? chartData : [];

  const firstPoint = hasData ? chartData[0] : null;
  const lastPoint = hasData ? chartData[chartData.length - 1] : null;

  let initialVal = firstPoint ? firstPoint.score : 0;
  let currentVal = lastPoint ? lastPoint.score : 0;
  let metricUnit = 'pts';
  let metricTitle = 'Overall Health Index';

  if (selectedMetric === 'bpSystolic') {
    initialVal = firstPoint ? firstPoint.bpSystolic : 0;
    currentVal = lastPoint ? lastPoint.bpSystolic : 0;
    metricUnit = 'mmHg';
    metricTitle = 'Systolic Blood Pressure';
  } else if (selectedMetric === 'glucose') {
    initialVal = firstPoint ? firstPoint.glucose : 0;
    currentVal = lastPoint ? lastPoint.glucose : 0;
    metricUnit = 'mg/dL';
    metricTitle = 'Fasting Blood Glucose';
  } else if (selectedMetric === 'hemoglobin') {
    initialVal = firstPoint ? firstPoint.hemoglobin : 0;
    currentVal = lastPoint ? lastPoint.hemoglobin : 0;
    metricUnit = 'g/dL';
    metricTitle = 'Hemoglobin Level';
  }

  // Calculate overall health increase or decrease (requires minimum 2 records)
  const absoluteChange = currentVal - initialVal;
  const percentageChange = initialVal > 0 ? ((absoluteChange / initialVal) * 100).toFixed(1) : '0';

  const isPositiveIncrement =
    selectedMetric === 'score' || selectedMetric === 'hemoglobin'
      ? absoluteChange >= 0
      : absoluteChange <= 0;

  const overallDirectionText = hasEnoughRecordsForComparison
    ? absoluteChange > 0
      ? `+${Math.abs(Number(percentageChange))}% Health Increment`
      : absoluteChange < 0
      ? `-${Math.abs(Number(percentageChange))}% Health Decrement`
      : '0% Change (Stable Level)'
    : totalUploadedRecords === 1
    ? 'Baseline (1 Record Uploaded)'
    : 'Awaiting Uploaded Health Records';

  const comparisonPeriodText = hasEnoughRecordsForComparison && firstPoint && lastPoint
    ? `Comparing "${firstPoint.title}" (${firstPoint.date}) ➔ "${lastPoint.title}" (${lastPoint.date})`
    : totalUploadedRecords === 1
    ? 'Upload at least 1 more health record file to compare trajectory increment/decrement'
    : 'Upload 2 or more lab records to compare health improvement or decrement level';

  return (
    <div className="bg-white dark:bg-stone-900 p-4 sm:p-6 lg:p-8 rounded-2xl sm:rounded-[2rem] border border-stone-200 dark:border-stone-800 shadow-2xs space-y-6">
      {/* Header section */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 border-b border-stone-100 dark:border-stone-800 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-400 rounded-lg">
              <Activity className="w-4 h-4" />
            </span>
            <h3 className="text-base sm:text-lg font-bold text-stone-900 dark:text-stone-100">Health Trajectory & Progression</h3>
          </div>
          <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
            Calculated strictly from uploaded health record files across dates (Minimum 2 files for comparison)
          </p>
        </div>

        {/* Metric Selector Pills */}
        <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 bg-stone-100 dark:bg-stone-800 p-1.5 rounded-2xl w-full sm:w-auto">
          <button
            onClick={() => setSelectedMetric('score')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              selectedMetric === 'score'
                ? 'bg-white dark:bg-stone-900 text-emerald-800 dark:text-emerald-300 shadow-2xs font-extrabold'
                : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Health Score</span>
          </button>

          <button
            onClick={() => setSelectedMetric('bpSystolic')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              selectedMetric === 'bpSystolic'
                ? 'bg-white dark:bg-stone-900 text-rose-800 dark:text-rose-300 shadow-2xs font-extrabold'
                : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white'
            }`}
          >
            <Heart className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />
            <span>Blood Pressure</span>
          </button>

          <button
            onClick={() => setSelectedMetric('glucose')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              selectedMetric === 'glucose'
                ? 'bg-white dark:bg-stone-900 text-blue-800 dark:text-blue-300 shadow-2xs font-extrabold'
                : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white'
            }`}
          >
            <Droplets className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            <span>Glucose</span>
          </button>

          <button
            onClick={() => setSelectedMetric('hemoglobin')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              selectedMetric === 'hemoglobin'
                ? 'bg-white dark:bg-stone-900 text-purple-800 dark:text-purple-300 shadow-2xs font-extrabold'
                : 'text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white'
            }`}
          >
            <Award className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
            <span>Hemoglobin</span>
          </button>
        </div>
      </div>

      {/* Increment / Decrement Status Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4">
        <div className="p-4 bg-stone-50 dark:bg-stone-800/60 rounded-2xl border border-stone-100 dark:border-stone-800 flex items-center justify-between">
          <div>
            <p className="text-[10px] font-bold text-stone-400 uppercase tracking-wider mb-0.5">
              Latest Record Value
            </p>
            <div className="text-xl font-bold text-stone-900 dark:text-stone-100">
              {hasData ? (
                <>
                  {currentVal} <span className="text-xs font-semibold text-stone-500 dark:text-stone-400">{metricUnit}</span>
                </>
              ) : (
                <span className="text-stone-400 font-normal text-sm">-- No Uploads --</span>
              )}
            </div>
            <p className="text-[10px] text-stone-500 dark:text-stone-400 mt-1">{metricTitle}</p>
          </div>
          <div className="p-2.5 bg-white dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700 text-stone-700 dark:text-stone-300">
            <Activity className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          </div>
        </div>

        {/* Dynamic Overall Health Increase / Decrease Display */}
        <div className={`p-4 rounded-2xl border flex items-center justify-between col-span-1 sm:col-span-2 ${
          hasEnoughRecordsForComparison
            ? isPositiveIncrement
              ? 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800/60'
              : 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800/60'
            : 'bg-stone-50 dark:bg-stone-800/60 border-stone-200 dark:border-stone-800'
        }`}>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5 text-stone-600 dark:text-stone-400">
              Trajectory Progression Comparison (Minimum 2 Uploads)
            </p>
            <div className={`text-base sm:text-lg font-extrabold flex items-center gap-1.5 ${
              hasEnoughRecordsForComparison
                ? isPositiveIncrement ? 'text-emerald-800 dark:text-emerald-300' : 'text-amber-800 dark:text-amber-300'
                : 'text-stone-600 dark:text-stone-300'
            }`}>
              {hasEnoughRecordsForComparison ? (
                isPositiveIncrement ? (
                  <>
                    <TrendingUp className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
                    <span>{overallDirectionText}</span>
                    <span className="text-xs font-mono font-semibold opacity-80">
                      ({absoluteChange > 0 ? `+${absoluteChange}` : absoluteChange} {metricUnit})
                    </span>
                  </>
                ) : (
                  <>
                    <TrendingDown className="w-5 h-5 shrink-0 text-amber-600 dark:text-amber-400" />
                    <span>{overallDirectionText}</span>
                    <span className="text-xs font-mono font-semibold opacity-80">
                      ({absoluteChange} {metricUnit})
                    </span>
                  </>
                )
              ) : (
                <span className="text-xs font-bold text-stone-600 dark:text-stone-300">{overallDirectionText}</span>
              )}
            </div>
            <p className="text-[11px] font-medium text-stone-500 dark:text-stone-400 mt-1">
              {comparisonPeriodText}
            </p>
          </div>

          <div className={`p-2.5 rounded-xl border shrink-0 ${
            hasEnoughRecordsForComparison
              ? isPositiveIncrement
                ? 'bg-emerald-100 dark:bg-emerald-900/60 border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300'
                : 'bg-amber-100 dark:bg-amber-900/60 border-amber-300 dark:border-amber-700 text-amber-800 dark:text-amber-300'
              : 'bg-stone-100 dark:bg-stone-800 border-stone-200 dark:border-stone-700 text-stone-400'
          }`}>
            {hasEnoughRecordsForComparison ? (
              isPositiveIncrement ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />
            ) : (
              <BarChart2 className="w-5 h-5 text-stone-400" />
            )}
          </div>
        </div>
      </div>

      {/* Connected Uploaded Files Bar */}
      {connectedRecords.length > 0 && (
        <div className="bg-emerald-50/70 dark:bg-emerald-950/40 p-3.5 rounded-2xl border border-emerald-200/80 dark:border-emerald-800/60 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-700 dark:text-emerald-400" />
              <span className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                Connected Uploaded Files ({connectedRecords.length})
              </span>
            </div>
            <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
              {hasEnoughRecordsForComparison
                ? 'Plotting chronological comparison trajectory'
                : 'Upload 1 more record to compute health increment/decrement'}
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {connectedRecords.map((rec) => (
              <div
                key={rec.id}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-stone-800 border border-emerald-200 dark:border-emerald-800/60 rounded-xl text-xs font-semibold text-stone-800 dark:text-stone-200 shadow-2xs"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span className="font-bold text-stone-900 dark:text-stone-100">{rec.title}</span>
                <span className="text-[10px] text-stone-400 dark:text-stone-400">({rec.date || 'Record'})</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Graph Area */}
      <div className="relative h-64 sm:h-72 w-full pt-2 rounded-2xl bg-stone-50/50 dark:bg-stone-800/40 border border-stone-200 dark:border-stone-800 overflow-hidden flex flex-col justify-center items-center">
        {!hasData && (
          <div className="absolute inset-0 z-10 bg-white/80 dark:bg-stone-900/80 backdrop-blur-[1px] flex flex-col items-center justify-center p-6 text-center space-y-3">
            <div className="w-12 h-12 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 rounded-2xl border border-emerald-200 dark:border-emerald-800 flex items-center justify-center shadow-2xs">
              <BarChart2 className="w-6 h-6" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100">No Uploaded Health Records Found</h4>
              <p className="text-xs text-stone-500 dark:text-stone-400 max-w-sm mt-0.5">
                Upload at least 2 health record files (e.g. Lab reports, Blood Work, Prescriptions) to compare dates and measure health increment or decrement levels.
              </p>
            </div>
            {onAddDataClick && (
              <button
                onClick={onAddDataClick}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
              >
                <PlusCircle className="w-4 h-4" />
                <span>+ Upload Health File</span>
              </button>
            )}
          </div>
        )}

        <ResponsiveContainer width="100%" height="100%">
          <AreaChart
            data={hasData ? displayData : blankData}
            margin={{ top: 20, right: 20, left: -20, bottom: 0 }}
          >
            <defs>
              <linearGradient id="emeraldGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" className="dark:opacity-20" vertical={false} />

            <XAxis
              dataKey="date"
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: '#94a3b8', fontWeight: 600 }}
            />

            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fontSize: 11, fill: '#94a3b8' }}
              domain={[0, 120]}
            />

            {hasData && (
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload as MetricPoint;
                    return (
                      <div className="bg-stone-900 dark:bg-stone-950 text-white p-3 rounded-xl shadow-xl text-xs border border-stone-800 space-y-1 max-w-xs">
                        <div className="font-bold text-emerald-400 border-b border-stone-800 pb-1 flex items-center justify-between gap-4">
                          <span>{data.title} ({label})</span>
                          <span className="text-[10px] font-semibold px-1.5 py-0.5 bg-emerald-950 text-emerald-300 rounded border border-emerald-800">
                            Uploaded File
                          </span>
                        </div>
                        <div className="pt-1 flex items-center justify-between gap-4">
                          <span className="text-stone-300">{metricTitle}:</span>
                          <span className="font-mono font-bold text-white">
                            {payload[0].value} {metricUnit}
                          </span>
                        </div>
                        {data.note && (
                          <p className="text-[10px] text-stone-400 italic pt-1 border-t border-stone-800">
                            {data.note}
                          </p>
                        )}
                      </div>
                    );
                  }
                  return null;
                }}
              />
            )}

            {hasData && (
              <ReferenceLine
                y={80}
                stroke="#10b981"
                strokeDasharray="4 4"
                label={{
                  value: 'Optimal Health Target',
                  fill: '#10b981',
                  fontSize: 10,
                  position: 'insideTopLeft',
                }}
              />
            )}

            <Area
              type="monotone"
              dataKey={selectedMetric}
              stroke="#059669"
              strokeWidth={3}
              fillOpacity={1}
              fill="url(#emeraldGradient)"
              dot={{ r: 5, fill: '#059669', strokeWidth: 2, stroke: '#ffffff' }}
              activeDot={{ r: 7, fill: '#047857', stroke: '#ffffff', strokeWidth: 2 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="p-3 bg-stone-50 dark:bg-stone-800/60 rounded-xl border border-stone-200 dark:border-stone-800 flex items-center justify-between text-xs text-stone-600 dark:text-stone-300">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>
            Trajectory graphs strictly plot uploaded health record files chronologically to calculate health increments or decrements (requires 2 or more files).
          </span>
        </div>
        <span className="text-[10px] font-bold uppercase text-stone-400 dark:text-stone-400 tracking-wider">
          Uploaded File Analysis
        </span>
      </div>
    </div>
  );
};

