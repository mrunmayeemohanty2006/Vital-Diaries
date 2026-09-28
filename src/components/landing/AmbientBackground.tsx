import React, { useEffect, useState } from 'react';

type SectionKey = 'hero' | 'privacy' | 'how-it-works' | 'features' | 'architecture' | 'final-cta';

interface OrbConfig {
  x: string;
  y: string;
  scale: number;
  opacity: number;
  size: string;
  gradient: string;
}

export const AmbientBackground: React.FC = () => {
  const [activeSection, setActiveSection] = useState<SectionKey>('hero');
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    // Check user preference for reduced motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mediaQuery.matches);

    const handleMotionChange = (e: MediaQueryListEvent) => {
      setReducedMotion(e.matches);
    };

    mediaQuery.addEventListener('change', handleMotionChange);

    // Section Intersection Observer for scroll tracking
    const sectionIds: { id: string; key: SectionKey }[] = [
      { id: 'home', key: 'hero' },
      { id: 'privacy-trust', key: 'privacy' },
      { id: 'how-it-works', key: 'how-it-works' },
      { id: 'features', key: 'features' },
      { id: 'architecture', key: 'architecture' },
      { id: 'final-cta-section', key: 'final-cta' },
    ];

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries.filter((entry) => entry.isIntersecting);
        if (visibleEntries.length > 0) {
          visibleEntries.sort((a, b) => b.intersectionRatio - a.intersectionRatio);
          const topEntry = visibleEntries[0];
          const matched = sectionIds.find((s) => s.id === topEntry.target.id);
          if (matched) {
            setActiveSection(matched.key);
          }
        }
      },
      {
        threshold: [0.15, 0.4, 0.6],
        rootMargin: '-10% 0px -10% 0px',
      }
    );

    sectionIds.forEach(({ id }) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => {
      mediaQuery.removeEventListener('change', handleMotionChange);
      observer.disconnect();
    };
  }, []);

  // Progression:
  // HERO: White / very light green -> soft green glow begins appearing behind mockup & title
  // PRIVACY SECTION: Pale mint tone with soft ethereal glow
  // HOW IT WORKS: Deeper vibrant green gradient & flowing animation
  // FEATURES: Return toward clean white with gentle highlights
  // FINAL CTA: Deep forest green ambient backplate with bright mint highlights
  const orbStates: Record<SectionKey, { orb1: OrbConfig; orb2: OrbConfig }> = {
    hero: {
      orb1: {
        // Soft green glow behind dashboard mockup
        x: '64vw',
        y: '26vh',
        scale: 1.1,
        opacity: 0.16,
        size: '520px',
        gradient: 'radial-gradient(circle, rgba(16,185,129,0.8) 0%, rgba(52,211,153,0.3) 45%, transparent 70%)',
      },
      orb2: {
        // Very subtle glow near headline
        x: '22vw',
        y: '32vh',
        scale: 0.95,
        opacity: 0.1,
        size: '460px',
        gradient: 'radial-gradient(circle, rgba(5,150,105,0.6) 0%, rgba(16,185,129,0.2) 50%, transparent 70%)',
      },
    },
    privacy: {
      orb1: {
        // White -> pale mint aura
        x: '50vw',
        y: '45vh',
        scale: 1.3,
        opacity: 0.22,
        size: '640px',
        gradient: 'radial-gradient(circle, rgba(52,211,153,0.65) 0%, rgba(16,185,129,0.3) 50%, transparent 75%)',
      },
      orb2: {
        x: '25vw',
        y: '40vh',
        scale: 1.1,
        opacity: 0.16,
        size: '500px',
        gradient: 'radial-gradient(circle, rgba(167,243,208,0.85) 0%, rgba(13,148,136,0.25) 50%, transparent 70%)',
      },
    },
    'how-it-works': {
      orb1: {
        // Deeper green gradient flow
        x: '55vw',
        y: '48vh',
        scale: 1.45,
        opacity: 0.28,
        size: '620px',
        gradient: 'radial-gradient(circle, rgba(5,150,105,0.9) 0%, rgba(16,185,129,0.5) 45%, transparent 70%)',
      },
      orb2: {
        x: '25vw',
        y: '52vh',
        scale: 1.25,
        opacity: 0.24,
        size: '560px',
        gradient: 'radial-gradient(circle, rgba(6,95,70,0.85) 0%, rgba(16,185,129,0.35) 50%, transparent 70%)',
      },
    },
    features: {
      orb1: {
        // Returning toward clean white with soft, light emerald whisper
        x: '35vw',
        y: '48vh',
        scale: 1.0,
        opacity: 0.11,
        size: '520px',
        gradient: 'radial-gradient(circle, rgba(16,185,129,0.5) 0%, rgba(209,250,229,0.3) 50%, transparent 70%)',
      },
      orb2: {
        x: '75vw',
        y: '50vh',
        scale: 0.95,
        opacity: 0.09,
        size: '480px',
        gradient: 'radial-gradient(circle, rgba(13,148,136,0.4) 0%, rgba(241,245,249,0.2) 50%, transparent 70%)',
      },
    },
    architecture: {
      orb1: {
        // Cryptographic diagram focus
        x: '50vw',
        y: '48vh',
        scale: 1.5,
        opacity: 0.32,
        size: '680px',
        gradient: 'radial-gradient(circle, rgba(16,185,129,0.95) 0%, rgba(5,150,105,0.55) 45%, transparent 70%)',
      },
      orb2: {
        x: '50vw',
        y: '55vh',
        scale: 1.1,
        opacity: 0.26,
        size: '450px',
        gradient: 'radial-gradient(circle, rgba(52,211,153,0.9) 0%, rgba(13,148,136,0.4) 50%, transparent 70%)',
      },
    },
    'final-cta': {
      orb1: {
        // Deep forest green with bright mint glow
        x: '50vw',
        y: '50vh',
        scale: 1.6,
        opacity: 0.45,
        size: '720px',
        gradient: 'radial-gradient(circle, rgba(6,78,59,0.95) 0%, rgba(5,150,105,0.65) 45%, transparent 75%)',
      },
      orb2: {
        // Bright mint accent core
        x: '50vw',
        y: '46vh',
        scale: 1.05,
        opacity: 0.35,
        size: '420px',
        gradient: 'radial-gradient(circle, rgba(52,211,153,0.95) 0%, rgba(110,231,183,0.5) 45%, transparent 70%)',
      },
    },
  };

  const current = orbStates[activeSection] || orbStates.hero;

  return (
    <div
      className="fixed inset-0 pointer-events-none -z-10 overflow-hidden"
      aria-hidden="true"
    >
      {/* Orb 1: Primary Ambient Orb */}
      <div
        className={`absolute rounded-full blur-[120px] transform-gpu -translate-x-1/2 -translate-y-1/2 ${
          reducedMotion ? '' : 'transition-all duration-1000 ease-out'
        }`}
        style={{
          left: current.orb1.x,
          top: current.orb1.y,
          width: current.orb1.size,
          height: current.orb1.size,
          transform: `translate(-50%, -50%) scale(${reducedMotion ? 1 : current.orb1.scale})`,
          opacity: current.orb1.opacity,
          background: current.orb1.gradient,
          willChange: 'left, top, transform, opacity',
        }}
      />

      {/* Orb 2: Secondary Accent Orb */}
      <div
        className={`absolute rounded-full blur-[120px] transform-gpu -translate-x-1/2 -translate-y-1/2 ${
          reducedMotion ? '' : 'transition-all duration-1000 ease-out'
        }`}
        style={{
          left: current.orb2.x,
          top: current.orb2.y,
          width: current.orb2.size,
          height: current.orb2.size,
          transform: `translate(-50%, -50%) scale(${reducedMotion ? 1 : current.orb2.scale})`,
          opacity: current.orb2.opacity,
          background: current.orb2.gradient,
          willChange: 'left, top, transform, opacity',
        }}
      />
    </div>
  );
};
