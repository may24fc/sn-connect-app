'use client';

import { cn } from '../utils/cn';
import { Check } from 'lucide-react';
import type { ReactNode } from 'react';

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface ProgressTimelineStep {
  /** Step label (e.g. "Created", "Submitted") */
  label: string;
  /** Optional secondary text (e.g. a formatted date) */
  description?: string | undefined;
  /** Step state – determines visual treatment */
  status: 'completed' | 'current' | 'upcoming';
  /** Optional icon override – defaults to check for completed, dot for others */
  icon?: ReactNode;
}

export interface ProgressTimelineProps {
  steps: ProgressTimelineStep[];
  /** @default 'default' */
  size?: 'compact' | 'default';
  className?: string;
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function ProgressTimeline({
  steps,
  size = 'default',
  className,
}: ProgressTimelineProps): ReactNode {
  const isCompact = size === 'compact';
  const indicatorSize = isCompact ? 'h-5 w-5' : 'h-6 w-6';
  const iconSize = isCompact ? 'h-2.5 w-2.5' : 'h-3 w-3';

  return (
    <div className={cn('relative', className)}>
      {steps.map((step, index) => {
        const isLast = index === steps.length - 1;

        return (
          <div key={step.label} className="flex gap-3">
            {/* ── Indicator column ── */}
            <div className="relative flex flex-col items-center">
              {/* Circle / indicator */}
              <div
                className={cn(
                  'relative z-10 flex shrink-0 items-center justify-center rounded-full transition-colors',
                  indicatorSize,
                  step.status === 'completed' &&
                    'bg-emerald-500 text-white shadow-sm shadow-emerald-500/25',
                  step.status === 'current' &&
                    'border-2 border-indigo-500 bg-indigo-50 dark:bg-indigo-950 shadow-sm shadow-indigo-500/25',
                  step.status === 'upcoming' &&
                    'border-2 border-zinc-200 bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800',
                )}
              >
                {step.icon ? (
                  step.icon
                ) : step.status === 'completed' ? (
                  <Check className={iconSize} strokeWidth={3} />
                ) : step.status === 'current' ? (
                  <div
                    className={cn(
                      'rounded-full bg-indigo-500',
                      isCompact ? 'h-1.5 w-1.5' : 'h-2 w-2',
                    )}
                  />
                ) : (
                  <div
                    className={cn(
                      'rounded-full bg-zinc-300 dark:bg-zinc-600',
                      isCompact ? 'h-1.5 w-1.5' : 'h-2 w-2',
                    )}
                  />
                )}
              </div>

              {/* Connector line */}
              {!isLast && (
                <div
                  className={cn(
                    'w-0.5 flex-1 mt-1',
                    isCompact ? 'min-h-[1rem]' : 'min-h-[1.25rem]',
                    step.status === 'completed' && steps[index + 1]?.status !== 'upcoming'
                      ? 'bg-emerald-400 dark:bg-emerald-500'
                      : 'bg-zinc-200 dark:bg-zinc-700',
                  )}
                />
              )}
            </div>

            {/* ── Text column ── */}
            <div className={cn('min-w-0', !isLast ? (isCompact ? 'pb-3' : 'pb-4') : 'pb-0')}>
              <p
                className={cn(
                  'leading-tight',
                  isCompact ? 'text-xs' : 'text-sm',
                  step.status === 'completed' && 'font-medium text-foreground',
                  step.status === 'current' && 'font-semibold text-indigo-600 dark:text-indigo-400',
                  step.status === 'upcoming' && 'font-medium text-muted-foreground',
                )}
              >
                {step.label}
              </p>
              {step.description && (
                <p
                  className={cn(
                    'mt-0.5 tabular-nums text-muted-foreground',
                    isCompact ? 'text-[10px]' : 'text-xs',
                  )}
                >
                  {step.description}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
