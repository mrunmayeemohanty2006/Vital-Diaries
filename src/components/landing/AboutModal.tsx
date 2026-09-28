import React from 'react';
import { X, ShieldCheck, Heart, Lock, BookOpen } from 'lucide-react';

interface AboutModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AboutModal: React.FC<AboutModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-150"
      role="dialog"
      aria-modal="true"
      aria-labelledby="about-title"
    >
      <div className="relative w-full max-w-lg bg-white rounded-2xl border border-slate-200 shadow-2xl p-6 sm:p-8 text-left space-y-5">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          aria-label="Close dialog"
        >
          <X className="w-5 h-5" />
        </button>

        <div>
          <h3 id="about-title" className="text-xl font-bold text-slate-900">
            About Vital Diaries
          </h3>
          <p className="text-xs text-emerald-800 font-semibold tracking-wide uppercase mt-0.5">
            Your health records · Your privacy · Your control
          </p>
        </div>

        <div className="space-y-3 text-sm text-slate-600 leading-relaxed">
          <p>
            Vital Diaries was conceived from a clear observation: personal health data is scattered across incompatible patient portals, physical paper printouts, and doctor clinics, often trapped in silos or vulnerable to data brokers.
          </p>
          <p>
            We believe that individuals should maintain lifelong custody over their own medical records without having to forfeit privacy. By combining client-side encryption with local processing, Vital Diaries provides cloud synchronization without giving anyone else access to readable health information.
          </p>
        </div>

        <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
          <span className="text-xs font-semibold text-slate-900 block">
            Core Design Commitments
          </span>
          <ul className="text-xs text-slate-600 space-y-1.5">
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
              <span>Zero plain-text medical records stored on servers</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
              <span>Local on-device parsing and search indexing</span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
              <span>Cryptographic verification rather than marketing exaggerations</span>
            </li>
          </ul>
        </div>

        <div className="pt-2">
          <button
            onClick={onClose}
            className="w-full py-2.5 px-4 text-sm font-semibold text-slate-700 hover:text-slate-950 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer text-center"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
};
