import React, { useState, useEffect } from 'react';
import {
  Activity,
  Plus,
  Heart,
  Scale,
  Droplet,
  Lock,
  Trash2,
  FileText,
  Sparkles,
  UploadCloud,
  CheckCircle2,
  Calendar,
  Clock,
  Tag,
  PlusCircle,
  Wind,
  Layers,
} from 'lucide-react';
import { db } from '../../lib/db';
import { encryptData, decryptData } from '../../lib/crypto';
import { getOrEnsureCryptoKey } from '../../lib/key-management';
import type { VitalLogEntry, DecryptedVitalData } from '../../types/health';
import { formatDate } from '../../lib/utils';

interface VitalsTrackerProps {
  encryptionKey: CryptoKey | null;
  userId: string;
}

interface DecryptedVitalItem extends VitalLogEntry {
  data?: DecryptedVitalData;
}

type MetricType = 'all' | 'heart_rate' | 'glucose' | 'weight' | 'bp' | 'spo2' | 'other';
type RecordMode = 'manual' | 'import';

interface DecryptedUploadedFile {
  id: string;
  title: string;
  date: string;
  type: string;
  heartRate?: number;
  bloodGlucose?: number;
  weightKg?: number;
  systolicBP?: number;
  diastolicBP?: number;
  oxygenSaturation?: number;
  notes?: string;
}

