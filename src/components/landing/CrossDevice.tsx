import React, { useState } from 'react';
import { Laptop, Smartphone, Cloud, Lock, CheckCircle, RefreshCw, Key } from 'lucide-react';

export const CrossDevice: React.FC = () => {
  const [synced, setSynced] = useState(true);

  return (
    <section id="cross-device" className="relative py-20 sm:py-24 bg-[#F8FAFC] border-t border-slate-200/80 tech-grid-pattern">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 text-xs font-mono font-semibold uppercase tracking-wider text-emerald-800 bg-emerald-50/80 px-2.5 py-1 rounded-md border border-emerald-200/60 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
            <span>Multi-Device Continuity</span>
          </div>

          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 text-balance">
            Your vault follows you.
          </h2>

          <p className="text-base sm:text-lg text-slate-600 leading-relaxed text-balance">
            Start on your laptop. Sign in from another device. Download your encrypted records and unlock them locally.
          </p>
        </div>

        {/* Visual Multi-Device Card */}
        <div className="max-w-4xl mx-auto glass-card rounded-2xl border border-slate-200/80 shadow-xl p-6 sm:p-10">
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
            
            {/* Device A (Laptop) */}
            <div className="p-5 rounded-xl glass-card-subtle text-left space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Laptop className="w-4 h-4 text-emerald-600" />
                  <span>Device A · Laptop</span>
                </span>
                <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50/90 px-2 py-0.5 rounded border border-emerald-200/60 font-medium">
                  Primary Vault
                </span>
              </div>

              {/* Fictional Laptop Preview Card */}
              <div className="p-3 bg-white/95 rounded-lg border border-slate-200/80 text-xs space-y-1.5 shadow-2xs">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>Record Added</span>
                  <span>10:42 AM</span>
                </div>
                <p className="font-display font-semibold text-slate-900 text-sm">
                  Cardiology Follow-Up.pdf
                </p>
                <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-700">
                  <Lock className="w-3 h-3" />
                  <span>Encrypted locally before sync</span>
                </div>
              </div>

              <div className="text-[11px] font-mono text-slate-500 flex items-center justify-between">
                <span>Local Status:</span>
                <span className="font-semibold text-slate-800">Key derivation active</span>
              </div>
            </div>

            {/* Cloud Transit Pipe */}
            <div className="flex flex-col items-center justify-center p-3 text-center space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200/80 flex items-center justify-center text-emerald-700 shadow-xs">
                <Cloud className="w-6 h-6" />
              </div>

              <div className="space-y-1">
                <span className="font-display text-xs font-semibold text-slate-900 block">
                  Encrypted Sync
                </span>
                <span className="text-[11px] font-mono text-emerald-700 block">
                  Zero Plaintext
                </span>
              </div>

              <div className="p-1.5 bg-slate-100/90 border border-slate-200/60 rounded-md text-[11px] text-slate-600 font-mono shadow-2xs">
                TLS 1.3 + AES-GCM
              </div>
            </div>

            {/* Device B (Phone) */}
            <div className="p-5 rounded-xl glass-card-subtle text-left space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                  <Smartphone className="w-4 h-4 text-emerald-600" />
                  <span>Device B · Mobile</span>
                </span>
                <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50/90 px-2 py-0.5 rounded border border-emerald-200/60 font-medium">
                  Decrypted Locally
                </span>
              </div>

              {/* Fictional Mobile Preview Card */}
              <div className="p-3 bg-white/95 rounded-lg border border-slate-200/80 text-xs space-y-1.5 shadow-2xs">
                <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
                  <span>Vault Unlocked</span>
                  <span>10:45 AM</span>
                </div>
                <p className="font-display font-semibold text-slate-900 text-sm">
                  Cardiology Follow-Up.pdf
                </p>
                <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-700">
                  <CheckCircle className="w-3 h-3" />
                  <span>Ready for offline reading</span>
                </div>
              </div>

              <div className="text-[11px] font-mono text-slate-500 flex items-center justify-between">
                <span>Unlock Credential:</span>
                <span className="font-semibold text-slate-800">Biometric / Passkey</span>
              </div>
            </div>

          </div>

          {/* Sync guarantee caption */}
          <div className="mt-8 pt-5 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 text-left font-mono">
            <span>
              Seamless multi-device synchronization without compromising end-to-end user isolation.
            </span>
            <span className="font-semibold text-emerald-800 shrink-0">
              No server-side key escrow
            </span>
          </div>

        </div>

      </div>
    </section>
  );
};
