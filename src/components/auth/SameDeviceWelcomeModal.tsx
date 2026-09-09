import React from 'react';
import { ShieldCheck, ArrowRight } from 'lucide-react';

interface SameDeviceWelcomeModalProps {
  userName: string;
  userEmail?: string;
  onContinue: () => void;
  onOpenRecoveryOrReset?: () => void;
}

export const SameDeviceWelcomeModal: React.FC<SameDeviceWelcomeModalProps> = ({
  userName,
  userEmail,
  onContinue,
  onOpenRecoveryOrReset,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 dark:bg-black/75 backdrop-blur-md flex items-center justify-center p-3.5 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-stone-900 max-w-md w-full rounded-2xl sm:rounded-[2.5rem] border border-stone-200 dark:border-stone-800 shadow-2xl p-5 sm:p-8 overflow-hidden text-center my-auto max-h-[92vh] text-stone-900 dark:text-stone-100">
        <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/60 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-2xs">
          <span className="text-2xl">👋</span>
        </div>

        <h2 className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-100 mb-1">
          Welcome back
        </h2>
        <p className="text-xs text-stone-500 dark:text-stone-400 font-medium mb-6">
          Local encrypted health vault active on this device
        </p>

        <div className="p-4 bg-stone-50 dark:bg-stone-800/60 rounded-2xl border border-stone-200 dark:border-stone-700 mb-6 flex items-center gap-3 text-left">
          <div className="w-10 h-10 bg-emerald-600 dark:bg-emerald-700 text-white font-bold rounded-xl flex items-center justify-center shrink-0">
            {userName ? userName.charAt(0).toUpperCase() : 'U'}
          </div>
          <div className="overflow-hidden">
            <p className="font-bold text-stone-900 dark:text-stone-100 text-sm truncate">{userName || 'Vital Diaries User'}</p>
            {userEmail ? (
              <p className="text-xs text-stone-500 dark:text-stone-400 truncate">{userEmail}</p>
            ) : (
              <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">Local Profile</p>
            )}
          </div>
        </div>

        <button
          onClick={onContinue}
          className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md mb-4 cursor-pointer"
        >
          <span>Continue</span>
          <ArrowRight className="w-4 h-4" />
        </button>

        <div className="pt-4 border-t border-stone-100 dark:border-stone-800 flex items-center justify-between text-xs text-stone-500 dark:text-stone-400">
          <span className="flex items-center gap-1.5 text-stone-600 dark:text-stone-300 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>Local Vault Verified</span>
          </span>

          {onOpenRecoveryOrReset && (
            <button
              onClick={onOpenRecoveryOrReset}
              className="text-stone-400 dark:text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 underline font-medium transition-colors cursor-pointer"
            >
              Vault Options
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
