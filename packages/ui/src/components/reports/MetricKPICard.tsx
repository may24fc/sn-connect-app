'use client';

import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import type * as React from 'react';
import { cn } from '../../utils/cn';

export interface MetricKPICardProps {
  label: string;
  value: string | number;
  change: {
    absolute: string | number;
    percent?: number;
    trend: 'up' | 'down' | 'stable';
  };
  color: 'blue' | 'green' | 'orange' | 'red';
  className?: string;
}

const TREND_CONFIG = {
  up: {
    icon: ArrowUp,
    color: 'text-green-600 dark:text-green-400',
  },
  down: {
    icon: ArrowDown,
    color: 'text-red-600 dark:text-red-400',
  },
  stable: {
    icon: Minus,
    color: 'text-zinc-400 dark:text-zinc-500',
  },
} as const;

/**
 * MetricKPICard - Displays a KPI metric with inline change indicator
 *
 * Features:
 * - Large primary value display
 * - Stacked change delta (absolute + percentage)
 * - Semantic color coding
 * - Trend indicators (up/down/stable)
 * - Responsive design
 *
 * @example
 * ```tsx
 * <MetricKPICard
 *   label="Revenue"
 *   value="$125,400"
 *   change={{
 *     absolute: "+$12,500",
 *     percent: 11.1,
 *     trend: 'up'
 *   }}
 *   color="green"
 * />
 * ```
 */
export function MetricKPICard({
  label,
  value,
  change,
  className,
}: MetricKPICardProps): React.ReactElement {
  const trendConfig = TREND_CONFIG[change.trend];
  const TrendIcon = trendConfig.icon;

  return (
    <div
      className={cn(
        'bg-card border border-zinc-200 dark:border-zinc-800 rounded-lg p-4 space-y-3',
        className
      )}
    >
      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
        {label}
      </p>
      <p className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
        {value}
      </p>
      <div className={cn('flex items-center gap-1 text-xs', trendConfig.color)}>
        <TrendIcon className="h-3 w-3" aria-hidden="true" />
        <span>
          {change.absolute}
          {change.percent !== undefined && (
            <span className="ml-0.5">({change.percent.toFixed(1)}%)</span>
          )}
        </span>
      </div>
    </div>
  );
}

/**
 * MetricKPICardGrid - Grid layout for multiple KPI cards
 *
 * @example
 * ```tsx
 * <MetricKPICardGrid>
 *   <MetricKPICard {...kpi1} />
 *   <MetricKPICard {...kpi2} />
 *   <MetricKPICard {...kpi3} />
 * </MetricKPICardGrid>
 * ```
 */
export function MetricKPICardGrid({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}): React.ReactElement {
  return (
    <div className={cn('grid gap-4 md:grid-cols-2 lg:grid-cols-4', className)}>{children}</div>
  );
}
