import React from 'react';

interface VitalLogoProps {
  className?: string;
  size?: number | string;
  color?: string;
  secondaryColor?: string;
  style?: React.CSSProperties;
}

export const VitalLogo: React.FC<VitalLogoProps> = ({
  className = "w-8 h-8",
  size,
  color = "currentColor",
  secondaryColor = "#0E7C4B",
  style,
}) => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 400 300"
      className={className}
      style={{ ...(size ? { width: size, height: size } : {}), ...style }}
    >
      <g fill="none" stroke={color} strokeLinecap="round" strokeLinejoin="round">
        {/* V Left Arm */}
        <path strokeWidth="16" d="M 140 80 L 190 190" />
        
        {/* V Right Arm + Loop */}
        <path strokeWidth="16" d="M 185 190 L 235 95 C 270 80 270 150 230 175 C 210 190 210 205 230 205 L 270 205" />
        
        {/* Chestpiece Connection */}
        <path strokeWidth="7" d="M 270 205 C 285 205 290 210 290 220" />
        
        {/* Stethoscope Bell */}
        <circle cx="290" cy="235" r="14" strokeWidth="5" />
        <circle cx="290" cy="235" r="7" strokeWidth="3" fill={secondaryColor} />
        <circle cx="290" cy="235" r="2.5" fill={color} stroke="none" />
      </g>
    </svg>
  );
};

