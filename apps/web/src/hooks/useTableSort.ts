'use client';

import { useCallback, useMemo, useState } from 'react';

export type SortDirection = 'asc' | 'desc';

export interface SortConfig {
  column: string;
  direction: SortDirection;
}

interface UseTableSortOptions {
  /** Initial sort column */
  initialColumn?: string;
  /** Initial sort direction */
  initialDirection?: SortDirection;
}

interface UseTableSortReturn {
  /** Current sort column */
  sortColumn: string;
  /** Current sort direction */
  sortDirection: SortDirection;
  /** Toggle sort on a column – sets ascending on first click, toggles on subsequent */
  handleSort: (column: string) => void;
  /** Sort an array of items by the current sort state. Provide an accessor map to resolve column keys to values. */
  sortItems: <T>(
    items: T[],
    accessors: Record<string, (item: T) => string | number | boolean | null | undefined>
  ) => T[];
}

/**
 * Reusable hook for client-side table sorting.
 *
 * @example
 * ```tsx
 * const { sortColumn, sortDirection, handleSort, sortItems } = useTableSort({ initialColumn: 'title' });
 * const sorted = sortItems(tasks, {
 *   title: (t) => t.title,
 *   priority: (t) => t.priority,
 * });
 * ```
 */
export function useTableSort(
  options: UseTableSortOptions = {}
): UseTableSortReturn {
  const { initialColumn = '', initialDirection = 'asc' } = options;

  const [sortColumn, setSortColumn] = useState(initialColumn);
  const [sortDirection, setSortDirection] = useState<SortDirection>(initialDirection);

  const handleSort = useCallback(
    (column: string) => {
      if (sortColumn === column) {
        setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
      } else {
        setSortColumn(column);
        setSortDirection('asc');
      }
    },
    [sortColumn]
  );

  const sortItems = useCallback(
    <T>(
      items: T[],
      accessors: Record<string, (item: T) => string | number | boolean | null | undefined>
    ): T[] => {
      if (!sortColumn || !accessors[sortColumn]) return items;

      const accessor = accessors[sortColumn];
      const multiplier = sortDirection === 'asc' ? 1 : -1;

      return [...items].sort((a, b) => {
        const aVal = accessor(a);
        const bVal = accessor(b);

        // Nulls always last
        if (aVal == null && bVal == null) return 0;
        if (aVal == null) return 1;
        if (bVal == null) return -1;

        if (typeof aVal === 'number' && typeof bVal === 'number') {
          return (aVal - bVal) * multiplier;
        }

        if (typeof aVal === 'boolean' && typeof bVal === 'boolean') {
          return (Number(aVal) - Number(bVal)) * multiplier;
        }

        return String(aVal).localeCompare(String(bVal), undefined, { sensitivity: 'base' }) * multiplier;
      });
    },
    [sortColumn, sortDirection]
  );

  return useMemo(
    () => ({ sortColumn, sortDirection, handleSort, sortItems }),
    [sortColumn, sortDirection, handleSort, sortItems]
  );
}
