import React from 'react';

interface NirmaanLogoProps {
  size?: number;
  className?: string;
  withBackground?: boolean;
}

export function NirmaanLogo({ size = 38, className = '', withBackground = true }: NirmaanLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 44 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Nirmaan Watch Logo"
    >
      <defs>
        <linearGradient id="nirmaanGrad" x1="2" y1="2" x2="42" y2="42" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f97316" />
          <stop offset="0.6" stopColor="#ea580c" />
          <stop offset="1" stopColor="#c2410c" />
        </linearGradient>
        <linearGradient id="goldGrad" x1="12" y1="8" x2="32" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fff7ed" />
          <stop offset="1" stopColor="#fed7aa" />
        </linearGradient>
        <linearGradient id="beamGrad" x1="8" y1="8" x2="36" y2="36" gradientUnits="userSpaceOnUse">
          <stop stopColor="#ffffff" />
          <stop offset="1" stopColor="#ffedd5" />
        </linearGradient>
        <filter id="logoShadow" x="-15%" y="-15%" width="130%" height="130%">
          <feDropShadow dx="0" dy="1.5" stdDeviation="1.5" floodColor="#7c2d12" floodOpacity="0.45" />
        </filter>
      </defs>

      {/* Optional rich rounded squircle container */}
      {withBackground && (
        <>
          <rect width="44" height="44" rx="11" fill="url(#nirmaanGrad)" />
          {/* Subtle top gloss highlight */}
          <path
            d="M11 2H33C39 2 42 5 42 11V13H2V11C2 5 5 2 11 2Z"
            fill="#ffffff"
            opacity="0.18"
          />
        </>
      )}

      {/* Emblem graphic: Architectural "N" (Nirmaan) + Oversight Beacon Eye (Watch) */}
      <g filter={withBackground ? 'url(#logoShadow)' : undefined}>
        {/* Left Column / Infrastructure Tower */}
        <path d="M10 32.5V14.5L15 10.5V32.5H10Z" fill="url(#beamGrad)" />

        {/* Right Column / Infrastructure Tower */}
        <path d="M29 10.5L34 14.5V32.5H29V10.5Z" fill="url(#beamGrad)" />

        {/* Structural Diagonal Beam forming the 'N' Monogram */}
        <path d="M15 12L29 30V32.5H26L12 14.5H15V12Z" fill="url(#goldGrad)" />

        {/* Public Infrastructure Base Foundation */}
        <rect x="8" y="32.5" width="28" height="3" rx="1.5" fill="#ffffff" />

        {/* Watchful Oversight Eye / Civic Transparency Lens */}
        <g transform="translate(22, 21.5)">
          {/* Eye Outline */}
          <path
            d="M-8.5 0C-5.5 -4.8 5.5 -4.8 8.5 0C5.5 4.8 -5.5 4.8 -8.5 0Z"
            fill="#1c1917"
            stroke="#ffedd5"
            strokeWidth="1.2"
          />
          {/* Iris Saffron Glow */}
          <circle cx="0" cy="0" r="3" fill="#ea580c" />
          {/* Pupil / Glint */}
          <circle cx="0" cy="0" r="1.3" fill="#ffffff" />
        </g>

        {/* Top Beacon of Integrity */}
        <circle cx="22" cy="7" r="2" fill="#ffedd5" />
      </g>
    </svg>
  );
}
