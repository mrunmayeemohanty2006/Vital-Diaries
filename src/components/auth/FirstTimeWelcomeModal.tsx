import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';

interface FirstTimeWelcomeModalProps {
  onComplete: (name: string) => Promise<void> | void;
}

export const FirstTimeWelcomeModal: React.FC<FirstTimeWelcomeModalProps> = ({ onComplete }) => {
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      await onComplete(name.trim());
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-stone-900/60 dark:bg-black/70 backdrop-blur-md flex items-center justify-center p-3.5 sm:p-4 overflow-y-auto">
      <div className="bg-white dark:bg-stone-900 max-w-md w-full rounded-2xl sm:rounded-[2.5rem] border border-stone-200 dark:border-stone-800 shadow-2xl p-6 sm:p-8 overflow-hidden text-center my-auto max-h-[92vh] text-stone-900 dark:text-stone-100">
        <div className="w-16 h-16 bg-emerald-100 dark:bg-emerald-950/60 rounded-3xl flex items-center justify-center mx-auto mb-5 shadow-2xs">
          <span className="text-2xl">👋</span>
        </div>

        <h2 className="text-xl sm:text-2xl font-bold text-stone-900 dark:text-stone-100 mb-2">
          What should we call you?
        </h2>
        <p className="text-xs sm:text-sm text-stone-500 dark:text-stone-400 mb-6">
          Enter your name to set up your local health profile.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-bold text-stone-700 dark:text-stone-300 uppercase tracking-wider mb-2">
              Your name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full px-4 py-3.5 bg-stone-50 dark:bg-stone-800/60 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-stone-100 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:bg-white dark:focus:bg-stone-800 text-sm font-medium transition-all"
              autoFocus
              required
            />
          </div>

          <button
            type="submit"
            disabled={!name.trim() || isSubmitting}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-sm transition-all flex items-center justify-center gap-2 shadow-sm hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>Continue</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
