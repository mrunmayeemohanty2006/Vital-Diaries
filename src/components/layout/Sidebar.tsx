import React from 'react';
import { LayoutDashboard, FileText, Activity, Pill, User, DownloadCloud, Shield, Lock, Sparkles, Settings as SettingsIcon } from 'lucide-react';

export type ActiveTab = 'dashboard' | 'records' | 'ai-advisor' | 'vitals' | 'medications' | 'profile' | 'backup' | 'privacy' | 'settings';

interface SidebarProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isUnlocked: boolean;
}

export const NAV_ITEMS = [
  { id: 'dashboard' as ActiveTab, label: 'Dashboard', icon: LayoutDashboard },
  { id: 'records' as ActiveTab, label: 'Health Records', icon: FileText },
  { id: 'ai-advisor' as ActiveTab, label: 'Get Insights', icon: Activity },
  { id: 'vitals' as ActiveTab, label: 'Vitals & Metrics', icon: Activity },
  { id: 'medications' as ActiveTab, label: 'Medications', icon: Pill },
  { id: 'profile' as ActiveTab, label: 'My Health Profile', icon: User },
  { id: 'settings' as ActiveTab, label: 'Settings & Data', icon: SettingsIcon },
];

export const TAB_LABELS: Record<ActiveTab, string> = {
  'dashboard': 'Dashboard',
  'records': 'Health Records',
  'ai-advisor': 'Get Insights',
  'vitals': 'Vitals & Metrics',
  'medications': 'Medications',
  'profile': 'My Health Profile',
  'settings': 'Settings & Data',
  'privacy': 'Settings & Data',
  'backup': 'Settings & Data',
};

export const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, isUnlocked }) => {
  return (
    <aside className="hidden md:flex w-64 border-r border-stone-200 dark:border-stone-800 bg-stone-50/50 dark:bg-stone-900/40 p-5 flex-col justify-between shrink-0 h-[calc(100vh-4rem)] sticky top-16 transition-colors">
      <div className="flex flex-col gap-1.5">
        <div className="px-3 py-2 text-[11px] font-extrabold text-stone-700 dark:text-stone-400 uppercase tracking-widest">
          Health Management
        </div>
        <nav className="flex flex-col gap-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${
                  isActive
                    ? 'bg-emerald-100/90 dark:bg-stone-800 shadow-2xs border border-emerald-300 dark:border-stone-700 text-stone-950 dark:text-emerald-400'
                    : 'text-stone-900 dark:text-stone-200 hover:bg-stone-200/70 dark:hover:bg-stone-800 hover:text-black dark:hover:text-white border border-transparent'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-700 dark:text-emerald-400' : 'text-stone-700 dark:text-stone-400'}`} />
                <span className="text-stone-900 dark:text-stone-200">{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      <div className="flex flex-col gap-3">
        {!isUnlocked && (
          <div className="p-4 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200/70 dark:border-amber-800/60 text-amber-900 dark:text-amber-200">
            <div className="flex items-center gap-2 text-xs font-bold mb-1">
              <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>Vault Locked</span>
            </div>
            <p className="text-xs text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
              Unlock vault with your passphrase to decrypt medical details.
            </p>
          </div>
        )}

        <div className="p-4 bg-emerald-50/80 dark:bg-emerald-950/40 rounded-2xl border border-emerald-100 dark:border-emerald-800/60">
          <h4 className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider mb-1.5">
            Privacy Assurance
          </h4>
          <p className="text-xs leading-relaxed text-emerald-900/90 dark:text-emerald-200/90">
            Health records never leave this device in plaintext. Zero cloud database storage.
          </p>
        </div>
      </div>
    </aside>
  );
};

