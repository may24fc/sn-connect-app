'use client';

import { cn } from '@/lib/utils';
import type { Table } from '@tanstack/react-table';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import type { ReactNode } from 'react';

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
  pageSizeOptions?: Array<number>;
}

/**
 * Pagination controls for DataTable.
 * Includes page navigation, page size selector, and row count display.
 */
export function DataTablePagination<TData>({
  table,
  pageSizeOptions = [10, 20, 50, 100],
}: DataTablePaginationProps<TData>): ReactNode {
  const pageIndex = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;
  const pageCount = table.getPageCount();
  const totalRows = table.getFilteredRowModel().rows.length;

  return (
    <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-100 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900">
      {/* Page size selector */}
      <div className="flex items-center gap-2">
        <span className="text-sm text-zinc-500 dark:text-zinc-400">Rows per page:</span>
        <select
          value={pageSize}
          onChange={(e) => table.setPageSize(Number(e.target.value))}
          className={cn(
            'h-7 px-2 text-sm bg-card',
            'border border-border rounded-md',
            'focus:outline-none focus:ring-2 focus:ring-slate-600/20 focus:border-slate-600'
          )}
        >
          {pageSizeOptions.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-3">
        {/* Row count info - Gmail style */}
        <span className="text-sm text-zinc-500 dark:text-zinc-400">
          {pageIndex * pageSize + 1}-{Math.min((pageIndex + 1) * pageSize, totalRows)} of {totalRows}
        </span>

        {/* Navigation buttons */}
        <div className="flex items-center gap-1">
          <PaginationButton
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
            aria-label="Go to first page"
          >
            <ChevronsLeft className="h-4 w-4" />
          </PaginationButton>
          <PaginationButton
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
            aria-label="Go to previous page"
          >
            <ChevronLeft className="h-4 w-4" />
          </PaginationButton>
          <PaginationButton
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
            aria-label="Go to next page"
          >
            <ChevronRight className="h-4 w-4" />
          </PaginationButton>
          <PaginationButton
            onClick={() => table.setPageIndex(pageCount - 1)}
            disabled={!table.getCanNextPage()}
            aria-label="Go to last page"
          >
            <ChevronsRight className="h-4 w-4" />
          </PaginationButton>
        </div>
      </div>
    </div>
  );
}

interface PaginationButtonProps {
  onClick: () => void;
  disabled: boolean;
  children: ReactNode;
  'aria-label': string;
}

function PaginationButton({
  onClick,
  disabled,
  children,
  'aria-label': ariaLabel,
}: PaginationButtonProps): ReactNode {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={ariaLabel}
      className={cn(
        'h-8 w-8 flex items-center justify-center rounded-md',
        'border border-border',
        'bg-card',
        'text-zinc-700 dark:text-zinc-300',
        'hover:bg-zinc-50 dark:hover:bg-zinc-800',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-card',
        'transition-colors'
      )}
    >
      {children}
    </button>
  );
}