export const VitalsTracker: React.FC<VitalsTrackerProps> = ({ encryptionKey, userId }) => {
  const [items, setItems] = useState<DecryptedVitalItem[]>([]);
  const [isAdding, setIsAdding] = useState(false);

  // Metric dropdown selection
  const [selectedMetric, setSelectedMetric] = useState<MetricType>('all');
  const [recordMode, setRecordMode] = useState<RecordMode>('manual');

  // Today ISO string for date picker max attribute
  const todayStr = new Date().toISOString().split('T')[0];

  // Input states including custom log date
  const [logDate, setLogDate] = useState<string>(todayStr);
  const [dateError, setDateError] = useState<string | null>(null);
  const [inlineActiveMetric, setInlineActiveMetric] = useState<MetricType | null>(null);

  const [systolic, setSystolic] = useState('120');
  const [diastolic, setDiastolic] = useState('80');
  const [heartRate, setHeartRate] = useState('72');
  const [glucose, setGlucose] = useState('95');
  const [weight, setWeight] = useState('70');
  const [spo2, setSpo2] = useState('98');

  // Custom / "Other" metric fields
  const [customMetricName, setCustomMetricName] = useState('Cholesterol');
  const [customMetricValue, setCustomMetricValue] = useState('190');
  const [customMetricUnit, setCustomMetricUnit] = useState('mg/dL');

  const [notes, setNotes] = useState('');
  const [importedSourceTitle, setImportedSourceTitle] = useState<string | null>(null);

  // Recent files for auto-import
  const [recentFiles, setRecentFiles] = useState<DecryptedUploadedFile[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string>('');
  const [isLoadingFiles, setIsLoadingFiles] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadAndDecryptVitals();
    loadRecentUploadedFiles();
  }, [encryptionKey, userId]);

  async function loadAndDecryptVitals() {
    const activeKey = await getOrEnsureCryptoKey(encryptionKey);
    const rawVitals = await db.vitalsLog.orderBy('timestamp').reverse().toArray();

    const decryptedList: DecryptedVitalItem[] = await Promise.all(
      rawVitals.map(async (v) => {
        try {
          const json = await decryptData(v.encryptedData, v.iv, activeKey);
          return { ...v, data: JSON.parse(json) };
        } catch {
          return v;
        }
      })
    );

    setItems(decryptedList);
  }

  // Load and decrypt uploaded reports to extract metrics
  async function loadRecentUploadedFiles() {
    setIsLoadingFiles(true);
    try {
      const activeKey = await getOrEnsureCryptoKey(encryptionKey);
      const rawReports = await db.reports.orderBy('date').reverse().toArray();

      const extractedList: DecryptedUploadedFile[] = [];

      for (const rep of rawReports) {
        try {
          const json = await decryptData(rep.encryptedData, rep.iv, activeKey);
          const parsed = JSON.parse(json);

          const { heartRate, bloodGlucose, weightKg, systolicBP, diastolicBP, oxygenSaturation } =
            extractMetricsFromParsedData(rep.title, rep.type, parsed);

          extractedList.push({
            id: rep.id,
            title: rep.title,
            date: rep.date,
            type: rep.type,
            heartRate,
            bloodGlucose,
            weightKg,
            systolicBP,
            diastolicBP,
            oxygenSaturation,
            notes: parsed.notes || '',
          });
        } catch {
          extractedList.push({
            id: rep.id,
            title: rep.title,
            date: rep.date,
            type: rep.type,
          });
        }
      }

      setRecentFiles(extractedList);
      if (extractedList.length > 0) {
        setSelectedFileId(extractedList[0].id);
      }
    } catch (err) {
      console.error('Error loading uploaded files for vitals import:', err);
    } finally {
      setIsLoadingFiles(false);
    }
  }

  // Helper to parse metrics out of decrypted report JSON
  const extractMetricsFromParsedData = (title: string, type: string, parsed: any) => {
    let heartRate: number | undefined;
    let bloodGlucose: number | undefined;
    let weightKg: number | undefined;
    let systolicBP: number | undefined;
    let diastolicBP: number | undefined;
    let oxygenSaturation: number | undefined;

    const resultsMap: Record<string, string> = {};

    if (parsed && parsed.results) {
      if (Array.isArray(parsed.results)) {
        parsed.results.forEach((r: any) => {
          if (r && r.key) {
            resultsMap[String(r.key).toLowerCase()] = String(r.value || '');
          }
        });
      } else if (typeof parsed.results === 'object') {
        Object.entries(parsed.results).forEach(([k, v]) => {
          resultsMap[k.toLowerCase()] = String(v || '');
        });
      }
    }

    const combinedText = (
      title +
      ' ' +
      type +
      ' ' +
      (parsed.notes || '') +
      ' ' +
      Object.entries(resultsMap)
        .map(([k, v]) => `${k}:${v}`)
        .join(' ')
    ).toLowerCase();

    // Heart Rate
    for (const [k, v] of Object.entries(resultsMap)) {
      if (k.includes('heart rate') || k.includes('pulse') || k.includes('hr')) {
        const match = v.match(/\d{2,3}/);
        if (match) heartRate = Number(match[0]);
      }
    }
    if (!heartRate) {
      const hrMatch = combinedText.match(/(pulse|heart rate|hr)[:\s]*(\d{2,3})/);
      if (hrMatch) heartRate = Number(hrMatch[2]);
    }

    // Glucose
    for (const [k, v] of Object.entries(resultsMap)) {
      if (k.includes('glucose') || k.includes('sugar') || k.includes('hba1c')) {
        const match = v.match(/(\d{2,3}(\.\d+)?)/);
        if (match) bloodGlucose = Number(match[1]);
      }
    }
    if (!bloodGlucose) {
      const gluMatch = combinedText.match(/glucose[:\s]*(\d{2,3})/);
      if (gluMatch) bloodGlucose = Number(gluMatch[1]);
    }

    // Weight
    for (const [k, v] of Object.entries(resultsMap)) {
      if (k.includes('weight') || k.includes('body weight') || k.includes('kg')) {
        const match = v.match(/(\d{2,3}(\.\d+)?)/);
        if (match) weightKg = Number(match[1]);
      }
    }

    // Blood Pressure
    for (const [k, v] of Object.entries(resultsMap)) {
      if (k.includes('pressure') || k.includes('bp') || k.includes('blood pressure')) {
        const match = v.match(/(\d{2,3})\s*[\/\\]\s*(\d{2,3})/);
        if (match) {
          systolicBP = Number(match[1]);
          diastolicBP = Number(match[2]);
        }
      }
    }
    if (!systolicBP) {
      const bpMatch = combinedText.match(/(\d{2,3})\s*[\/\\]\s*(\d{2,3})/);
      if (bpMatch) {
        systolicBP = Number(bpMatch[1]);
        diastolicBP = Number(bpMatch[2]);
      }
    }

    // Oxygen
    for (const [k, v] of Object.entries(resultsMap)) {
      if (k.includes('spo2') || k.includes('oxygen') || k.includes('o2')) {
        const match = v.match(/(\d{2,3})/);
        if (match) oxygenSaturation = Number(match[1]);
      }
    }

    return { heartRate, bloodGlucose, weightKg, systolicBP, diastolicBP, oxygenSaturation };
  };

  // Auto-fill values when user selects a file to import
  const handleApplyFileImport = (fileId: string) => {
    const targetFile = recentFiles.find((f) => f.id === fileId);
    if (!targetFile) return;

    if (targetFile.heartRate) setHeartRate(String(targetFile.heartRate));
    if (targetFile.bloodGlucose) setGlucose(String(targetFile.bloodGlucose));
    if (targetFile.weightKg) setWeight(String(targetFile.weightKg));
    if (targetFile.systolicBP) setSystolic(String(targetFile.systolicBP));
    if (targetFile.diastolicBP) setDiastolic(String(targetFile.diastolicBP));
    if (targetFile.oxygenSaturation) setSpo2(String(targetFile.oxygenSaturation));
    if (targetFile.date) setLogDate(targetFile.date);

    setImportedSourceTitle(targetFile.title);
    setNotes(`Imported from health record file: "${targetFile.title}" (${targetFile.date})`);
  };

  const handleDateChange = (val: string) => {
    setLogDate(val);
    if (val > todayStr) {
      setDateError(`Future dates are not allowed. Today is ${todayStr}. Please select today or a past date.`);
    } else {
      setDateError(null);
    }
  };

  const handleSaveVital = async (e: React.FormEvent) => {
    e.preventDefault();
    if (logDate > todayStr) {
      setDateError(`Future dates are not allowed. Today is ${todayStr}. Please select today or a past date.`);
      return;
    }
    setDateError(null);
    setIsSubmitting(true);
    try {
      const activeKey = await getOrEnsureCryptoKey(encryptionKey);

      // Save depending on selected metric or custom 'other' metric
      const vitalData: DecryptedVitalData = {
        systolicBP: selectedMetric === 'all' || selectedMetric === 'bp' ? Number(systolic) || undefined : undefined,
        diastolicBP: selectedMetric === 'all' || selectedMetric === 'bp' ? Number(diastolic) || undefined : undefined,
        heartRate: selectedMetric === 'all' || selectedMetric === 'heart_rate' ? Number(heartRate) || undefined : undefined,
        bloodGlucose: selectedMetric === 'all' || selectedMetric === 'glucose' ? Number(glucose) || undefined : undefined,
        weightKg: selectedMetric === 'all' || selectedMetric === 'weight' ? Number(weight) || undefined : undefined,
        oxygenSaturation: selectedMetric === 'all' || selectedMetric === 'spo2' ? Number(spo2) || undefined : undefined,
        customMetricName: selectedMetric === 'other' ? customMetricName.trim() : undefined,
        customMetricValue: selectedMetric === 'other' ? customMetricValue.trim() : undefined,
        customMetricUnit: selectedMetric === 'other' ? customMetricUnit.trim() : undefined,
        notes: notes.trim() || undefined,
      };

      const { cipherText, iv } = await encryptData(JSON.stringify(vitalData), activeKey);
      
      const selectedTimestamp = logDate
        ? new Date(`${logDate}T12:00:00`).toISOString()
        : new Date().toISOString();

      const newEntry: VitalLogEntry = {
        id: `vit_${Date.now()}`,
        userId,
        timestamp: selectedTimestamp,
        date: logDate || todayStr,
        encryptedData: cipherText,
        iv,
        createdAt: new Date().toISOString(),
      };

      await db.vitalsLog.put(newEntry);
      setIsAdding(false);
      setNotes('');
      setImportedSourceTitle(null);
      await loadAndDecryptVitals();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveInlineVital = async (e: React.FormEvent, metricType: MetricType) => {
    e.preventDefault();
    if (logDate > todayStr) {
      setDateError(`Future dates are not allowed. Today is ${todayStr}. Please select today or a past date.`);
      return;
    }
    setDateError(null);
    setIsSubmitting(true);
    try {
      const activeKey = await getOrEnsureCryptoKey(encryptionKey);

      const vitalData: DecryptedVitalData = {
        systolicBP: metricType === 'bp' ? Number(systolic) || undefined : undefined,
        diastolicBP: metricType === 'bp' ? Number(diastolic) || undefined : undefined,
        heartRate: metricType === 'heart_rate' ? Number(heartRate) || undefined : undefined,
        bloodGlucose: metricType === 'glucose' ? Number(glucose) || undefined : undefined,
        weightKg: metricType === 'weight' ? Number(weight) || undefined : undefined,
        oxygenSaturation: metricType === 'spo2' ? Number(spo2) || undefined : undefined,
        customMetricName: metricType === 'other' ? customMetricName.trim() : undefined,
        customMetricValue: metricType === 'other' ? customMetricValue.trim() : undefined,
        customMetricUnit: metricType === 'other' ? customMetricUnit.trim() : undefined,
        notes: notes.trim() || undefined,
      };

      const { cipherText, iv } = await encryptData(JSON.stringify(vitalData), activeKey);

      const selectedTimestamp = logDate
        ? new Date(`${logDate}T12:00:00`).toISOString()
        : new Date().toISOString();

      const newEntry: VitalLogEntry = {
        id: `vit_${Date.now()}`,
        userId,
        timestamp: selectedTimestamp,
        date: logDate || todayStr,
        encryptedData: cipherText,
        iv,
        createdAt: new Date().toISOString(),
      };

      await db.vitalsLog.put(newEntry);
      setInlineActiveMetric(null);
      setNotes('');
      await loadAndDecryptVitals();
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteVital = async (id: string) => {
    await db.vitalsLog.delete(id);
    await loadAndDecryptVitals();
  };

  // Group entries by metric type for personalized metric boxes
  const bpEntries = items.filter((i) => i.data?.systolicBP !== undefined && i.data?.diastolicBP !== undefined);
  const hrEntries = items.filter((i) => i.data?.heartRate !== undefined);
  const glucoseEntries = items.filter((i) => i.data?.bloodGlucose !== undefined);
  const weightEntries = items.filter((i) => i.data?.weightKg !== undefined);
  const spo2Entries = items.filter((i) => i.data?.oxygenSaturation !== undefined);
  const customEntries = items.filter((i) => i.data?.customMetricName !== undefined && i.data?.customMetricValue !== undefined);

  const activeSelectedFile = recentFiles.find((f) => f.id === selectedFileId);

  const renderInlineEntryForm = (metricType: MetricType) => {
    return (
      <form
        onSubmit={(e) => handleSaveInlineVital(e, metricType)}
        className="p-4 bg-stone-50 dark:bg-stone-900 text-stone-900 dark:text-white rounded-2xl border border-stone-200 dark:border-stone-800 space-y-3 my-2 shadow-sm"
      >
        <div className="flex items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-2">
          <span className="text-xs font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Add Entry Directly Below</span>
          </span>
          <button
            type="button"
            onClick={() => {
              setInlineActiveMetric(null);
              setDateError(null);
            }}
            className="text-[11px] text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
          >
            Cancel
          </button>
        </div>

        {dateError && (
          <div className="p-2.5 bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-700/60 rounded-xl text-xs text-rose-800 dark:text-rose-300 font-semibold flex items-center gap-1.5">
            <span>⚠️ {dateError}</span>
          </div>
        )}

        {/* Date Input with max={todayStr} */}
        <div className="flex items-center justify-between gap-2 bg-white dark:bg-stone-800/80 p-2.5 rounded-xl border border-stone-200 dark:border-stone-700/80">
          <label className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Entry Date:</span>
          </label>
          <input
            type="date"
            max={todayStr}
            value={logDate}
            onChange={(e) => handleDateChange(e.target.value)}
            className="px-2.5 py-1 bg-stone-50 dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-lg text-xs font-mono text-stone-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
            required
          />
        </div>

        {/* Metric Specific Inputs */}
        {metricType === 'weight' && (
          <div>
            <label className="block text-[10px] font-bold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-1">
              Body Weight (kg)
            </label>
            <input
              type="number"
              step="0.1"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="w-full px-3 py-1.5 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-mono text-stone-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              required
            />
          </div>
        )}

        {metricType === 'bp' && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[10px] font-bold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-1">
                Systolic BP (mmHg)
              </label>
              <input
                type="number"
                value={systolic}
                onChange={(e) => setSystolic(e.target.value)}
                className="w-full px-3 py-1.5 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-mono text-stone-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                required
              />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-1">
                Diastolic BP (mmHg)
              </label>
              <input
                type="number"
                value={diastolic}
                onChange={(e) => setDiastolic(e.target.value)}
                className="w-full px-3 py-1.5 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-mono text-stone-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                required
              />
            </div>
          </div>
        )}

        {metricType === 'heart_rate' && (
          <div>
            <label className="block text-[10px] font-bold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-1">
              Heart Rate (bpm)
            </label>
            <input
              type="number"
              value={heartRate}
              onChange={(e) => setHeartRate(e.target.value)}
              className="w-full px-3 py-1.5 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-mono text-stone-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              required
            />
          </div>
        )}

        {metricType === 'glucose' && (
          <div>
            <label className="block text-[10px] font-bold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-1">
              Blood Glucose (mg/dL)
            </label>
            <input
              type="number"
              value={glucose}
              onChange={(e) => setGlucose(e.target.value)}
              className="w-full px-3 py-1.5 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-mono text-stone-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              required
            />
          </div>
        )}

        {metricType === 'spo2' && (
          <div>
            <label className="block text-[10px] font-bold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-1">
              Blood Oxygen / SpO2 (%)
            </label>
            <input
              type="number"
              value={spo2}
              onChange={(e) => setSpo2(e.target.value)}
              className="w-full px-3 py-1.5 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-mono text-stone-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              required
            />
          </div>
        )}

        {metricType === 'other' && (
          <div className="space-y-2">
            <div>
              <label className="block text-[10px] font-bold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-1">
                Metric Name
              </label>
              <input
                type="text"
                value={customMetricName}
                onChange={(e) => setCustomMetricName(e.target.value)}
                placeholder="e.g. Cholesterol, Temp"
                className="w-full px-3 py-1.5 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                required
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-bold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-1">
                  Value
                </label>
                <input
                  type="text"
                  value={customMetricValue}
                  onChange={(e) => setCustomMetricValue(e.target.value)}
                  placeholder="e.g. 190"
                  className="w-full px-3 py-1.5 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono"
                  required
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-1">
                  Unit
                </label>
                <input
                  type="text"
                  value={customMetricUnit}
                  onChange={(e) => setCustomMetricUnit(e.target.value)}
                  placeholder="e.g. mg/dL"
                  className="w-full px-3 py-1.5 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono"
                />
              </div>
            </div>
          </div>
        )}

        {/* Notes */}
        <div>
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional notes or context..."
            className="w-full px-3 py-1.5 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-stone-500 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
          />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={() => {
              setInlineActiveMetric(null);
              setDateError(null);
            }}
            className="px-3 py-1.5 bg-stone-200 hover:bg-stone-300 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-xl text-xs font-bold"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1"
          >
            <Lock className="w-3 h-3 text-emerald-200" />
            <span>{isSubmitting ? 'Saving...' : 'Save Record'}</span>
          </button>
        </div>
      </form>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header section with Dropdown and Log Vitals Trigger */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2.5">
            <Activity className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
            <span>Vitals & Physiological Metrics</span>
          </h2>
          <p className="text-sm text-stone-500 dark:text-stone-400 mt-0.5">
            Log multiple entries across dates or import physiological metrics to your encrypted vault
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Metric Selector Dropdown with "Other" section */}
          <div className="relative inline-flex items-center">
            <span className="text-xs font-bold text-stone-500 dark:text-stone-400 mr-2 hidden sm:inline">Recording:</span>
            <select
              value={selectedMetric}
              onChange={(e) => {
                setSelectedMetric(e.target.value as MetricType);
                setIsAdding(true);
              }}
              className="px-3.5 py-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl text-xs font-bold text-stone-900 dark:text-stone-100 shadow-2xs focus:ring-2 focus:ring-emerald-500 focus:outline-hidden cursor-pointer"
            >
              <option value="all" className="bg-white text-stone-900 dark:bg-stone-900 dark:text-stone-100 font-medium">⚡ All Vitals Panel</option>
              <option value="heart_rate" className="bg-white text-stone-900 dark:bg-stone-900 dark:text-stone-100 font-medium">❤️ Heart Rate (bpm)</option>
              <option value="glucose" className="bg-white text-stone-900 dark:bg-stone-900 dark:text-stone-100 font-medium">🩸 Blood Glucose (mg/dL)</option>
              <option value="weight" className="bg-white text-stone-900 dark:bg-stone-900 dark:text-stone-100 font-medium">⚖️ Body Weight (kg)</option>
              <option value="bp" className="bg-white text-stone-900 dark:bg-stone-900 dark:text-stone-100 font-medium">🫀 Blood Pressure (mmHg)</option>
              <option value="spo2" className="bg-white text-stone-900 dark:bg-stone-900 dark:text-stone-100 font-medium">🫁 Blood Oxygen / SpO2 (%)</option>
              <option value="other" className="bg-white text-stone-900 dark:bg-stone-900 dark:text-stone-100 font-medium">✨ Other / Custom Metric...</option>
            </select>
          </div>

          <button
            onClick={() => setIsAdding(!isAdding)}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-2xs transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{isAdding ? 'Close Recording' : 'Record Vitals'}</span>
          </button>
        </div>
      </div>

      {/* Main Logging Form Interface */}
      {isAdding && (
        <div className="p-6 bg-white dark:bg-stone-900 text-stone-900 dark:text-white rounded-3xl border border-stone-200 dark:border-stone-800 space-y-5 shadow-xl">
          {/* Top Control Bar: Mode Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-stone-200 dark:border-stone-800 pb-4">
            <div className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
              <div>
                <h3 className="font-bold text-stone-900 dark:text-stone-100 text-sm">
                  Record Metric:{' '}
                  <span className="text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                    {selectedMetric === 'other' ? 'Custom Metric Entry' : selectedMetric.replace('_', ' ')}
                  </span>
                </h3>
                <p className="text-[11px] text-stone-500 dark:text-stone-400">
                  Provide custom date & value, or extract auto-filled numbers from uploaded files
                </p>
              </div>
            </div>

            {/* Tab Mode Buttons */}
            <div className="inline-flex p-1 bg-stone-100 dark:bg-stone-800 rounded-xl border border-stone-200 dark:border-stone-700">
              <button
                type="button"
                onClick={() => setRecordMode('manual')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  recordMode === 'manual'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                }`}
              >
                Store Manually
              </button>
              <button
                type="button"
                onClick={() => {
                  setRecordMode('import');
                  if (recentFiles.length > 0 && !selectedFileId) {
                    setSelectedFileId(recentFiles[0].id);
                  }
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  recordMode === 'import'
                    ? 'bg-emerald-600 text-white shadow-2xs'
                    : 'text-stone-600 dark:text-stone-400 hover:text-stone-900 dark:hover:text-stone-200'
                }`}
              >
                <UploadCloud className="w-3.5 h-3.5" />
                <span>Import from File</span>
              </button>
            </div>
          </div>

          {/* Mode 1: Import from Recent Uploaded File */}
          {recordMode === 'import' && (
            <div className="p-4 bg-stone-50 dark:bg-stone-800/80 rounded-2xl border border-stone-200 dark:border-stone-700/80 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-stone-800 dark:text-stone-300 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  Select Uploaded Health File to Import From:
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono">
                  {recentFiles.length} Uploads Available
                </span>
              </div>

              {recentFiles.length === 0 ? (
                <div className="p-4 bg-white dark:bg-stone-900 rounded-xl text-center border border-stone-200 dark:border-stone-700/50">
                  <p className="text-xs text-stone-500 dark:text-stone-400 mb-2">No uploaded health record files found.</p>
                  <button
                    type="button"
                    onClick={() => setRecordMode('manual')}
                    className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold"
                  >
                    Switch to Manual Store
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedFileId}
                      onChange={(e) => {
                        setSelectedFileId(e.target.value);
                        handleApplyFileImport(e.target.value);
                      }}
                      className="w-full px-3.5 py-2.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-bold text-stone-900 dark:text-stone-100 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    >
                      {recentFiles.map((f) => (
                        <option key={f.id} value={f.id} className="bg-white text-stone-900 dark:bg-stone-900 dark:text-stone-100 font-medium">
                          📄 {f.title} ({f.date})
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => handleApplyFileImport(selectedFileId)}
                      className="px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 shadow-2xs"
                    >
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Extract & Auto-Fill</span>
                    </button>
                  </div>

                  {activeSelectedFile && (
                    <div className="p-3 bg-emerald-50/50 dark:bg-stone-900/90 rounded-xl border border-emerald-200 dark:border-emerald-500/30 text-xs space-y-1.5">
                      <div className="font-bold text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
                        <span>Extracted Values from "{activeSelectedFile.title}":</span>
                        <span className="text-[10px] text-stone-500 dark:text-stone-400">{activeSelectedFile.date}</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[11px] text-stone-700 dark:text-stone-300">
                        {activeSelectedFile.heartRate && (
                          <div className="p-1.5 bg-white dark:bg-stone-800 rounded border border-stone-200 dark:border-stone-700">
                            Heart Rate: <strong className="text-stone-900 dark:text-white">{activeSelectedFile.heartRate} bpm</strong>
                          </div>
                        )}
                        {activeSelectedFile.bloodGlucose && (
                          <div className="p-1.5 bg-white dark:bg-stone-800 rounded border border-stone-200 dark:border-stone-700">
                            Glucose: <strong className="text-stone-900 dark:text-white">{activeSelectedFile.bloodGlucose} mg/dL</strong>
                          </div>
                        )}
                        {activeSelectedFile.systolicBP && (
                          <div className="p-1.5 bg-white dark:bg-stone-800 rounded border border-stone-200 dark:border-stone-700">
                            BP: <strong className="text-stone-900 dark:text-white">{activeSelectedFile.systolicBP}/{activeSelectedFile.diastolicBP} mmHg</strong>
                          </div>
                        )}
                        {activeSelectedFile.weightKg && (
                          <div className="p-1.5 bg-white dark:bg-stone-800 rounded border border-stone-200 dark:border-stone-700">
                            Weight: <strong className="text-stone-900 dark:text-white">{activeSelectedFile.weightKg} kg</strong>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Input Form with Date Field */}
          <form onSubmit={handleSaveVital} className="space-y-4">
            {importedSourceTitle && (
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-700/50 rounded-xl text-xs text-emerald-800 dark:text-emerald-300 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>Auto-filled from uploaded file: <strong>"{importedSourceTitle}"</strong></span>
              </div>
            )}

            {/* Date Field for Input */}
            <div className="bg-stone-50 dark:bg-stone-800/80 p-3 rounded-2xl border border-stone-200 dark:border-stone-700/80 flex flex-col gap-2">
              <div className="flex items-center justify-between gap-4">
                <label className="text-xs font-bold text-stone-700 dark:text-stone-300 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Entry Date:</span>
                </label>
                <input
                  type="date"
                  max={todayStr}
                  value={logDate}
                  onChange={(e) => handleDateChange(e.target.value)}
                  className="px-3 py-1.5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-xs font-mono text-stone-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                  required
                />
              </div>
              {dateError && (
                <div className="p-2.5 bg-rose-50 dark:bg-rose-950/80 border border-rose-200 dark:border-rose-700/60 rounded-xl text-xs text-rose-800 dark:text-rose-300 font-semibold flex items-center gap-1.5">
                  <span>⚠️ {dateError}</span>
                </div>
              )}
            </div>

            {/* Custom "Other" Metric Input Fields */}
            {selectedMetric === 'other' ? (
              <div className="p-4 bg-stone-50 dark:bg-stone-800/90 rounded-2xl border border-stone-200 dark:border-stone-700 space-y-3">
                <div className="text-xs font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
                  <Tag className="w-4 h-4" />
                  <span>Custom Metric Details</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[10px] font-bold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-1">
                      Metric Name
                    </label>
                    <input
                      type="text"
                      value={customMetricName}
                      onChange={(e) => setCustomMetricName(e.target.value)}
                      placeholder="e.g. Cholesterol, Sleep Hours, Temp"
                      className="w-full px-3 py-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-1">
                      Value
                    </label>
                    <input
                      type="text"
                      value={customMetricValue}
                      onChange={(e) => setCustomMetricValue(e.target.value)}
                      placeholder="e.g. 190, 8, 98.6"
                      className="w-full px-3 py-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-1">
                      Unit
                    </label>
                    <input
                      type="text"
                      value={customMetricUnit}
                      onChange={(e) => setCustomMetricUnit(e.target.value)}
                      placeholder="e.g. mg/dL, hrs, °F, L"
                      className="w-full px-3 py-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden font-mono"
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* Standard Metric Inputs */
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
                {(selectedMetric === 'all' || selectedMetric === 'heart_rate') && (
                  <div className={selectedMetric === 'heart_rate' ? 'col-span-2 sm:col-span-3 md:col-span-2' : ''}>
                    <label className="block text-[10px] font-bold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <Heart className="w-3 h-3 text-rose-500" /> Heart Rate (bpm)
                    </label>
                    <input
                      type="number"
                      value={heartRate}
                      onChange={(e) => setHeartRate(e.target.value)}
                      className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm font-mono text-stone-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>
                )}

                {(selectedMetric === 'all' || selectedMetric === 'glucose') && (
                  <div className={selectedMetric === 'glucose' ? 'col-span-2 sm:col-span-3 md:col-span-2' : ''}>
                    <label className="block text-[10px] font-bold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <Droplet className="w-3 h-3 text-amber-500" /> Glucose (mg/dL)
                    </label>
                    <input
                      type="number"
                      value={glucose}
                      onChange={(e) => setGlucose(e.target.value)}
                      className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm font-mono text-stone-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>
                )}

                {(selectedMetric === 'all' || selectedMetric === 'weight') && (
                  <div className={selectedMetric === 'weight' ? 'col-span-2 sm:col-span-3 md:col-span-2' : ''}>
                    <label className="block text-[10px] font-bold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-1 flex items-center gap-1">
                      <Scale className="w-3 h-3 text-blue-500" /> Weight (kg)
                    </label>
                    <input
                      type="number"
                      value={weight}
                      onChange={(e) => setWeight(e.target.value)}
                      className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm font-mono text-stone-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>
                )}

                {(selectedMetric === 'all' || selectedMetric === 'bp') && (
                  <>
                    <div>
                      <label className="block text-[10px] font-bold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-1">
                        Systolic BP
                      </label>
                      <input
                        type="number"
                        value={systolic}
                        onChange={(e) => setSystolic(e.target.value)}
                        className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm font-mono text-stone-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-1">
                        Diastolic BP
                      </label>
                      <input
                        type="number"
                        value={diastolic}
                        onChange={(e) => setDiastolic(e.target.value)}
                        className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm font-mono text-stone-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                      />
                    </div>
                  </>
                )}

                {(selectedMetric === 'all' || selectedMetric === 'spo2') && (
                  <div className={selectedMetric === 'spo2' ? 'col-span-2 sm:col-span-3 md:col-span-2' : ''}>
                    <label className="block text-[10px] font-bold text-stone-600 dark:text-stone-400 uppercase tracking-wider mb-1">
                      SpO2 (%)
                    </label>
                    <input
                      type="number"
                      value={spo2}
                      onChange={(e) => setSpo2(e.target.value)}
                      className="w-full px-3 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-sm font-mono text-stone-900 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
                    />
                  </div>
                )}
              </div>
            )}

            <div>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Optional notes or context..."
                className="w-full px-4 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-xs text-stone-900 dark:text-white placeholder-stone-400 dark:placeholder-stone-500 focus:ring-2 focus:ring-emerald-500 focus:outline-hidden"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 text-stone-700 dark:text-stone-300 rounded-xl text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-2xs flex items-center gap-1.5 transition-colors"
              >
                <Lock className="w-3.5 h-3.5 text-emerald-200" />
                <span>
                  {isSubmitting
                    ? 'Encrypting & Storing...'
                    : recordMode === 'import'
                    ? 'Store Imported Entry'
                    : 'Store Entry'}
                </span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Personalized Metric Grouped Boxes */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Personalized Metric Boxes (Multiple Records Grouped)</span>
          </h3>
          <span className="text-xs text-stone-500 dark:text-stone-400 font-medium">All logged records grouped together</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* ⚖️ Weight Personal Box */}
          <div className="bg-white dark:bg-stone-900 p-5 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 rounded-xl">
                  <Scale className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-stone-900 dark:text-stone-100 text-sm">Body Weight Records</h4>
                  <p className="text-[10px] text-stone-400 font-semibold">{weightEntries.length} total entries</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsAdding(false);
                  setDateError(null);
                  setInlineActiveMetric(inlineActiveMetric === 'weight' ? null : 'weight');
                }}
                className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-bold flex items-center gap-1 cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>{inlineActiveMetric === 'weight' ? 'Close' : 'Add Record'}</span>
              </button>
            </div>

            {inlineActiveMetric === 'weight' && renderInlineEntryForm('weight')}

            {weightEntries.length === 0 ? (
              <p className="text-xs text-stone-400 italic py-2">No weight records logged yet.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {weightEntries.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 bg-stone-50 dark:bg-stone-800/60 rounded-2xl border border-stone-100 dark:border-stone-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-mono font-extrabold text-stone-900 dark:text-stone-100 text-sm">
                        {item.data?.weightKg} <span className="text-[10px] text-stone-500 dark:text-stone-400 font-normal">kg</span>
                      </span>
                      <div className="text-[10px] text-stone-400 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-stone-400" />
                        <span>{formatDate(item.timestamp)}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteVital(item.id)}
                      className="text-stone-300 dark:text-stone-600 hover:text-red-500 p-1 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 🫀 Blood Pressure Personal Box */}
          <div className="bg-white dark:bg-stone-900 p-5 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-xl">
                  <Activity className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-stone-900 dark:text-stone-100 text-sm">Blood Pressure Records</h4>
                  <p className="text-[10px] text-stone-400 font-semibold">{bpEntries.length} total entries</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsAdding(false);
                  setDateError(null);
                  setInlineActiveMetric(inlineActiveMetric === 'bp' ? null : 'bp');
                }}
                className="text-xs text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 font-bold flex items-center gap-1 cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>{inlineActiveMetric === 'bp' ? 'Close' : 'Add Record'}</span>
              </button>
            </div>

            {inlineActiveMetric === 'bp' && renderInlineEntryForm('bp')}

            {bpEntries.length === 0 ? (
              <p className="text-xs text-stone-400 italic py-2">No blood pressure records logged yet.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {bpEntries.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 bg-stone-50 dark:bg-stone-800/60 rounded-2xl border border-stone-100 dark:border-stone-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-mono font-extrabold text-stone-900 dark:text-stone-100 text-sm">
                        {item.data?.systolicBP}/{item.data?.diastolicBP}{' '}
                        <span className="text-[10px] text-stone-500 dark:text-stone-400 font-normal">mmHg</span>
                      </span>
                      <div className="text-[10px] text-stone-400 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-stone-400" />
                        <span>{formatDate(item.timestamp)}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteVital(item.id)}
                      className="text-stone-300 dark:text-stone-600 hover:text-red-500 p-1 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ❤️ Heart Rate Personal Box */}
          <div className="bg-white dark:bg-stone-900 p-5 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 rounded-xl">
                  <Heart className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-stone-900 dark:text-stone-100 text-sm">Heart Rate Records</h4>
                  <p className="text-[10px] text-stone-400 font-semibold">{hrEntries.length} total entries</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsAdding(false);
                  setDateError(null);
                  setInlineActiveMetric(inlineActiveMetric === 'heart_rate' ? null : 'heart_rate');
                }}
                className="text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 font-bold flex items-center gap-1 cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>{inlineActiveMetric === 'heart_rate' ? 'Close' : 'Add Record'}</span>
              </button>
            </div>

            {inlineActiveMetric === 'heart_rate' && renderInlineEntryForm('heart_rate')}

            {hrEntries.length === 0 ? (
              <p className="text-xs text-stone-400 italic py-2">No heart rate records logged yet.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {hrEntries.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 bg-stone-50 dark:bg-stone-800/60 rounded-2xl border border-stone-100 dark:border-stone-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-mono font-extrabold text-stone-900 dark:text-stone-100 text-sm">
                        {item.data?.heartRate}{' '}
                        <span className="text-[10px] text-stone-500 dark:text-stone-400 font-normal">bpm</span>
                      </span>
                      <div className="text-[10px] text-stone-400 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-stone-400" />
                        <span>{formatDate(item.timestamp)}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteVital(item.id)}
                      className="text-stone-300 dark:text-stone-600 hover:text-red-500 p-1 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 🩸 Blood Glucose Personal Box */}
          <div className="bg-white dark:bg-stone-900 p-5 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 rounded-xl">
                  <Droplet className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-stone-900 dark:text-stone-100 text-sm">Blood Glucose Records</h4>
                  <p className="text-[10px] text-stone-400 font-semibold">{glucoseEntries.length} total entries</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsAdding(false);
                  setDateError(null);
                  setInlineActiveMetric(inlineActiveMetric === 'glucose' ? null : 'glucose');
                }}
                className="text-xs text-amber-600 dark:text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 font-bold flex items-center gap-1 cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>{inlineActiveMetric === 'glucose' ? 'Close' : 'Add Record'}</span>
              </button>
            </div>

            {inlineActiveMetric === 'glucose' && renderInlineEntryForm('glucose')}

            {glucoseEntries.length === 0 ? (
              <p className="text-xs text-stone-400 italic py-2">No blood glucose records logged yet.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {glucoseEntries.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 bg-stone-50 dark:bg-stone-800/60 rounded-2xl border border-stone-100 dark:border-stone-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-mono font-extrabold text-stone-900 dark:text-stone-100 text-sm">
                        {item.data?.bloodGlucose}{' '}
                        <span className="text-[10px] text-stone-500 dark:text-stone-400 font-normal">mg/dL</span>
                      </span>
                      <div className="text-[10px] text-stone-400 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-stone-400" />
                        <span>{formatDate(item.timestamp)}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteVital(item.id)}
                      className="text-stone-300 dark:text-stone-600 hover:text-red-500 p-1 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 🫁 Blood Oxygen / SpO2 Personal Box */}
          <div className="bg-white dark:bg-stone-900 p-5 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 rounded-xl">
                  <Wind className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-stone-900 dark:text-stone-100 text-sm">Blood Oxygen (SpO2) Records</h4>
                  <p className="text-[10px] text-stone-400 font-semibold">{spo2Entries.length} total entries</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsAdding(false);
                  setDateError(null);
                  setInlineActiveMetric(inlineActiveMetric === 'spo2' ? null : 'spo2');
                }}
                className="text-xs text-teal-600 dark:text-teal-400 hover:text-teal-700 dark:hover:text-teal-300 font-bold flex items-center gap-1 cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>{inlineActiveMetric === 'spo2' ? 'Close' : 'Add Record'}</span>
              </button>
            </div>

            {inlineActiveMetric === 'spo2' && renderInlineEntryForm('spo2')}

            {spo2Entries.length === 0 ? (
              <p className="text-xs text-stone-400 italic py-2">No oxygen saturation records logged yet.</p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {spo2Entries.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 bg-stone-50 dark:bg-stone-800/60 rounded-2xl border border-stone-100 dark:border-stone-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-mono font-extrabold text-stone-900 dark:text-stone-100 text-sm">
                        {item.data?.oxygenSaturation}{' '}
                        <span className="text-[10px] text-stone-500 dark:text-stone-400 font-normal">%</span>
                      </span>
                      <div className="text-[10px] text-stone-400 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-stone-400" />
                        <span>{formatDate(item.timestamp)}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteVital(item.id)}
                      className="text-stone-300 dark:text-stone-600 hover:text-red-500 p-1 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ✨ Custom / Other Metrics Personal Box */}
          <div className="bg-white dark:bg-stone-900 p-5 rounded-3xl border border-stone-200 dark:border-stone-800 shadow-2xs space-y-3">
            <div className="flex items-center justify-between border-b border-stone-100 dark:border-stone-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 rounded-xl">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-stone-900 dark:text-stone-100 text-sm">Custom / Other Metrics</h4>
                  <p className="text-[10px] text-stone-400 font-semibold">{customEntries.length} custom entries</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setIsAdding(false);
                  setDateError(null);
                  setInlineActiveMetric(inlineActiveMetric === 'other' ? null : 'other');
                }}
                className="text-xs text-purple-600 dark:text-purple-400 hover:text-purple-700 dark:hover:text-purple-300 font-bold flex items-center gap-1 cursor-pointer"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>{inlineActiveMetric === 'other' ? 'Close' : 'Add Custom'}</span>
              </button>
            </div>

            {inlineActiveMetric === 'other' && renderInlineEntryForm('other')}

            {customEntries.length === 0 ? (
              <p className="text-xs text-stone-400 italic py-2">
                No custom metrics logged yet. Select "Other Custom Metric" in dropdown to add custom parameters.
              </p>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {customEntries.map((item) => (
                  <div
                    key={item.id}
                    className="p-2.5 bg-stone-50 dark:bg-stone-800/60 rounded-2xl border border-stone-100 dark:border-stone-800 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-purple-950 dark:text-purple-300 text-xs">
                        {item.data?.customMetricName}
                      </div>
                      <span className="font-mono font-extrabold text-stone-900 text-sm">
                        {item.data?.customMetricValue}{' '}
                        <span className="text-[10px] text-stone-500 font-normal">{item.data?.customMetricUnit}</span>
                      </span>
                      <div className="text-[10px] text-stone-400 flex items-center gap-1 mt-0.5">
                        <Clock className="w-3 h-3 text-stone-400" />
                        <span>{formatDate(item.timestamp)}</span>
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteVital(item.id)}
                      className="text-stone-300 hover:text-red-500 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Complete Vitals History Table */}
      <div className="bg-white rounded-3xl border border-stone-200 overflow-hidden shadow-2xs">
        <div className="px-6 py-4 border-b border-stone-100 flex justify-between items-center">
          <h3 className="font-bold text-stone-800 text-sm">Complete Vitals History Audit Log</h3>
          <span className="text-xs text-stone-400 font-semibold">{items.length} records stored</span>
        </div>

        {items.length === 0 ? (
          <div className="p-8 text-center text-stone-400 text-sm">
            No vitals recorded yet. Use the dropdown above to select a metric and record your first entry.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-stone-50 text-stone-400 font-bold uppercase text-[10px] tracking-widest border-b border-stone-100">
                <tr>
                  <th className="px-6 py-3">Timestamp / Date</th>
                  <th className="px-6 py-3">Blood Pressure</th>
                  <th className="px-6 py-3">Heart Rate</th>
                  <th className="px-6 py-3">Glucose</th>
                  <th className="px-6 py-3">Weight</th>
                  <th className="px-6 py-3">Custom / Other</th>
                  <th className="px-6 py-3">Status</th>
                  <th className="px-6 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {items.map((item) => (
                  <tr key={item.id} className="hover:bg-stone-50/60">
                    <td className="px-6 py-3.5 font-medium text-stone-800 text-xs">
                      {formatDate(item.timestamp)}
                    </td>
                    <td className="px-6 py-3.5 font-mono text-xs text-stone-900">
                      {item.data?.systolicBP ? `${item.data.systolicBP}/${item.data.diastolicBP}` : '--'}
                    </td>
                    <td className="px-6 py-3.5 font-mono text-xs text-stone-900">
                      {item.data?.heartRate ? `${item.data.heartRate} bpm` : '--'}
                    </td>
                    <td className="px-6 py-3.5 font-mono text-xs text-stone-900">
                      {item.data?.bloodGlucose ? `${item.data.bloodGlucose} mg/dL` : '--'}
                    </td>
                    <td className="px-6 py-3.5 font-mono text-xs text-stone-900">
                      {item.data?.weightKg ? `${item.data.weightKg} kg` : '--'}
                    </td>
                    <td className="px-6 py-3.5 font-mono text-xs text-purple-900 font-semibold">
                      {item.data?.customMetricName
                        ? `${item.data.customMetricName}: ${item.data.customMetricValue} ${item.data.customMetricUnit || ''}`
                        : '--'}
                    </td>
                    <td className="px-6 py-3.5">
                      <span className="inline-flex items-center gap-1 text-emerald-700 text-xs font-semibold">
                        <Lock className="w-3 h-3 text-emerald-600" />
                        Encrypted
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right">
                      <button
                        onClick={() => handleDeleteVital(item.id)}
                        className="text-stone-400 hover:text-red-600 p-1 rounded-lg"
                        title="Delete Entry"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};


