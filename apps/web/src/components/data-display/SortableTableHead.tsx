'use client';

import { TableHead } from '@hr-portal/ui';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import type { ReactNode } from 'react';
import type { SortDirection } from '@/hooks/useTableSort';

interface SortableTableHeadProps {
  /** Column key used to identify this column for sorting */
  column: string;
  /** Display label */
  children: ReactNode;
  /** Currently active sort column */
  sortColumn: string;
  /** Current sort direction */
  sortDirection: SortDirection;
  /** Called when header is clicked to toggle sort */
  onSort: (column: string) => void;
  /** Additional className for the TableHead */
  className?: string;
}

/**
 * A TableHead wrapper that adds click-to-sort behavior and sort direction icons.
 *
 * @example
 * ```tsx
 * <SortableTableHead column="title" sortColumn={sortColumn} sortDirection={sortDirection} onSort={handleSort}>
 *   Title
 * </SortableTableHead>
 * ```
 */
export function SortableTableHead({
  column,
  children,
  sortColumn,
  sortDirection,
  onSort,
  className,
}: SortableTableHeadProps): ReactNode {
  const isActive = sortColumn === column;

  return (
    <TableHead className={className}>
      <button
        type="button"
        className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors -ml-2 px-2 py-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800"
        onClick={() => onSort(column)}
      >
        {children}
        {isActive ? (
          sortDirection === 'asc' ? (
            <ArrowUp className="h-3.5 w-3.5" />
          ) : (
            <ArrowDown className="h-3.5 w-3.5" />
          )
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 opacity-40" />
        )}
      </button>
    </TableHead>
  );
}
