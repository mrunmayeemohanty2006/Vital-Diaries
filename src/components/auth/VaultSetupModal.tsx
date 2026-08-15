import React, { useState } from 'react';
import { ShieldAlert, Key, Copy, Download, Check, Lock, ArrowRight } from 'lucide-react';
import { generateMasterRecoveryKey } from '../../lib/key-management';

interface VaultSetupModalProps {
  onCompleteSetup: (passphrase: string, recoveryKey: string, fullName: string) => Promise<void>;
}

export const VaultSetupModal: React.FC<VaultSetupModalProps> = ({ onCompleteSetup }) => {
  const [step, setStep] = useState<'passphrase' | 'recoveryKey'>('passphrase');
  const [fullName, setFullName] = useState('Mrunmayee');
  const [passphrase, setPassphrase] = useState('');
  const [confirmPassphrase, setConfirmPassphrase] = useState('');
  const [error, setError] = useState('');
  const [recoveryKey] = useState(() => generateMasterRecoveryKey());
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handlePassphraseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!fullName.trim()) {
      setError('Please enter your full name.');
      return;
    }

    if (passphrase.length < 8) {
      setError('Passphrase must be at least 8 characters long.');
      return;
    }

    if (passphrase !== confirmPassphrase) {
      setError('Passphrases do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onCompleteSetup(passphrase, recoveryKey, fullName);
    } catch (err: any) {
      setError(err.message || 'Failed to set up vault');
      setIsSubmitting(false);
    }
  };

  const handleCopyRecoveryKey = () => {
    navigator.clipboard.writeText(recoveryKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleDownloadSafetyPackage = () => {
    const text = `=====================================================
VITAL DIARIES - MASTER RECOVERY SAFETY KIT
=====================================================
Date Generated: ${new Date().toLocaleString()}

YOUR MASTER RECOVERY KEY:
${recoveryKey}

IMPORTANT PRIVACY & SECURITY WARNING:
1. This recovery key is the ONLY way to decrypt your local health data
   and backups if you forget your passphrase or lose this device.
2. Vital Diaries does NOT store your passphrase, recovery key, or health data
   on any cloud server.
3. Keep this file in a secure password manager or offline location.
=====================================================`;

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `VitalDiaries-Recovery-Key.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setDownloaded(true);
  };

  const handleFinalize = async () => {
    setIsSubmitting(true);
    try {
      await onCompleteSetup(passphrase, recoveryKey, fullName);
    } catch (err: any) {
      setError(err.message || 'Failed to set up vault');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-white max-w-lg w-full rounded-[2.5rem] border border-stone-200 shadow-2xl p-8 overflow-hidden">
        {step === 'passphrase' ? (
          <div>
            <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center mb-6">
              <Lock className="w-6 h-6 text-emerald-700" />
            </div>

            <h2 className="text-2xl font-bold text-stone-900 mb-2">Setup Your Health Vault</h2>
            <p className="text-sm text-stone-600 leading-relaxed mb-6">
              Enter your name and create a local passphrase to derive your AES-256-GCM encryption key.
              Your data stays strictly on this device and is never sent to any server in plaintext.
            </p>

            <form onSubmit={handlePassphraseSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                  Your Name / Display Name
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Mrunmayee"
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-sm font-medium"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                  Passphrase (Min 8 Characters)
                </label>
                <input
                  type="password"
                  value={passphrase}
                  onChange={(e) => setPassphrase(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-sm"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 uppercase tracking-wider mb-2">
                  Confirm Passphrase
                </label>
                <input
                  type="password"
                  value={confirmPassphrase}
                  onChange={(e) => setConfirmPassphrase(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full px-4 py-3 bg-stone-50 border border-stone-200 rounded-xl text-stone-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white text-sm"
                  required
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl font-medium">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-colors flex items-center justify-center gap-2 shadow-sm disabled:opacity-50"
              >
                <span>{isSubmitting ? 'Encrypting & Initializing Vault...' : 'Initialize Encrypted Vault'}</span>
                {!isSubmitting && <ArrowRight className="w-4 h-4" />}
              </button>
            </form>
          </div>
        ) : (
          <div>
            <div className="w-12 h-12 bg-emerald-100 rounded-2xl flex items-center justify-center mb-6">
              <ShieldAlert className="w-6 h-6 text-emerald-700" />
            </div>

            <h2 className="text-2xl font-bold text-stone-900 mb-2">Secure Your Health Data</h2>
            <p className="text-xs text-stone-600 leading-relaxed mb-4">
              Vital Diaries stores your health data securely on this device. We've generated a Recovery Key for you.
            </p>

            <div className="p-4 bg-stone-900 rounded-2xl mb-4 border border-stone-800 text-center">
              <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">
                Your Recovery Key
              </p>
              <div className="font-mono text-base font-bold text-emerald-400 break-all tracking-wider select-all">
                {recoveryKey}
              </div>
            </div>

            <p className="text-xs text-stone-500 mb-5 leading-relaxed bg-stone-50 p-3 rounded-xl border border-stone-200">
              You won't need this key every time you open Vital Diaries. You will need it if you restore your health data on a new device.
            </p>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <button
                type="button"
                onClick={handleCopyRecoveryKey}
                className="py-2.5 px-3 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border border-stone-200 transition-colors"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied Key!' : 'Copy Recovery Key'}</span>
              </button>

              <button
                type="button"
                onClick={handleDownloadSafetyPackage}
                className="py-2.5 px-3 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 border border-stone-200 transition-colors"
              >
                {downloaded ? <Check className="w-4 h-4 text-emerald-600" /> : <Download className="w-4 h-4" />}
                <span>{downloaded ? 'Downloaded' : 'Download Recovery Key'}</span>
              </button>
            </div>

            <button
              type="button"
              onClick={handleFinalize}
              disabled={isSubmitting}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-colors shadow-sm disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? 'Encrypting & Initializing Vault...' : 'I\'ve Saved My Recovery Key'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
