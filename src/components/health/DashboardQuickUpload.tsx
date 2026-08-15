import React, { useState, useRef } from 'react';
import { UploadCloud, FileText, CheckCircle2, Lock, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { db } from '../../lib/db';
import { encryptData } from '../../lib/crypto';
import { getOrEnsureCryptoKey } from '../../lib/key-management';
import { performLocalOCR } from '../../lib/ocr';
import { extractHealthData } from '../../lib/health-extractor';
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

      // 2. Perform 100% Local Health Data Extraction
      setUploadStatus('Parsing health metrics locally...');
      const extractedData = extractHealthData(ocrText);

      // 3. Read file as Data URL locally for file attachment storage
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read file from disk'));
        reader.readAsDataURL(file);
      });

      const parsedTitle = extractedData.title || file.name.replace(/\.[^/.]+$/, '');
      const parsedType: HealthReport['type'] = extractedData.reportType || 'general';
      const doctorName = 'Self Upload';
      const extractedResults: Record<string, string> = extractedData.results || {};
      const extractedNotes = extractedData.summary || `Uploaded file: ${file.name}`;

      // 4. Build report payload
      const rawPayload = JSON.stringify({
        reportType: parsedTitle,
        notes: extractedNotes,
        results: extractedResults,
        fileName: file.name,
        fileType: file.type,
        fileSize: file.size,
        fileDataUrl: dataUrl,
      });

      // 5. AES-256-GCM Encrypt locally before IndexedDB write
      setUploadStatus('Encrypting report locally with AES-256-GCM...');
      const { cipherText, iv } = await encryptData(rawPayload, activeKey);

      const activeUserId = userId || `usr_${Date.now().toString(36)}`;

      const newReport: HealthReport = {
        id: `rep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        userId: activeUserId,
        date: new Date().toISOString().split('T')[0],
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
    <div className="bg-white p-6 rounded-[2rem] border border-stone-200 shadow-2xs space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-emerald-600" />
            <span>Upload Health Record File</span>
          </h3>
          <p className="text-xs text-stone-500">
            Drag & drop or select PDF, PNG, JPG medical reports to encrypt and store locally
          </p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 bg-stone-100 text-stone-600 rounded-full text-xs font-semibold">
          <Lock className="w-3.5 h-3.5 text-emerald-600" />
          <span>Local Client-Side Encryption</span>
        </div>
      </div>

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`p-6 sm:p-8 rounded-2xl border-2 border-dashed transition-all cursor-pointer text-center flex flex-col items-center justify-center gap-3 ${
          isDragging
            ? 'border-emerald-500 bg-emerald-50/80 scale-[1.01]'
            : 'border-stone-200 bg-stone-50/60 hover:bg-emerald-50/30 hover:border-emerald-300'
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
          <div className="flex flex-col items-center gap-2 text-emerald-700 py-2">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
            <span className="text-xs font-bold">{uploadStatus}</span>
          </div>
        ) : (
          <>
            <div className="w-12 h-12 bg-emerald-100/80 rounded-2xl flex items-center justify-center text-emerald-700 shadow-2xs">
              <UploadCloud className="w-6 h-6" />
            </div>

            <div>
              <p className="text-sm font-bold text-stone-900">
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
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl text-xs font-semibold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{uploadStatus}</span>
        </div>
      )}

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 text-red-800 rounded-xl text-xs font-semibold flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
};
