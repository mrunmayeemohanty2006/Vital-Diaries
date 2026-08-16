import React, { useState } from 'react';
import { Menu, Lock, Unlock, Key, Palette, Sun, Moon, Sparkles, ShieldCheck, Check, ChevronDown } from 'lucide-react';
import { VitalLogo } from '../common/VitalLogo';
import type { ActiveTab } from './Sidebar';
import { TAB_LABELS } from './Sidebar';
import type { AppTheme } from './Header';

interface MobileHeaderProps {
  activeTab: ActiveTab;
  isUnlocked: boolean;
  onOpenDrawer: () => void;
  onLockVault: () => void;
  onUnlockVault: () => void;
  onOpenRecoveryKey: () => void;
  userId: string;
  userName?: string;
  currentTheme: AppTheme;
  onThemeChange: (theme: AppTheme) => void;
}

export const MobileHeader: React.FC<MobileHeaderProps> = ({
  activeTab,
  isUnlocked,
  onOpenDrawer,
  onLockVault,
  onUnlockVault,
  onOpenRecoveryKey,
  userId,
  userName,
  currentTheme,
  onThemeChange,
}) => {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const pageTitle = TAB_LABELS[activeTab] || 'Dashboard';

  return (
    <header className="flex md:hidden h-14 border-b border-stone-200 dark:border-stone-800 px-3.5 items-center justify-between bg-white/90 dark:bg-stone-900/90 backdrop-blur-md sticky top-0 z-30 transition-colors">
      {/* Left: Hamburger Button & Brand Accent */}
      <div className="flex items-center gap-2">
        <button
          onClick={onOpenDrawer}
          aria-label="Open Navigation Menu"
          className="p-2 -ml-1 text-stone-700 dark:text-stone-200 hover:text-stone-950 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition-colors cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="w-7 h-7 bg-emerald-600 dark:bg-emerald-700 rounded-lg flex items-center justify-center p-1 shrink-0 shadow-2xs">
          <VitalLogo className="w-full h-full text-white" />
        </div>
      </div>

      {/* Center: Current Page Name */}
      <div className="flex-1 px-2 text-center min-w-0">
        <h1 className="text-sm font-extrabold text-stone-900 dark:text-stone-100 truncate tracking-tight">
          {pageTitle}
        </h1>
      </div>

      {/* Right: Quick Vault Status & Profile Indicator */}
      <div className="flex items-center gap-1.5 shrink-0">
        {/* Quick Lock / Unlock Icon Button */}
        {isUnlocked ? (
          <button
            onClick={onLockVault}
            title="Lock Vault"
            aria-label="Lock Vault"
            className="p-1.5 text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 rounded-lg text-xs transition-colors border border-stone-200 dark:border-stone-700"
          >
            <Unlock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          </button>
        ) : (
          <button
            onClick={onUnlockVault}
            title="Unlock Vault"
            aria-label="Unlock Vault"
            className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors shadow-2xs"
          >
            <Lock className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Existing Profile Indicator Menu */}
        <div className="relative">
          <button
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            aria-label="User Profile and Theme"
            className="flex items-center gap-1 p-1 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition-all cursor-pointer"
          >
            <div className="w-7 h-7 rounded-full bg-emerald-700 text-white flex items-center justify-center text-[11px] font-bold shadow-2xs shrink-0">
              {userName ? userName.slice(0, 2).toUpperCase() : (userId ? userId.slice(0, 2).toUpperCase() : 'VD')}
            </div>
            <ChevronDown className="w-3 h-3 text-stone-400" />
          </button>

          {isProfileMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40 bg-stone-900/30 backdrop-blur-xs"
                onClick={() => setIsProfileMenuOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-72 max-w-[calc(100vw-1.5rem)] bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-2xl z-50 p-4 space-y-4 text-stone-900 dark:text-stone-100 animate-in fade-in zoom-in-95 duration-150">
                {/* Profile Header */}
                <div className="flex items-center gap-3 pb-3 border-b border-stone-100 dark:border-stone-800">
                  <div className="w-10 h-10 rounded-full bg-emerald-700 text-white flex items-center justify-center text-sm font-bold shadow-xs shrink-0">
                    {userName ? userName.slice(0, 2).toUpperCase() : 'VD'}
                  </div>
                  <div className="overflow-hidden">
                    <h4 className="text-sm font-bold text-stone-900 dark:text-stone-100 truncate">
                      {userName || 'Health Vault User'}
                    </h4>
                    <p className="text-[10px] text-stone-400 font-mono truncate">ID: {userId}</p>
                  </div>
                </div>

                {/* Theme Selector */}
                <div>
                  <label className="text-[10px] font-bold text-stone-400 uppercase tracking-widest flex items-center gap-1.5 mb-2.5">
                    <Palette className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>App Theme</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        onThemeChange('light');
                        setIsProfileMenuOpen(false);
                      }}
                      className={`p-2.5 rounded-xl border text-left flex items-center justify-between text-xs font-bold transition-all ${
                        currentTheme === 'light'
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/60 text-stone-700 dark:text-stone-300 hover:border-stone-300'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <Sun className="w-3.5 h-3.5 text-amber-500" />
                        <span>Light</span>
                      </div>
                      {currentTheme === 'light' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onThemeChange('dark');
                        setIsProfileMenuOpen(false);
                      }}
                      className={`p-2.5 rounded-xl border text-left flex items-center justify-between text-xs font-bold transition-all ${
                        currentTheme === 'dark'
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/60 text-stone-700 dark:text-stone-300 hover:border-stone-300'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <Moon className="w-3.5 h-3.5 text-purple-400" />
                        <span>Onyx</span>
                      </div>
                      {currentTheme === 'dark' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onThemeChange('midnight');
                        setIsProfileMenuOpen(false);
                      }}
                      className={`p-2.5 rounded-xl border text-left flex items-center justify-between text-xs font-bold transition-all ${
                        currentTheme === 'midnight'
                          ? 'border-blue-600 bg-blue-50 text-blue-900 dark:bg-blue-950/60 dark:text-blue-300'
                          : 'border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/60 text-stone-700 dark:text-stone-300 hover:border-stone-300'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                        <span>Midnight</span>
                      </div>
                      {currentTheme === 'midnight' && <Check className="w-3.5 h-3.5 text-blue-600" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        onThemeChange('emerald');
                        setIsProfileMenuOpen(false);
                      }}
                      className={`p-2.5 rounded-xl border text-left flex items-center justify-between text-xs font-bold transition-all ${
                        currentTheme === 'emerald'
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : 'border-stone-200 dark:border-stone-800 bg-stone-50 dark:bg-stone-800/60 text-stone-700 dark:text-stone-300 hover:border-stone-300'
                      }`}
                    >
                      <div className="flex items-center gap-1.5">
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Forest</span>
                      </div>
                      {currentTheme === 'emerald' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                    </button>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="pt-2 border-t border-stone-100 dark:border-stone-800 flex flex-col gap-1">
                  <button
                    type="button"
                    onClick={() => {
                      onOpenRecoveryKey();
                      setIsProfileMenuOpen(false);
                    }}
                    className="w-full px-3 py-2 text-left rounded-xl text-xs font-semibold text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 flex items-center gap-2 transition-colors"
                  >
                    <Key className="w-3.5 h-3.5 text-stone-400" />
                    <span>Master Recovery Key</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onLockVault();
                      setIsProfileMenuOpen(false);
                    }}
                    className="w-full px-3 py-2 text-left rounded-xl text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 flex items-center gap-2 transition-colors"
                  >
                    <Lock className="w-3.5 h-3.5 text-rose-500" />
                    <span>Lock Vault</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
