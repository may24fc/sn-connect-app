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
    position: string | null;
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
      const queryParams: Array<[string, string | number | undefined]> = [
        ['search', filters.search],
        ['status', filters.status],
        ['archived', filters.archived],
        ['reportType', filters.reportType],
        ['employeeId', filters.employeeId],
        ['groupBy', filters.groupBy],
        ['parentReportId', filters.parentReportId],
        ['periodStart', filters.periodStart],
        ['periodEnd', filters.periodEnd],
        ['periodOverlapStart', filters.periodOverlapStart],
        ['periodOverlapEnd', filters.periodOverlapEnd],
        ['marketingReportType', filters.marketingReportType],
        ['department', filters.department],
        ['page', filters.page],
        ['pageSize', filters.pageSize],
      ];

      for (const [key, value] of queryParams) {
        if (value) {
          params.append(key, String(value));
        }
      }

      const response = await fetch(`/api/reports?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch reports');
      }

      return response.json();
    },
  });
}
