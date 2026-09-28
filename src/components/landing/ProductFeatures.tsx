import React, { useState, useEffect, useRef } from 'react';
import { SITE_CONFIG } from './config';
import {
  FileText,
  Clock,
  Search,
  Activity,
  Pill,
  Laptop,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

export const ProductFeatures: React.FC = () => {
  const [selectedFeature, setSelectedFeature] = useState<number | null>(null);
  const [visibleCards, setVisibleCards] = useState<boolean[]>(new Array(6).fill(false));
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  const iconMap: Record<string, React.ElementType> = {
    FileText,
    Clock,
    Search,
    Activity,
    Pill,
    Laptop,
  };

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    cardRefs.current.forEach((el, index) => {
      if (!el) return;
      const obs = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            setVisibleCards((prev) => {
              const updated = [...prev];
              updated[index] = true;
              return updated;
            });
            obs.unobserve(el);
          }
        },
        { threshold: 0.15, rootMargin: '0px 0px -50px 0px' }
      );
      obs.observe(el);
      observers.push(obs);
    });

    return () => {
      observers.forEach((o) => o.disconnect());
    };
  }, []);

  return (
    <section id="features" className="relative py-24 bg-gradient-to-b from-[#F8FAFC] via-white to-white border-t border-slate-200/80 tech-dot-matrix">
      <div className="absolute inset-0 bg-white/60 pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="max-w-3xl mx-auto text-center space-y-4 mb-16">
          <div className="inline-flex items-center gap-2 text-xs font-mono font-semibold uppercase tracking-wider text-emerald-800 bg-emerald-50/90 px-2.5 py-1 rounded-md border border-emerald-200/80 shadow-2xs">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
            <span>Product Capabilities</span>
          </div>

          <h2 className="font-display text-3xl sm:text-4xl font-bold tracking-tight text-slate-900 text-balance">
            Everything you need to stay organized.
          </h2>

          <p className="text-base sm:text-lg text-slate-600 leading-relaxed text-balance">
            Every capability in Vital Diaries is crafted for personal clarity, rapid retrieval, and strict on-device data sovereignty.
          </p>
        </div>

        {/* 6 Feature Cards Grid with Scroll-Emerging Effect */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {SITE_CONFIG.features.map((feature, idx) => {
            const Icon = iconMap[feature.icon] || FileText;
            const isSelected = selectedFeature === idx;
            const isEmerged = visibleCards[idx];

            return (
              <div
                key={feature.title}
                ref={(el) => { cardRefs.current[idx] = el; }}
                onClick={() => setSelectedFeature(isSelected ? null : idx)}
                style={{
                  transitionDelay: `${idx * 75}ms`,
                }}
                className={`p-7 rounded-2xl transition-all duration-500 text-left flex flex-col justify-between cursor-pointer transform ${
                  isEmerged ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
                } ${
                  isSelected
                    ? 'glass-card border-emerald-400 shadow-md ring-1 ring-emerald-300/40'
                    : 'glass-card-interactive border-slate-200/80 hover:border-slate-300'
                }`}
              >
                <div>
                  {/* Feature Icon Header */}
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-11 h-11 rounded-xl bg-white border border-slate-200/80 flex items-center justify-center text-emerald-700 shadow-2xs">
                      <Icon className="w-5 h-5" />
                    </div>
                    <span className="text-[11px] font-mono text-slate-500 bg-slate-100/80 px-2 py-0.5 rounded font-medium border border-slate-200/50">
                      0{idx + 1}
                    </span>
                  </div>

                  {/* Feature Title & Description */}
                  <h3 className="font-display text-lg font-semibold text-slate-900 tracking-tight mb-2.5">
                    {feature.title}
                  </h3>
                  <p className="text-sm text-slate-600 leading-relaxed">
                    {feature.description}
                  </p>
                </div>

                {/* Feature Anchor Tagline */}
                <div className="mt-6 pt-4 border-t border-slate-200/70 flex items-center justify-between font-mono">
                  <span className="text-xs font-medium text-emerald-800">
                    {feature.benefit}
                  </span>
                  <ChevronRight
                    className={`w-4 h-4 text-slate-400 transition-transform ${
                      isSelected ? 'rotate-90 text-emerald-600' : ''
                    }`}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Local Processing Guarantee Banner */}
        <div className="mt-12 p-6 rounded-2xl glass-card-subtle flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-left">
          <div className="flex items-start gap-3.5">
            <div className="w-9 h-9 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0 mt-0.5 shadow-2xs">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-display text-sm font-semibold text-slate-900">
                Transparent Local Architecture
              </h4>
              <p className="text-xs text-slate-600 mt-0.5 max-w-2xl">
                Vital Diaries uses deterministic, offline parsers for timeline aggregation, document indexing, and reference interval comparison. Your health records never train third-party machine learning models.
              </p>
            </div>
          </div>

          <div className="text-xs font-mono text-emerald-800 bg-white/90 px-3 py-1.5 rounded-lg border border-slate-200/80 whitespace-nowrap self-end sm:self-center shadow-2xs">
            Zero-Telemetry Record Index
          </div>
        </div>

      </div>
    </section>
  );
};
