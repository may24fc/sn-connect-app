'use client';

import { PaginationBar } from './PaginationBar';

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
  if (totalPages <= 1) return null;

  return (
    <PaginationBar
      page={page}
      totalPages={totalPages}
      onPageChange={onPageChange}
      isLoading={isLoading}
      className={`border-t border-border px-4 py-3 ${className}`}
    />
  );
}
