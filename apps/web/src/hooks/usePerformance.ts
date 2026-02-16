import { queryKeys } from '@/lib/query-keys';
import type { CreateReviewCycleInput } from '@/lib/schemas/performance.schema';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { KPI, OKR, PerformanceCycle, ReviewStatus } from '@hr-portal/ui';

interface ReviewCycleRow {
  id: string;
  name: string;
  description: string | null;
  start_date: string;
  end_date: string;
  self_review_deadline: string | null;
  manager_review_deadline: string | null;
  status: 'draft' | 'active' | 'completed' | 'archived';
  created_at: string;
  updated_at: string;
}

interface OkrRow {
  id: string;
  employee_id: string;
  cycle_id: string | null;
  objective: string;
  key_results: Array<{
    id?: string;
    description?: string;
    targetValue?: number;
    currentValue?: number;
    unit?: string;
    weight?: number;
    progressPercentage?: number;
  }>;
  progress: number | null;
  status: string | null;
  created_at: string;
  updated_at: string;
}

interface KpiRow {
  id: string;
  employee_id: string;
  cycle_id: string | null;
  name: string;
  target_value: number;
  current_value: number;
  unit: string | null;
  period_start: string;
  period_end: string;
  created_at: string;
  updated_at: string;
}

interface ReviewRow {
  id: string;
  cycle_id: string;
  employee_id: string;
  status: 'pending' | 'self_review' | 'manager_review' | 'completed';
}

function mapCycleStatus(status: ReviewCycleRow['status']): PerformanceCycle['status'] {
  if (status === 'active') return 'active';
  if (status === 'draft') return 'draft';
  return 'closed';
}

function mapReviewStatus(status: ReviewRow['status']): ReviewStatus {
  if (status === 'pending') return 'pending_self';
  if (status === 'self_review') return 'pending_manager';
  if (status === 'manager_review') return 'pending_hr';
  return 'completed';
}

function toUiCycle(row: ReviewCycleRow): PerformanceCycle {
  return {
    id: row.id as PerformanceCycle['id'],
    name: row.name,
    startDate: row.start_date,
    endDate: row.end_date,
    status: mapCycleStatus(row.status),
    ...(row.self_review_deadline ? { selfAssessmentDeadline: row.self_review_deadline } : {}),
    ...(row.manager_review_deadline
      ? { managerReviewDeadline: row.manager_review_deadline }
      : {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toUiOKR(row: OkrRow): OKR {
  const keyResults = Array.isArray(row.key_results) ? row.key_results : [];
  const mappedKeyResults = keyResults.map((keyResult, index) => ({
    id: (keyResult.id || `${row.id}-kr-${index}`) as OKR['keyResults'][0]['id'],
    okrId: row.id as OKR['keyResults'][0]['okrId'],
    description: keyResult.description || 'Key result',
    targetValue: Number(keyResult.targetValue ?? 0),
    currentValue: Number(keyResult.currentValue ?? 0),
    unit: keyResult.unit || '',
    weight: Number(keyResult.weight ?? 0),
    progressPercentage: Number(keyResult.progressPercentage ?? 0),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  return {
    id: row.id as OKR['id'],
    employeeId: row.employee_id as OKR['employeeId'],
    cycleId: (row.cycle_id || 'uncategorized') as OKR['cycleId'],
    objective: row.objective,
    status: (row.status || 'in_progress') as OKR['status'],
    progressPercentage: Number(row.progress ?? 0),
    keyResults: mappedKeyResults,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toUiKPI(row: KpiRow): KPI {
  const target = Number(row.target_value || 0);
  const actual = Number(row.current_value || 0);
  const score = target > 0 ? Math.round((actual / target) * 100) : 0;

  return {
    id: row.id as KPI['id'],
    employeeId: row.employee_id as KPI['employeeId'],
    cycleId: (row.cycle_id || 'uncategorized') as KPI['cycleId'],
    name: row.name,
    target,
    actual,
    unit: row.unit || '',
    weight: 0,
    score,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function usePerformanceCycles() {
  return useQuery({
    queryKey: queryKeys.performance.cycles(),
    queryFn: async (): Promise<Array<PerformanceCycle>> => {
      const response = await fetch('/api/performance/cycles');
      if (!response.ok) throw new Error('Failed to fetch cycles');
      const payload = (await response.json()) as { data: Array<ReviewCycleRow> };
      return (payload.data || []).map(toUiCycle);
    },
  });
}

export function usePerformanceOKRs(cycleId?: string) {
  return useQuery({
    queryKey: [...queryKeys.performance.okrs(), cycleId || 'all'],
    queryFn: async (): Promise<Array<OKR>> => {
      const params = new URLSearchParams();
      if (cycleId) params.set('cycleId', cycleId);
      const response = await fetch(`/api/performance/okrs?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch OKRs');
      const payload = (await response.json()) as { data: Array<OkrRow> };
      return (payload.data || []).map(toUiOKR);
    },
  });
}

export function usePerformanceKPIs(cycleId?: string) {
  return useQuery({
    queryKey: [...queryKeys.performance.kpis(), cycleId || 'all'],
    queryFn: async (): Promise<Array<KPI>> => {
      const params = new URLSearchParams();
      if (cycleId) params.set('cycleId', cycleId);
      const response = await fetch(`/api/performance/kpis?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch KPIs');
      const payload = (await response.json()) as { data: Array<KpiRow> };
      return (payload.data || []).map(toUiKPI);
    },
  });
}

export function usePerformanceReviews(cycleId?: string) {
  return useQuery({
    queryKey: [...queryKeys.performance.reviews(), cycleId || 'all'],
    queryFn: async (): Promise<Array<{ id: string; status: ReviewStatus }>> => {
      const params = new URLSearchParams();
      if (cycleId) params.set('cycleId', cycleId);
      const response = await fetch(`/api/performance/reviews?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch reviews');
      const payload = (await response.json()) as { data: Array<ReviewRow> };
      return (payload.data || []).map((row) => ({ id: row.id, status: mapReviewStatus(row.status) }));
    },
  });
}

export function useCreatePerformanceCycle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateReviewCycleInput) => {
      const response = await fetch('/api/performance/cycles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create cycle');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.performance.cycles() });
    },
  });
}

export function useUpdatePerformanceCycle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const response = await fetch('/api/performance/cycles', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update cycle');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.performance.cycles() });
      queryClient.invalidateQueries({ queryKey: queryKeys.performance.all });
    },
  });
}

export function useDeletePerformanceCycle() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/performance/cycles?id=${id}`, { method: 'DELETE' });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete cycle');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.performance.cycles() });
      queryClient.invalidateQueries({ queryKey: queryKeys.performance.all });
    },
  });
}

export function useCreateOKR() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      objective: string;
      cycleId?: string;
      keyResults?: Array<Record<string, unknown>>;
      progress?: number;
      status?: string;
      employeeId?: string;
    }) => {
      const response = await fetch('/api/performance/okrs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create OKR');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.performance.okrs() });
      queryClient.invalidateQueries({ queryKey: queryKeys.performance.all });
    },
  });
}
