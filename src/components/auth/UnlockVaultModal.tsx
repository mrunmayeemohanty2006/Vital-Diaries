import React, { useState } from 'react';
import { Lock, Key, ArrowRight, ShieldCheck } from 'lucide-react';

interface UnlockVaultModalProps {
  onUnlock: (passphraseOrRecoveryKey: string) => Promise<boolean>;
  onResetVaultPrompt?: () => void;
  recoveryKeySnippet?: string;
  userName?: string;
}

export const UnlockVaultModal: React.FC<UnlockVaultModalProps> = ({
  onUnlock,
  onResetVaultPrompt,
  userName,
}) => {
  const [inputKey, setInputKey] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputKey.trim()) return;

    setError('');
    setIsSubmitting(true);

    try {
      const success = await onUnlock(inputKey.trim());
      if (!success) {
        setError('Incorrect passphrase or recovery key. Please verify and try again.');
      }
    } catch (err: any) {
      setError(err.message || 'Decryption failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 dark:bg-black/70 backdrop-blur-md flex items-center justify-center p-3.5 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-stone-900 max-w-md w-full rounded-2xl sm:rounded-[2.5rem] border border-stone-200 dark:border-stone-800 shadow-2xl p-5 sm:p-8 max-h-[92vh] overflow-y-auto my-auto text-stone-900 dark:text-stone-100">
        <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-950/60 rounded-2xl flex items-center justify-center mb-6">
          <Lock className="w-6 h-6 text-emerald-700 dark:text-emerald-400" />
        </div>

        <h2 className="text-2xl font-bold text-stone-900 mb-1">
          {userName ? `Welcome back, ${userName}` : 'Unlock Health Vault'}
        </h2>
        <p className="text-sm text-stone-600 leading-relaxed mb-6">
          Enter your local passphrase or Master Recovery Key to decrypt your health records.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
              Passphrase or Recovery Key
            </label>
            <div className="relative">
              <input
                type="password"
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
                placeholder="Enter passphrase or VITA-XXXX-..."
                className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-sm font-mono"
                autoFocus
                required
              />
              <Key className="w-4 h-4 text-stone-400 absolute right-3.5 top-3.5" />
            </div>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !inputKey.trim()}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
          >
            <span>{isSubmitting ? 'Deriving Key...' : 'Unlock Local Vault'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            Zero Server Knowledge
          </span>
          {onResetVaultPrompt && (
            <button
              onClick={onResetVaultPrompt}
              className="text-stone-500 hover:text-stone-800 underline font-medium"
            >
              Reset Vault
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
