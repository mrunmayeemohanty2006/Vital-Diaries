import React, { useState, useEffect } from 'react';
import { DownloadCloud, ShieldCheck, HardDrive, Calendar, Clock, CheckCircle2, Cloud, FileText } from 'lucide-react';
import { createEncryptedBackup, downloadBackupFile } from '../../lib/backup';
import { db } from '../../lib/db';
import type { BackupHistoryItem } from '../../types/backup';
import { formatDate, formatRelativeTime } from '../../lib/utils';

interface BackupPanelProps {
  encryptionKey: CryptoKey | null;
  saltBase64: string | null;
  userId: string;
  onOpenGoogleDrive: () => void;
  onBackupSuccess?: () => void;
}

export const BackupPanel: React.FC<BackupPanelProps> = ({
  encryptionKey,
  saltBase64,
  userId,
  onOpenGoogleDrive,
  onBackupSuccess,
}) => {
  const [history, setHistory] = useState<BackupHistoryItem[]>([]);
  const [reminderDays, setReminderDays] = useState('14');
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [lastBackup, setLastBackup] = useState<string | null>(null);

  useEffect(() => {
    loadBackupHistory();
  }, []);

  async function loadBackupHistory() {
    const list = await db.backupHistory.orderBy('createdAt').reverse().toArray();
    setHistory(list);
    if (list.length > 0) {
      setLastBackup(list[0].createdAt);
    }
  }

  const handleBackupNow = async () => {
    if (!encryptionKey || !saltBase64) return;

    setIsCreatingBackup(true);
    try {
      const { backupPackage, fileName } = await createEncryptedBackup(
        encryptionKey,
        saltBase64,
        userId
      );

      // Download file locally
      downloadBackupFile(backupPackage, fileName);

      await loadBackupHistory();
      if (onBackupSuccess) onBackupSuccess();
    } catch (err) {
      console.error('Backup creation failed:', err);
    } finally {
      setIsCreatingBackup(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-stone-900">Encrypted Backup & Restore</h2>
          <p className="text-sm text-stone-500">
            Export encrypted .healthbackup packages or sync with Google Drive. Zero plaintext leaves this device.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Manual File Backup Card */}
        <div className="bg-white p-6 rounded-[2rem] border border-stone-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 bg-emerald-100 rounded-2xl flex items-center justify-center mb-4">
              <HardDrive className="w-5 h-5 text-emerald-700" />
            </div>
            <h3 className="text-lg font-bold text-stone-900 mb-1">Local Encrypted Backup</h3>
            <p className="text-xs text-stone-500 leading-relaxed mb-4">
              Creates a versioned <code className="font-mono text-emerald-800 bg-emerald-50 px-1 rounded">.healthbackup</code> file
              encrypted with AES-256-GCM using your master passphrase.
            </p>

            <div className="p-3 bg-stone-50 rounded-xl border border-stone-100 text-xs text-stone-600 mb-4 flex justify-between">
              <span>Last Exported:</span>
              <span className="font-semibold text-stone-900">{formatRelativeTime(lastBackup || undefined)}</span>
            </div>
          </div>

          <button
            onClick={handleBackupNow}
            disabled={!encryptionKey || isCreatingBackup}
            className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-xs disabled:opacity-50"
          >
            <DownloadCloud className="w-4 h-4" />
            <span>{isCreatingBackup ? 'Encrypting & Generating...' : 'Export Encrypted Backup Now'}</span>
          </button>
        </div>

        {/* Google Drive Card */}
        <div className="bg-white p-6 rounded-[2rem] border border-stone-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="w-10 h-10 bg-blue-100 rounded-2xl flex items-center justify-center mb-4">
              <Cloud className="w-5 h-5 text-blue-700" />
            </div>
            <h3 className="text-lg font-bold text-stone-900 mb-1">Google Drive Sync (Optional)</h3>
            <p className="text-xs text-stone-500 leading-relaxed mb-4">
              Uploads pre-encrypted backup files to your personal Google Drive folder. Decryption happens strictly in your browser.
            </p>

            <div className="p-3 bg-stone-50 rounded-xl border border-stone-100 text-xs text-stone-600 mb-4 flex justify-between items-center">
              <span>Storage Mode:</span>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded">
                End-to-End Encrypted
              </span>
            </div>
          </div>

          <button
            onClick={onOpenGoogleDrive}
            className="w-full py-3 bg-stone-900 hover:bg-stone-800 text-white rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-colors shadow-xs"
          >
            <Cloud className="w-4 h-4 text-emerald-400" />
            <span>Connect & Sync Google Drive</span>
          </button>
        </div>
      </div>

      {/* Backup Frequency Settings */}
      <div className="bg-white p-6 rounded-[2rem] border border-stone-200 shadow-2xs">
        <h3 className="font-bold text-stone-900 text-sm mb-3">Backup Reminder Preferences</h3>
        <div className="flex flex-wrap items-center gap-4 text-xs text-stone-700">
          <span>Remind me if no backup created for:</span>
          {['7', '14', '30', '0'].map((days) => (
            <label key={days} className="flex items-center gap-1.5 cursor-pointer font-medium">
              <input
                type="radio"
                name="reminder"
                value={days}
                checked={reminderDays === days}
                onChange={(e) => setReminderDays(e.target.value)}
                className="text-emerald-600 focus:ring-emerald-500"
              />
              <span>{days === '0' ? 'Never' : `${days} Days`}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Backup History Table */}
      <div className="bg-white rounded-[2rem] border border-stone-200 overflow-hidden shadow-2xs">
        <div className="px-6 py-4 border-b border-stone-100 flex justify-between items-center">
          <h3 className="font-bold text-stone-800 text-sm">Backup History & Downloads</h3>
          <span className="text-xs text-stone-400 font-medium">{history.length} exports recorded</span>
        </div>

        {history.length === 0 ? (
          <div className="p-8 text-center text-stone-400 text-sm">
            No backup history recorded yet on this device.
          </div>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-stone-50 text-stone-400 font-bold uppercase text-[10px] tracking-widest border-b border-stone-100">
              <tr>
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Filename</th>
                <th className="px-6 py-3">Destination</th>
                <th className="px-6 py-3">Records Included</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {history.map((item) => (
                <tr key={item.id} className="hover:bg-stone-50/50">
                  <td className="px-6 py-3.5 text-xs font-medium text-stone-800">{formatDate(item.createdAt)}</td>
                  <td className="px-6 py-3.5 font-mono text-xs text-stone-900">{item.fileName}</td>
                  <td className="px-6 py-3.5 text-xs text-stone-600">
                    <span className="capitalize">{item.destination.replace('_', ' ')}</span>
                  </td>
                  <td className="px-6 py-3.5 text-xs font-semibold text-emerald-700">{item.reportCount} reports</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
