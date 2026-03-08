import { queryKeys } from '@/lib/query-keys';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface IndividualPerformanceData {
  employee: {
    id: string;
    userId: string;
    fullName: string;
    position: string | null;
    department: string | null;
    status: string | null;
    employmentType: string | null;
    dateHired: string | null;
    avatarUrl: string | null;
    role: string | null;
    email: string | null;
  };
  kpis: Array<{
    id: string;
    employee_id: string;
    cycle_id: string | null;
    name: string;
    target_value: number;
    current_value: number;
    unit: string | null;
    status: string;
    period_start: string | null;
    period_end: string | null;
    admin_comments: string | null;
    admin_rating: number | null;
    created_at: string;
  }>;
  kpiSummary: {
    total: number;
    completed: number;
    avgProgress: number;
  };
  okrs: Array<{
    id: string;
    employee_id: string;
    cycle_id: string | null;
    objective: string;
    description: string | null;
    key_results: unknown;
    progress: number;
    weight: number;
    status: string;
    admin_comments: string | null;
    admin_rating: string | null;
    created_at: string;
  }>;
  okrTargets: Array<{
    id: string;
    okr_id: string;
    employee_id: string;
    cycle_id: string | null;
    name: string;
    description: string | null;
    metric_type: 'number' | 'boolean' | 'currency' | 'tasks';
    start_value: number;
    target_value: number;
    current_value: number;
    unit: string | null;
    weight: number;
    sort_order: number;
    admin_rating: string | null;
    admin_comments: string | null;
    created_at: string;
    updated_at: string;
  }>;
  okrSummary: {
    total: number;
    completed: number;
    avgProgress: number;
  };
  reviews: Array<{
    id: string;
    cycle_id: string;
    employee_id: string;
    reviewer_id: string | null;
    status: string;
    self_rating: number | null;
    manager_rating: number | null;
    final_rating: number | null;
    submitted_at: string | null;
    completed_at: string | null;
    review_cycles: {
      id: string;
      name: string;
      start_date: string;
      end_date: string;
      status: string;
    } | null;
  }>;
  latestReview: unknown | null;
}

export function useIndividualPerformance(employeeId: string | null) {
  return useQuery({
    queryKey: queryKeys.performance.individual(employeeId || ''),
    queryFn: async (): Promise<IndividualPerformanceData> => {
      const response = await fetch(`/api/performance/individual/${employeeId}`);

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ error: 'Failed to fetch performance data' }));
        throw new Error(error.error || 'Failed to fetch performance data');
      }

      return response.json();
    },
    enabled: !!employeeId,
  });
}

export function useExtendInternship() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      internshipId,
      newEndDate,
      reason,
    }: {
      internshipId: string;
      newEndDate: string;
      reason: string;
    }) => {
      const response = await fetch(`/api/internships/${internshipId}/extend`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newEndDate, reason }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to extend internship' }));
        throw new Error(error.error || 'Failed to extend internship');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.internships.all });
    },
  });
}
