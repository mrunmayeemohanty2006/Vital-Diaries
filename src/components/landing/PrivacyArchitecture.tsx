import React from 'react';
import {
  Laptop,
  Cloud,
  Smartphone,
  Lock,
  Unlock,
  ArrowRight,
  Shield,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export const PrivacyArchitecture: React.FC = () => {
  return (
    <section id="architecture" className="py-20 sm:py-28 bg-[#0B1320] text-slate-100 relative overflow-hidden tech-grid-dark">
      {/* Background ambient lighting */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[350px] bg-emerald-500/12 blur-[130px] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 text-xs font-mono font-semibold tracking-wider text-emerald-400 uppercase bg-emerald-950/70 px-2.5 py-1 rounded-md border border-emerald-800/60 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            <span>Zero-Knowledge Architecture</span>
          </div>

          <h2 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-white leading-tight text-balance">
            Privacy isn’t a setting.<br />
            <span className="text-emerald-400">It’s an architecture.</span>
          </h2>

          <p className="text-base sm:text-lg text-slate-300 leading-relaxed text-balance">
            Vital Diaries is designed so that your medical information is encrypted before cloud synchronization. The cloud stores encrypted data rather than readable medical records.
          </p>
        </div>

        {/* Visual Architecture Flow Diagram */}
        <div className="max-w-4xl mx-auto bg-slate-900/90 rounded-2xl border border-slate-800 p-6 sm:p-10 shadow-2xl backdrop-blur-sm mb-12 ring-1 ring-white/5">
          
          <div className="text-left border-b border-slate-800 pb-4 mb-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
            <div>
              <span className="text-xs font-mono uppercase text-emerald-400 tracking-wider">
                Cryptographic Boundary
              </span>
              <h3 className="font-display text-base font-semibold text-white">
                Client-Side Encryption Life Cycle
              </h3>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-400 bg-slate-800/80 px-3 py-1 rounded-md border border-slate-700/60">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Zero-knowledge server transit</span>
            </div>
          </div>

          {/* Diagram Nodes: Desktop -> Encrypt -> Cloud -> Mobile -> Decrypt */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
            
            {/* Node 1: Origin Device */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center space-y-2">
              <div className="w-10 h-10 rounded-lg bg-emerald-950 text-emerald-400 mx-auto flex items-center justify-center border border-emerald-800/50 shadow-2xs">
                <Laptop className="w-5 h-5" />
              </div>
              <span className="font-display text-xs font-semibold text-white block">Your Device A</span>
              <span className="text-[11px] font-mono text-slate-400 block leading-tight">Plaintext record entered</span>
            </div>

            {/* Transition 1: Encrypt */}
            <div className="flex flex-col items-center justify-center py-2 text-center">
              <div className="w-8 h-8 rounded-full bg-emerald-900/60 border border-emerald-500/40 text-emerald-300 flex items-center justify-center mb-1 shadow-2xs">
                <Lock className="w-3.5 h-3.5" />
              </div>
              <span className="text-[11px] font-mono text-emerald-400 font-medium">Encrypt</span>
              <span className="text-[10px] font-mono text-slate-400">AES-256-GCM</span>
              <div className="hidden md:block w-full border-t border-dashed border-emerald-600/30 mt-2" />
            </div>

            {/* Node 2: Encrypted Cloud Sync */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-700/80 text-center space-y-2 relative ring-1 ring-emerald-500/20 shadow-lg">
              <div className="w-10 h-10 rounded-lg bg-slate-900 text-slate-300 mx-auto flex items-center justify-center border border-slate-700">
                <Cloud className="w-5 h-5" />
              </div>
              <span className="font-display text-xs font-semibold text-white block">Encrypted Cloud</span>
              <span className="text-[11px] text-emerald-400 font-mono block">Ciphertext Only</span>
            </div>

            {/* Transition 2: Decrypt */}
            <div className="flex flex-col items-center justify-center py-2 text-center">
              <div className="w-8 h-8 rounded-full bg-emerald-900/60 border border-emerald-500/40 text-emerald-300 flex items-center justify-center mb-1 shadow-2xs">
                <Unlock className="w-3.5 h-3.5" />
              </div>
              <span className="text-[11px] font-mono text-emerald-400 font-medium">Decrypt</span>
              <span className="text-[10px] font-mono text-slate-400">Local key verify</span>
              <div className="hidden md:block w-full border-t border-dashed border-emerald-600/30 mt-2" />
            </div>

            {/* Node 3: Target Device */}
            <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 text-center space-y-2">
              <div className="w-10 h-10 rounded-lg bg-emerald-950 text-emerald-400 mx-auto flex items-center justify-center border border-emerald-800/50 shadow-2xs">
                <Smartphone className="w-5 h-5" />
              </div>
              <span className="font-display text-xs font-semibold text-white block">Your Device B</span>
              <span className="text-[11px] font-mono text-slate-400 block leading-tight">Decrypted in memory</span>
            </div>

          </div>

          {/* Cryptographic Boundary Note */}
          <div className="mt-8 p-3.5 rounded-lg bg-slate-950/70 border border-slate-800 text-left flex items-start gap-3">
            <Shield className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <p className="text-xs text-slate-400 leading-relaxed font-sans">
              At no point in this pipeline does Vital Diaries hold your encryption passkey or possess the cryptographic keys needed to inspect medical files, doctor notes, or lab results.
            </p>
          </div>
        </div>

        {/* Security Contrast Cards (As specified in prompt) */}
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
          
          <div className="p-6 rounded-2xl bg-slate-900/95 border border-slate-800 ring-1 ring-white/5">
            <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider block mb-1">
              Data in Motion & Storage
            </span>
            <h4 className="font-display text-lg font-bold text-white mb-2">
              Medical Data
            </h4>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-emerald-400 mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Encrypted before synchronization</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Before syncing over TLS to the cloud, documents and structured records are wrapped in client-generated ciphertext. The database never receives unencrypted medical documents.
            </p>
          </div>

          <div className="p-6 rounded-2xl bg-slate-900/95 border border-slate-800 ring-1 ring-white/5">
            <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider block mb-1">
              Execution Boundary
            </span>
            <h4 className="font-display text-lg font-bold text-white mb-2">
              Plaintext Health Information
            </h4>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs font-mono text-emerald-400 mb-3 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Processed locally whenever possible</span>
            </div>
            <p className="text-xs text-slate-400 leading-relaxed">
              Searching your records, reading prescriptions, and organizing chronological timelines are calculated within your browser or device sandboxes.
            </p>
          </div>

        </div>

      </div>
    </section>
  );
};
