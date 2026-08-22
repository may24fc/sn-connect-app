import { STALE_TIMES } from '@/lib/query-client';
import { queryKeys, type PaTaskFilters } from '@/lib/query-keys';
import type { PaTaskRecord } from '@/types/pa-task.types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

interface PaTaskListResponse {
  data: PaTaskRecord[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

interface PaTaskDetailResponse {
  data: PaTaskRecord & {
    status?: { id: string; label: string; color: string; is_terminal: boolean };
    priority?: { id: string; label: string; color: string };
    category?: { id: string; label: string; color: string } | null;
    attachments?: Array<Record<string, unknown>>;
  };
}

interface UsePaTasksOptions {
  enabled?: boolean;
}

function buildTaskParams(filters: PaTaskFilters) {
  const params = new URLSearchParams();
  if (filters.search) params.append('search', filters.search);
  if (filters.statusId) params.append('statusId', filters.statusId);
  if (filters.statusScope) params.append('statusScope', filters.statusScope);
  if (filters.priorityId) params.append('priorityId', filters.priorityId);
  if (filters.categoryId) params.append('categoryId', filters.categoryId);
  if (filters.assigneeId) params.append('assigneeId', filters.assigneeId);
  if (filters.dueDateFrom) params.append('dueDateFrom', filters.dueDateFrom);
  if (filters.dueDateTo) params.append('dueDateTo', filters.dueDateTo);
  if (filters.dateGivenFrom) params.append('dateGivenFrom', filters.dateGivenFrom);
  if (filters.dateGivenTo) params.append('dateGivenTo', filters.dateGivenTo);
  if (filters.page) params.append('page', String(filters.page));
  if (filters.pageSize) params.append('pageSize', String(filters.pageSize));
  if (filters.sortBy) params.append('sortBy', filters.sortBy);
  if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);
  return params;
}

async function readJson<T>(response: Response, fallbackMessage: string): Promise<T> {
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: fallbackMessage }));
    throw new Error(payload.error || fallbackMessage);
  }
  return response.json() as Promise<T>;
}

export function usePaTasks(filters: PaTaskFilters = {}, options: UsePaTasksOptions = {}) {
  return useQuery({
    queryKey: queryKeys.paTasks.list(filters),
    queryFn: async (): Promise<PaTaskListResponse> => {
      const response = await fetch(`/api/pa-tasks?${buildTaskParams(filters).toString()}`);
      return readJson<PaTaskListResponse>(response, 'Failed to fetch PA tasks');
    },
    enabled: options.enabled ?? true,
    staleTime: STALE_TIMES.dynamic,
  });
}

export function usePaTask(taskId: string | null | undefined, enabled = true) {
  return useQuery({
    queryKey: queryKeys.paTasks.detail(taskId ?? ''),
    queryFn: async (): Promise<PaTaskDetailResponse> => {
      if (!taskId) {
        throw new Error('Task id is required');
      }
      const response = await fetch(`/api/pa-tasks/${taskId}`);
      return readJson<PaTaskDetailResponse>(response, 'Failed to fetch PA task');
    },
    enabled: enabled && Boolean(taskId),
    staleTime: STALE_TIMES.dynamic,
  });
}

export function useCreatePaTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      title: string;
      description?: string | null;
      statusId: string;
      priorityId: string;
      categoryId?: string | null;
      assignedTo?: string | null;
      dueDate?: string | null;
      dateGiven?: string | null;
      blockerReason?: string | null;
      waitingOn?: string | null;
      notes?: string | null;
    }): Promise<{ data: PaTaskRecord }> => {
      const response = await fetch('/api/pa-tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return readJson<{ data: PaTaskRecord }>(response, 'Failed to create PA task');
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.paTasks.lists() });
    },
  });
}

export function useUpdatePaTask(taskId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      title?: string;
      description?: string | null;
      statusId?: string;
      priorityId?: string;
      categoryId?: string | null;
      assignedTo?: string | null;
      dueDate?: string | null;
      dateGiven?: string | null;
      blockerReason?: string | null;
      waitingOn?: string | null;
      notes?: string | null;
    }): Promise<{ data: PaTaskRecord }> => {
      const response = await fetch(`/api/pa-tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return readJson<{ data: PaTaskRecord }>(response, 'Failed to update PA task');
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.paTasks.detail(taskId) });
      void queryClient.invalidateQueries({ queryKey: queryKeys.paTasks.lists() });
    },
  });
}

export function useDeletePaTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (taskId: string): Promise<void> => {
      const response = await fetch(`/api/pa-tasks/${taskId}`, { method: 'DELETE' });
      await readJson<{ data: { id: string } }>(response, 'Failed to delete PA task');
    },
    onSuccess: (_, taskId) => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.paTasks.lists() });
      void queryClient.removeQueries({ queryKey: queryKeys.paTasks.detail(taskId) });
      void queryClient.removeQueries({ queryKey: queryKeys.paTasks.attachments(taskId) });
    },
  });
}
