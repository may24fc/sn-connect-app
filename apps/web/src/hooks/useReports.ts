import { type ReportFilters, queryKeys } from '@/lib/query-keys';
import type { MarketingContext } from '@/lib/schemas/report.schema';
import { useQuery } from '@tanstack/react-query';

export interface ReportRecord {
  id: string;
  employee_id: string;
  report_type: string;
  period_start: string;
  period_end: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected';
  submitted_at: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  deleted_at: string | null;
  notes: string | null;
  marketing_context: MarketingContext | null;
  parent_report_id: string | null;
  report_group: string | null;
  hierarchy_path: string[] | null;
  created_at: string;
  updated_at: string;
  child_count?: number;
  employees?: {
    id: string;
    user_id: string;
    first_name: string;
    last_name: string;
    department: string;
  };
  report_metrics?: Array<{
    id: string;
    metric_name: string;
    metric_value: number;
    metric_unit: string | null;
    notes: string | null;
  }>;
}

interface ReportListResponse {
  data: Array<ReportRecord>;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export function useReports(filters: ReportFilters = {}) {
  return useQuery({
    queryKey: queryKeys.reports.list(filters),
    queryFn: async (): Promise<ReportListResponse> => {
      const params = new URLSearchParams();

      if (filters.search) params.append('search', filters.search);
      if (filters.status) params.append('status', filters.status);
      if (filters.archived) params.append('archived', filters.archived);
      if (filters.reportType) params.append('reportType', filters.reportType);
      if (filters.employeeId) params.append('employeeId', filters.employeeId);
      if (filters.groupBy) params.append('groupBy', filters.groupBy);
      if (filters.parentReportId) params.append('parentReportId', filters.parentReportId);
      if (filters.periodStart) params.append('periodStart', filters.periodStart);
      if (filters.periodEnd) params.append('periodEnd', filters.periodEnd);
      if (filters.department) params.append('department', filters.department);
      if (filters.page) params.append('page', String(filters.page));
      if (filters.pageSize) params.append('pageSize', String(filters.pageSize));

      const response = await fetch(`/api/reports?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch reports');
      }

      return response.json();
    },
  });
}
