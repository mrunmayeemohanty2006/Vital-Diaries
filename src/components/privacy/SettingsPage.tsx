import React, { useState } from 'react';
import { Shield, HardDrive, Key, DownloadCloud, Trash2, UserCheck, ShieldCheck, Database, Cloud } from 'lucide-react';
import { PrivacyDashboard } from './PrivacyDashboard';
import { BackupPanel } from '../backup/BackupPanel';
import { RestorePanel } from '../restore/RestorePanel';

interface SettingsPageProps {
  isPersistent: boolean;
  canPersist: boolean;
  quotaBytes?: number;
  usageBytes?: number;
  onRequestPersistence: () => Promise<void>;
  recoveryKeySnippet?: string;
  userName?: string;
  onUpdateUserName?: (newName: string) => Promise<void>;
  onDeleteAllData: () => Promise<void>;
  encryptionKey: CryptoKey | null;
  saltBase64: string;
  userId: string;
  onOpenGoogleDriveModal: () => void;
  onRestoreSuccess: (key: CryptoKey, salt: string) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  isPersistent,
  canPersist,
  quotaBytes,
  usageBytes,
  onRequestPersistence,
  recoveryKeySnippet,
  userName = 'User',
  onUpdateUserName,
  onDeleteAllData,
  encryptionKey,
  saltBase64,
  userId,
  onOpenGoogleDriveModal,
  onRestoreSuccess,
}) => {
  const [subTab, setSubTab] = useState<'privacy' | 'backup'>('privacy');

  return (
    <div className="space-y-6">
      {/* Sub navigation header inside Settings */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-3">
        <button
          onClick={() => setSubTab('privacy')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            subTab === 'privacy'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
        >
          <Shield className="w-3.5 h-3.5" />
          <span>Privacy & Security</span>
        </button>

        <button
          onClick={() => setSubTab('backup')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
            subTab === 'backup'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
          }`}
        >
          <DownloadCloud className="w-3.5 h-3.5" />
          <span>Backup & Recovery</span>
        </button>
      </div>

      {subTab === 'privacy' ? (
        <PrivacyDashboard
          isPersistent={isPersistent}
          canPersist={canPersist}
          quotaBytes={quotaBytes}
          usageBytes={usageBytes}
          onRequestPersistence={onRequestPersistence}
          recoveryKeySnippet={recoveryKeySnippet}
          userName={userName}
          onUpdateUserName={onUpdateUserName}
          onOpenExportBackup={() => setSubTab('backup')}
          onOpenRestore={() => setSubTab('backup')}
          onOpenGoogleDrive={onOpenGoogleDriveModal}
          onDeleteAllData={onDeleteAllData}
        />
      ) : (
        <div className="space-y-8">
          <BackupPanel
            encryptionKey={encryptionKey}
            saltBase64={saltBase64}
            userId={userId}
            onOpenGoogleDrive={onOpenGoogleDriveModal}
          />
          <div className="pt-8 border-t border-stone-200">
            <RestorePanel
              onRestoreSuccess={onRestoreSuccess}
              onOpenGoogleDriveModal={onOpenGoogleDriveModal}
            />
          </div>
        </div>
      )}
    </div>
  );
};
