'use client';

import React from 'react';

interface CircularProgressProps {
  /** Progress percentage (0-100) */
  progress: number;
  /** Radius of the circle in pixels */
  radius?: number;
  /** Width of the progress bar stroke in pixels */
  strokeWidth?: number;
  /** Text to display in the center */
  centerText?: React.ReactNode;
  /** Color of the progress bar */
  progressColor?: string;
  /** Color of the background circle */
  backgroundColor?: string;
  /** Color of the center text */
  textColor?: string;
  /** Additional CSS class name */
  className?: string;
}

export function CircularProgress({
  progress,
  radius = 60,
  strokeWidth = 8,
  centerText = '',
  progressColor = 'oklch(0.646 0.222 41.116)', // chart-1
  backgroundColor = 'oklch(0.97 0 0)', // muted
  textColor = 'oklch(0.145 0 0)', // foreground
  className = '',
}: CircularProgressProps) {
  // Ensure progress is between 0 and 100
  const normalizedProgress = Math.min(Math.max(progress, 0), 100);

  // SVG calculations
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (normalizedProgress / 100) * circumference;
  const size = (radius + strokeWidth) * 2;

  return (
    <div
      className={`flex items-center justify-center ${className}`}
      style={{ width: size, height: size }}
    >
      <svg
        width={size}
        height={size}
        className="transform -rotate-90"
        style={{ position: 'absolute' }}
      >
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={backgroundColor}
          strokeWidth={strokeWidth}
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={progressColor}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{
            transition: 'stroke-dashoffset 0.35s ease',
          }}
        />
      </svg>

      {/* Center content */}
      <div
        className="flex items-center justify-center absolute text-center"
        style={{ color: textColor }}
      >
        <span
          style={{
            fontSize: `${Math.max(14, radius * 0.4)}px`,
            fontWeight: 600,
            whiteSpace: 'pre-line',
          }}
        >
          {centerText}
        </span>
      </div>
    </div>
  );
}
