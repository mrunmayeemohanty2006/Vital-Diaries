import React from 'react';
import { Sparkles, ShieldCheck, Activity, FileText, CheckCircle2 } from 'lucide-react';
import type { HealthReport, VitalLogEntry } from '../../types/health';

interface LocalInsightsProps {
  reportCount: number;
  vitalsCount: number;
  isUnlocked: boolean;
  onNavigateTab: (tab: 'records' | 'vitals') => void;
}

export const LocalInsights: React.FC<LocalInsightsProps> = ({
  reportCount,
  vitalsCount,
  isUnlocked,
  onNavigateTab,
}) => {
  return (
    <div className="bg-gradient-to-br from-emerald-900 to-stone-900 text-stone-100 p-6 sm:p-8 rounded-[2.5rem] shadow-xl relative overflow-hidden">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-emerald-400" />
          <span className="text-xs font-bold text-emerald-400 uppercase tracking-widest">
            On-Device Local Health Analysis
          </span>
        </div>
        <span className="px-2.5 py-0.5 bg-emerald-500/20 text-emerald-300 text-[10px] font-bold rounded-full border border-emerald-500/30">
          Zero Network Payload
        </span>
      </div>

      <h3 className="text-xl font-bold mb-2 text-white">Local Health Vault Summary</h3>
      <p className="text-xs text-stone-300 leading-relaxed mb-6">
        Your health records and vitals are decrypted exclusively in browser memory when unlocked. No health records are sent to external cloud AI servers.
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-6">
        <div
          onClick={() => onNavigateTab('records')}
          className="p-3.5 bg-stone-800/80 hover:bg-stone-800 rounded-2xl border border-stone-700/80 cursor-pointer transition-colors"
        >
          <div className="text-[10px] font-bold text-stone-400 uppercase mb-1">Encrypted Reports</div>
          <div className="text-lg font-bold text-emerald-400 font-mono">{reportCount} Records</div>
        </div>

        <div
          onClick={() => onNavigateTab('vitals')}
          className="p-3.5 bg-stone-800/80 hover:bg-stone-800 rounded-2xl border border-stone-700/80 cursor-pointer transition-colors"
        >
          <div className="text-[10px] font-bold text-stone-400 uppercase mb-1">Vitals Logged</div>
          <div className="text-lg font-bold text-emerald-400 font-mono">{vitalsCount} Entries</div>
        </div>

        <div className="p-3.5 bg-stone-800/80 rounded-2xl border border-stone-700/80">
          <div className="text-[10px] font-bold text-stone-400 uppercase mb-1">Privacy Guarantee</div>
          <div className="text-xs font-bold text-emerald-300 flex items-center gap-1 mt-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            100% On-Device
          </div>
        </div>
      </div>

      <div className="p-4 bg-emerald-950/60 rounded-2xl border border-emerald-800/60 text-xs text-emerald-200/90 leading-relaxed">
        <span className="font-bold text-emerald-300 block mb-1">Local Health Observation:</span>
        All physiological parameters (CBC, Blood Pressure, ECG) reside in your local IndexedDB. Encrypted backups protect against hardware loss.
      </div>
    </div>
  );
};
