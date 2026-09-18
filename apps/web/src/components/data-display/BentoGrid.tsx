'use client';

import { cn } from '@/lib/utils';
import type * as React from 'react';

/**
 * BentoGrid - A flexible grid layout for dashboard cards.
 * Follows the Navy & Gold design system.
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

export function BentoGrid({ children, className, columns = 4 }: BentoGridProps): React.ReactNode {
  return (
    <div className={cn('grid grid-cols-1 md:grid-cols-2 gap-4', columnClasses[columns], className)}>
      {children}
    </div>
  );
}

interface BentoCardProps {
  children: React.ReactNode;
  className?: string;
  /** Column span on large screens */
  colSpan?: 1 | 2 | 3 | 4 | undefined;
  /** Row span (default: 1) */
  rowSpan?: 1 | 2 | undefined;
  /** Whether to add hover effect */
  interactive?: boolean | undefined;
  /** Click handler */
  onClick?: (() => void) | undefined;
  /** Data-tour attribute for guided tour targeting */
  'data-tour'?: string | undefined;
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
  'data-tour': dataTour,
}: BentoCardProps): React.ReactNode {
  const Component = onClick ? 'button' : 'div';

  return (
    <Component
      onClick={onClick}
      data-tour={dataTour}
      className={cn(
        'rounded-[10px] border border-border bg-card p-5 shadow-[0_1px_2px_rgb(10_43_54/0.035)]',
        colSpanClasses[colSpan],
        rowSpanClasses[rowSpan],
        interactive &&
          'cursor-pointer transition-[border-color,box-shadow,transform] hover:-translate-y-px hover:border-primary/30 hover:shadow-card-hover',
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

export function BentoCardHeader({ children, className }: BentoCardHeaderProps): React.ReactNode {
  return <div className={cn('flex items-center justify-between mb-4', className)}>{children}</div>;
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
    <h3
      className={cn(
        'flex items-center gap-2 font-heading text-sm font-semibold text-foreground',
        className
      )}
    >
      {icon && (
        <span className="flex h-7 w-7 items-center justify-center rounded-md bg-primary-muted text-primary">
          {icon}
        </span>
      )}
      {children}
    </h3>
  );
}

interface BentoCardContentProps {
  children: React.ReactNode;
  className?: string;
}

export function BentoCardContent({ children, className }: BentoCardContentProps): React.ReactNode {
  return <div className={cn('', className)}>{children}</div>;
}

// Re-export for convenience
export { BentoGrid as default };
