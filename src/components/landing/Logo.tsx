import React from 'react';

interface LogoProps {
  className?: string;
  iconOnly?: boolean;
  variant?: 'light' | 'dark';
}

/**
 * Brand Wordmark:
 * - "Vital": Bold neo-grotesque sans-serif (Inter, weight: 800), #0F172A on light surfaces, #FFFFFF on dark surfaces.
 * - "Diaries": Elegant italic serif (Playfair Display, font-style: italic), deep rich emerald green (#047857 on light, #00E599 on dark).
 * - No background capsule or black box container around the wordmark.
 */
export const Logo: React.FC<LogoProps> = ({
  className = '',
  iconOnly = false,
  variant = 'light',
}) => {
  if (iconOnly) {
    return null;
  }

  const vitalColor = variant === 'dark' ? '#FFFFFF' : '#0F172A';
  const diariesColor = variant === 'dark' ? '#00E599' : '#047857';

  return (
    <span
      className={`inline-flex items-center gap-1 select-none transition-opacity hover:opacity-90 ${className}`}
    >
      {/* "Vital": Bold neo-grotesque sans-serif (Inter, weight: 800) */}
      <span
        style={{
          fontFamily: "'Inter', sans-serif",
          fontWeight: 800,
          color: vitalColor,
          letterSpacing: '-0.035em',
        }}
        className="text-[19px] sm:text-xl leading-none"
      >
        Vital
      </span>

      {/* "Diaries": Elegant italic serif (Playfair Display, font-style: italic), darker rich emerald green */}
      <span
        style={{
          fontFamily: "'Playfair Display', Georgia, serif",
          fontStyle: 'italic',
          fontWeight: 600,
          color: diariesColor,
          letterSpacing: '-0.01em',
        }}
        className="text-[20px] sm:text-[21px] leading-none ml-0.5"
      >
        Diaries
      </span>
    </span>
  );
};
