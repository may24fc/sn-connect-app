import { queryKeys } from '@/lib/query-keys';
import type { PaTaskCategory, PaTaskPriority, PaTaskStatus } from '@/types/pa-task.types';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

interface LookupResponse<T> {
  data: T[];
}

type LookupName = 'statuses' | 'priorities' | 'categories';

async function readJson<T>(response: Response, fallbackMessage: string): Promise<T> {
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: fallbackMessage }));
    throw new Error(payload.error || fallbackMessage);
  }
  return response.json() as Promise<T>;
}

function useLookupQuery<T>(lookup: LookupName, queryKey: readonly unknown[], enabled = true) {
  return useQuery({
    queryKey,
    enabled,
    queryFn: async (): Promise<LookupResponse<T>> => {
      const response = await fetch(`/api/pa-tasks/${lookup}`);
      return readJson<LookupResponse<T>>(response, `Failed to fetch PA task ${lookup}`);
    },
  });
}

function useLookupCreateMutation<T>(
  lookup: LookupName,
  queryKey: readonly unknown[],
  mutationAction: string
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      label: string;
      color?: string;
      sortOrder?: number;
      isDefault?: boolean;
      isTerminal?: boolean;
    }): Promise<{ data: T }> => {
      const response = await fetch(`/api/pa-tasks/${lookup}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return readJson<{ data: T }>(response, mutationAction);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });
}

function useLookupUpdateMutation<T>(
  lookup: LookupName,
  queryKey: readonly unknown[],
  mutationAction: string
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      id: string;
      label?: string;
      color?: string;
      sortOrder?: number;
      isDefault?: boolean;
      isTerminal?: boolean;
    }): Promise<{ data: T }> => {
      const response = await fetch(`/api/pa-tasks/${lookup}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return readJson<{ data: T }>(response, mutationAction);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });
}

function useLookupDeleteMutation(lookup: LookupName, queryKey: readonly unknown[], mutationAction: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const response = await fetch(`/api/pa-tasks/${lookup}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      await readJson<{ data: { id: string } }>(response, mutationAction);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey });
    },
  });
}

export function usePaTaskStatuses(enabled = true) {
  return useLookupQuery<PaTaskStatus>('statuses', queryKeys.paTasks.statuses(), enabled);
}

export function useCreatePaTaskStatus() {
  return useLookupCreateMutation<PaTaskStatus>(
    'statuses',
    queryKeys.paTasks.statuses(),
    'Failed to create PA task status'
  );
}

export function useUpdatePaTaskStatus() {
  return useLookupUpdateMutation<PaTaskStatus>(
    'statuses',
    queryKeys.paTasks.statuses(),
    'Failed to update PA task status'
  );
}

export function useDeletePaTaskStatus() {
  return useLookupDeleteMutation(
    'statuses',
    queryKeys.paTasks.statuses(),
    'Failed to delete PA task status'
  );
}

export function usePaTaskPriorities(enabled = true) {
  return useLookupQuery<PaTaskPriority>('priorities', queryKeys.paTasks.priorities(), enabled);
}

export function useCreatePaTaskPriority() {
  return useLookupCreateMutation<PaTaskPriority>(
    'priorities',
    queryKeys.paTasks.priorities(),
    'Failed to create PA task priority'
  );
}

export function useUpdatePaTaskPriority() {
  return useLookupUpdateMutation<PaTaskPriority>(
    'priorities',
    queryKeys.paTasks.priorities(),
    'Failed to update PA task priority'
  );
}

export function useDeletePaTaskPriority() {
  return useLookupDeleteMutation(
    'priorities',
    queryKeys.paTasks.priorities(),
    'Failed to delete PA task priority'
  );
}

export function usePaTaskCategories(enabled = true) {
  return useLookupQuery<PaTaskCategory>('categories', queryKeys.paTasks.categories(), enabled);
}

export function useCreatePaTaskCategory() {
  return useLookupCreateMutation<PaTaskCategory>(
    'categories',
    queryKeys.paTasks.categories(),
    'Failed to create PA task category'
  );
}

export function useUpdatePaTaskCategory() {
  return useLookupUpdateMutation<PaTaskCategory>(
    'categories',
    queryKeys.paTasks.categories(),
    'Failed to update PA task category'
  );
}

export function useDeletePaTaskCategory() {
  return useLookupDeleteMutation(
    'categories',
    queryKeys.paTasks.categories(),
    'Failed to delete PA task category'
  );
}
