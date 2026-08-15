import React from 'react';
import { Database, ShieldCheck, AlertCircle, HardDrive } from 'lucide-react';
import { formatBytes } from '../../lib/storage';

interface StorageStatusCardProps {
  isPersistent: boolean;
  canPersist: boolean;
  quotaBytes?: number;
  usageBytes?: number;
  onRequestPersistence: () => Promise<void>;
}

export const StorageStatusCard: React.FC<StorageStatusCardProps> = ({
  isPersistent,
  canPersist,
  quotaBytes,
  usageBytes,
  onRequestPersistence,
}) => {
  return (
    <div className="bg-white p-6 rounded-[2rem] border border-stone-200 shadow-2xs space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-emerald-100 rounded-2xl flex items-center justify-center">
            <Database className="w-5 h-5 text-emerald-700" />
          </div>
          <div>
            <h3 className="font-bold text-stone-900 text-base">Local Browser Storage & Persistence</h3>
            <p className="text-xs text-stone-500">IndexedDB via StorageManager API</p>
          </div>
        </div>

        <span
          className={`px-3 py-1 rounded-full text-xs font-bold border ${
            isPersistent
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-amber-50 text-amber-800 border-amber-200'
          }`}
        >
          {isPersistent ? '✓ Storage Protected' : '⚠ Standard Storage'}
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-4 bg-stone-50 rounded-2xl border border-stone-100 text-xs">
        <div>
          <span className="text-stone-400 font-bold uppercase text-[10px] block mb-1">Local Usage</span>
          <span className="font-bold text-stone-900 text-sm">{formatBytes(usageBytes || 524288)}</span>
        </div>

        <div>
          <span className="text-stone-400 font-bold uppercase text-[10px] block mb-1">Device Quota</span>
          <span className="font-bold text-stone-900 text-sm">{formatBytes(quotaBytes || 107374182400)}</span>
        </div>

        <div>
          <span className="text-stone-400 font-bold uppercase text-[10px] block mb-1">Persistence Mode</span>
          <span className="font-bold text-emerald-800 text-xs block truncate">
            {isPersistent ? 'Persistent (No Auto Evict)' : 'Standard Eviction'}
          </span>
        </div>
      </div>

      {!isPersistent && (
        <div className="p-4 bg-amber-50/80 rounded-2xl border border-amber-200 flex items-center justify-between gap-3 text-xs text-amber-900">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <span>Enable persistent storage to reduce the risk of browser eviction during low disk space.</span>
          </div>

          <button
            onClick={onRequestPersistence}
            className="px-4 py-2 bg-amber-700 hover:bg-amber-800 text-white font-bold rounded-xl text-xs shrink-0 transition-colors shadow-2xs"
          >
            Enable Persistence
          </button>
        </div>
      )}

      <div className="text-[11px] text-stone-500 leading-relaxed italic bg-stone-50 p-3 rounded-xl">
        Persistent storage reduces browser eviction risk, but local data can still be cleared if you manually delete browser history, uninstall the browser, or reset your device. Always create encrypted backups.
      </div>
    </div>
  );
};
