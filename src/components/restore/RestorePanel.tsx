import React, { useState } from 'react';
import { Upload, Key, ShieldCheck, AlertTriangle, CheckCircle2, FileText, ArrowRight } from 'lucide-react';
import { parseAndValidateBackupFile, decryptBackupPackage, applyRestoredHealthData, type DecryptedBackupContent } from '../../lib/restore';
import type { HealthBackupPackage } from '../../types/backup';

interface RestorePanelProps {
  onRestoreSuccess: (newKey: CryptoKey, saltBase64: string) => void;
  onOpenGoogleDriveModal: () => void;
}

export const RestorePanel: React.FC<RestorePanelProps> = ({
  onRestoreSuccess,
  onOpenGoogleDriveModal,
}) => {
  const [step, setStep] = useState<'select' | 'passphrase' | 'confirm'>('select');
  const [selectedFileContent, setSelectedFileContent] = useState<string | null>(null);
  const [backupPackage, setBackupPackage] = useState<HealthBackupPackage | null>(null);
  const [passphrase, setPassphrase] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [decryptedContent, setDecryptedContent] = useState<DecryptedBackupContent | null>(null);
  const [derivedKey, setDerivedKey] = useState<CryptoKey | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      setSelectedFileContent(text);

      const validation = parseAndValidateBackupFile(text);
      if (!validation.isValid || !validation.backupPackage) {
        setError(validation.error || 'Invalid backup file structure.');
        return;
      }

      setBackupPackage(validation.backupPackage);
      setStep('passphrase');
    };
    reader.readAsText(file);
  };

  const handleDecryptBackup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!backupPackage || !passphrase.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const result = await decryptBackupPackage(backupPackage, passphrase.trim());
      setDecryptedContent(result.decryptedContent);
      setDerivedKey(result.derivedKey);
      setStep('confirm');
    } catch (err: any) {
      setError('Decryption failed: Invalid passphrase or recovery key for this backup package.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyRestore = async (mode: 'replace' | 'merge') => {
    if (!decryptedContent || !derivedKey || !backupPackage) return;

    setIsLoading(true);
    try {
      await applyRestoredHealthData(decryptedContent, mode);
      const salt = backupPackage.encryption.kdf.salt;
      onRestoreSuccess(derivedKey, salt);
    } catch (err: any) {
      setError(`Restore failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div>
        <h2 className="text-2xl font-bold text-stone-900">Restore Health Data</h2>
        <p className="text-sm text-stone-500">
          Restore encrypted health records on a new device or recover from a local .healthbackup file.
        </p>
      </div>

      {step === 'select' && (
        <div className="space-y-6">
          <div className="p-8 bg-white rounded-[2.5rem] border-2 border-dashed border-stone-300 hover:border-emerald-500 transition-colors text-center relative">
            <input
              type="file"
              accept=".healthbackup,.json"
              onChange={handleFileSelect}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Upload className="w-6 h-6 text-emerald-700" />
            </div>
            <h3 className="text-lg font-bold text-stone-900 mb-1">Select .healthbackup File</h3>
            <p className="text-xs text-stone-500 max-w-sm mx-auto mb-4">
              Drag and drop your encrypted backup file here, or click to browse files on your device.
            </p>
            <span className="inline-block px-4 py-2 bg-stone-100 text-stone-800 rounded-xl text-xs font-bold border border-stone-200">
              Browse Local Backup File
            </span>
          </div>

          <div className="text-center text-xs text-stone-400 font-bold uppercase tracking-widest">
            — Or —
          </div>

          <div className="p-6 bg-white rounded-[2rem] border border-stone-200 shadow-2xs flex items-center justify-between">
            <div>
              <h4 className="font-bold text-stone-900 text-sm">Restore from Google Drive</h4>
              <p className="text-xs text-stone-500">Fetch encrypted backup package from connected cloud account</p>
            </div>
            <button
              onClick={onOpenGoogleDriveModal}
              className="px-4 py-2 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-xs font-bold"
            >
              Connect Google Drive
            </button>
          </div>

          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-2xl text-red-800 text-xs font-medium">
              {error}
            </div>
          )}
        </div>
      )}

      {step === 'passphrase' && backupPackage && (
        <div className="bg-white p-8 rounded-[2.5rem] border border-stone-200 shadow-2xs space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-stone-100">
            <div className="w-10 h-10 bg-emerald-100 rounded-2xl flex items-center justify-center">
              <Key className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h3 className="font-bold text-stone-900 text-lg">Enter Backup Encryption Key</h3>
              <p className="text-xs text-stone-500">
                Created on {new Date(backupPackage.createdAt).toLocaleString()} • {backupPackage.metadata.reportCount} reports
              </p>
            </div>
          </div>

          <form onSubmit={handleDecryptBackup} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                Passphrase or Master Recovery Key
              </label>
              <input
                type="password"
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder="Enter passphrase used when generating this backup"
                className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-mono"
                required
                autoFocus
              />
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
                {error}
              </div>
            )}

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep('select')}
                className="flex-1 py-3 bg-stone-100 hover:bg-stone-200 text-stone-800 font-bold rounded-xl text-xs"
              >
                Choose Different File
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs shadow-2xs disabled:opacity-50"
              >
                {isLoading ? 'Decrypting Backup...' : 'Decrypt Backup Contents'}
              </button>
            </div>
          </form>
        </div>
      )}

      {step === 'confirm' && decryptedContent && (
        <div className="bg-white p-8 rounded-[2.5rem] border border-stone-200 shadow-2xs space-y-6">
          <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 text-emerald-900 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
            <span className="font-bold">✓ Backup Decrypted & Verified Successfully!</span>
          </div>

          <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 space-y-2 text-xs">
            <h4 className="font-bold text-stone-900 uppercase tracking-wider">Restored Data Preview</h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-stone-700">
              <div>Health Reports: <strong className="text-stone-900">{decryptedContent.reports?.length || 0}</strong></div>
              <div>Vitals Entries: <strong className="text-stone-900">{decryptedContent.vitalsLog?.length || 0}</strong></div>
              <div>Symptoms: <strong className="text-stone-900">{decryptedContent.symptoms?.length || 0}</strong></div>
              <div>Medications: <strong className="text-stone-900">{decryptedContent.medications?.length || 0}</strong></div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-bold text-stone-900 text-sm">Select Import Strategy:</h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                onClick={() => handleApplyRestore('merge')}
                disabled={isLoading}
                className="p-4 bg-stone-50 hover:bg-emerald-50 border border-stone-200 hover:border-emerald-300 rounded-2xl text-left transition-colors group"
              >
                <span className="font-bold text-stone-900 group-hover:text-emerald-900 block text-sm mb-1">
                  Merge With Existing Data
                </span>
                <span className="text-xs text-stone-500 leading-relaxed block">
                  Combines backup items with current local records without overwriting.
                </span>
              </button>

              <button
                onClick={() => handleApplyRestore('replace')}
                disabled={isLoading}
                className="p-4 bg-stone-50 hover:bg-red-50 border border-stone-200 hover:border-red-300 rounded-2xl text-left transition-colors group"
              >
                <span className="font-bold text-stone-900 group-hover:text-red-900 block text-sm mb-1">
                  Replace All Local Data
                </span>
                <span className="text-xs text-stone-500 leading-relaxed block">
                  Clears local IndexedDB database and imports restored backup completely.
                </span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
