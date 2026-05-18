'use client';

import { cn } from '@/lib/utils';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import type { ReactNode } from 'react';

interface DataTableColumnHeaderProps {
  column: {
    getCanSort: () => boolean;
    getIsSorted: () => false | 'asc' | 'desc';
    toggleSorting: (desc?: boolean) => void;
  };
  title: string;
  className?: string;
}

/**
 * Sortable column header for DataTable.
 * Displays sort direction indicators and handles click-to-sort.
 */
export function DataTableColumnHeader({
  column,
  title,
  className,
}: DataTableColumnHeaderProps): ReactNode {
  if (!column.getCanSort()) {
    return (
      <span
        className={cn(
          'text-[0.75rem] font-medium leading-4 text-zinc-500 dark:text-zinc-400 lg:text-[0.8125rem]',
          className
        )}
      >
        {title}
      </span>
    );
  }

  const sorted = column.getIsSorted();

  return (
    <button
      type="button"
      onClick={() => column.toggleSorting(sorted === 'asc')}
      className={cn(
        'flex items-center gap-1.5 text-[0.75rem] font-medium leading-4 text-zinc-500 dark:text-zinc-400 lg:text-[0.8125rem]',
        'hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors',
        '-ml-2 px-2 py-1 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800',
        className
      )}
    >
      {title}
      {sorted === 'asc' ? (
        <ArrowUp className="h-3.5 w-3.5" />
      ) : sorted === 'desc' ? (
        <ArrowDown className="h-3.5 w-3.5" />
      ) : (
        <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />
      )}
    </button>
  );
}
