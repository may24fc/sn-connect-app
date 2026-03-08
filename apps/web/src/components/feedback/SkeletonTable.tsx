'use client';

import { cn } from '@/lib/utils';
import * as React from 'react';

interface SkeletonTableProps {
  /** Number of columns */
  columns?: number;
  /** Number of rows */
  rows?: number;
  /** Whether to show pagination skeleton */
  showPagination?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Whether to show header skeleton */
  showHeader?: boolean;
}

/**
 * SkeletonTable - A loading skeleton that matches DataTable structure.
 * Provides a smooth loading state for table-based content.
 */
export function SkeletonTable({
  columns = 5,
  rows = 5,
  showPagination = true,
  className,
  showHeader = true,
}: SkeletonTableProps): React.ReactNode {
  // Generate random but consistent widths for columns
  const columnWidths = React.useMemo(
    () => Array.from({ length: columns }, () => Math.random() * 60 + 40),
    [columns]
  );

  return (
    <div
      className={cn(
        'rounded-lg border border-border overflow-hidden bg-card',
        className
      )}
    >
      {/* Pagination skeleton - at top */}
      {showPagination && (
        <div className="h-11 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900 flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="h-3 w-20 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
            <div className="h-7 w-16 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
          </div>
          <div className="flex items-center gap-3">
            <div className="h-3 w-24 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
            <div className="flex gap-1">
              <div className="h-7 w-7 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
              <div className="h-7 w-7 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
              <div className="h-7 w-7 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
              <div className="h-7 w-7 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
            </div>
          </div>
        </div>
      )}

      {/* Header skeleton */}
      {showHeader && (
        <div className="bg-zinc-50 dark:bg-zinc-900 h-10 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-4 px-4">
          {columnWidths.map((width, i) => (
            <div
              key={i}
              className="h-3 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse"
              style={{ width: `${width}px` }}
            />
          ))}
        </div>
      )}

      {/* Row skeletons */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          key={rowIndex}
          className="h-10 border-b border-zinc-100 dark:border-zinc-800 last:border-0 flex items-center gap-4 px-4"
        >
          {columnWidths.map((width, colIndex) => (
            <div
              key={colIndex}
              className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse"
              style={{
                width: `${width + (Math.random() * 20 - 10)}px`,
                animationDelay: `${(rowIndex * columns + colIndex) * 50}ms`,
              }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

/**
 * SkeletonListItem - A skeleton for individual list items.
 */
interface SkeletonListItemProps {
  /** Show avatar/icon placeholder */
  hasAvatar?: boolean;
  /** Show action button placeholder */
  hasAction?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export function SkeletonListItem({
  hasAvatar = true,
  hasAction = true,
  className,
}: SkeletonListItemProps): React.ReactNode {
  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800',
        className
      )}
    >
      {hasAvatar && (
        <div className="h-10 w-10 bg-zinc-200 dark:bg-zinc-800 rounded-lg animate-pulse flex-shrink-0" />
      )}
      <div className="flex-1 space-y-2">
        <div className="h-4 w-3/4 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
        <div className="h-3 w-1/2 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse" />
      </div>
      {hasAction && (
        <div className="h-8 w-16 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse flex-shrink-0" />
      )}
    </div>
  );
}

/**
 * SkeletonList - A list of skeleton items.
 */
interface SkeletonListProps {
  /** Number of items */
  count?: number;
  /** Show avatar/icon placeholder */
  hasAvatar?: boolean;
  /** Show action button placeholder */
  hasAction?: boolean;
  /** Additional CSS classes */
  className?: string;
}

export function SkeletonList({
  count = 5,
  hasAvatar = true,
  hasAction = true,
  className,
}: SkeletonListProps): React.ReactNode {
  return (
    <div className={cn('space-y-2', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonListItem key={i} hasAvatar={hasAvatar} hasAction={hasAction} />
      ))}
    </div>
  );
}

export { SkeletonTable as default };
