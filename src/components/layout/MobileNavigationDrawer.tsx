import React, { useEffect } from 'react';
import { X, Lock, ShieldCheck } from 'lucide-react';
import { VitalLogo } from '../common/VitalLogo';
import type { ActiveTab } from './Sidebar';
import { NAV_ITEMS } from './Sidebar';

interface MobileNavigationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  isUnlocked: boolean;
}

export const MobileNavigationDrawer: React.FC<MobileNavigationDrawerProps> = ({
  isOpen,
  onClose,
  activeTab,
  setActiveTab,
  isUnlocked,
}) => {
  // Prevent background scrolling when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 md:hidden flex">
      {/* Dimmed Backdrop with fade transition */}
      <div
        className="fixed inset-0 bg-stone-900/60 dark:bg-black/70 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Slide-out Drawer Panel */}
      <div className="relative w-72 max-w-[85vw] bg-white dark:bg-stone-900 h-full p-5 flex flex-col justify-between shadow-2xl z-10 border-r border-stone-200 dark:border-stone-800 animate-in slide-in-from-left duration-200">
        {/* Drawer Header */}
        <div className="flex flex-col gap-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100 dark:border-stone-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-emerald-600 dark:bg-emerald-700 rounded-xl flex items-center justify-center shadow-xs p-1.5 shrink-0">
                <VitalLogo className="w-full h-full text-white" />
              </div>
              <div>
                <span className="text-base font-extrabold tracking-tight text-stone-900 dark:text-stone-100">
                  Vital <span className="font-serif italic font-normal text-emerald-700 dark:text-emerald-400">Diaries</span>
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              aria-label="Close navigation drawer"
              className="p-1.5 text-stone-400 hover:text-stone-700 dark:hover:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="px-3 py-1 text-[11px] font-extrabold text-stone-700 dark:text-stone-400 uppercase tracking-widest">
            Health Management
          </div>

          {/* Navigation Items */}
          <nav className="flex flex-col gap-1.5">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    onClose();
                  }}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                    isActive
                      ? 'bg-emerald-100/90 dark:bg-stone-800 shadow-2xs border border-emerald-300 dark:border-stone-700 text-stone-950 dark:text-emerald-400'
                      : 'text-stone-900 dark:text-stone-200 hover:bg-stone-100 dark:hover:bg-stone-800 hover:text-black dark:hover:text-white border border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-700 dark:text-emerald-400' : 'text-stone-700 dark:text-stone-400'}`} />
                  <span className="text-stone-900 dark:text-stone-200">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Drawer Footer Status & Privacy */}
        <div className="flex flex-col gap-3 pt-4 border-t border-stone-100 dark:border-stone-800">
          {!isUnlocked && (
            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/40 rounded-2xl border border-amber-200/70 dark:border-amber-800/60 text-amber-900 dark:text-amber-200">
              <div className="flex items-center gap-2 text-xs font-bold mb-1">
                <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Vault Locked</span>
              </div>
              <p className="text-[11px] text-amber-800/90 dark:text-amber-300/90 leading-relaxed">
                Unlock vault to decrypt medical details.
              </p>
            </div>
          )}

          <div className="p-3.5 bg-emerald-50/80 dark:bg-emerald-950/40 rounded-2xl border border-emerald-100 dark:border-emerald-800/60">
            <h4 className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider mb-1">
              Privacy Assurance
            </h4>
            <p className="text-[11px] leading-relaxed text-emerald-900/90 dark:text-emerald-200/90">
              Zero cloud database storage. Plaintext never leaves device.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
