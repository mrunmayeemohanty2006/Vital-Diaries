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
    <footer className="min-h-8 py-2 sm:py-0 bg-stone-100 dark:bg-stone-900 border-t border-stone-200 dark:border-stone-800 px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-[10px] font-bold text-stone-500 dark:text-stone-400 uppercase tracking-widest shrink-0 gap-1.5 sm:gap-4 transition-colors">
      <div className="flex items-center gap-2 sm:gap-4 flex-wrap justify-center sm:justify-start">
        <span>Storage: {storageUsageFormatted}</span>
        <span className="text-stone-300 dark:text-stone-700">•</span>
        <span className={isPersistent ? 'text-emerald-700 dark:text-emerald-400 font-bold' : 'text-stone-500 dark:text-stone-400'}>
          {isPersistent ? '✓ Storage Protected (Persistent)' : 'Standard Storage'}
        </span>
      </div>
      <div className="flex items-center gap-2 sm:gap-4 flex-wrap justify-center sm:justify-end">
        <span>Last Backup: {lastBackupDate || 'Never'}</span>
        <span className="text-stone-300 dark:text-stone-700">•</span>
        <span>Vital Diaries v1.0.0</span>
      </div>
    </footer>
  );
};
