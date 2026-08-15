import React from 'react';

interface FooterProps {
  storageUsageFormatted?: string;
  isPersistent: boolean;
  lastBackupDate?: string;
}

export const Footer: React.FC<FooterProps> = ({
  storageUsageFormatted = '0.5 MB',
  isPersistent,
  lastBackupDate,
}) => {
  return (
    <footer className="h-8 bg-stone-100 border-t border-stone-200 px-6 lg:px-8 flex items-center justify-between text-[10px] font-bold text-stone-500 uppercase tracking-widest shrink-0">
      <div className="flex items-center gap-4">
        <span>Storage: {storageUsageFormatted}</span>
        <span className="text-stone-300">•</span>
        <span className={isPersistent ? 'text-emerald-700 font-bold' : 'text-stone-500'}>
          {isPersistent ? '✓ Storage Protected (Persistent)' : 'Standard Storage'}
        </span>
      </div>
      <div className="flex items-center gap-4">
        <span>Last Backup: {lastBackupDate || 'Never'}</span>
        <span className="text-stone-300">•</span>
        <span>Vital Diaries v1.0.0</span>
      </div>
    </footer>
  );
};
