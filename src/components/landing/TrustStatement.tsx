import React from 'react';
import { ShieldCheck, KeyRound, Cpu, RefreshCw, Info } from 'lucide-react';
import { SITE_CONFIG } from './config';
import { FloatingParticles } from './FloatingParticles';

export const TrustStatement: React.FC = () => {
  const iconMap: Record<string, React.ElementType> = {
    ShieldLock: ShieldCheck,
    KeyRound: KeyRound,
    Cpu: Cpu,
    RefreshCw: RefreshCw,
  };

  return (
    <section id="privacy-trust" className="relative py-20 sm:py-24 bg-gradient-to-b from-white via-emerald-50/40 to-emerald-50/70 border-y border-emerald-100/80 tech-dot-matrix overflow-hidden">
      {/* Floating encrypted particle field */}
      <FloatingParticles />

      {/* Pale mint subtle ambient glow */}
      <div className="absolute inset-0 bg-radial-at-c from-emerald-100/30 via-transparent to-transparent pointer-events-none -z-0" />

      <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center space-y-4 mb-12 sm:mb-16">
          <div className="inline-flex items-center gap-2 text-xs font-mono font-semibold uppercase tracking-wider text-emerald-800 bg-emerald-100/70 px-2.5 py-1 rounded-md border border-emerald-300/60 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
            <span>Zero-Knowledge Privacy</span>
          </div>

          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 text-balance">
            Your health data shouldn't be someone else's business.
          </h2>

          <p className="text-base sm:text-lg text-slate-600 leading-relaxed text-balance">
            Vital Diaries was architected from the foundation so that you never have to choose between digital convenience and personal medical confidentiality.
          </p>
        </div>

        {/* 4 Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {SITE_CONFIG.trustCards.map((card, idx) => {
            const Icon = iconMap[card.icon] || ShieldCheck;
            return (
              <div
                key={card.id}
                className="group relative p-6 glass-card-interactive rounded-2xl flex flex-col justify-between text-left"
              >
                <div>
                  {/* Card Icon & Index */}
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-10 h-10 rounded-xl bg-white border border-slate-200/80 group-hover:border-emerald-300 group-hover:bg-emerald-50/70 text-emerald-700 flex items-center justify-center transition-colors shadow-2xs">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-xs font-mono text-slate-400 font-semibold bg-slate-100/70 px-2 py-0.5 rounded border border-slate-200/50">
                      0{idx + 1}
                    </span>
                  </div>

                  {/* Title & Core Copy */}
                  <h3 className="font-display text-lg font-semibold text-slate-900 tracking-tight mb-2">
                    {card.title}
                  </h3>
                  <p className="text-sm font-medium text-slate-700 mb-3 leading-snug">
                    {card.description}
                  </p>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    {card.detail}
                  </p>
                </div>

                {/* Subtle border bottom indicator */}
                <div className="mt-6 pt-3 border-t border-slate-200/70 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                  <span>Architecture Verified</span>
                  <span className="text-emerald-700 font-medium">Device Boundary</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Responsible Transparency Disclaimer (No absolute/impossible security claims) */}
        <div className="mt-10 max-w-2xl mx-auto p-4 rounded-xl glass-card-subtle text-xs text-slate-600 flex items-start gap-3 text-left">
          <Info className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
          <p className="leading-relaxed">
            <strong>Honest Security:</strong> We do not market "100% unbreakable" or absolute claims. Instead, we rely on established, standard cryptographic primitives where encrypted records are decrypted solely on your hardware with your passkey credentials.
          </p>
        </div>

      </div>
    </section>
  );
};
