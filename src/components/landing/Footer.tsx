import React from 'react';
import { Logo } from './Logo';
import { SITE_CONFIG } from './config';

interface FooterProps {
  onNavigateAuth: (route: string) => void;
  onOpenAboutModal: () => void;
}

export const Footer: React.FC<FooterProps> = ({ onNavigateAuth, onOpenAboutModal }) => {
  return (
    <footer className="bg-[#F8FAFC] border-t border-slate-200/80 py-14 sm:py-16 text-slate-600">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start justify-between">
          
          {/* Brand & Tagline */}
          <div className="md:col-span-6 space-y-3 text-left">
            <a href="#home" className="inline-block" aria-label="Vital Diaries Homepage">
              <Logo variant="dark" />
            </a>
            <p className="text-sm font-medium text-slate-700">
              {SITE_CONFIG.tagline}
            </p>
            <p className="text-xs text-slate-500 max-w-sm leading-relaxed">
              A private digital health records system built for personal confidentiality, cryptographic separation, and local device control.
            </p>
          </div>

          {/* Links Grid */}
          <div className="md:col-span-6 flex flex-wrap gap-x-12 gap-y-6 sm:justify-end text-left">
            
            <div className="space-y-2.5">
              <span className="text-xs font-semibold text-slate-900 uppercase tracking-wider block">
                Product
              </span>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#how-it-works" className="hover:text-emerald-700 transition-colors">
                    How It Works
                  </a>
                </li>
                <li>
                  <a href="#features" className="hover:text-emerald-700 transition-colors">
                    Features
                  </a>
                </li>
                <li>
                  <a href="#architecture" className="hover:text-emerald-700 transition-colors">
                    Security
                  </a>
                </li>
                <li>
                  <a href="#privacy-trust" className="hover:text-emerald-700 transition-colors">
                    Privacy
                  </a>
                </li>
                <li>
                  <a href="#faq" className="hover:text-emerald-700 transition-colors">
                    FAQ
                  </a>
                </li>
              </ul>
            </div>

            <div className="space-y-2.5">
              <span className="text-xs font-semibold text-slate-900 uppercase tracking-wider block">
                Account & Access
              </span>
              <ul className="space-y-2 text-sm">
                <li>
                  <button
                    onClick={() => onNavigateAuth(SITE_CONFIG.routes.signup)}
                    className="hover:text-emerald-700 transition-colors cursor-pointer text-left"
                  >
                    Create Account
                  </button>
                </li>
                <li>
                  <button
                    onClick={() => onNavigateAuth(SITE_CONFIG.routes.login)}
                    className="hover:text-emerald-700 transition-colors cursor-pointer text-left"
                  >
                    Sign In
                  </button>
                </li>
                <li>
                  <button
                    onClick={onOpenAboutModal}
                    className="hover:text-emerald-700 transition-colors cursor-pointer text-left"
                  >
                    About
                  </button>
                </li>
              </ul>
            </div>

          </div>

        </div>

        {/* Bottom Copyright Line */}
        <div className="mt-12 pt-8 border-t border-slate-200/80 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <p>© 2026 Vital Diaries. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <a href="#privacy-trust" className="hover:text-slate-800 transition-colors">
              Privacy Architecture
            </a>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <a href="#architecture" className="hover:text-slate-800 transition-colors">
              Local Verification
            </a>
          </div>
        </div>

      </div>
    </footer>
  );
};
