'use client';

import type * as React from 'react';
import { cn } from '../../utils/cn';

export interface ProgressRingProps {
  /** Value 0..100 */
  value: number;
  size?: number;
  strokeWidth?: number;
  className?: string;
  label?: React.ReactNode;
  /** When true, color is derived from value (red < 33, amber 33-66, emerald > 66). */
  colorByValue?: boolean;
}

function pickColor(pct: number): string {
  if (pct >= 75) return 'stroke-emerald-500 dark:stroke-emerald-400';
  if (pct >= 40) return 'stroke-amber-500 dark:stroke-amber-400';
  return 'stroke-red-500 dark:stroke-red-400';
}

export function ProgressRing({
  value,
  size = 96,
  strokeWidth = 8,
  className,
  label,
  colorByValue = true,
}: ProgressRingProps) {
  const clamped = Math.max(0, Math.min(100, value));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clamped / 100) * circumference;
  const color = colorByValue ? pickColor(clamped) : 'stroke-indigo-600 dark:stroke-indigo-400';

  return (
    <div
      className={cn('relative inline-flex items-center justify-center', className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={`Progress ${Math.round(clamped)}%`}
    >
      <svg
        width={size}
        height={size}
        className="-rotate-90"
        viewBox={`0 0 ${size} ${size}`}
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          className="fill-none stroke-zinc-200 dark:stroke-zinc-800"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className={cn('fill-none transition-all duration-500', color)}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: offset,
          }}
        />
      </svg>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center text-center">
        {label ?? (
          <span className="text-sm font-semibold text-zinc-900 tabular-nums dark:text-zinc-50">
            {Math.round(clamped)}%
          </span>
        )}
      </div>
    </div>
  );
}
