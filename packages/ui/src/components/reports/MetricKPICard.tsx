'use client';

import { ArrowDown, ArrowUp, Minus } from 'lucide-react';
import type * as React from 'react';
import { Card, CardContent } from '../../primitives/card';
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

const COLOR_VARIANTS = {
  blue: {
    border: 'border-l-blue-500',
    icon: 'text-blue-600',
    value: 'text-blue-900',
    bg: 'bg-blue-50',
  },
  green: {
    border: 'border-l-green-500',
    icon: 'text-green-600',
    value: 'text-green-900',
    bg: 'bg-green-50',
  },
  orange: {
    border: 'border-l-orange-500',
    icon: 'text-orange-600',
    value: 'text-orange-900',
    bg: 'bg-orange-50',
  },
  red: {
    border: 'border-l-red-500',
    icon: 'text-red-600',
    value: 'text-red-900',
    bg: 'bg-red-50',
  },
} as const;

const TREND_CONFIG = {
  up: {
    icon: ArrowUp,
    color: 'text-green-600',
    bgColor: 'bg-green-50',
  },
  down: {
    icon: ArrowDown,
    color: 'text-red-600',
    bgColor: 'bg-red-50',
  },
  stable: {
    icon: Minus,
    color: 'text-gray-600',
    bgColor: 'bg-gray-50',
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
  color,
  className,
}: MetricKPICardProps): React.ReactElement {
  const colorVariant = COLOR_VARIANTS[color];
  const trendConfig = TREND_CONFIG[change.trend];
  const TrendIcon = trendConfig.icon;

  return (
    <Card
      className={cn('border-l-4 transition-all hover:shadow-md', colorVariant.border, className)}
    >
      <CardContent className="pt-6">
        <div className="space-y-2">
          {/* Label */}
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
            {label}
          </p>

          {/* Primary Value */}
          <div className="space-y-1">
            <p className={cn('text-4xl font-bold tracking-tight font-mono', colorVariant.value)}>
              {value}
            </p>

            {/* Change Indicator */}
            <div
              className={cn(
                'inline-flex items-center gap-1 px-2 py-1 rounded-md text-sm font-semibold',
                trendConfig.bgColor,
                trendConfig.color
              )}
            >
              <TrendIcon className="h-4 w-4" aria-hidden="true" />
              <span className="font-mono">
                {change.absolute}
                {change.percent !== undefined && (
                  <span className="ml-1">({change.percent.toFixed(1)}%)</span>
                )}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
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
