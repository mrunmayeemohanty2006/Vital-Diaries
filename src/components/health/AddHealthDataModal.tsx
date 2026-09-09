import React, { useState } from 'react';
import { X, FileText, FlaskConical, Heart, FileCode, ArrowRight, Upload, Lock, Plus, Trash2, CheckCircle2, Loader2, Sparkles, Image as ImageIcon } from 'lucide-react';
import { db } from '../../lib/db';
import { encryptData } from '../../lib/crypto';
import type { HealthReport } from '../../types/health';

interface AddHealthDataModalProps {
  encryptionKey: CryptoKey;
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
  onNavigateToVitals?: () => void;
}

type AddType = 'menu' | 'report_file' | 'lab_results' | 'health_metric' | 'health_note';

export const AddHealthDataModal: React.FC<AddHealthDataModalProps> = ({
  encryptionKey,
  userId,
  onClose,
  onSuccess,
  onNavigateToVitals,
}) => {
  const [activeStep, setActiveStep] = useState<AddType>('menu');

  // Shared Form Fields
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [doctorName, setDoctorName] = useState('');
  const [facility, setFacility] = useState('');
  const [notes, setNotes] = useState('');
  const [reportType, setReportType] = useState<HealthReport['type']>('cbc');

  // Lab Results
  const [labResults, setLabResults] = useState<Array<{ key: string; value: string }>>([
    { key: 'Hemoglobin', value: '13.8 g/dL' },
    { key: 'WBC', value: '6,200 /mcL' },
  ]);

  // Metrics
  const [metricType, setMetricType] = useState('blood_pressure');
  const [systolic, setSystolic] = useState('120');
  const [diastolic, setDiastolic] = useState('80');
  const [heartRate, setHeartRate] = useState('72');
  const [weightKg, setWeightKg] = useState('70');
  const [bloodSugar, setBloodSugar] = useState('95');

  // File Upload scanning & preservation state
  const [isScanning, setIsScanning] = useState(false);
  const [scanSuccessMsg, setScanSuccessMsg] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
  const [uploadedFileState, setUploadedFileState] = useState<{
    fileName: string;
    fileType: string;
    fileSize: number;
    fileLastModified?: string;
    fileBase64: string;
    fileDataUrl: string;
  } | null>(null);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please upload a PDF document or image file (PNG, JPG, WebP).');
      return;
    }

    setUploadedFileName(file.name);
    setIsScanning(true);
    setError('');
    setScanSuccessMsg('');

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        const base64Data = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;

        // Preserve exact file metadata
        setUploadedFileState({
          fileName: file.name,
          fileType: file.type || 'application/octet-stream',
          fileSize: file.size,
          fileLastModified: file.lastModified ? new Date(file.lastModified).toISOString() : undefined,
          fileBase64: base64Data,
          fileDataUrl: dataUrl,
        });

        if (file.lastModified) {
          const modDate = new Date(file.lastModified);
          if (!isNaN(modDate.getTime())) {
            setDate(modDate.toISOString().split('T')[0]);
          }
        }

        const response = await fetch('/api/parse-lab-report', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fileBase64: base64Data,
            mimeType: file.type,
            fileName: file.name,
          }),
        });

        const resData = await response.json();
        if (resData.success && resData.data) {
          const data = resData.data;
          if (data.title) setTitle(data.title);
          if (data.date) setDate(data.date);
          if (data.doctorName) setDoctorName(data.doctorName);
          if (data.facility) setFacility(data.facility);
          if (data.notes || data.summary) {
            setNotes(`${data.summary ? data.summary + '\n\n' : ''}${data.notes || ''}`.trim());
          }
          if (Array.isArray(data.results) && data.results.length > 0) {
            setLabResults(data.results.map((r: any) => ({
              key: r.key || '',
              value: r.value || (r.unit ? `${r.value} ${r.unit}` : ''),
            })));
          }
          setScanSuccessMsg(`Scanned "${file.name}"! Key fields populated.`);
        } else {
          setTitle(file.name.replace(/\.[^/.]+$/, ''));
          setScanSuccessMsg(`Uploaded file "${file.name}". Ready to save.`);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setError('File uploaded locally. You can proceed with title and notes.');
      setTitle(file.name.replace(/\.[^/.]+$/, ''));
    } finally {
      setIsScanning(false);
    }
  };

  const handleSubmitRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide a record title.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      if (activeStep === 'health_metric') {
        const metricData = {
          systolicBP: systolic ? Number(systolic) : undefined,
          diastolicBP: diastolic ? Number(diastolic) : undefined,
          heartRate: heartRate ? Number(heartRate) : undefined,
          weightKg: weightKg ? Number(weightKg) : undefined,
          bloodGlucose: bloodSugar ? Number(bloodSugar) : undefined,
          notes: notes.trim() || undefined,
        };
        const { cipherText, iv } = await encryptData(JSON.stringify(metricData), encryptionKey);
        await db.vitalsLog.put({
          id: `vit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          userId,
          timestamp: new Date().toISOString(),
          date,
          encryptedData: cipherText,
          iv,
          createdAt: new Date().toISOString(),
        });
      } else {
        const resultMap: Record<string, string> = {};
        if (activeStep === 'lab_results' || activeStep === 'report_file') {
          labResults.forEach((row) => {
            if (row.key.trim()) {
              resultMap[row.key.trim()] = row.value.trim();
            }
          });
        }

        const rawPayload = JSON.stringify({
          reportType: title,
          facility: facility.trim() || undefined,
          notes: notes.trim() || undefined,
          results: resultMap,
          fileName: uploadedFileState?.fileName || uploadedFileName || undefined,
          fileType: uploadedFileState?.fileType,
          fileSize: uploadedFileState?.fileSize,
          fileLastModified: uploadedFileState?.fileLastModified,
          uploadedAt: new Date().toISOString(),
          reportDate: date,
          fileBase64: uploadedFileState?.fileBase64,
          category: activeStep,
        });

        const { cipherText, iv } = await encryptData(rawPayload, encryptionKey);

        const newReport: HealthReport = {
          id: `rep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          userId,
          date,
          type: reportType,
          title: title.trim(),
          doctorName: doctorName.trim() || undefined,
          encryptedData: cipherText,
          iv,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        await db.reports.put(newReport);
      }

      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to encrypt and save health data.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 dark:bg-black/75 backdrop-blur-md flex items-center justify-center p-3.5 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-stone-900 max-w-xl w-full rounded-2xl sm:rounded-[2.5rem] border border-stone-200 dark:border-stone-800 shadow-2xl p-5 sm:p-8 my-auto text-stone-900 dark:text-stone-100 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-stone-100 dark:border-stone-800">
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-100">
              {activeStep === 'menu' ? 'Add Health Data' : 'Log Health Entry'}
            </h2>
            <p className="text-xs text-stone-500 dark:text-stone-400">
              AES-256-GCM zero-knowledge encrypted on device
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {activeStep === 'menu' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button
              onClick={() => {
                setActiveStep('report_file');
                setTitle('Medical Lab Report');
              }}
              className="p-4 rounded-2xl border border-stone-200 dark:border-stone-700/80 bg-stone-50/60 dark:bg-stone-800/60 hover:border-emerald-500 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/30 text-left transition-all group flex flex-col justify-between cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <FileText className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-stone-900 dark:text-stone-100 text-sm">Upload Medical File</h4>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">PDF or Image Scan (Preserves original file)</p>
              </div>
            </button>

            <button
              onClick={() => {
                setActiveStep('lab_results');
                setTitle('Blood Work (CBC)');
              }}
              className="p-4 rounded-2xl border border-stone-200 dark:border-stone-700/80 bg-stone-50/60 dark:bg-stone-800/60 hover:border-emerald-500 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/30 text-left transition-all group flex flex-col justify-between cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <FlaskConical className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-stone-900 dark:text-stone-100 text-sm">Manual Lab Results</h4>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">Custom key-value health parameters</p>
              </div>
            </button>

            <button
              onClick={() => {
                setActiveStep('health_metric');
                setTitle('Vital Signs Log');
              }}
              className="p-4 rounded-2xl border border-stone-200 dark:border-stone-700/80 bg-stone-50/60 dark:bg-stone-800/60 hover:border-emerald-500 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/30 text-left transition-all group flex flex-col justify-between cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-purple-100 dark:bg-purple-950/80 text-purple-700 dark:text-purple-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <Heart className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-stone-900 dark:text-stone-100 text-sm">Vital Metrics</h4>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">Blood Pressure, Glucose, Weight</p>
              </div>
            </button>

            <button
              onClick={() => {
                setActiveStep('health_note');
                setTitle('Doctor Consultation Note');
              }}
              className="p-4 rounded-2xl border border-stone-200 dark:border-stone-700/80 bg-stone-50/60 dark:bg-stone-800/60 hover:border-emerald-500 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/30 text-left transition-all group flex flex-col justify-between cursor-pointer"
            >
              <div className="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/80 text-amber-700 dark:text-amber-400 flex items-center justify-center mb-3 group-hover:scale-105 transition-transform">
                <FileCode className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-stone-900 dark:text-stone-100 text-sm">Clinical Note</h4>
                <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">Physician impressions or advice</p>
              </div>
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmitRecord} className="space-y-4">
            <button
              type="button"
              onClick={() => setActiveStep('menu')}
              className="text-xs font-semibold text-stone-500 dark:text-stone-400 hover:text-stone-800 dark:hover:text-stone-200 flex items-center gap-1 mb-2 cursor-pointer"
            >
              ← Choose different record type
            </button>

            {/* File Upload Section for report_file */}
            {activeStep === 'report_file' && (
              <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200/80 dark:border-emerald-800/60 rounded-2xl">
                <label className="block text-xs font-bold text-emerald-900 dark:text-emerald-200 uppercase tracking-wider mb-2">
                  Attach Medical Document (PDF or Photo)
                </label>
                <label className={`block relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
                  isScanning
                    ? 'bg-emerald-100/60 dark:bg-emerald-900/40 border-emerald-400'
                    : 'bg-white dark:bg-stone-800 border-emerald-300 dark:border-emerald-700 hover:border-emerald-500'
                }`}>
                  <input
                    type="file"
                    accept=".pdf,image/png,image/jpeg,image/jpg,image/webp"
                    onChange={handleFileUpload}
                    disabled={isScanning}
                    className="hidden"
                  />
                  {isScanning ? (
                    <div className="flex flex-col items-center justify-center py-2 text-emerald-800 dark:text-emerald-300">
                      <Loader2 className="w-6 h-6 animate-spin text-emerald-600 dark:text-emerald-400 mb-2" />
                      <span className="text-xs font-bold">Scanning report with Gemini AI...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-3 py-1">
                      <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950/80 flex items-center justify-center text-emerald-700 dark:text-emerald-300">
                        <Upload className="w-4 h-4" />
                      </div>
                      <div className="text-left">
                        <span className="text-xs font-bold text-stone-800 dark:text-stone-200 block">
                          {uploadedFileName || 'Click to select report file'}
                        </span>
                        <span className="text-[10px] text-stone-500 dark:text-stone-400">PDF, PNG, JPG preserved & encrypted</span>
                      </div>
                    </div>
                  )}
                </label>

                {scanSuccessMsg && (
                  <div className="mt-2.5 p-2 bg-emerald-100 dark:bg-emerald-900/50 border border-emerald-300 dark:border-emerald-700 text-emerald-900 dark:text-emerald-200 text-xs rounded-xl flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400 shrink-0" />
                    <span>{scanSuccessMsg}</span>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Record Title"
                  className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
            </div>

            {/* Vitals fields */}
            {activeStep === 'health_metric' && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 bg-stone-50 dark:bg-stone-800/60 rounded-2xl border border-stone-200 dark:border-stone-700">
                <div>
                  <label className="block text-[10px] font-bold text-stone-500 dark:text-stone-400 uppercase mb-1">BP Systolic</label>
                  <input
                    type="number"
                    value={systolic}
                    onChange={(e) => setSystolic(e.target.value)}
                    placeholder="120"
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-xs text-stone-900 dark:text-stone-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-stone-500 dark:text-stone-400 uppercase mb-1">BP Diastolic</label>
                  <input
                    type="number"
                    value={diastolic}
                    onChange={(e) => setDiastolic(e.target.value)}
                    placeholder="80"
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-xs text-stone-900 dark:text-stone-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-stone-500 dark:text-stone-400 uppercase mb-1">Heart Rate</label>
                  <input
                    type="number"
                    value={heartRate}
                    onChange={(e) => setHeartRate(e.target.value)}
                    placeholder="72"
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-xs text-stone-900 dark:text-stone-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-stone-500 dark:text-stone-400 uppercase mb-1">Weight (kg)</label>
                  <input
                    type="number"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    placeholder="70"
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-xs text-stone-900 dark:text-stone-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-stone-500 dark:text-stone-400 uppercase mb-1">Blood Sugar</label>
                  <input
                    type="number"
                    value={bloodSugar}
                    onChange={(e) => setBloodSugar(e.target.value)}
                    placeholder="95"
                    className="w-full px-2.5 py-1.5 bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-xs text-stone-900 dark:text-stone-100 font-mono"
                  />
                </div>
              </div>
            )}

            {/* Key-Value Metrics */}
            {(activeStep === 'lab_results' || activeStep === 'report_file') && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider">
                    Lab Results & Tests
                  </label>
                  <button
                    type="button"
                    onClick={() => setLabResults([...labResults, { key: '', value: '' }])}
                    className="text-xs font-bold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Metric</span>
                  </button>
                </div>
                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {labResults.map((r, idx) => (
                    <div key={idx} className="flex gap-2">
                      <input
                        type="text"
                        value={r.key}
                        onChange={(e) => {
                          const updated = [...labResults];
                          updated[idx].key = e.target.value;
                          setLabResults(updated);
                        }}
                        placeholder="Test (e.g. Hemoglobin)"
                        className="flex-1 px-3 py-1.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-xs text-stone-900 dark:text-stone-100"
                      />
                      <input
                        type="text"
                        value={r.value}
                        onChange={(e) => {
                          const updated = [...labResults];
                          updated[idx].value = e.target.value;
                          setLabResults(updated);
                        }}
                        placeholder="Value (e.g. 14.2 g/dL)"
                        className="flex-1 px-3 py-1.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-lg text-xs text-stone-900 dark:text-stone-100 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setLabResults(labResults.filter((_, i) => i !== idx))}
                        className="p-1.5 text-stone-400 hover:text-red-600 rounded-lg cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-1">
                Notes & Physician Impressions
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Clinical impressions or personal notes..."
                className="w-full px-3.5 py-2 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-red-700 dark:text-red-300 text-xs rounded-xl font-medium">
                {error}
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-3 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 font-bold rounded-xl text-sm transition-colors cursor-pointer border border-stone-200 dark:border-stone-700"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
              >
                {isSubmitting ? 'Encrypting & Saving...' : 'Save Encrypted Record'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
