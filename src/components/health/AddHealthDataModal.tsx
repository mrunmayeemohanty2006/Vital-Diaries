import React, { useState } from 'react';
import { X, FileText, FlaskConical, Heart, FileCode, ArrowRight, Upload, Lock, Plus, Trash2, CheckCircle2, Loader2, Sparkles } from 'lucide-react';
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

  // File Upload scanning state
  const [isScanning, setIsScanning] = useState(false);
  const [scanSuccessMsg, setScanSuccessMsg] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState('');
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
        const base64Data = dataUrl.split(',')[1];

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
      let rawPayload = '';

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

        rawPayload = JSON.stringify({
          reportType: title,
          facility: facility.trim() || undefined,
          notes: notes.trim() || undefined,
          results: resultMap,
          fileName: uploadedFileName || undefined,
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
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white max-w-xl w-full rounded-[2.5rem] border border-stone-200 shadow-2xl p-6 sm:p-8 my-8">
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-stone-100">
          <div>
            <h2 className="text-xl font-bold text-stone-900">Add Health Data</h2>
            <p className="text-xs text-stone-500">Encrypt and save health records locally on this device</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {activeStep === 'menu' ? (
          <div className="space-y-4">
            <p className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">
              What would you like to add?
            </p>

            <button
              onClick={() => {
                setReportType('imaging');
                setActiveStep('report_file');
              }}
              className="w-full p-4 bg-stone-50 hover:bg-emerald-50/60 border border-stone-200 hover:border-emerald-300 rounded-2xl flex items-center justify-between text-left transition-all group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 bg-emerald-100 group-hover:bg-emerald-600 group-hover:text-white rounded-xl flex items-center justify-center transition-colors">
                  <FileText className="w-5 h-5 text-emerald-700 group-hover:text-white transition-colors" />
                </div>
                <div>
                  <span className="font-bold text-stone-900 text-sm block">📄 Upload Medical Report</span>
                  <span className="text-xs text-stone-500">PDF, JPG, PNG, WEBP files encrypted locally</span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-stone-400 group-hover:text-emerald-600 transition-colors" />
            </button>

            <button
              onClick={() => {
                setReportType('cbc');
                setActiveStep('lab_results');
              }}
              className="w-full p-4 bg-stone-50 hover:bg-blue-50/60 border border-stone-200 hover:border-blue-300 rounded-2xl flex items-center justify-between text-left transition-all group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 bg-blue-100 group-hover:bg-blue-600 group-hover:text-white rounded-xl flex items-center justify-center transition-colors">
                  <FlaskConical className="w-5 h-5 text-blue-700 group-hover:text-white transition-colors" />
                </div>
                <div>
                  <span className="font-bold text-stone-900 text-sm block">🧪 Add Lab Results</span>
                  <span className="text-xs text-stone-500">Enter test parameters, reference values, and panel readings</span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-stone-400 group-hover:text-blue-600 transition-colors" />
            </button>

            <button
              onClick={() => {
                setActiveStep('health_metric');
              }}
              className="w-full p-4 bg-stone-50 hover:bg-rose-50/60 border border-stone-200 hover:border-rose-300 rounded-2xl flex items-center justify-between text-left transition-all group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 bg-rose-100 group-hover:bg-rose-600 group-hover:text-white rounded-xl flex items-center justify-center transition-colors">
                  <Heart className="w-5 h-5 text-rose-700 group-hover:text-white transition-colors" />
                </div>
                <div>
                  <span className="font-bold text-stone-900 text-sm block">❤️ Add Health Metric</span>
                  <span className="text-xs text-stone-500">Blood pressure, weight, heart rate, blood sugar</span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-stone-400 group-hover:text-rose-600 transition-colors" />
            </button>

            <button
              onClick={() => {
                setReportType('general');
                setActiveStep('health_note');
              }}
              className="w-full p-4 bg-stone-50 hover:bg-amber-50/60 border border-stone-200 hover:border-amber-300 rounded-2xl flex items-center justify-between text-left transition-all group"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 bg-amber-100 group-hover:bg-amber-600 group-hover:text-white rounded-xl flex items-center justify-center transition-colors">
                  <FileCode className="w-5 h-5 text-amber-700 group-hover:text-white transition-colors" />
                </div>
                <div>
                  <span className="font-bold text-stone-900 text-sm block">📝 Add Health Note</span>
                  <span className="text-xs text-stone-500">Doctor consultations, symptoms, personal diary entry</span>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-stone-400 group-hover:text-amber-600 transition-colors" />
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmitRecord} className="space-y-4">
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setActiveStep('menu')}
                className="text-xs font-bold text-emerald-700 hover:underline"
              >
                ← Back to Options
              </button>
              <span className="text-xs text-stone-400 font-medium capitalize">
                {activeStep.replace('_', ' ')}
              </span>
            </div>

            {/* File Upload Component if report_file */}
            {activeStep === 'report_file' && (
              <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-2">
                <label className="block text-xs font-bold text-emerald-900 uppercase tracking-wider">
                  Select File (PDF, JPG, PNG, WEBP)
                </label>
                <input
                  type="file"
                  accept=".pdf,image/png,image/jpeg,image/jpg,image/webp"
                  onChange={handleFileUpload}
                  className="block w-full text-xs text-stone-600 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-emerald-600 file:text-white hover:file:bg-emerald-700 cursor-pointer"
                />
                {isScanning && (
                  <div className="flex items-center gap-2 text-xs text-emerald-700 font-semibold pt-1">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Parsing report file...</span>
                  </div>
                )}
                {scanSuccessMsg && (
                  <p className="text-xs text-emerald-800 font-medium">{scanSuccessMsg}</p>
                )}
              </div>
            )}

            {/* Title & Date */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Title
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={
                    activeStep === 'health_metric' ? 'Vitals Log' : 'e.g. Annual Blood Panel'
                  }
                  className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                  Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  required
                />
              </div>
            </div>

            {/* Metric Fields */}
            {activeStep === 'health_metric' && (
              <div className="grid grid-cols-2 gap-3 p-4 bg-stone-50 rounded-2xl border border-stone-200">
                <div>
                  <label className="block text-[10px] font-bold text-stone-500 uppercase mb-1">
                    Systolic BP (mmHg)
                  </label>
                  <input
                    type="number"
                    value={systolic}
                    onChange={(e) => setSystolic(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-stone-200 rounded-lg text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-stone-500 uppercase mb-1">
                    Diastolic BP (mmHg)
                  </label>
                  <input
                    type="number"
                    value={diastolic}
                    onChange={(e) => setDiastolic(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-stone-200 rounded-lg text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-stone-500 uppercase mb-1">
                    Heart Rate (BPM)
                  </label>
                  <input
                    type="number"
                    value={heartRate}
                    onChange={(e) => setHeartRate(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-stone-200 rounded-lg text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-stone-500 uppercase mb-1">
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    value={weightKg}
                    onChange={(e) => setWeightKg(e.target.value)}
                    className="w-full px-3 py-1.5 bg-white border border-stone-200 rounded-lg text-xs font-bold"
                  />
                </div>
              </div>
            )}

            {/* Physician & Facility if applicable */}
            {activeStep !== 'health_metric' && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Doctor / Physician
                  </label>
                  <input
                    type="text"
                    value={doctorName}
                    onChange={(e) => setDoctorName(e.target.value)}
                    placeholder="e.g. Dr. Vance"
                    className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                    Facility / Clinic
                  </label>
                  <input
                    type="text"
                    value={facility}
                    onChange={(e) => setFacility(e.target.value)}
                    placeholder="e.g. City Hospital"
                    className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900"
                  />
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
                Clinical Notes / Remarks
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Write personal health observations or doctor instructions..."
                className="w-full px-3.5 py-2 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900"
              />
            </div>

            <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-2 text-xs text-emerald-900">
              <Lock className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>AES-256-GCM local Web Crypto encryption active.</span>
            </div>

            {error && (
              <p className="text-xs text-red-600 font-medium p-2 bg-red-50 rounded-lg border border-red-200">
                {error}
              </p>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setActiveStep('menu')}
                className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold rounded-xl text-xs transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors shadow-2xs disabled:opacity-50"
              >
                {isSubmitting ? 'Encrypting...' : 'Encrypt & Save Record'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
