import React, { useState } from 'react';
import { Key, Copy, Download, Check, ShieldAlert } from 'lucide-react';

interface RecoveryKeyCardProps {
  recoveryKeySnippet?: string;
  fullRecoveryKey?: string;
  onShowFullKeyPrompt?: () => void;
}

export const RecoveryKeyCard: React.FC<RecoveryKeyCardProps> = ({
  recoveryKeySnippet = 'VITA-7729-QLZP-9901-BAKE',
  fullRecoveryKey,
}) => {
  const [copied, setCopied] = useState(false);

  const displayKey = fullRecoveryKey || recoveryKeySnippet;

  const handleCopy = () => {
    navigator.clipboard.writeText(displayKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  };

  const handleDownload = () => {
    const content = `VITAL DIARIES - MASTER RECOVERY KEY\nKey: ${displayKey}\nGenerated: ${new Date().toLocaleDateString()}\nKeep this key safe offline.`;
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'VitalDiaries-Master-Recovery-Key.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="bg-stone-900 text-stone-100 p-6 sm:p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 bg-emerald-500/20 rounded-2xl flex items-center justify-center border border-emerald-500/30">
          <Key className="w-5 h-5 text-emerald-400" />
        </div>
        <div>
          <h3 className="text-lg font-bold">Master Security Recovery Key</h3>
          <p className="text-xs text-stone-400">Zero-Knowledge Local Key Derivation</p>
        </div>
      </div>

      <div className="p-4 bg-stone-800/90 rounded-2xl mb-4 border border-stone-700 font-mono text-center">
        <p className="text-[10px] font-bold text-stone-400 uppercase tracking-widest mb-2">
          Emergency Recovery Passphrase
        </p>
        <div className="text-base font-bold text-emerald-400 break-all tracking-wider select-all">
          {displayKey}
        </div>
      </div>

      <p className="text-xs text-stone-400 leading-relaxed mb-6 italic">
        This key is the ONLY way to decrypt your local backups if you lose your device or forget your passphrase. Store it safely offline.
      </p>

      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={handleCopy}
          className="py-3 bg-stone-800 hover:bg-stone-700 text-white rounded-xl text-xs font-bold border border-stone-700 flex items-center justify-center gap-2 transition-colors"
        >
          {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          <span>{copied ? 'Copied to Clipboard' : 'Copy Key'}</span>
        </button>

        <button
          onClick={handleDownload}
          className="py-3 bg-white text-stone-900 hover:bg-stone-100 rounded-xl text-xs font-bold shadow-md flex items-center justify-center gap-2 transition-colors"
        >
          <Download className="w-4 h-4 text-stone-900" />
          <span>Download Safety Package</span>
        </button>
      </div>
    </div>
  );
};
