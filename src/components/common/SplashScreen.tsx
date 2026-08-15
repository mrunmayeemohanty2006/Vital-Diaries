import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Lock, Sparkles, ShieldCheck } from 'lucide-react';
import { VitalLogo } from './VitalLogo';

interface SplashScreenProps {
  onFinish?: () => void;
  durationMs?: number;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onFinish,
  durationMs = 3200,
}) => {
  const [animationPhase, setAnimationPhase] = useState<'logo' | 'reveal' | 'details'>('logo');
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Timeline of animation steps
    const timer1 = setTimeout(() => {
      setAnimationPhase('reveal');
    }, 700);

    const timer2 = setTimeout(() => {
      setAnimationPhase('details');
    }, 1500);

    const fadeTimer = setTimeout(() => {
      setFadeOut(true);
    }, durationMs - 500);

    const finishTimer = setTimeout(() => {
      if (onFinish) onFinish();
    }, durationMs);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(fadeTimer);
      clearTimeout(finishTimer);
    };
  }, [durationMs, onFinish]);

  return (
    <div
      className={`fixed inset-0 z-50 bg-gradient-to-br from-emerald-900 via-emerald-800 to-stone-950 flex flex-col items-center justify-center p-6 text-white transition-opacity duration-500 select-none ${
        fadeOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      <div className="relative flex flex-col items-center text-center max-w-lg mx-auto">
        {/* Soft Glowing Background Aura */}
        <div className="absolute -top-20 w-72 h-72 bg-emerald-400/20 rounded-full blur-3xl pointer-events-none animate-pulse" />

        {/* Central Brand Container with Animated V Logo + "ital Diaries" reveal */}
        <div className="relative flex items-center justify-center min-h-[100px] mb-4">
          <motion.div
            className="flex items-center justify-center gap-1 sm:gap-2"
            layout
            transition={{ type: 'spring', stiffness: 120, damping: 18 }}
          >
            {/* The V Logo Emblem */}
            <motion.div
              initial={{ scale: 0.6, opacity: 0, rotate: -5 }}
              animate={{
                scale: 1,
                opacity: 1,
                rotate: 0,
                x: animationPhase !== 'logo' ? -4 : 0,
              }}
              transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
              className="shrink-0 flex items-center justify-center"
            >
              <div className="w-14 h-14 sm:w-20 sm:h-20 bg-emerald-500/30 backdrop-blur-md rounded-2xl sm:rounded-3xl p-2.5 sm:p-3 border border-emerald-300/30 shadow-2xl flex items-center justify-center">
                <VitalLogo className="w-full h-full text-white" />
              </div>
            </motion.div>

            {/* The Revealed Text "ital Diaries" */}
            {animationPhase !== 'logo' && (
              <motion.div
                initial={{ opacity: 0, width: 0, x: -15 }}
                animate={{ opacity: 1, width: 'auto', x: 0 }}
                transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                className="overflow-hidden whitespace-nowrap flex items-baseline text-left pl-1"
              >
                <span className="text-3xl sm:text-5xl font-extrabold tracking-tight text-white drop-shadow-md font-sans">
                  ital <span className="font-serif italic font-normal text-emerald-200">Diaries</span>
                </span>
              </motion.div>
            )}
          </motion.div>
        </div>

        {/* Tagline & Encryption Badge Phase */}
        {animationPhase === 'details' && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="space-y-6 flex flex-col items-center"
          >
            <p className="text-emerald-200/90 text-sm sm:text-base font-semibold tracking-wide flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-300 animate-pulse" />
              <span>Your Health. Your Story. Your Privacy.</span>
            </p>

            {/* Progress Indicator */}
            <div className="w-48 sm:w-56 space-y-2 pt-2">
              <div className="h-1.5 w-full bg-emerald-950/80 rounded-full overflow-hidden border border-emerald-600/30">
                <motion.div
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 1.2, ease: 'easeInOut' }}
                  className="h-full bg-gradient-to-r from-emerald-400 to-teal-300 rounded-full"
                />
              </div>
              <p className="text-[11px] text-emerald-200/80 font-medium flex items-center justify-center gap-1.5">
                <Lock className="w-3 h-3 text-emerald-300 shrink-0" />
                <span>Initializing Encrypted Local Vault</span>
              </p>
            </div>
          </motion.div>
        )}
      </div>

      {/* Security note footer */}
      <div className="absolute bottom-6 text-center text-[11px] text-emerald-300/60 font-medium flex items-center gap-1.5">
        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
        <span>AES-256-GCM Zero-Knowledge Local Storage</span>
      </div>
    </div>
  );
};
