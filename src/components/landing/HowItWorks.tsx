import React, { useState } from 'react';
import { SITE_CONFIG } from './config';
import { ArrowRight, Upload, Lock, Smartphone, CheckCircle, FileText } from 'lucide-react';

export const HowItWorks: React.FC = () => {
  const [activeStep, setActiveStep] = useState<number>(0);

  const stepVisuals = [
    {
      badge: 'Step 1: Local Ingestion',
      title: 'Upload to Device Sandbox',
      desc: 'Files are read locally within your browser or application memory. No data is sent over the network in plaintext.',
      previewType: 'upload',
    },
    {
      badge: 'Step 2: Cryptographic Sealing',
      title: 'Encrypted Before Departure',
      desc: 'A random IV and user-derived key wrap your document into an encrypted blob. Only the sealed blob leaves your device.',
      previewType: 'encrypt',
    },
    {
      badge: 'Step 3: Secure On-Demand Unlock',
      title: 'Decrypted in Local RAM',
      desc: 'When accessing from your phone or laptop, the encrypted payload is downloaded and unlocked locally with your credentials.',
      previewType: 'access',
    },
  ];

  return (
    <section id="how-it-works" className="relative py-24 bg-gradient-to-b from-emerald-950 via-[#064E3B] to-slate-950 text-white tech-grid-dark overflow-hidden">
      {/* Dynamic ambient lighting */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-emerald-500/15 rounded-full blur-[100px] pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-teal-500/15 rounded-full blur-[100px] pointer-events-none" />

      {/* Animated Flowing Data Track across top */}
      <div className="relative w-full h-1 bg-emerald-900/50 overflow-hidden mb-12" aria-hidden="true">
        <div className="absolute top-0 bottom-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-emerald-400 to-transparent animate-data-flow" />
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center space-y-4 mb-14">
          <div className="inline-flex items-center gap-2 text-xs font-mono font-semibold uppercase tracking-wider text-emerald-300 bg-emerald-900/70 px-3 py-1 rounded-md border border-emerald-700/60 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Process & Verification</span>
          </div>

          <h2 className="font-display text-3xl sm:text-5xl font-bold tracking-tight text-white text-balance">
            Your records. One private vault.
          </h2>

          <p className="text-base sm:text-lg text-emerald-100/80 leading-relaxed text-balance max-w-2xl mx-auto">
            Experience real-time client-side cryptographic sealing from local drop to zero-knowledge multi-device unlock.
          </p>

          {/* Visual Flow Indicator with Flowing Data Animation */}
          <div className="pt-2 flex items-center justify-center gap-2 text-xs font-mono font-semibold tracking-wider text-emerald-300">
            <span className="text-emerald-200 bg-emerald-900/90 px-3 py-1 rounded-md border border-emerald-600/70 shadow-2xs">
              01 UPLOAD
            </span>
            <div className="relative w-8 h-0.5 bg-emerald-800 overflow-hidden">
              <div className="absolute inset-0 bg-emerald-400 animate-data-flow" />
            </div>
            <span className="text-emerald-200 bg-emerald-900/90 px-3 py-1 rounded-md border border-emerald-600/70 shadow-2xs ring-1 ring-emerald-400/30">
              02 ENCRYPT
            </span>
            <div className="relative w-8 h-0.5 bg-emerald-800 overflow-hidden">
              <div className="absolute inset-0 bg-emerald-400 animate-data-flow" />
            </div>
            <span className="text-emerald-200 bg-emerald-900/90 px-3 py-1 rounded-md border border-emerald-600/70 shadow-2xs">
              03 ACCESS
            </span>
          </div>
        </div>

        {/* 3 Step Interactive Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Column: 3 Steps */}
          <div className="lg:col-span-6 space-y-4">
            {SITE_CONFIG.steps.map((item, idx) => {
              const isActive = activeStep === idx;
              return (
                <div
                  key={item.step}
                  onClick={() => setActiveStep(idx)}
                  className={`p-6 rounded-2xl text-left cursor-pointer transition-all duration-200 border ${
                    isActive
                      ? 'bg-slate-900/90 border-emerald-400 shadow-xl ring-1 ring-emerald-400/40 text-white'
                      : 'bg-slate-950/60 hover:bg-slate-900/70 border-emerald-900/40 hover:border-emerald-700/60 text-slate-300'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center font-mono font-bold text-sm shrink-0 transition-colors shadow-2xs ${
                        isActive
                          ? 'bg-emerald-500 text-slate-950 ring-2 ring-emerald-300'
                          : 'bg-slate-800 text-emerald-400 border border-emerald-800/50'
                      }`}
                    >
                      {item.step}
                    </div>

                    <div className="space-y-1 flex-1">
                      <div className="flex items-center justify-between">
                        <h3 className="font-display text-lg font-semibold text-white tracking-tight">
                          {item.title}
                        </h3>
                        <span className="text-xs font-mono font-medium text-emerald-300 bg-emerald-950/80 px-2 py-0.5 rounded border border-emerald-800/60">
                          {item.tag}
                        </span>
                      </div>
                      <p className="text-sm text-slate-300 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Right Column: Step Preview Interactive Simulation with Encryption & Flowing Animation */}
          <div className="lg:col-span-6">
            <div className="bg-slate-900/95 rounded-2xl border border-emerald-500/40 shadow-2xl p-6 sm:p-8 text-left transition-all ring-1 ring-white/10 backdrop-blur-md">
              
              <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
                <span className="text-xs font-mono font-semibold text-emerald-300 bg-emerald-950/90 px-2.5 py-1 rounded-md border border-emerald-700/70 shadow-2xs">
                  {stepVisuals[activeStep].badge}
                </span>
                <span className="text-xs text-emerald-400/80 font-mono flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping inline-block" />
                  Live Flow
                </span>
              </div>

              <h4 className="font-display text-xl font-bold text-white mb-2">
                {stepVisuals[activeStep].title}
              </h4>
              <p className="text-sm text-slate-300 mb-6 leading-relaxed">
                {stepVisuals[activeStep].desc}
              </p>

              {/* Dynamic Step Visual */}
              <div className="rounded-xl p-5 border border-slate-800 bg-slate-950/90 shadow-inner">
                {activeStep === 0 && (
                  <div className="space-y-3">
                    <div className="border-2 border-dashed border-emerald-500/40 rounded-xl p-6 text-center bg-emerald-950/30">
                      <Upload className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
                      <p className="font-display text-sm font-semibold text-white">
                        Drop records or choose files
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        PDF, DICOM summaries, Scanned Prescriptions (Processed in browser sandbox)
                      </p>
                    </div>
                    <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 flex items-center justify-between text-xs shadow-2xs">
                      <span className="flex items-center gap-2 font-medium text-slate-200">
                        <FileText className="w-4 h-4 text-emerald-400" />
                        blood_panel_march_2026.pdf
                      </span>
                      <span className="text-emerald-400 font-mono">1.8 MB · Local RAM</span>
                    </div>
                  </div>
                )}

                {activeStep === 1 && (
                  <div className="space-y-3 font-mono text-xs">
                    {/* Live encryption visual with pulsing ring and streaming cipher stream */}
                    <div className="relative bg-black/80 text-slate-200 p-4 rounded-xl border border-emerald-500/40 space-y-2.5 overflow-hidden">
                      {/* Flowing data beam behind cipher */}
                      <div className="absolute top-0 bottom-0 left-0 w-2/3 bg-gradient-to-r from-transparent via-emerald-500/10 to-transparent animate-data-flow pointer-events-none" />

                      <div className="flex items-center justify-between text-emerald-400 text-[11px]">
                        <span className="flex items-center gap-2">
                          <div className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center animate-encrypt-pulse">
                            <Lock className="w-3 h-3 text-emerald-400" />
                          </div>
                          <span className="font-semibold">Local Cryptographic Engine</span>
                        </span>
                        <span className="bg-emerald-950 text-emerald-300 border border-emerald-700/60 px-2 py-0.5 rounded text-[10px]">
                          AES-256-GCM Active
                        </span>
                      </div>

                      {/* Stream ciphertext */}
                      <div className="bg-slate-950 p-3 rounded-lg text-emerald-300 text-[11px] break-all border border-emerald-900/60 font-mono leading-relaxed space-y-1">
                        <div className="text-[10px] text-slate-400 flex justify-between">
                          <span>IV: 0x9b4a1...</span>
                          <span className="text-emerald-400 animate-pulse">● ENCRYPTING IN RAM</span>
                        </div>
                        <p className="text-emerald-200/90 font-mono">
                          enc_payload: 8a4f912cb90...72c83d91ae049fe71b9c20a48...auth_tag::7b12
                        </p>
                      </div>

                      <p className="text-[11px] text-slate-300 font-sans">
                        Plaintext is purged from transit memory. The encrypted bundle is all that the cloud synchronization worker receives.
                      </p>
                    </div>

                    <div className="text-[11px] text-emerald-300 flex items-center gap-2 pt-1 font-sans">
                      <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span>Zero readable medical data ever leaves this device in plaintext.</span>
                    </div>
                  </div>
                )}

                {activeStep === 2 && (
                  <div className="space-y-3">
                    <div className="bg-slate-900 p-4 rounded-xl border border-slate-800 space-y-3 shadow-2xs">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-white flex items-center gap-1.5">
                          <Smartphone className="w-4 h-4 text-emerald-400" />
                          <span>Authorized Device Sync</span>
                        </span>
                        <span className="text-xs font-mono text-emerald-300 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-700/60 font-medium">
                          Unlocked with Passkey
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">
                        Credentials verified on local device. Records unlocked in volatile memory for viewing, sorting, and offline inspection.
                      </p>
                      <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                        <span>Synced over TLS 1.3</span>
                        <span className="font-semibold text-emerald-400">Decrypted Locally</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Progress step triggers */}
              <div className="flex items-center justify-between pt-5 mt-4 border-t border-slate-800 text-xs font-mono">
                <button
                  type="button"
                  onClick={() => setActiveStep((prev) => (prev > 0 ? prev - 1 : 2))}
                  className="px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 hover:text-white hover:border-slate-500 transition-colors cursor-pointer"
                >
                  ← Previous step
                </button>
                <div className="flex items-center gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <button
                      key={i}
                      onClick={() => setActiveStep(i)}
                      className={`h-2 rounded-full transition-all cursor-pointer ${
                        activeStep === i ? 'w-6 bg-emerald-400' : 'w-2 bg-slate-700'
                      }`}
                      aria-label={`Go to step ${i + 1}`}
                    />
                  ))}
                </div>
                <button
                  type="button"
                  onClick={() => setActiveStep((prev) => (prev < 2 ? prev + 1 : 0))}
                  className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-medium hover:bg-emerald-500 transition-colors cursor-pointer shadow-xs"
                >
                  Next step →
                </button>
              </div>

            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
