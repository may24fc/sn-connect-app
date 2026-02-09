import type {
  ColumnDef,
  ColumnFiltersState,
  OnChangeFn,
  PaginationState,
  SortingState,
  Table,
} from '@tanstack/react-table';

/**
 * Props for the DataTable component.
 */
export interface DataTableProps<TData> {
  /** Column definitions for the table */
  columns: ColumnDef<TData>[];
  /** Data to display in the table */
  data: TData[];
  /** Whether the table is in a loading state */
  isLoading?: boolean;
  /** Callback when a row is clicked */
  onRowClick?: (row: TData) => void;
  /** Enable row selection with checkboxes */
  enableRowSelection?: boolean;
  /** Callback when selection changes */
  onSelectionChange?: (rows: TData[]) => void;
  /** Enable pagination */
  enablePagination?: boolean;
  /** Page size options for pagination */
  pageSizeOptions?: number[];
  /** Total row count for server-side pagination */
  totalRows?: number;
  /** Callback for pagination changes (server-side) */
  onPaginationChange?: (pagination: PaginationState) => void;
  /** External sorting state (server-side) */
  sorting?: SortingState;
  /** Callback for sorting changes (server-side) - uses TanStack's OnChangeFn type */
  onSortingChange?: OnChangeFn<SortingState>;
  /** External filter state (server-side) */
  columnFilters?: ColumnFiltersState;
  /** Callback for filter changes (server-side) - uses TanStack's OnChangeFn type */
  onColumnFiltersChange?: OnChangeFn<ColumnFiltersState>;
  /** Number of skeleton rows to show when loading */
  skeletonRowCount?: number;
}

/**
 * Props for the DataTableColumnHeader component.
 */
export interface DataTableColumnHeaderProps {
  /** The column to render the header for */
  column: {
    getCanSort: () => boolean;
    getIsSorted: () => false | 'asc' | 'desc';
    toggleSorting: (desc?: boolean) => void;
  };
  /** The title to display */
  title: string;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Props for the DataTablePagination component.
 */
export interface DataTablePaginationProps<TData> {
  /** The table instance */
  table: Table<TData>;
  /** Page size options */
  pageSizeOptions?: number[];
}

/**
 * Props for the DataTableSkeleton component.
 */
export interface DataTableSkeletonProps {
  /** Number of columns */
  columns: number;
  /** Number of rows to render */
  rows?: number;
}
