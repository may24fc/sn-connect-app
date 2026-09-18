'use client';

import { cn } from '@/lib/utils';
import {
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@hr-portal/ui';
import {
  type ColumnDef,
  type ColumnFiltersState,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table';
import * as React from 'react';
import type { DataTableProps } from './DataTable.types';
import { DataTablePagination } from './DataTablePagination';

/**
 * A professional-grade data table built on TanStack Table v8.
 * Supports sorting, filtering, row selection, and pagination.
 * Follows the Control Hub design system.
 */
export function DataTable<TData>({
  columns,
  data,
  isLoading = false,
  onRowClick,
  enableRowSelection = false,
  onSelectionChange,
  enablePagination = true,
  pageSizeOptions = [10, 20, 50, 100],
  totalRows,
  onPaginationChange,
  sorting: externalSorting,
  onSortingChange,
  columnFilters: externalFilters,
  onColumnFiltersChange,
  skeletonRowCount = 5,
}: DataTableProps<TData>): React.ReactNode {
  // Internal state management
  const [internalSorting, setInternalSorting] = React.useState<SortingState>([]);
  const [internalFilters, setInternalFilters] = React.useState<ColumnFiltersState>([]);
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 20,
  });

  // Use external or internal state
  const sorting = externalSorting ?? internalSorting;
  const columnFilters = externalFilters ?? internalFilters;

  // Build columns with selection if enabled
  const tableColumns = React.useMemo(() => {
    if (!enableRowSelection) return columns;

    const selectionColumn: ColumnDef<TData> = {
      id: 'select',
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && 'indeterminate')
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
          className="translate-y-[2px]"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
          className="translate-y-[2px]"
          onClick={(e) => e.stopPropagation()}
        />
      ),
      enableSorting: false,
      enableHiding: false,
      size: 40,
    };

    return [selectionColumn, ...columns];
  }, [columns, enableRowSelection]);

  // Handle sorting change - supports both internal and external state
  const handleSortingChange: typeof setInternalSorting = (updaterOrValue) => {
    if (onSortingChange) {
      onSortingChange(updaterOrValue);
    } else {
      setInternalSorting(updaterOrValue);
    }
  };

  // Handle column filters change - supports both internal and external state
  const handleColumnFiltersChange: typeof setInternalFilters = (updaterOrValue) => {
    if (onColumnFiltersChange) {
      onColumnFiltersChange(updaterOrValue);
    } else {
      setInternalFilters(updaterOrValue);
    }
  };

  // Calculate page count for server-side pagination
  const calculatedPageCount = totalRows ? Math.ceil(totalRows / pagination.pageSize) : -1; // -1 means unknown total (TanStack Table convention)

  const table = useReactTable({
    data,
    columns: tableColumns,
    state: {
      sorting,
      columnFilters,
      rowSelection,
      pagination,
    },
    onSortingChange: handleSortingChange,
    onColumnFiltersChange: handleColumnFiltersChange,
    onRowSelectionChange: setRowSelection,
    onPaginationChange: (updater) => {
      const newPagination = typeof updater === 'function' ? updater(pagination) : updater;
      setPagination(newPagination);
      onPaginationChange?.(newPagination);
    },
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    manualPagination: !!onPaginationChange,
    pageCount: calculatedPageCount,
    enableRowSelection,
  });

  // Notify parent of selection changes
  React.useEffect(() => {
    if (onSelectionChange) {
      const selectedRows = table.getSelectedRowModel().rows.map((row) => row.original);
      onSelectionChange(selectedRows);
    }
  }, [rowSelection, onSelectionChange, table]);

  if (isLoading) {
    return <DataTableSkeleton columns={tableColumns.length} rows={skeletonRowCount} />;
  }

  if (data.length === 0) {
    return (
      <div className="overflow-hidden rounded-lg border border-border bg-card">
        <div className="h-10 border-b border-border bg-muted/55" />
        <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
          No data available
        </div>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      {enablePagination && <DataTablePagination table={table} pageSizeOptions={pageSizeOptions} />}
      <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((row) => (
              <TableRow
                key={row.id}
                onClick={() => onRowClick?.(row.original)}
                onKeyDown={(event) => {
                  if (onRowClick && (event.key === 'Enter' || event.key === ' ')) {
                    event.preventDefault();
                    onRowClick(row.original);
                  }
                }}
                role={onRowClick ? 'button' : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                className={cn(
                  'h-10 focus-visible:outline-none',
                  onRowClick &&
                    'cursor-pointer hover:bg-primary-muted/45 focus-visible:bg-primary-muted/60 focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring/45',
                  row.getIsSelected() && 'bg-primary-muted/60'
                )}
              >
                {row.getVisibleCells().map((cell) => (
                  <TableCell key={cell.id}>
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
      </Table>
    </div>
  );
}

/**
 * Skeleton loader for DataTable.
 * Matches the table structure for seamless loading states.
 */
function DataTableSkeleton({
  columns,
  rows = 5,
}: {
  columns: number;
  rows?: number;
}): React.ReactNode {
  return (
    <div className="rounded-lg border border-border overflow-hidden bg-card">
      {/* Pagination skeleton - at top */}
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

      {/* Header skeleton */}
      <div className="bg-zinc-50 dark:bg-zinc-900 h-10 border-b border-zinc-200 dark:border-zinc-800 flex items-center gap-4 px-4">
        {Array.from({ length: columns }).map((_, i) => (
          <div
            // biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton cells never reorder.
            key={i}
            className="h-3 bg-zinc-200 dark:bg-zinc-700 rounded animate-pulse"
            style={{ width: `${[72, 96, 64, 88, 80][i % 5]}px` }}
          />
        ))}
      </div>

      {/* Row skeletons */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div
          // biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton rows never reorder.
          key={rowIndex}
          className="h-10 border-b border-zinc-100 dark:border-zinc-800 last:border-0 flex items-center gap-4 px-4"
        >
          {Array.from({ length: columns }).map((_, colIndex) => (
            <div
              // biome-ignore lint/suspicious/noArrayIndexKey: Static skeleton cells never reorder.
              key={colIndex}
              className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded animate-pulse"
              style={{ width: `${[96, 72, 112, 84, 104][colIndex % 5]}px` }}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export { DataTableSkeleton };
