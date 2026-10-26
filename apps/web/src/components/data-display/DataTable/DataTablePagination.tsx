'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@hr-portal/ui';
import type { Table } from '@tanstack/react-table';
import type { ReactNode } from 'react';
import { PaginationBar } from '../PaginationBar';

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
  pageSizeOptions?: Array<number>;
}

/**
 * Pagination controls for DataTable: rows-per-page selector plus the shared PaginationBar.
 */
export function DataTablePagination<TData>({
  table,
  pageSizeOptions = [10, 20, 50, 100],
}: DataTablePaginationProps<TData>): ReactNode {
  const pageIndex = table.getState().pagination.pageIndex;
  const pageSize = table.getState().pagination.pageSize;

  return (
    <PaginationBar
      page={pageIndex + 1}
      totalPages={table.getPageCount()}
      onPageChange={(page) => table.setPageIndex(page - 1)}
      total={table.getFilteredRowModel().rows.length}
      pageSize={pageSize}
      className="border-b border-border bg-muted/35 px-4 py-2"
      leading={
        <div className="flex items-center gap-2">
          <span>Rows per page</span>
          <Select value={String(pageSize)} onValueChange={(val) => table.setPageSize(Number(val))}>
            <SelectTrigger className="h-8 w-auto min-w-[60px]" aria-label="Rows per page">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {pageSizeOptions.map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      }
    />
  );
}
