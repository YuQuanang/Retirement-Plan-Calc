import React from 'react';

interface BrandLogoProps {
  size?: number;
  className?: string;
  hasShadow?: boolean;
}

export function BrandLogo({ size = 32, className = '', hasShadow = true }: BrandLogoProps): React.ReactElement {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`shrink-0 select-none ${hasShadow ? 'drop-shadow-sm' : ''} ${className}`}
      style={{ display: 'block' }}
    >
      <defs>
        {/* Background: Apple Deep Royal Indigo Gradient */}
        <linearGradient id="blAppleBg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#0071E3" />
          <stop offset="45%" stopColor="#3A36D5" />
          <stop offset="100%" stopColor="#6025F5" />
        </linearGradient>

        {/* Warm Radiant Flame Gradient */}
        <linearGradient id="blFlameGrad" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#FF375F" />
          <stop offset="35%" stopColor="#FF5B00" />
          <stop offset="70%" stopColor="#FF9F0A" />
          <stop offset="100%" stopColor="#FFD60A" />
        </linearGradient>

        {/* Inner Core Glow */}
        <linearGradient id="blCoreGrad" x1="0%" y1="100%" x2="0%" y2="0%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#FFF4D0" />
        </linearGradient>

        {/* Subtle Bevel Border Highlight */}
        <linearGradient id="blRimGlow" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.4" />
          <stop offset="40%" stopColor="#FFFFFF" stopOpacity="0.08" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.2" />
        </linearGradient>

        {/* Top Soft Ambient Highlight */}
        <radialGradient id="blTopGlow" cx="50%" cy="10%" r="60%">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.32" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>

        {/* Drop Shadow for the inner flame glyph */}
        <filter id="blShadow" x="-20%" y="-15%" width="140%" height="135%">
          <feDropShadow dx="0" dy="2" stdDeviation="2" floodColor="#0F0C3B" floodOpacity="0.4" />
        </filter>
      </defs>

      {/* Base Apple Squircle with Continuous Curvature */}
      <rect width="64" height="64" rx="15" fill="url(#blAppleBg)" />
      <rect width="64" height="64" rx="15" fill="url(#blTopGlow)" />
      <rect x="0.5" y="0.5" width="63" height="63" rx="14.5" fill="none" stroke="url(#blRimGlow)" strokeWidth="1" />

      {/* Iconic FIRE Mark */}
      <g filter="url(#blShadow)">
        {/* Main Outer Flame (Smooth organic curves) */}
        <path
          d="M32 10.5C32 10.5 45.5 21.5 45.5 35C45.5 44 39.5 50.5 32 50.5C24.5 50.5 18.5 44 18.5 35C18.5 24 28 17.5 32 10.5Z"
          fill="url(#blFlameGrad)"
        />

        {/* Dynamic Compounding Swell (Left rising curve) */}
        <path
          d="M32 10.5C30.5 16.5 24 23 24 33C24 38.5 27 43 32 46C29 44 27 40 27 35C27 28 31 20 32 10.5Z"
          fill="#FFFFFF"
          fillOpacity="0.32"
        />

        {/* Inner Core Flame (Luminous center) */}
        <path
          d="M32 23C32 23 38.5 29.5 38.5 37.5C38.5 42.5 35.5 46 32 46C28.5 46 25.5 42.5 25.5 37.5C25.5 31 30 26.5 32 23Z"
          fill="url(#blCoreGrad)"
        />

        {/* Summit Star / Spark of Independence */}
        <path
          d="M32 30.5L33.6 34.6L37.5 36.2L33.6 37.8L32 41.9L30.4 37.8L26.5 36.2L30.4 34.6Z"
          fill="#FF5B00"
        />
      </g>
    </svg>
  );
}

