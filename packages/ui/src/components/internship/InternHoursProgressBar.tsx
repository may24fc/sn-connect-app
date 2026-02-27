'use client';

import { Clock } from 'lucide-react';
import type * as React from 'react';
import { cn } from '../../utils/cn';

export interface InternHoursProgressBarProps {
  completedHours: number;
  requiredHours: number;
  startDate?: string | null;
  endDate?: string | null;
  compact?: boolean;
  className?: string;
}

function getProgressColor(percentage: number): {
  bg: string;
  fill: string;
  text: string;
} {
  if (percentage >= 75) {
    return {
      bg: 'bg-emerald-100 dark:bg-emerald-900/20',
      fill: 'bg-emerald-500 dark:bg-emerald-400',
      text: 'text-emerald-700 dark:text-emerald-400',
    };
  }
  if (percentage >= 50) {
    return {
      bg: 'bg-amber-100 dark:bg-amber-900/20',
      fill: 'bg-amber-500 dark:bg-amber-400',
      text: 'text-amber-700 dark:text-amber-400',
    };
  }
  return {
    bg: 'bg-red-100 dark:bg-red-900/20',
    fill: 'bg-red-500 dark:bg-red-400',
    text: 'text-red-700 dark:text-red-400',
  };
}

function estimateCompletionDate(
  completedHours: number,
  requiredHours: number,
  startDate: string | null | undefined
): string | null {
  if (!startDate || completedHours <= 0) return null;

  const start = new Date(startDate);
  const now = new Date();
  const daysElapsed = Math.max(1, Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
  const dailyAverage = completedHours / daysElapsed;

  if (dailyAverage <= 0) return null;

  const remainingHours = requiredHours - completedHours;
  if (remainingHours <= 0) return 'Completed';

  const daysRemaining = Math.ceil(remainingHours / dailyAverage);
  const estimatedDate = new Date(now);
  estimatedDate.setDate(estimatedDate.getDate() + daysRemaining);

  return estimatedDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function InternHoursProgressBar({
  completedHours,
  requiredHours,
  startDate,
  endDate,
  compact = false,
  className,
}: InternHoursProgressBarProps): React.ReactNode {
  const percentage = requiredHours > 0 ? Math.min((completedHours / requiredHours) * 100, 100) : 0;
  const roundedPercentage = Math.round(percentage * 10) / 10;
  const colors = getProgressColor(roundedPercentage);
  const estimatedCompletion = estimateCompletionDate(completedHours, requiredHours, startDate);

  if (compact) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <div className={cn('h-2 flex-1 rounded-full', colors.bg)}>
          <div
            className={cn('h-full rounded-full transition-all duration-500', colors.fill)}
            style={{ width: `${roundedPercentage}%` }}
          />
        </div>
        <span className={cn('text-xs font-medium tabular-nums', colors.text)}>
          {roundedPercentage}%
        </span>
      </div>
    );
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Clock className="h-4 w-4 text-zinc-400 dark:text-zinc-500" strokeWidth={1.5} />
          <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
            Hours Progress
          </span>
        </div>
        <span className={cn('text-sm font-semibold tabular-nums', colors.text)}>
          {roundedPercentage}%
        </span>
      </div>

      <div className={cn('h-3 w-full rounded-full', colors.bg)}>
        <div
          className={cn('h-full rounded-full transition-all duration-500', colors.fill)}
          style={{ width: `${roundedPercentage}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400">
        <span className="tabular-nums">
          {completedHours.toLocaleString()} of {requiredHours.toLocaleString()} hours completed
        </span>
        {estimatedCompletion && (
          <span>
            Est. completion: <span className="font-medium">{estimatedCompletion}</span>
          </span>
        )}
      </div>

      {endDate && (
        <div className="text-xs text-zinc-400 dark:text-zinc-500">
          End date:{' '}
          <span className="font-medium">
            {new Date(endDate).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
            })}
          </span>
        </div>
      )}
    </div>
  );
}
