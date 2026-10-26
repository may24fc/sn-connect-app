'use client';

import type { ReactNode } from 'react';
import { PaginationBar } from './PaginationBar';

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

  return (
    <PaginationBar
      page={pagination.page}
      totalPages={pagination.totalPages}
      onPageChange={onPageChange}
      total={pagination.total}
      pageSize={pagination.pageSize}
      itemLabel={itemLabel}
      isLoading={isLoading}
      className={className}
    />
  );
}
