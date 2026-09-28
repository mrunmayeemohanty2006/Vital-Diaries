import React, { useMemo } from 'react';

interface FloatingParticle {
  id: number;
  text: string;
  left: string;
  top: string;
  duration: string;
  delay: string;
  opacity: number;
}

export const FloatingParticles: React.FC = () => {
  const particles: FloatingParticle[] = useMemo(() => [
    { id: 1, text: 'AES-256-GCM', left: '12%', top: '20%', duration: '9s', delay: '0s', opacity: 0.55 },
    { id: 2, text: '0x82f4e::iv', left: '84%', top: '15%', duration: '11s', delay: '1.5s', opacity: 0.5 },
    { id: 3, text: '• • • • • • • •', left: '22%', top: '65%', duration: '8s', delay: '2s', opacity: 0.4 },
    { id: 4, text: 'auth_tag::9b3c', left: '76%', top: '70%', duration: '12s', delay: '0.8s', opacity: 0.45 },
    { id: 5, text: 'ciphertext', left: '5%', top: '48%', duration: '10s', delay: '3s', opacity: 0.35 },
    { id: 6, text: 'zero-plain', left: '88%', top: '42%', duration: '8.5s', delay: '1s', opacity: 0.4 },
    { id: 7, text: 'sha-256', left: '38%', top: '85%', duration: '11.5s', delay: '2.5s', opacity: 0.35 },
    { id: 8, text: 'kdf::pbkdf2', left: '60%', top: '18%', duration: '9.5s', delay: '3.2s', opacity: 0.45 },
  ], []);

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none -z-0" aria-hidden="true">
      {particles.map((p) => (
        <span
          key={p.id}
          className="absolute font-mono text-[10px] sm:text-xs text-emerald-700/70 select-none px-2 py-0.5 rounded-full bg-emerald-100/40 border border-emerald-300/30 backdrop-blur-2xs animate-float-particle"
          style={{
            left: p.left,
            top: p.top,
            animationDuration: p.duration,
            animationDelay: p.delay,
            opacity: p.opacity,
          }}
        >
          {p.text}
        </span>
      ))}
    </div>
  );
};
