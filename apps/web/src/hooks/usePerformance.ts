import { queryKeys } from '@/lib/query-keys';
import type { CreateReviewCycleInput } from '@/lib/schemas/performance.schema';
import type {
  KPI,
  OKR,
  OKRTarget,
  OKRTargetId,
  PerformanceCycle,
  ReviewStatus,
  TargetMetricType,
} from '@hr-portal/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

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
  description: string | null;
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
  weight: number | null;
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

interface OkrTargetRow {
  id: string;
  okr_id: string;
  employee_id: string;
  cycle_id: string | null;
  name: string;
  description: string | null;
  metric_type: TargetMetricType;
  start_value: number | null;
  target_value: number;
  current_value: number | null;
  unit: string | null;
  weight: number | null;
  sort_order: number | null;
  admin_rating: string | null;
  admin_comments: string | null;
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
    ...(row.manager_review_deadline ? { managerReviewDeadline: row.manager_review_deadline } : {}),
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
    ...(row.description ? { description: row.description } : {}),
    status: (row.status || 'in_progress') as OKR['status'],
    weight: Number(row.weight ?? 1),
    progressPercentage: Number(row.progress ?? 0),
    targets: [], // Populated separately via useOKRTargets
    keyResults: mappedKeyResults,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function calculateTargetProgress(target: OkrTargetRow): number {
  const current = Number(target.current_value ?? 0);
  const targetVal = Number(target.target_value);
  const start = Number(target.start_value ?? 0);

  switch (target.metric_type) {
    case 'boolean':
      return current >= 1 ? 100 : 0;
    case 'number':
    case 'currency':
      if (targetVal > start) {
        return Math.min(Math.round(((current - start) / (targetVal - start)) * 100), 100);
      }
      return current >= targetVal ? 100 : 0;
    case 'tasks':
      return targetVal > 0 ? Math.min(Math.round((current / targetVal) * 100), 100) : 0;
    default:
      return 0;
  }
}

function toUiOKRTarget(row: OkrTargetRow): OKRTarget {
  return {
    id: row.id as OKRTargetId,
    okrId: row.okr_id as OKR['id'],
    employeeId: row.employee_id as OKR['employeeId'],
    cycleId: row.cycle_id as OKR['cycleId'] | null,
    name: row.name,
    ...(row.description ? { description: row.description } : {}),
    metricType: row.metric_type,
    startValue: Number(row.start_value ?? 0),
    targetValue: Number(row.target_value),
    currentValue: Number(row.current_value ?? 0),
    ...(row.unit ? { unit: row.unit } : {}),
    weight: Number(row.weight ?? 1),
    sortOrder: Number(row.sort_order ?? 0),
    progressPercentage: Math.max(0, calculateTargetProgress(row)),
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
      return (payload.data || []).map((row) => ({
        id: row.id,
        status: mapReviewStatus(row.status),
      }));
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

export function useUpdateOKR() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      id: string;
      objective?: string;
      description?: string;
      keyResults?: Array<Record<string, unknown>>;
      progress?: number;
      status?: string;
      weight?: number;
      adminRating?: 'exceptional' | 'exceeds' | 'meets' | 'needs_improvement' | 'unsatisfactory';
      adminComments?: string;
      evaluatedBy?: string;
      evaluatedAt?: string;
    }) => {
      const response = await fetch('/api/performance/okrs', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const error = (await response.json()) as { error?: string };
        throw new Error(error.error || 'Failed to update OKR');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.performance.okrs() });
      queryClient.invalidateQueries({ queryKey: queryKeys.performance.all });
    },
  });
}

export function useUpdateKPI() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      id: string;
      name?: string;
      targetValue?: number;
      currentValue?: number;
      unit?: string;
      status?: string;
      adminRating?: 'exceptional' | 'exceeds' | 'meets' | 'needs_improvement' | 'unsatisfactory';
      adminComments?: string;
      evaluatedBy?: string;
      evaluatedAt?: string;
    }) => {
      const response = await fetch('/api/performance/kpis', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const error = (await response.json()) as { error?: string };
        throw new Error(error.error || 'Failed to update KPI');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.performance.kpis() });
      queryClient.invalidateQueries({ queryKey: queryKeys.performance.all });
    },
  });
}

export function useCreateKPI() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      name: string;
      targetValue: number;
      currentValue?: number;
      unit?: string;
      cycleId?: string;
      employeeId?: string;
      periodStart?: string;
      periodEnd?: string;
    }) => {
      const response = await fetch('/api/performance/kpis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = (await response.json()) as { error?: string };
        throw new Error(error.error || 'Failed to create KPI');
      }

      return response.json() as Promise<{ data: KpiRow }>;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.performance.kpis() });
      queryClient.invalidateQueries({ queryKey: queryKeys.performance.all });
    },
  });
}

export function useCreateOKR() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      objective: string;
      description?: string;
      cycleId?: string;
      keyResults?: Array<Record<string, unknown>>;
      progress?: number;
      status?: string;
      weight?: number;
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

// =============================================
// OKR Target Hooks
// =============================================

export function useOKRTargets(okrId?: string) {
  return useQuery({
    queryKey: queryKeys.performance.okrTargets(okrId),
    queryFn: async (): Promise<Array<OKRTarget>> => {
      const params = new URLSearchParams();
      if (okrId) params.set('okrId', okrId);
      const response = await fetch(`/api/performance/okr-targets?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch targets');
      const payload = (await response.json()) as { data: Array<OkrTargetRow> };
      return (payload.data || []).map(toUiOKRTarget);
    },
    enabled: !!okrId,
  });
}

export function useCreateOKRTarget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      okrId: string;
      name: string;
      description?: string;
      metricType: TargetMetricType;
      startValue?: number;
      targetValue: number;
      currentValue?: number;
      unit?: string;
      weight?: number;
      sortOrder?: number;
    }) => {
      const response = await fetch('/api/performance/okr-targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = (await response.json()) as { error?: string };
        throw new Error(error.error || 'Failed to create target');
      }

      return response.json() as Promise<{ data: OkrTargetRow }>;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.performance.okrTargets(variables.okrId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.performance.okrs() });
      queryClient.invalidateQueries({ queryKey: queryKeys.performance.all });
    },
  });
}

export function useUpdateOKRTarget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      id: string;
      okrId: string; // needed for cache invalidation
      name?: string;
      description?: string;
      metricType?: TargetMetricType;
      startValue?: number;
      targetValue?: number;
      currentValue?: number;
      unit?: string;
      weight?: number;
      sortOrder?: number;
      adminRating?: string;
      adminComments?: string;
    }) => {
      const { okrId: _, ...body } = payload;
      const response = await fetch('/api/performance/okr-targets', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const error = (await response.json()) as { error?: string };
        throw new Error(error.error || 'Failed to update target');
      }

      return response.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.performance.okrTargets(variables.okrId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.performance.okrs() });
      queryClient.invalidateQueries({ queryKey: queryKeys.performance.all });
    },
  });
}

export function useDeleteOKRTarget() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { id: string; okrId: string }) => {
      const response = await fetch(`/api/performance/okr-targets?id=${payload.id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = (await response.json()) as { error?: string };
        throw new Error(error.error || 'Failed to delete target');
      }

      return response.json();
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.performance.okrTargets(variables.okrId),
      });
      queryClient.invalidateQueries({ queryKey: queryKeys.performance.okrs() });
      queryClient.invalidateQueries({ queryKey: queryKeys.performance.all });
    },
  });
}
