import React, { useState } from 'react';
import { SITE_CONFIG } from './config';
import {
  Lock,
  Unlock,
  ShieldCheck,
  FileText,
  Activity,
  Pill,
  ArrowRight,
  Eye,
  CheckCircle2,
  HardDriveDownload,
  Key
} from 'lucide-react';

interface HeroProps {
  onNavigateAuth: (route: string) => void;
}

export const Hero: React.FC<HeroProps> = ({ onNavigateAuth }) => {
  // Interactive mock state for dashboard preview
  const [activeTab, setActiveTab] = useState<'decrypted' | 'encrypted'>('decrypted');
  const [selectedRecordId, setSelectedRecordId] = useState<string>('rec-1');

  const mockRecords = [
    {
      id: 'rec-1',
      title: 'Blood Report',
      category: 'Diagnostic Lab',
      date: 'Mar 14, 2026',
      icon: Activity,
      summary: 'Comprehensive Panel · 14 markers verified in normal range',
      encryptedPayload: 'enc_v1:gcm:8f9a2b0e4c1d6837aa90...[3.8 KB]',
      doctor: 'Dr. Evelyn Reed (General Practice)',
      metrics: [
        { label: 'Fasting Glucose', value: '88 mg/dL', status: 'Normal' },
        { label: 'Total Cholesterol', value: '182 mg/dL', status: 'Optimal' },
        { label: 'Hemoglobin A1c', value: '5.2%', status: 'Normal' },
      ],
    },
    {
      id: 'rec-2',
      title: 'Prescription',
      category: 'Pharmacy Record',
      date: 'Feb 28, 2026',
      icon: Pill,
      summary: 'OptiCare Ophthalmic Solution · 1 Refill remaining',
      encryptedPayload: 'enc_v1:gcm:33de71c9902fae81b012...[1.2 KB]',
      doctor: 'Dr. Marcus Vance (Ophthalmology)',
      metrics: [
        { label: 'Dosage', value: '1 Drop / Eye', status: 'Active' },
        { label: 'Frequency', value: 'Twice daily', status: 'Scheduled' },
        { label: 'Refills Left', value: '1 of 3', status: 'Available' },
      ],
    },
    {
      id: 'rec-3',
      title: 'Health Checkup',
      category: 'Preventive Visit',
      date: 'Jan 19, 2026',
      icon: FileText,
      summary: 'Annual Preventive Assessment · Routine vitals recorded',
      encryptedPayload: 'enc_v1:gcm:aa199ef02b13c7784019...[5.1 KB]',
      doctor: 'City Health Clinic',
      metrics: [
        { label: 'Blood Pressure', value: '118/76 mmHg', status: 'Normal' },
        { label: 'Resting Pulse', value: '64 bpm', status: 'Optimal' },
        { label: 'BMI', value: '22.4', status: 'Normal' },
      ],
    },
  ];

  const currentRecord = mockRecords.find((r) => r.id === selectedRecordId) || mockRecords[0];

  return (
    <section id="home" className="relative pt-8 pb-16 lg:pt-16 lg:pb-24 overflow-hidden tech-grid-pattern">
      {/* Subtle background glow/grid pattern */}
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(55%_45%_at_50%_0%,rgba(16,185,129,0.08)_0%,transparent_100%)] pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
          
          {/* Left Column: Value Proposition & CTAs */}
          <div className="lg:col-span-6 space-y-6 text-left">
            {/* Eyebrow with JetBrains Mono */}
            <div className="inline-flex items-center gap-2 text-xs font-mono font-semibold tracking-wider text-emerald-800 uppercase bg-emerald-50/80 px-2.5 py-1 rounded-md border border-emerald-200/60 shadow-2xs">
              <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" aria-hidden="true" />
              <span>{SITE_CONFIG.eyebrow}</span>
            </div>

            {/* Main Headline - Space Grotesk */}
            <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-slate-900 leading-[1.08] text-balance">
              Your health records.{' '}
              <span className="text-emerald-700 block mt-1">Your privacy.</span>
              <span className="block mt-1">Your control.</span>
            </h1>

            {/* Supporting Text */}
            <p className="text-base sm:text-lg text-slate-600 leading-relaxed max-w-xl">
              {SITE_CONFIG.heroDescription}
            </p>

            {/* CTAs */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
              <button
                onClick={() => onNavigateAuth(SITE_CONFIG.routes.signup)}
                className="inline-flex items-center justify-center gap-2 px-6 py-3.5 text-base font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-xl shadow-sm transition-all duration-150 cursor-pointer focus-visible:outline-2 focus-visible:outline-emerald-600 focus-visible:outline-offset-2"
              >
                <span>Get Started</span>
                <ArrowRight className="w-4.5 h-4.5" />
              </button>

              <a
                href="#how-it-works"
                className="inline-flex items-center justify-center px-6 py-3.5 text-base font-medium text-slate-700 hover:text-slate-950 bg-white hover:bg-slate-50 border border-slate-200/90 rounded-xl shadow-xs transition-colors focus-visible:outline-2 focus-visible:outline-emerald-600"
              >
                See How It Works
              </a>
            </div>

            {/* Unboxed Trust Signals */}
            <div className="pt-4 border-t border-slate-200/80 flex flex-wrap items-center gap-y-2 gap-x-3 text-xs text-slate-500 font-mono">
              <span className="flex items-center gap-1.5 text-slate-700 font-medium">
                <Lock className="w-3.5 h-3.5 text-emerald-600" />
                <span>Client-side encryption</span>
              </span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span>Zero plaintext cloud storage</span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span>Local on-device unlock</span>
            </div>
          </div>

          {/* Right Column: Abstract Product Preview / Dashboard Mockup with Depth Glow */}
          <div className="lg:col-span-6 relative">
            {/* Soft ambient radial emerald glow behind dashboard mockup */}
            <div className="absolute -inset-6 sm:-inset-10 bg-[radial-gradient(ellipse_at_center,rgba(16,185,129,0.22)_0%,rgba(13,148,136,0.12)_35%,transparent_70%)] blur-2xl -z-10 pointer-events-none" />

            <div className="relative mx-auto max-w-xl lg:max-w-none rounded-2xl glass-card border border-slate-200/80 shadow-2xl overflow-hidden transition-all duration-200">
              
              {/* Mockup Window Header */}
              <div className="bg-slate-50/90 border-b border-slate-200/80 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5" aria-hidden="true">
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block" />
                    <span className="w-2.5 h-2.5 rounded-full bg-slate-300 inline-block" />
                  </div>
                  <span className="ml-2 font-display text-xs font-semibold text-slate-800 tracking-tight">
                    Health Overview
                  </span>
                </div>

                {/* Encrypted Locally Indicator */}
                <div className="flex items-center gap-1.5 text-xs font-mono text-emerald-800 bg-emerald-50/90 px-2 py-0.5 rounded-md border border-emerald-200/70 font-medium shadow-2xs">
                  <Lock className="w-3 h-3 text-emerald-600" />
                  <span>🔒 Encrypted locally</span>
                </div>
              </div>

              {/* Mockup Interactive Mode Bar */}
              <div className="bg-slate-100/70 border-b border-slate-200/80 px-4 py-2 flex items-center justify-between text-xs">
                <div className="flex items-center gap-1 bg-white p-0.5 rounded-lg border border-slate-200/90 shadow-2xs">
                  <button
                    onClick={() => setActiveTab('decrypted')}
                    className={`px-3 py-1 rounded-md font-mono text-xs font-medium transition-colors cursor-pointer ${
                      activeTab === 'decrypted'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Decrypted View
                  </button>
                  <button
                    onClick={() => setActiveTab('encrypted')}
                    className={`px-3 py-1 rounded-md font-mono text-xs font-medium transition-colors cursor-pointer ${
                      activeTab === 'encrypted'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Cloud Sync Payload
                  </button>
                </div>

                <span className="text-slate-500 font-mono hidden sm:inline text-[11px]">
                  Fictional preview
                </span>
              </div>

              {/* Mockup Body Content */}
              <div className="p-5 space-y-4">
                {activeTab === 'decrypted' ? (
                  <>
                    {/* Vault Summary Cards */}
                    <div className="grid grid-cols-3 gap-2.5">
                      <div className="glass-card-subtle p-2.5 rounded-xl border border-slate-200/80 text-left">
                        <span className="text-[11px] font-mono text-slate-500 block">Total Records</span>
                        <span className="font-display text-base font-bold text-slate-900 tabular-nums">3 Stored</span>
                      </div>
                      <div className="glass-card-subtle p-2.5 rounded-xl border border-slate-200/80 text-left">
                        <span className="text-[11px] font-mono text-slate-500 block">Vault Status</span>
                        <span className="font-display text-base font-bold text-emerald-700 flex items-center gap-1">
                          <Unlock className="w-3.5 h-3.5" />
                          <span>Unlocked</span>
                        </span>
                      </div>
                      <div className="glass-card-subtle p-2.5 rounded-xl border border-slate-200/80 text-left">
                        <span className="text-[11px] font-mono text-slate-500 block">Sync Protocol</span>
                        <span className="font-display text-base font-bold text-slate-900">Zero-Plain</span>
                      </div>
                    </div>

                    {/* Recent Records Heading */}
                    <div className="text-left pt-1">
                      <h3 className="font-display text-xs font-semibold text-slate-900 uppercase tracking-wider">
                        Recent Records
                      </h3>
                    </div>

                    {/* Recent Records List */}
                    <div className="space-y-2">
                      {mockRecords.map((record) => {
                        const Icon = record.icon;
                        const isSelected = record.id === currentRecord.id;

                        return (
                          <div
                            key={record.id}
                            onClick={() => setSelectedRecordId(record.id)}
                            className={`p-3 rounded-xl border transition-all text-left cursor-pointer ${
                              isSelected
                                ? 'bg-emerald-50/50 border-emerald-300 ring-1 ring-emerald-200/50 shadow-xs'
                                : 'glass-card-interactive border-slate-200/80 hover:border-slate-300'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3">
                                <div
                                  className={`p-2 rounded-lg mt-0.5 ${
                                    isSelected
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-slate-100 text-slate-700 border border-slate-200/60'
                                  }`}
                                >
                                  <Icon className="w-4 h-4" />
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-display text-sm font-semibold text-slate-900">
                                      {record.title}
                                    </h4>
                                    <span className="text-[11px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                                      {record.category}
                                    </span>
                                  </div>
                                  <p className="text-xs text-slate-600 mt-0.5">
                                    {record.summary}
                                  </p>
                                </div>
                              </div>
                              <span className="text-[11px] font-mono text-slate-500 tabular-nums whitespace-nowrap">
                                {record.date}
                              </span>
                            </div>

                            {/* Active Record Detail Expansion */}
                            {isSelected && (
                              <div className="mt-3 pt-2.5 border-t border-emerald-200/60 grid grid-cols-3 gap-2">
                                {record.metrics.map((m) => (
                                  <div key={m.label} className="bg-white/90 p-2 rounded-lg border border-emerald-100 shadow-2xs">
                                    <span className="text-[10px] font-mono text-slate-500 block truncate">
                                      {m.label}
                                    </span>
                                    <span className="font-display text-xs font-semibold text-slate-900 tabular-nums block">
                                      {m.value}
                                    </span>
                                    <span className="text-[10px] font-mono text-emerald-700 font-medium">
                                      {m.status}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </>
                ) : (
                  /* Encrypted Cloud Payload Simulation */
                  <div className="space-y-3 text-left">
                    <div className="p-3.5 bg-slate-900 text-slate-200 rounded-xl font-mono text-xs space-y-2 border border-slate-800 shadow-inner">
                      <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-2">
                        <span className="flex items-center gap-1.5 text-emerald-400">
                          <Lock className="w-3.5 h-3.5" />
                          <span>Cloud Sync Ciphertext Payload</span>
                        </span>
                        <span className="bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded text-[10px]">AES-256-GCM</span>
                      </div>
                      <p className="text-[11px] text-slate-400 leading-relaxed font-sans">
                        What the server and network transit see. Plaintext records, names, and medical details are replaced with cryptographically sealed blocks:
                      </p>
                      <div className="bg-black/60 p-2.5 rounded-lg text-[11px] text-emerald-300 break-all leading-normal select-all border border-slate-800/80">
                        {`{"sync_id":"vd_0x82f4e","vault_version":3,"iv":"dGhpcy1pcy1hbi1pdi12YWx1ZQ==","ciphertext":"U2FsdGVkX1+9bY2w...8f9a2b0e4c1d6837aa90de29c01827419fa821","auth_tag":"9b3c4f7a1e0d"}`}
                      </div>
                      <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 font-mono">
                        <span>Readable Medical Data: <strong className="text-white">0 Bytes</strong></span>
                        <span className="text-emerald-400">Decrypted on device</span>
                      </div>
                    </div>

                    <div className="glass-card-subtle p-3 rounded-xl border border-slate-200/80 text-xs text-slate-600 flex items-start gap-2.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <p>
                        Without your personal cryptographic key, synced data resembles random digital noise. Even if cloud storage is intercepted, your private consultations and diagnoses remain unreadable.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Mockup Footer Notice */}
              <div className="bg-slate-50/70 border-t border-slate-100 px-4 py-2.5 text-center text-[11px] font-mono text-slate-500">
                Visual mockup for illustrative purposes · Non-sensitive fictional data
              </div>
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
