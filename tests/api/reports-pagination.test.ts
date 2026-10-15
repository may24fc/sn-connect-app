import { REPORTS_MAX_PAGE_SIZE, parseReportsPagination } from '@/app/api/reports/_pagination';
import { parsePagination } from '@/lib/api/pagination';
import { describe, expect, it } from 'vitest';

describe('reports pagination contract', () => {
  it('accepts the 500-row reporting snapshot without weakening the shared default', () => {
    const reportsPage = new URLSearchParams(`page=1&pageSize=${REPORTS_MAX_PAGE_SIZE}`);

    expect(parseReportsPagination(reportsPage)).toEqual({
      page: 1,
      pageSize: REPORTS_MAX_PAGE_SIZE,
    });
    expect(parsePagination(reportsPage, 10)).toBeNull();
  });

  it('rejects a reporting snapshot above the endpoint limit', () => {
    const excessivePage = new URLSearchParams(`page=1&pageSize=${REPORTS_MAX_PAGE_SIZE + 1}`);

    expect(parseReportsPagination(excessivePage)).toBeNull();
  });
});
