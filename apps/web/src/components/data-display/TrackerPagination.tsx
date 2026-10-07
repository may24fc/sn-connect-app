'use client';

import { Button } from '@hr-portal/ui';

interface TrackerPaginationProps {
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
  className?: string;
}

export function TrackerPagination({
  page,
  totalPages,
  onPageChange,
  isLoading = false,
  className = '',
}: TrackerPaginationProps) {
  const safeTotalPages = Math.max(totalPages, 1);

  return (
    <div
      className={`flex items-center justify-center gap-3 border-t border-border px-4 py-3 ${className}`}
      aria-label="Pagination"
    >
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isLoading || page <= 1}
        onClick={() => onPageChange(Math.max(page - 1, 1))}
      >
        Previous
      </Button>
      <span className="text-sm text-muted-foreground" aria-live="polite">
        Page {page} of {safeTotalPages}
      </span>
      <Button
        type="button"
        variant="outline"
        size="sm"
        disabled={isLoading || page >= safeTotalPages}
        onClick={() => onPageChange(Math.min(page + 1, safeTotalPages))}
      >
        Next
      </Button>
    </div>
  );
}
