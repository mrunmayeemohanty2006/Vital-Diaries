import React, { useState } from 'react';
import { ShieldCheck, Lock, Database, HardDrive, Key, Cloud, Trash2, Download, RefreshCw, CheckCircle2 } from 'lucide-react';
import { StorageStatusCard } from './StorageStatusCard';
import { RecoveryKeyCard } from './RecoveryKeyCard';
import { DeleteDataModal } from './DeleteDataModal';

interface PrivacyDashboardProps {
  isPersistent: boolean;
  canPersist: boolean;
  quotaBytes?: number;
  usageBytes?: number;
  onRequestPersistence: () => Promise<void>;
  recoveryKeySnippet?: string;
  userName?: string;
  onUpdateUserName?: (newName: string) => Promise<void>;
  onOpenExportBackup: () => void;
  onOpenRestore: () => void;
  onOpenGoogleDrive: () => void;
  onDeleteAllData: () => Promise<void>;
}

export const PrivacyDashboard: React.FC<PrivacyDashboardProps> = ({
  isPersistent,
  canPersist,
  quotaBytes,
  usageBytes,
  onRequestPersistence,
  recoveryKeySnippet,
  userName = 'User',
  onUpdateUserName,
  onOpenExportBackup,
  onOpenRestore,
  onOpenGoogleDrive,
  onDeleteAllData,
}) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [editName, setEditName] = useState(userName);
  const [isSavingName, setIsSavingName] = useState(false);
  const [nameSavedMsg, setNameSavedMsg] = useState(false);

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editName.trim() || !onUpdateUserName) return;

    setIsSavingName(true);
    try {
      await onUpdateUserName(editName.trim());
      setNameSavedMsg(true);
      setTimeout(() => setNameSavedMsg(false), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingName(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-stone-900">Privacy & Profile Controls</h2>
        <p className="text-sm text-stone-500">Zero-Knowledge Local Encryption & Personal Vault Profile</p>
      </div>

      {/* Profile & Name Card */}
      <div className="bg-white p-6 rounded-[2rem] border border-stone-200 shadow-2xs">
        <h3 className="font-bold text-stone-900 text-sm uppercase tracking-wider text-stone-400 mb-4">
          Vault Profile Details
        </h3>
        <form onSubmit={handleSaveName} className="flex flex-col sm:flex-row gap-3 items-end max-w-xl">
          <div className="flex-1 w-full">
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-1">
              Your Display Name
            </label>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="e.g. Alex Morgan"
              className="w-full px-4 py-2.5 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
            />
          </div>
          <button
            type="submit"
            disabled={isSavingName || !editName.trim()}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors shadow-2xs disabled:opacity-50"
          >
            {isSavingName ? 'Saving...' : 'Save Name'}
          </button>
        </form>
        {nameSavedMsg && (
          <p className="text-xs text-emerald-700 font-semibold mt-2">Display name updated successfully!</p>
        )}
      </div>

      {/* Main Privacy Audit Checkpoints */}
      <div className="bg-white p-6 rounded-[2rem] border border-stone-200 shadow-2xs space-y-4">
        <h3 className="font-bold text-stone-900 text-sm uppercase tracking-wider text-stone-400">
          Privacy Safeguards Audit
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div className="flex items-start gap-3 p-3.5 bg-stone-50 rounded-2xl border border-stone-100">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-stone-900 block">Health Data Local Storage</span>
              <span className="text-xs text-stone-500">Stored exclusively on this device's IndexedDB engine.</span>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 bg-stone-50 rounded-2xl border border-stone-100">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-stone-900 block">AES-256-GCM Encryption</span>
              <span className="text-xs text-stone-500">Web Crypto native implementation with unique IV per record.</span>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 bg-stone-50 rounded-2xl border border-stone-100">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-stone-900 block">Zero Plaintext Cloud Transmission</span>
              <span className="text-xs text-stone-500">Application servers never receive raw medical records.</span>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3.5 bg-stone-50 rounded-2xl border border-stone-100">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-stone-900 block">Client-Side Key Derivation</span>
              <span className="text-xs text-stone-500">PBKDF2-SHA256 with 100,000 iterations & secure random salt.</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <StorageStatusCard
          isPersistent={isPersistent}
          canPersist={canPersist}
          quotaBytes={quotaBytes}
          usageBytes={usageBytes}
          onRequestPersistence={onRequestPersistence}
        />

        <RecoveryKeyCard recoveryKeySnippet={recoveryKeySnippet} />
      </div>

      {/* Danger Zone */}
      <div className="p-6 bg-white rounded-[2rem] border border-red-200/80 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h4 className="font-bold text-red-900 text-sm">Danger Zone</h4>
          <p className="text-xs text-stone-500">Permanently purge all local health data and encryption metadata</p>
        </div>

        <button
          onClick={() => setShowDeleteModal(true)}
          className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-700 font-bold rounded-xl text-xs border border-red-200 transition-colors flex items-center gap-2 shrink-0"
        >
          <Trash2 className="w-4 h-4" />
          <span>Delete All Local Data</span>
        </button>
      </div>

      {showDeleteModal && (
        <DeleteDataModal
          onClose={() => setShowDeleteModal(false)}
          onConfirmDelete={async () => {
            await onDeleteAllData();
            setShowDeleteModal(false);
          }}
        />
      )}
    </div>
  );
};
