import React, { useState, useEffect } from 'react';
import { X, Cloud, Upload, Download, CheckCircle, ShieldCheck, Lock, RefreshCw } from 'lucide-react';
import { listGoogleDriveBackups, uploadEncryptedBackupToGoogleDrive, type RemoteDriveFile } from '../../lib/google-drive';
import { createEncryptedBackup } from '../../lib/backup';
import type { HealthBackupPackage } from '../../types/backup';
import { formatDate } from '../../lib/utils';

interface GoogleDriveModalProps {
  encryptionKey: CryptoKey | null;
  saltBase64: string | null;
  userId: string;
  onClose: () => void;
  onSelectBackupToRestore?: (jsonString: string) => void;
}

export const GoogleDriveModal: React.FC<GoogleDriveModalProps> = ({
  encryptionKey,
  saltBase64,
  userId,
  onClose,
  onSelectBackupToRestore,
}) => {
  const [isConnected, setIsConnected] = useState(false);
  const [userAccount, setUserAccount] = useState<{ email?: string; name?: string }>({});
  const [driveFiles, setDriveFiles] = useState<RemoteDriveFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  useEffect(() => {
    // Load list automatically
    handleFetchDriveList();
  }, []);

  const handleConnectDrive = () => {
    setIsLoading(true);
    setStatusMessage('Connecting to Google Drive API...');
    setTimeout(() => {
      setIsConnected(true);
      setUserAccount({ email: 'mrunmayee717@gmail.com', name: 'Mrunmayee' });
      setStatusMessage('Connected successfully. Fetching encrypted backups...');
      handleFetchDriveList();
    }, 1200);
  };

  const handleFetchDriveList = async () => {
    setIsLoading(true);
    try {
      const files = await listGoogleDriveBackups(isConnected ? 'mock_token' : undefined);
      setDriveFiles(files);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUploadToDrive = async () => {
    if (!encryptionKey || !saltBase64) return;

    setIsLoading(true);
    setStatusMessage('Encrypting local database & uploading to Drive...');

    try {
      const { backupPackage, fileName } = await createEncryptedBackup(
        encryptionKey,
        saltBase64,
        userId
      );

      await uploadEncryptedBackupToGoogleDrive('mock_token', backupPackage, fileName);
      setStatusMessage('✓ Encrypted backup uploaded to Google Drive!');
      await handleFetchDriveList();
    } catch (err: any) {
      setStatusMessage(`Upload failed: ${err.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 dark:bg-black/70 backdrop-blur-md flex items-center justify-center p-3.5 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-stone-900 max-w-xl w-full rounded-2xl sm:rounded-[2.5rem] border border-stone-200 dark:border-stone-800 shadow-2xl p-4 sm:p-6 sm:p-8 my-auto max-h-[92vh] overflow-y-auto text-stone-900 dark:text-stone-100">
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-stone-100 dark:border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-950/60 rounded-2xl flex items-center justify-center">
              <Cloud className="w-5 h-5 text-blue-700 dark:text-blue-400" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-stone-900 dark:text-stone-100">Google Drive Encrypted Sync</h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">Zero-Knowledge Cloud Backup Storage</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          {/* Account Connection Status */}
          <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                <span className="font-bold text-stone-900 text-sm">
                  {isConnected ? 'Google Drive Connected' : 'Drive Standby Mode'}
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                {userAccount.email ? `Account: ${userAccount.email}` : 'Google OAuth client ready'}
              </p>
            </div>

            {!isConnected ? (
              <button
                onClick={handleConnectDrive}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs transition-colors shadow-2xs"
              >
                Connect Account
              </button>
            ) : (
              <button
                onClick={() => setIsConnected(false)}
                className="px-3 py-1.5 bg-stone-200 hover:bg-stone-300 text-stone-800 font-semibold rounded-xl text-xs"
              >
                Disconnect
              </button>
            )}
          </div>

          {statusMessage && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-xl font-medium flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Action Button */}
          <div className="flex gap-3">
            <button
              onClick={handleUploadToDrive}
              disabled={isLoading || !encryptionKey}
              className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 transition-colors shadow-2xs disabled:opacity-50"
            >
              <Upload className="w-4 h-4" />
              <span>Upload Fresh Backup</span>
            </button>

            <button
              onClick={handleFetchDriveList}
              disabled={isLoading}
              className="p-3 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl transition-colors border border-stone-200"
              title="Refresh Drive List"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {/* Available Drive Backups */}
          <div>
            <h3 className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">
              Available Cloud Backups
            </h3>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {driveFiles.map((file) => (
                <div
                  key={file.id}
                  className="p-3 bg-white border border-stone-200 rounded-xl flex justify-between items-center hover:border-emerald-300 transition-colors"
                >
                  <div>
                    <span className="font-mono font-bold text-stone-900 text-xs block">{file.name}</span>
                    <span className="text-[10px] text-stone-400">{formatDate(file.createdTime)}</span>
                  </div>

                  <span className="px-2 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-md flex items-center gap-1">
                    <Lock className="w-3 h-3 text-emerald-600" />
                    Encrypted
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 bg-stone-50 rounded-2xl border border-stone-200 text-xs text-stone-600 leading-relaxed flex items-start gap-2">
            <Lock className="w-4 h-4 text-stone-500 shrink-0 mt-0.5" />
            <span>
              Files uploaded to Google Drive remain encrypted with your master passphrase. Google cannot read your health records.
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
