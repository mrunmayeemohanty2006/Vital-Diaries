import React, { useState } from 'react';
import { AlertCircle, DownloadCloud, X } from 'lucide-react';

interface BackupReminderBannerProps {
  lastBackupDate?: string;
  unbackedRecordCount?: number;
  onOpenBackup: () => void;
}

export const BackupReminderBanner: React.FC<BackupReminderBannerProps> = ({
  lastBackupDate,
  unbackedRecordCount = 0,
  onOpenBackup,
}) => {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  const now = new Date().getTime();
  const lastBackupTime = lastBackupDate ? new Date(lastBackupDate).getTime() : 0;
  const daysSince = lastBackupDate ? Math.floor((now - lastBackupTime) / (1000 * 60 * 60 * 24)) : 7;

  const needsBackup = !lastBackupDate || daysSince >= 7 || unbackedRecordCount >= 5;

  if (!needsBackup) return null;

  return (
    <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-amber-900 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-amber-100 rounded-xl flex items-center justify-center shrink-0">
          <AlertCircle className="w-4 h-4 text-amber-700" />
        </div>
        <div>
          <span className="font-bold text-xs sm:text-sm block text-amber-950">
            ⚠️ Your health data hasn't been backed up in {daysSince > 0 ? `${daysSince} days` : 'a while'}.
          </span>
          <span className="text-xs text-amber-800">
            {unbackedRecordCount > 0 ? `${unbackedRecordCount} new records pending backup.` : 'Export an encrypted file to keep your local data safe.'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onOpenBackup}
          className="px-4 py-2 bg-amber-800 hover:bg-amber-900 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-2xs"
        >
          <DownloadCloud className="w-3.5 h-3.5" />
          <span>Backup Now</span>
        </button>

        <button
          onClick={() => setDismissed(true)}
          className="px-3 py-2 bg-amber-100 hover:bg-amber-200 text-amber-900 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1"
        >
          <X className="w-3.5 h-3.5 text-amber-700" />
          <span>Remind Me Later</span>
        </button>
      </div>
    </div>
  );
};
