import React from 'react';

interface WolfLogoProps {
  className?: string;
  size?: number;
  color?: string;
}

export function WolfLogo({ className, size = 20, color = 'white' }: WolfLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      {/* Left ear */}
      <path d="M10 6 L18 22 L6 20 Z" fill={color} opacity="0.9" />
      {/* Right ear */}
      <path d="M54 6 L46 22 L58 20 Z" fill={color} opacity="0.9" />
      {/* Inner left ear */}
      <path d="M11 9 L17 21 L8 19.5 Z" fill={color} opacity="0.4" />
      {/* Inner right ear */}
      <path d="M53 9 L47 21 L56 19.5 Z" fill={color} opacity="0.4" />
      {/* Head shape */}
      <path
        d="M14 20 C8 24 6 32 8 40 C10 46 16 52 24 54 C28 55 32 55 36 54 C44 52 54 46 56 40 C58 32 56 24 50 20 C45 17 38 15 32 15 C26 15 19 17 14 20 Z"
        fill={color}
      />
      {/* Snout */}
      <path
        d="M24 38 C24 38 27 44 32 44 C37 44 40 38 40 38 C40 38 37 36 32 36 C27 36 24 38 24 38 Z"
        fill={color}
        opacity="0.5"
      />
      {/* Nose */}
      <ellipse cx="32" cy="37" rx="4" ry="2.5" fill={color} opacity="0.7" />
      {/* Left eye */}
      <ellipse cx="22" cy="29" rx="3.5" ry="3" fill={color} opacity="0.25" />
      <ellipse cx="22" cy="29" rx="2" ry="2" fill={color} opacity="0.6" />
      {/* Right eye */}
      <ellipse cx="42" cy="29" rx="3.5" ry="3" fill={color} opacity="0.25" />
      <ellipse cx="42" cy="29" rx="2" ry="2" fill={color} opacity="0.6" />
      {/* Chest/neck fur hint */}
      <path
        d="M22 52 C24 56 28 59 32 60 C36 59 40 56 42 52 C38 54 34 55 32 55 C30 55 26 54 22 52 Z"
        fill={color}
        opacity="0.5"
      />
    </svg>
  );
}
