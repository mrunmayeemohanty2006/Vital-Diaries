import React from 'react';
import { HardDrive, Cloud, PlusCircle, ShieldAlert, ArrowRight } from 'lucide-react';

interface NewDeviceModalProps {
  onSelectRestoreFile: () => void;
  onSelectGoogleDrive: () => void;
  onCreateNewVault: () => void;
}

export const NewDeviceModal: React.FC<NewDeviceModalProps> = ({
  onSelectRestoreFile,
  onSelectGoogleDrive,
  onCreateNewVault,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 dark:bg-black/70 backdrop-blur-md flex items-center justify-center p-3.5 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-stone-900 max-w-lg w-full rounded-2xl sm:rounded-[2.5rem] border border-stone-200 dark:border-stone-800 shadow-2xl p-5 sm:p-8 overflow-hidden my-auto max-h-[92vh] overflow-y-auto text-stone-900 dark:text-stone-100">
        <div className="w-12 h-12 bg-amber-100 dark:bg-amber-950/60 rounded-2xl flex items-center justify-center mb-5">
          <ShieldAlert className="w-6 h-6 text-amber-700 dark:text-amber-400" />
        </div>

        <h2 className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-100 mb-2">
          Welcome back 👋
        </h2>
        <p className="text-sm font-semibold text-amber-900 bg-amber-50 p-3 rounded-xl border border-amber-200/80 mb-6">
          We couldn't find your local health vault on this device.
        </p>

        <p className="text-xs font-bold text-stone-400 uppercase tracking-widest mb-3">
          Restore Your Health Data
        </p>

        <div className="space-y-3 mb-6">
          <button
            onClick={onSelectRestoreFile}
            className="w-full p-4 bg-stone-50 hover:bg-emerald-50/60 border border-stone-200 hover:border-emerald-300 rounded-2xl flex items-center justify-between text-left transition-all group shadow-2xs"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-100 group-hover:bg-emerald-600 group-hover:text-white rounded-xl flex items-center justify-center transition-colors">
                <HardDrive className="w-5 h-5 text-emerald-700 group-hover:text-white transition-colors" />
              </div>
              <div>
                <span className="font-bold text-stone-900 text-sm block">Restore from Backup File</span>
                <span className="text-xs text-stone-500">Import a .healthbackup file and decrypt with your Recovery Key</span>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-stone-400 group-hover:text-emerald-600 transition-colors" />
          </button>

          <button
            onClick={onSelectGoogleDrive}
            className="w-full p-4 bg-stone-50 hover:bg-blue-50/60 border border-stone-200 hover:border-blue-300 rounded-2xl flex items-center justify-between text-left transition-all group shadow-2xs"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 group-hover:bg-blue-600 group-hover:text-white rounded-xl flex items-center justify-center transition-colors">
                <Cloud className="w-5 h-5 text-blue-700 group-hover:text-white transition-colors" />
              </div>
              <div>
                <span className="font-bold text-stone-900 text-sm block">Connect Google Drive</span>
                <span className="text-xs text-stone-500">Fetch encrypted backup from Drive & decrypt locally</span>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-stone-400 group-hover:text-blue-600 transition-colors" />
          </button>
        </div>

        <div className="pt-4 border-t border-stone-100 text-center">
          <button
            onClick={onCreateNewVault}
            className="text-xs font-bold text-stone-600 hover:text-emerald-700 flex items-center justify-center gap-1.5 mx-auto py-1"
          >
            <PlusCircle className="w-4 h-4 text-stone-400" />
            <span>Create Fresh Local Vault on This Device</span>
          </button>
        </div>
      </div>
    </div>
  );
};
