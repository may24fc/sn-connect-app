'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';

/**
 * BentoGrid - A flexible grid layout for dashboard cards.
 * Follows the Titanium & Indigo design system.
 */

interface BentoGridProps {
  children: React.ReactNode;
  className?: string;
  /** Number of columns on large screens (default: 4) */
  columns?: 2 | 3 | 4 | 6;
}

const columnClasses = {
  2: 'lg:grid-cols-2',
  3: 'lg:grid-cols-3',
  4: 'lg:grid-cols-4',
  6: 'lg:grid-cols-6',
} as const;

export function BentoGrid({
  children,
  className,
  columns = 4,
}: BentoGridProps): React.ReactNode {
  return (
    <div
      className={cn(
        'grid grid-cols-1 md:grid-cols-2 gap-4',
        columnClasses[columns],
        className
      )}
    >
      {children}
    </div>
  );
}

interface BentoCardProps {
  children: React.ReactNode;
  className?: string;
  /** Column span on large screens */
  colSpan?: 1 | 2 | 3 | 4;
  /** Row span (default: 1) */
  rowSpan?: 1 | 2;
  /** Whether to add hover effect */
  interactive?: boolean;
  /** Click handler */
  onClick?: () => void;
}

const colSpanClasses = {
  1: 'lg:col-span-1',
  2: 'lg:col-span-2',
  3: 'lg:col-span-3',
  4: 'lg:col-span-4',
} as const;

const rowSpanClasses = {
  1: 'row-span-1',
  2: 'row-span-2',
} as const;

export function BentoCard({
  children,
  className,
  colSpan = 1,
  rowSpan = 1,
  interactive = false,
  onClick,
}: BentoCardProps): React.ReactNode {
  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      onClick={onClick}
      className={cn(
        'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg p-5',
        colSpanClasses[colSpan],
        rowSpanClasses[rowSpan],
        interactive && 'transition-all hover:border-indigo-300 dark:hover:border-indigo-700 hover:shadow-card-hover cursor-pointer',
        onClick && 'text-left w-full',
        className
      )}
      style={{ boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.03)' }}
      type={onClick ? 'button' : undefined}
    >
      {children}
    </Component>
  );
}

interface BentoCardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function BentoCardHeader({
  children,
  className,
}: BentoCardHeaderProps): React.ReactNode {
  return (
    <div className={cn('flex items-center justify-between mb-4', className)}>
      {children}
    </div>
  );
}

interface BentoCardTitleProps {
  children: React.ReactNode;
  className?: string;
  icon?: React.ReactNode;
}

export function BentoCardTitle({
  children,
  className,
  icon,
}: BentoCardTitleProps): React.ReactNode {
  return (
    <h3 className={cn('flex items-center gap-2 text-sm font-medium text-zinc-900 dark:text-zinc-100', className)}>
      {icon && <span className="text-zinc-400 dark:text-zinc-500">{icon}</span>}
      {children}
    </h3>
  );
}

interface BentoCardContentProps {
  children: React.ReactNode;
  className?: string;
}

export function BentoCardContent({
  children,
  className,
}: BentoCardContentProps): React.ReactNode {
  return <div className={cn('', className)}>{children}</div>;
}

// Re-export for convenience
export { BentoGrid as default };
