'use client';

import { Button } from '@hr-portal/ui';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';

export interface ServerPaginationMeta {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface ServerPaginationProps {
  pagination: ServerPaginationMeta | undefined;
  onPageChange: (page: number) => void;
  /** Disables the controls while a page is in flight. */
  isLoading?: boolean;
  /** Noun shown in the range label, e.g. "resources". */
  itemLabel?: string;
  className?: string;
}

/**
 * Range label plus prev/next controls for an API that returns
 * `{ page, pageSize, total, totalPages }`.
 *
 * Several list screens used to request a single large page and present it as the
 * whole dataset; this control makes the remaining pages reachable and shows the
 * server's real total rather than the loaded row count.
 */
export function ServerPagination({
  pagination,
  onPageChange,
  isLoading = false,
  itemLabel = 'records',
  className = '',
}: ServerPaginationProps): ReactNode {
  if (!pagination || pagination.total === 0) {
    return null;
  }

  const { page, pageSize, total, totalPages } = pagination;
  const firstOnPage = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const lastOnPage = Math.min(page * pageSize, total);

  return (
    <div className={`flex items-center justify-between gap-3 ${className}`}>
      <span className="text-sm text-zinc-500 dark:text-zinc-400">
        {firstOnPage}-{lastOnPage} of {total} {itemLabel}
      </span>
      {totalPages > 1 && (
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label="Previous page"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={isLoading || page <= 1}
          >
            <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
          </Button>
          <span className="px-1 text-sm tabular-nums text-zinc-500 dark:text-zinc-400">
            {page} / {totalPages}
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            aria-label="Next page"
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={isLoading || page >= totalPages}
          >
            <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
          </Button>
        </div>
      )}
    </div>
  );
}
