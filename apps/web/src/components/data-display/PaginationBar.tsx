'use client';

import { Button, cn } from '@hr-portal/ui';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';

export interface PaginationBarProps {
  /** 1-based current page. */
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  /** Total matching rows; when given with `pageSize` the bar shows a "1–25 of 132" range. */
  total?: number;
  pageSize?: number;
  /** Noun after the range, e.g. "resources". */
  itemLabel?: string;
  /** Disables the controls while a page is in flight. */
  isLoading?: boolean;
  /** Content placed before the range label, e.g. a rows-per-page select. */
  leading?: ReactNode;
  className?: string;
}

/**
 * The one pagination control for Control Hub lists: range label on the left,
 * "page / total" with previous and next buttons on the right.
 */
export function PaginationBar({
  page,
  totalPages,
  onPageChange,
  total,
  pageSize,
  itemLabel,
  isLoading = false,
  leading,
  className,
}: PaginationBarProps): ReactNode {
  const safeTotalPages = Math.max(totalPages, 1);
  const hasRange = typeof total === 'number' && typeof pageSize === 'number';
  const firstOnPage = hasRange && total > 0 ? (page - 1) * pageSize + 1 : 0;
  const lastOnPage = hasRange ? Math.min(page * pageSize, total) : 0;

  if (hasRange && total === 0) return null;

  return (
    <nav
      aria-label="Pagination"
      className={cn('flex items-center justify-between gap-3', className)}
    >
      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        {leading}
        {hasRange ? (
          <span className="tabular-nums">
            {firstOnPage}–{lastOnPage} of {total}
            {itemLabel ? ` ${itemLabel}` : ''}
          </span>
        ) : null}
      </div>
      {safeTotalPages > 1 ? (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Previous page"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={isLoading || page <= 1}
          >
            <ChevronLeft strokeWidth={1.5} />
          </Button>
          <span className="px-1 text-sm tabular-nums text-muted-foreground" aria-live="polite">
            {page} / {safeTotalPages}
          </span>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Next page"
            onClick={() => onPageChange(Math.min(safeTotalPages, page + 1))}
            disabled={isLoading || page >= safeTotalPages}
          >
            <ChevronRight strokeWidth={1.5} />
          </Button>
        </div>
      ) : null}
    </nav>
  );
}
