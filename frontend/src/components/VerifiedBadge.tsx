import React from 'react';

interface VerifiedBadgeProps {
  size?: number;
  className?: string;
  color?: string;
  tooltip?: string;
}

export default function VerifiedBadge({
  size = 16,
  className = '',
  color = '#2563eb',
  tooltip = 'Verified Account',
}: VerifiedBadgeProps) {
  return (
    <span
      className={`inline-flex items-center justify-center shrink-0 ${className}`}
      title={tooltip}
      aria-label={tooltip}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outer shield/circle */}
        <path
          d="M12 2L3 7v6c0 5.25 3.85 10.15 9 11 5.15-.85 9-5.75 9-11V7l-9-5z"
          fill={color}
          opacity="0.15"
        />
        <path
          d="M12 2L3 7v6c0 5.25 3.85 10.15 9 11 5.15-.85 9-5.75 9-11V7l-9-5z"
          fill={color}
          opacity="0.25"
        />
        {/* Checkmark circle */}
        <circle cx="12" cy="12" r="10" fill={color} />
        {/* Checkmark */}
        <path
          d="M8 12l2.5 2.5L16 9"
          stroke="white"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          fill="none"
        />
        {/* Inner glow */}
        <path
          d="M12 4a8 8 0 100 16 8 8 0 000-16z"
          fill={color}
          opacity="0.3"
        />
      </svg>
    </span>
  );
}