'use client';

import { cn } from '@/lib/utils';
import type * as React from 'react';

interface SkeletonCardProps {
  className?: string;
  /** Show icon skeleton */
  hasIcon?: boolean;
  /** Show trend skeleton */
  hasTrend?: boolean;
  /** Number of content lines */
  lines?: number;
}

/**
 * SkeletonCard - A loading skeleton that matches card layouts.
 * Uses animate-pulse for a smooth loading animation.
 */
export function SkeletonCard({
  className,
  hasIcon = true,
  hasTrend = true,
  lines = 1,
}: SkeletonCardProps): React.ReactNode {
  return (
    <div
      className={cn(
        'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-5',
        className
      )}
      style={{ boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.03)' }}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-2 flex-1">
          {/* Label skeleton */}
          <div className="h-3 w-24 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />

          {/* Value skeleton */}
          <div className="h-7 w-16 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />

          {/* Trend skeleton */}
          {hasTrend && (
            <div className="flex items-center gap-1 mt-1">
              <div className="h-3.5 w-3.5 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
              <div className="h-3 w-12 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
            </div>
          )}

          {/* Additional content lines */}
          {lines > 1 &&
            Array.from({ length: lines - 1 }).map((_, i) => (
              <div
                key={i}
                className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse"
                style={{ width: `${70 + Math.random() * 30}%` }}
              />
            ))}
        </div>

        {/* Icon skeleton */}
        {hasIcon && (
          <div className="h-12 w-12 bg-zinc-200 dark:bg-zinc-800 rounded-lg animate-pulse flex-shrink-0" />
        )}
      </div>
    </div>
  );
}

/**
 * SkeletonCardGrid - A grid of skeleton cards for loading states.
 */
interface SkeletonCardGridProps {
  count?: number;
  columns?: 2 | 3 | 4;
  className?: string;
  hasIcon?: boolean;
  hasTrend?: boolean;
}

const gridColumnClasses = {
  2: 'lg:grid-cols-2',
  3: 'lg:grid-cols-3',
  4: 'lg:grid-cols-4',
} as const;

export function SkeletonCardGrid({
  count = 4,
  columns = 4,
  className,
  hasIcon = true,
  hasTrend = true,
}: SkeletonCardGridProps): React.ReactNode {
  return (
    <div
      className={cn('grid grid-cols-1 sm:grid-cols-2 gap-4', gridColumnClasses[columns], className)}
    >
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} hasIcon={hasIcon} hasTrend={hasTrend} />
      ))}
    </div>
  );
}

/**
 * SkeletonBentoCard - A larger skeleton for bento grid cards.
 */
interface SkeletonBentoCardProps {
  className?: string;
  /** Column span */
  colSpan?: 1 | 2;
  /** Type of content skeleton */
  variant?: 'chart' | 'list' | 'default';
}

export function SkeletonBentoCard({
  className,
  colSpan = 1,
  variant = 'default',
}: SkeletonBentoCardProps): React.ReactNode {
  const colSpanClass = colSpan === 2 ? 'lg:col-span-2' : 'lg:col-span-1';

  return (
    <div
      className={cn(
        'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-5',
        colSpanClass,
        className
      )}
      style={{ boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.03)' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="h-5 w-5 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
          <div className="h-4 w-32 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
        </div>
        <div className="h-6 w-16 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
      </div>

      {/* Content based on variant */}
      {variant === 'chart' && (
        <div className="h-48 bg-zinc-100 dark:bg-zinc-800/50 rounded-lg animate-pulse" />
      )}

      {variant === 'list' && (
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="flex items-center gap-3 p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50"
            >
              <div className="h-10 w-10 bg-zinc-200 dark:bg-zinc-700 rounded-lg animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-3/4 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
                <div className="h-3 w-1/2 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      )}

      {variant === 'default' && (
        <div className="space-y-3">
          <div className="h-4 w-full bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
          <div className="h-4 w-5/6 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
          <div className="h-4 w-4/6 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
        </div>
      )}
    </div>
  );
}

export { SkeletonCard as default };
