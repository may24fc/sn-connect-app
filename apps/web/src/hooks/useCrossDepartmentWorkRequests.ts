import { queryKeys } from '@/lib/query-keys';
import type {
  CrossDepartmentWorkRequestCreateInput,
  CrossDepartmentWorkRequestResponseInput,
  CrossDepartmentWorkRequestRevisionInput,
} from '@/lib/schemas/work-request.schema';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export type CrossDepartmentWorkRequestStatus =
  | 'pending'
  | 'changes_requested'
  | 'approved'
  | 'rejected'
  | 'cancelled';

export interface CrossDepartmentWorkRequest {
  id: string;
  requester_id: string;
  requester_name: string;
  source_department_id: string | null;
  source_department_name: string | null;
  target_department_id: string;
  target_department_name: string;
  project_id: string | null;
  project_name: string | null;
  milestone_id: string | null;
  suggested_assignee_id: string | null;
  suggested_assignee_name: string | null;
  assigned_to: string | null;
  assigned_to_name: string | null;
  reviewed_by: string | null;
  reviewer_name: string | null;
  created_task_id: string | null;
  title: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  due_date: string | null;
  status: CrossDepartmentWorkRequestStatus;
  decision_note: string | null;
  created_at: string;
  updated_at: string;
  decided_at: string | null;
}

export interface WorkRequestAssigneeOption {
  id: string;
  departmentId: string;
  name: string;
  avatarUrl: string | null;
}

interface WorkRequestsResponse {
  data: Array<CrossDepartmentWorkRequest>;
  assigneeOptions: Array<WorkRequestAssigneeOption>;
  canReview: boolean;
  pendingCount: number;
}

async function jsonRequest<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.error || 'Request failed');
  return body as T;
}

export function useCrossDepartmentWorkRequests(scope: 'mine' | 'review', enabled = true) {
  return useQuery({
    queryKey: queryKeys.workTracker.requests(scope),
    queryFn: () => jsonRequest<WorkRequestsResponse>(`/api/work-requests?view=${scope}`),
    enabled,
  });
}

export function useCreateCrossDepartmentWorkRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CrossDepartmentWorkRequestCreateInput) =>
      jsonRequest<{ data: CrossDepartmentWorkRequest }>('/api/work-requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.workTracker.all });
    },
  });
}

export function useRespondCrossDepartmentWorkRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: CrossDepartmentWorkRequestResponseInput & { id: string }) =>
      jsonRequest<{ data: CrossDepartmentWorkRequest }>(`/api/work-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.workTracker.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      void queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
    },
  });
}

export function useReviseCrossDepartmentWorkRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...input }: CrossDepartmentWorkRequestRevisionInput & { id: string }) =>
      jsonRequest<{ data: CrossDepartmentWorkRequest }>(`/api/work-requests/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.workTracker.all });
    },
  });
}
