import React, { useState } from 'react';
import { X, Lock, Plus, Trash2, FilePlus, Sparkles, Upload, FileText, CheckCircle2, Loader2 } from 'lucide-react';
import { db } from '../../lib/db';
import { encryptData } from '../../lib/crypto';
import type { HealthReport } from '../../types/health';

interface AddReportModalProps {
  encryptionKey: CryptoKey;
  userId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export const AddReportModal: React.FC<AddReportModalProps> = ({
  encryptionKey,
  userId,
  onClose,
  onSuccess,
}) => {
  const [title, setTitle] = useState('');
  const [type, setType] = useState<HealthReport['type']>('cbc');
  const [date, setDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [doctorName, setDoctorName] = useState('');
  const [facility, setFacility] = useState('');
  const [notes, setNotes] = useState('');

  // Key-value lab test metrics
  const [results, setResults] = useState<Array<{ key: string; value: string }>>([
    { key: 'Hemoglobin', value: '13.8 g/dL' },
    { key: 'WBC', value: '6,200 /mcL' },
  ]);

  const [tags, setTags] = useState('Blood Work, Routine');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [scanSuccessMsg, setScanSuccessMsg] = useState('');
  const [error, setError] = useState('');

  // File upload for PDF/Image auto-parsing
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const allowedTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Please upload a PDF document or image file (PNG, JPG, WebP).');
      return;
    }

    setIsScanning(true);
    setError('');
    setScanSuccessMsg('');

    try {
      // Read file as Base64
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = reader.result as string;
        const base64Data = dataUrl.split(',')[1];

        // Call backend parsing endpoint
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
        if (!resData.success) {
          throw new Error(resData.error || 'Failed to scan report file');
        }

        const data = resData.data;

        // Populate form fields from extracted JSON
        if (data.title) setTitle(data.title);
        if (data.type && ['cbc', 'imaging', 'cardiology', 'general', 'vaccine', 'genomics', 'other'].includes(data.type)) {
          setType(data.type as HealthReport['type']);
        }
        if (data.date) setDate(data.date);
        if (data.doctorName) setDoctorName(data.doctorName);
        if (data.facility) setFacility(data.facility);
        if (data.notes || data.summary) {
          setNotes(`${data.summary ? data.summary + '\n\n' : ''}${data.notes || ''}`.trim());
        }

        if (Array.isArray(data.results) && data.results.length > 0) {
          const parsedRows = data.results.map((r: any) => ({
            key: r.key || '',
            value: r.value || (r.unit ? `${r.value} ${r.unit}` : ''),
          }));
          setResults(parsedRows);
        }

        setScanSuccessMsg(`Successfully scanned "${file.name}"! Form fields populated with extracted lab metrics.`);
      };

      reader.onerror = () => {
        throw new Error('Failed to read file from disk');
      };

      reader.readAsDataURL(file);
    } catch (err: any) {
      setError(err.message || 'Error parsing document with AI');
    } finally {
      setIsScanning(false);
    }
  };

  const handleAddResultRow = () => {
    setResults([...results, { key: '', value: '' }]);
  };

  const handleRemoveResultRow = (index: number) => {
    setResults(results.filter((_, i) => i !== index));
  };

  const handleResultChange = (index: number, field: 'key' | 'value', val: string) => {
    const updated = [...results];
    updated[index][field] = val;
    setResults(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('Please provide a report title.');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      // 1. Structure raw lab JSON object
      const resultMap: Record<string, string> = {};
      results.forEach((row) => {
        if (row.key.trim()) {
          resultMap[row.key.trim()] = row.value.trim();
        }
      });

      const rawPayload = JSON.stringify({
        reportType: title,
        facility: facility.trim() || undefined,
        notes: notes.trim() || undefined,
        results: resultMap,
        tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
      });

      // 2. Encrypt locally via Web Crypto AES-256-GCM
      const { cipherText, iv } = await encryptData(rawPayload, encryptionKey);

      // 3. Construct IndexedDB record
      const newReport: HealthReport = {
        id: `rep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        userId,
        date,
        type,
        title: title.trim(),
        doctorName: doctorName.trim() || undefined,
        encryptedData: cipherText,
        iv,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      await db.reports.put(newReport);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'Failed to encrypt and save record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white max-w-2xl w-full rounded-[2.5rem] border border-stone-200 shadow-2xl p-6 sm:p-8 my-8">
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-2xl flex items-center justify-center">
              <FilePlus className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-stone-900">Add Encrypted Health Report</h2>
              <p className="text-xs text-stone-500">Will be encrypted locally with AES-256-GCM</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Upload PDF or Image Section */}
        <div className="mb-6 p-4 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-700" />
              <span className="text-xs font-bold text-emerald-900 uppercase tracking-wider">
                Import PDF or Image Lab Record (Gemini Auto-Scan)
              </span>
            </div>
            <span className="text-[10px] font-bold bg-emerald-200/80 text-emerald-800 px-2 py-0.5 rounded-full">
              PDF / PNG / JPG
            </span>
          </div>
          <p className="text-xs text-emerald-800 mb-3 leading-relaxed">
            Upload your medical lab report (PDF or photo scan). Gemini will parse parameters, reference ranges, and doctor notes directly into the form.
          </p>

          <label className={`block relative border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all ${
            isScanning ? 'bg-emerald-100/60 border-emerald-400' : 'bg-white border-emerald-300 hover:border-emerald-500 hover:bg-emerald-50/30'
          }`}>
            <input
              type="file"
              accept=".pdf,image/png,image/jpeg,image/jpg,image/webp"
              onChange={handleFileUpload}
              disabled={isScanning}
              className="hidden"
            />
            {isScanning ? (
              <div className="flex flex-col items-center justify-center py-2 text-emerald-800">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mb-2" />
                <span className="text-xs font-bold">Scanning report with Gemini AI...</span>
                <span className="text-[10px] text-emerald-600">Extracting test parameters and reference ranges</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-3 py-1">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700">
                  <Upload className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <span className="text-xs font-bold text-stone-800 block">Click or drop lab PDF/image file</span>
                  <span className="text-[10px] text-stone-500">Auto-fills title, date, doctor name, and test readings</span>
                </div>
              </div>
            )}
          </label>

          {scanSuccessMsg && (
            <div className="mt-3 p-2.5 bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs rounded-xl flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
              <span>{scanSuccessMsg}</span>
            </div>
          )}
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                Report Title
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Comprehensive Lipid Panel"
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                Category / Type
              </label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as HealthReport['type'])}
                className="w-full px-4 py-2.5 bg-stone-50 dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="cbc" className="bg-white text-stone-900 dark:bg-stone-900 dark:text-stone-100 font-medium">Blood Work (CBC / Panels)</option>
                <option value="imaging" className="bg-white text-stone-900 dark:bg-stone-900 dark:text-stone-100 font-medium">Radiology (MRI / CT / X-Ray)</option>
                <option value="cardiology" className="bg-white text-stone-900 dark:bg-stone-900 dark:text-stone-100 font-medium">Cardiology (ECG / Echo)</option>
                <option value="general" className="bg-white text-stone-900 dark:bg-stone-900 dark:text-stone-100 font-medium">General Checkup / Consult</option>
                <option value="vaccine" className="bg-white text-stone-900 dark:bg-stone-900 dark:text-stone-100 font-medium">Immunization / Vaccine</option>
                <option value="genomics" className="bg-white text-stone-900 dark:bg-stone-900 dark:text-stone-100 font-medium">Genomics / Labs</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                Date
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
                Physician / Doctor
              </label>
              <input
                type="text"
                value={doctorName}
                onChange={(e) => setDoctorName(e.target.value)}
                placeholder="e.g., Dr. Julian Vance"
                className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
              Medical Facility / Lab Name
            </label>
            <input
              type="text"
              value={facility}
              onChange={(e) => setFacility(e.target.value)}
              placeholder="e.g., Quest Diagnostics / City General Hospital"
              className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider">
                Lab Results / Values
              </label>
              <button
                type="button"
                onClick={handleAddResultRow}
                className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Metric</span>
              </button>
            </div>

            <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
              {results.map((row, idx) => (
                <div key={idx} className="flex gap-2 items-center">
                  <input
                    type="text"
                    value={row.key}
                    onChange={(e) => handleResultChange(idx, 'key', e.target.value)}
                    placeholder="Metric (e.g. Total Cholesterol)"
                    className="flex-1 px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900"
                  />
                  <input
                    type="text"
                    value={row.value}
                    onChange={(e) => handleResultChange(idx, 'value', e.target.value)}
                    placeholder="Value (e.g. 185 mg/dL)"
                    className="flex-1 px-3 py-1.5 bg-stone-50 border border-stone-200 rounded-xl text-xs text-stone-900"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveResultRow(idx)}
                    className="p-1.5 text-stone-400 hover:text-red-600 rounded-lg"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1.5">
              Clinical Notes & Impressions
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Add physician notes, lifestyle guidance, or personal diary observations..."
              className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="p-3 bg-emerald-50 border border-emerald-100 rounded-xl flex items-center gap-2 text-xs text-emerald-900 font-medium">
            <Lock className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>This entire JSON payload will be encrypted with AES-256-GCM before saving to IndexedDB.</span>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold rounded-xl text-sm transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-colors shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? 'Encrypting & Saving...' : 'Encrypt & Save Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
