import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle2, Lock, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { db } from '../../lib/db';
import { encryptData } from '../../lib/crypto';
import { getOrEnsureCryptoKey } from '../../lib/key-management';
import { performLocalOCR } from '../../lib/ocr';
import { extractHealthData } from '../../lib/health-extractor';
import { validateMedicalDocument } from '../../lib/medical-document-validator';
import type { HealthReport } from '../../types/health';

interface DashboardQuickUploadProps {
  encryptionKey: CryptoKey | null;
  userId: string;
  onReportAdded: () => void;
  isUnlocked: boolean;
  onUnlockRequest?: () => void;
}

export const DashboardQuickUpload: React.FC<DashboardQuickUploadProps> = ({
  encryptionKey,
  userId,
  onReportAdded,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    const validTypes = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
      setError('Unsupported file type. Please upload a PDF or image (PNG, JPG, WebP).');
      return;
    }

    setIsUploading(true);
    setError(null);
    setUploadStatus(`Extracting text locally from "${file.name}"...`);

    try {
      const activeKey = await getOrEnsureCryptoKey(encryptionKey);

      // 1. Perform 100% Local Browser OCR (Images & PDFs)
      const ocrResult = await performLocalOCR(
        file,
        'eng',
        (status) => setUploadStatus(status)
      );

      const ocrText = ocrResult.text;

      // Diagnostic Logging: Expose exact raw Tesseract OCR output before extraction
      if (ocrResult.pageResults && ocrResult.pageResults.length > 0) {
        ocrResult.pageResults.forEach((p) => {
          console.log(`===== OCR PAGE ${p.pageNum} =====\n${p.text}`);
        });
      }
      console.log(`===== VITAL DIARIES RAW OCR START =====\n${ocrText}\n===== VITAL DIARIES RAW OCR END =====`);

      // 2. Perform 100% Local Deterministic Medical Document Validation Gate
      setUploadStatus('Validating medical laboratory document locally...');
      const validation = validateMedicalDocument(ocrText, {
        fileName: file.name,
        source: ocrResult.source,
      });

      if (!validation.isSupportedLabReport) {
        setError(validation.userMessage);
        setUploadStatus(null);
        setIsUploading(false);
        // CRITICAL PRIVACY & DATA INTEGRITY GATE:
        // Halt immediately — zero encryption, zero IndexedDB write, zero event generation.
        return;
      }

      // 3. Perform 100% Local Health Data Extraction
      setUploadStatus('Parsing health metrics locally...');
      console.error("VITAL_DIARIES_CALLER", "DashboardQuickUpload", {
        inputOcrLength: ocrText?.length ?? 0,
        fileName: file.name
      });
      const extractedData = extractHealthData(ocrText, { source: ocrResult.source });

      // 4. Read file as Data URL / Base64 locally for exact original file byte storage
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read file from disk'));
        reader.readAsDataURL(file);
      });

      const base64Data = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;

      // Determine best available date: 1) Report date in OCR, 2) file.lastModified, 3) Today
      let bestDate = new Date().toISOString().split('T')[0];
      if (extractedData.extractedDate) {
        bestDate = extractedData.extractedDate;
      } else if (file.lastModified) {
        const modDate = new Date(file.lastModified);
        if (!isNaN(modDate.getTime())) {
          bestDate = modDate.toISOString().split('T')[0];
        }
      }

      const parsedTitle = extractedData.title || file.name.replace(/\.[^/.]+$/, '');
      const parsedType: HealthReport['type'] = extractedData.reportType || 'general';
      const doctorName = 'Self Upload';
      const extractedResults: Record<string, string> = extractedData.results || {};
      const extractedNotes = extractedData.summary || `Uploaded file: ${file.name}`;

      // 4. Build complete encrypted report payload with exact original file bytes & timestamps
      const rawPayload = JSON.stringify({
        reportType: parsedTitle,
        notes: extractedNotes,
        results: extractedResults,
        metrics: extractedData.metrics,
        fileName: file.name,
        fileType: file.type || 'application/octet-stream',
        fileSize: file.size,
        fileLastModified: file.lastModified ? new Date(file.lastModified).toISOString() : undefined,
        uploadedAt: new Date().toISOString(),
        reportDate: bestDate,
        fileBase64: base64Data,
      });

      // 5. AES-256-GCM Encrypt locally before IndexedDB write (Zero external transmission)
      setUploadStatus('Encrypting original file locally with AES-256-GCM...');
      const { cipherText, iv } = await encryptData(rawPayload, activeKey);

      const activeUserId = userId || `usr_${Date.now().toString(36)}`;

      const newReport: HealthReport = {
        id: `rep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        userId: activeUserId,
        date: bestDate,
        type: parsedType,
        title: parsedTitle,
        doctorName,
        encryptedData: cipherText,
        iv,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // 6. Save to IndexedDB
      await db.reports.put(newReport);

      setUploadStatus(`Successfully encrypted and saved "${file.name}" to local health vault!`);
      onReportAdded();

      setTimeout(() => {
        setUploadStatus(null);
      }, 4000);
    } catch (err: any) {
      console.error('Local upload processing error:', err);
      setError(err.message || 'Failed to process and encrypt file locally.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div className="bg-white dark:bg-stone-900 p-4 sm:p-6 rounded-2xl sm:rounded-[2rem] border border-stone-200 dark:border-stone-800 shadow-2xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-4">
        <div>
          <h3 className="text-base font-bold text-stone-900 dark:text-stone-100 flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            <span>Upload Health Record File</span>
          </h3>
          <p className="text-xs text-stone-500 dark:text-stone-400">
            Drag & drop or select PDF, PNG, JPG medical reports to encrypt and store locally
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300 rounded-full text-xs font-semibold self-start sm:self-auto border border-stone-200/60 dark:border-stone-700/60">
          <Lock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>AES-256 Encrypted</span>
        </div>
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`p-5 sm:p-8 rounded-2xl border-2 border-dashed transition-all cursor-pointer text-center flex flex-col items-center justify-center gap-3 ${
          isDragging
            ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/40 scale-[1.01]'
            : 'border-stone-200 dark:border-stone-800 bg-stone-50/60 dark:bg-stone-800/40 hover:bg-emerald-50/30 dark:hover:bg-emerald-950/20 hover:border-emerald-300 dark:hover:border-emerald-700'
        }`}
      >
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".pdf,image/png,image/jpeg,image/jpg,image/webp"
          className="hidden"
        />

        {isUploading ? (
          <div className="flex flex-col items-center gap-2 text-emerald-700 dark:text-emerald-300 py-2">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600 dark:text-emerald-400" />
            <span className="text-xs font-bold">{uploadStatus}</span>
          </div>
        ) : (
          <>
            <div className="w-12 h-12 bg-emerald-100/80 dark:bg-emerald-950/60 rounded-2xl flex items-center justify-center text-emerald-700 dark:text-emerald-400 shadow-2xs">
              <UploadCloud className="w-6 h-6" />
            </div>

            <div>
              <p className="text-sm font-bold text-stone-900 dark:text-stone-100">
                Click to browse or drop medical files here
              </p>
              <p className="text-xs text-stone-400 mt-0.5">
                Supports PDF, PNG, JPG, WebP (up to 25MB)
              </p>
            </div>

            <button
              type="button"
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-2xs transition-colors pointer-events-none mt-1"
            >
              Select File from Device
            </button>
          </>
        )}
      </div>

      {uploadStatus && !isUploading && (
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200 rounded-xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
          <span>{uploadStatus}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/60 text-red-800 dark:text-red-200 rounded-xl text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
