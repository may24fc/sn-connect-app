import { parsePagination } from '@/lib/api/pagination';

// Admin reporting views build cross-report summaries from one bounded snapshot.
// Keep this endpoint's limit aligned with those callers instead of the shared
// pagination helper's lower default for ordinary list screens.
export const REPORTS_MAX_PAGE_SIZE = 500;

export function parseReportsPagination(searchParams: URLSearchParams) {
  return parsePagination(searchParams, 10, REPORTS_MAX_PAGE_SIZE);
}
