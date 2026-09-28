import React from 'react';
import { SITE_CONFIG } from './config';
import { ArrowRight, ShieldCheck, Lock, Sparkles } from 'lucide-react';

interface FinalCTAProps {
  onNavigateAuth: (route: string) => void;
}

export const FinalCTA: React.FC<FinalCTAProps> = ({ onNavigateAuth }) => {
  return (
    <section id="final-cta-section" className="relative py-24 sm:py-28 bg-gradient-to-b from-slate-900 via-[#032e22] to-[#022118] text-white border-t border-emerald-900/60 overflow-hidden tech-grid-dark">
      {/* Deep forest green ambient lighting with bright mint focal glows */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[450px] bg-emerald-500/20 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute top-0 right-10 w-80 h-80 bg-teal-400/15 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute bottom-0 left-10 w-80 h-80 bg-emerald-300/15 blur-[100px] rounded-full pointer-events-none" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl bg-[#04281e]/90 text-white p-8 sm:p-14 lg:p-16 overflow-hidden shadow-2xl text-center border border-emerald-500/30 ring-1 ring-emerald-400/20 backdrop-blur-xl">
          
          {/* Subtle bright mint decorative ring & beam */}
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-80 h-80 rounded-full bg-emerald-400/25 blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-80 h-80 rounded-full bg-teal-300/20 blur-3xl pointer-events-none" />

          <div className="relative z-10 max-w-2xl mx-auto space-y-6">
            
            {/* Bright Mint Eyebrow Accent */}
            <div className="inline-flex items-center gap-2 text-xs font-mono font-semibold uppercase tracking-wider text-emerald-200 bg-emerald-950/90 px-3.5 py-1.5 rounded-md border border-emerald-400/40 shadow-sm shadow-emerald-950/50">
              <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
              <span>Begin Your Private Health Record</span>
            </div>

            {/* Crisp Pure White Typography */}
            <h2 className="font-display text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.08] text-balance">
              Take control of your health records.
            </h2>

            <p className="text-base sm:text-lg text-emerald-100/90 leading-relaxed text-balance max-w-xl mx-auto">
              Create your private health vault with Vital Diaries. Encrypted on your device before sync. Accessible only by you.
            </p>

            {/* CTAs with Bright Mint Accents */}
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3.5">
              <button
                onClick={() => onNavigateAuth(SITE_CONFIG.routes.signup)}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 text-base font-semibold text-slate-950 bg-emerald-400 hover:bg-emerald-300 active:bg-emerald-500 rounded-xl shadow-lg shadow-emerald-500/25 hover:shadow-emerald-400/35 transition-all duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-white focus-visible:outline-offset-2 ring-1 ring-white/40"
              >
                <span>Create Your Vault</span>
                <ArrowRight className="w-4.5 h-4.5 text-slate-950" />
              </button>

              <button
                onClick={() => onNavigateAuth(SITE_CONFIG.routes.login)}
                className="w-full sm:w-auto inline-flex items-center justify-center px-7 py-4 text-base font-medium text-emerald-100 hover:text-white bg-emerald-950/80 hover:bg-emerald-900/90 border border-emerald-700/60 rounded-xl transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-white"
              >
                Sign In
              </button>
            </div>

            {/* Quiet Reassure Note in bright mint accent */}
            <div className="pt-4 flex flex-wrap items-center justify-center gap-x-4 gap-y-2 text-xs font-mono text-emerald-300/80">
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Zero telemetry pixels</span>
              </span>
              <span className="text-emerald-700">•</span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Client-side AES-256-GCM</span>
              </span>
              <span className="text-emerald-700">•</span>
              <span>100% ad-free custody</span>
            </div>

          </div>
        </div>
      </div>
    </section>
  );
};
