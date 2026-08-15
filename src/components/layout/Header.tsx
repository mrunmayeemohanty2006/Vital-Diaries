import React, { useState } from 'react';
import { ShieldCheck, Lock, Unlock, Database, Key, Palette, Sun, Moon, Sparkles, Check, ChevronDown } from 'lucide-react';
import { VitalLogo } from '../common/VitalLogo';

export type AppTheme = 'light' | 'dark' | 'midnight' | 'emerald';

interface HeaderProps {
  isUnlocked: boolean;
  isPersistent: boolean;
  onLockVault: () => void;
  onUnlockVault: () => void;
  onOpenRecoveryKey: () => void;
  userId: string;
  userName?: string;
  currentTheme: AppTheme;
  onThemeChange: (theme: AppTheme) => void;
}

export const Header: React.FC<HeaderProps> = ({
  isUnlocked,
  isPersistent,
  onLockVault,
  onUnlockVault,
  onOpenRecoveryKey,
  userId,
  userName,
  currentTheme,
  onThemeChange,
}) => {
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  return (
    <header className="h-16 border-b border-stone-200 dark:border-stone-800 px-6 lg:px-8 flex items-center justify-between bg-white/80 dark:bg-stone-900/80 backdrop-blur-md sticky top-0 z-30 transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 bg-emerald-600 dark:bg-emerald-700 rounded-xl flex items-center justify-center shadow-xs p-1.5 transition-colors shrink-0">
          <VitalLogo className="w-full h-full text-white" />
        </div>
        <div className="flex items-baseline gap-2">
          <span className="text-xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100">
            Vital <span className="font-serif italic font-normal text-emerald-700 dark:text-emerald-400">Diaries</span>
          </span>
          <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 text-[10px] font-bold uppercase rounded-md tracking-wider border border-emerald-200/60 dark:border-emerald-800/60">
            Local-First
          </span>
        </div>
      </div>

      <div className="flex items-center gap-3 md:gap-4">
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 bg-stone-100/80 dark:bg-stone-800/80 rounded-full text-xs font-medium text-stone-700 dark:text-stone-300 border border-stone-200/60 dark:border-stone-700/60">
          <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
          <span>AES-256-GCM Encrypted</span>
        </div>

        {isPersistent && (
          <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-950/60 rounded-full text-xs font-semibold text-emerald-800 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
            <Database className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Storage Persistent</span>
          </div>
        )}

        {isUnlocked ? (
          <button
            onClick={onLockVault}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-stone-100 dark:bg-stone-800 hover:bg-stone-200 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 rounded-xl text-xs font-semibold transition-colors border border-stone-200 dark:border-stone-700"
            title="Lock local vault and remove encryption keys from memory"
          >
            <Unlock className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Vault Unlocked</span>
          </button>
        ) : (
          <button
            onClick={onUnlockVault}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors shadow-xs"
          >
            <Lock className="w-3.5 h-3.5" />
            <span>Unlock Vault</span>
          </button>
        )}

        <button
          onClick={onOpenRecoveryKey}
          className="p-2 text-stone-600 dark:text-stone-300 hover:text-stone-900 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl transition-colors border border-transparent hover:border-stone-200 dark:hover:border-stone-700"
          title="View Master Recovery Key"
        >
          <Key className="w-4 h-4" />
        </button>

        {/* User Icon & Theme Popover Menu */}
        <div className="relative pl-1 border-l border-stone-200/80 dark:border-stone-800">
          <button
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            className="flex items-center gap-2 px-2 py-1 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition-all border border-transparent hover:border-stone-200 dark:hover:border-stone-700 cursor-pointer"
            title="Profile & Theme Settings"
          >
            <div className="w-8 h-8 rounded-full bg-emerald-700 text-white flex items-center justify-center text-xs font-bold shadow-2xs">
              {userName ? userName.slice(0, 2).toUpperCase() : (userId ? userId.slice(0, 2).toUpperCase() : 'VD')}
            </div>
            {userName && (
              <span className="hidden sm:inline text-xs font-bold text-stone-800 dark:text-stone-200">
                {userName}
              </span>
            )}
            <ChevronDown className="w-3.5 h-3.5 text-stone-400" />
          </button>

          {isProfileMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setIsProfileMenuOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-72 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-xl z-50 p-4 space-y-4 text-stone-900 dark:text-stone-100">
                {/* Profile Header */}
                <div className="flex items-center gap-3 pb-3 border-b border-stone-100 dark:border-stone-800">
                  <div className="w-10 h-10 rounded-full bg-emerald-700 text-white flex items-center justify-center text-sm font-bold shadow-xs">
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
                        <span>Onyx Dark</span>
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

