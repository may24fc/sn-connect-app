'use client';

import { cn } from '@/lib/utils';
import { Minus, TrendingDown, TrendingUp } from 'lucide-react';
import type * as React from 'react';

interface StatCardProps {
  /** Label for the stat (e.g., "Total Employees") */
  label: string;
  /** The main value to display */
  value: string | number;
  /** Optional trend information */
  trend?: {
    /** The trend direction */
    direction: 'up' | 'down' | 'stable';
    /** The change value (e.g., "+12%" or "5 more") */
    value: string;
  };
  /** Optional icon to display - should be a Lucide icon with strokeWidth={1.5} */
  icon?: React.ReactNode;
  /** @deprecated iconVariant is no longer used - icons are now text-zinc-400 only */
  iconVariant?: 'primary' | 'success' | 'warning' | 'danger';
  /** Additional CSS classes */
  className?: string;
  /** Whether to use compact styling */
  compact?: boolean;
}

/**
 * StatCard - A card for displaying key metrics and statistics.
 * Follows the Titanium & Indigo design system with tabular-nums for values.
 *
 * Icons follow strict iconography rules:
 * - strokeWidth={1.5} (fine/elegant)
 * - h-4 w-4 size
 * - text-zinc-400 color (recede, not pop)
 * - NO colored background containers
 */
export function StatCard({
  label,
  value,
  trend,
  icon,
  className,
  compact = false,
}: StatCardProps): React.ReactNode {
  return (
    <div
      className={cn(
        'relative bg-card border border-border rounded-lg',
        compact ? 'p-4' : 'p-5',
        className
      )}
      style={{ boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.03)' }}
    >
      {/* Icon - positioned top-right, no background */}
      {icon && (
        <div className="absolute top-4 right-4 text-zinc-500 dark:text-zinc-400">{icon}</div>
      )}

      <div className="space-y-1">
        {/* Label with inline icon option */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
            {label}
          </span>
        </div>

        {/* Value */}
        <div
          className={cn(
            'font-bold text-zinc-900 dark:text-zinc-50 tabular-nums',
            compact ? 'text-xl' : 'text-2xl'
          )}
        >
          {value}
        </div>

        {/* Trend */}
        {trend && (
          <div className="flex items-center gap-1 mt-1">
            <TrendIndicator direction={trend.direction} />
            <span
              className={cn(
                'text-xs font-medium',
                trend.direction === 'up' && 'text-emerald-600 dark:text-emerald-400',
                trend.direction === 'down' && 'text-rose-600 dark:text-rose-400',
                trend.direction === 'stable' && 'text-zinc-500 dark:text-zinc-400'
              )}
            >
              {trend.value}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function TrendIndicator({ direction }: { direction: 'up' | 'down' | 'stable' }): React.ReactNode {
  switch (direction) {
    case 'up':
      return (
        <TrendingUp
          className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400"
          strokeWidth={1.5}
        />
      );
    case 'down':
      return (
        <TrendingDown className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" strokeWidth={1.5} />
      );
    case 'stable':
      return <Minus className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" strokeWidth={1.5} />;
  }
}

/**
 * StatCardGrid - A responsive grid layout for StatCards.
 */
interface StatCardGridProps {
  children: React.ReactNode;
  className?: string;
  /** Number of columns on large screens */
  columns?: 2 | 3 | 4 | 5 | 6;
}

const gridColumnClasses = {
  2: 'lg:grid-cols-2',
  3: 'lg:grid-cols-3',
  4: 'lg:grid-cols-4',
  5: 'lg:grid-cols-5',
  6: 'lg:grid-cols-6',
} as const;

export function StatCardGrid({
  children,
  className,
  columns = 4,
}: StatCardGridProps): React.ReactNode {
  return (
    <div
      className={cn('grid grid-cols-1 sm:grid-cols-2 gap-4', gridColumnClasses[columns], className)}
    >
      {children}
    </div>
  );
}

export { StatCard as default };
