import { queryKeys } from '@/lib/query-keys';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface TaskProof {
  id: string;
  task_id: string;
  submitted_by: string;
  proof_type: 'link' | 'note';
  content: string;
  label: string | null;
  created_at: string;
  updated_at: string;
  submitted_by_name: string;
}

export function useTaskProofs(taskId: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.tasks.proofs(taskId || ''),
    queryFn: async (): Promise<{ data: TaskProof[] }> => {
      if (!taskId) throw new Error('Task ID is required');
      const response = await fetch(`/api/tasks/${taskId}/proofs`);
      if (!response.ok) throw new Error('Failed to fetch proofs');
      return response.json();
    },
    enabled: !!taskId,
  });
}

export function useCreateTaskProof(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      proofType: 'link' | 'note';
      content: string;
      label?: string | null;
    }): Promise<{ data: TaskProof }> => {
      const response = await fetch(`/api/tasks/${taskId}/proofs`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to submit proof');
      }
      return response.json();
    },
    onMutate: async (payload) => {
      const queryKey = queryKeys.tasks.proofs(taskId);
      await queryClient.cancelQueries({ queryKey });
      const previousProofs = queryClient.getQueryData<{ data: Array<TaskProof> }>(queryKey);
      const optimisticId = `optimistic-proof-${crypto.randomUUID()}`;
      queryClient.setQueryData<{ data: Array<TaskProof> }>(queryKey, (old) =>
        old
          ? {
              ...old,
              data: [
                ...old.data,
                {
                  id: optimisticId,
                  task_id: taskId,
                  submitted_by: '',
                  proof_type: payload.proofType,
                  content: payload.content,
                  label: payload.label ?? null,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                  submitted_by_name: 'You',
                },
              ],
            }
          : old
      );
      return { previousProofs, optimisticId };
    },
    onSuccess: (response, _payload, context) => {
      queryClient.setQueryData<{ data: Array<TaskProof> }>(queryKeys.tasks.proofs(taskId), (old) =>
        old && context
          ? {
              ...old,
              data: old.data.map((proof) => (proof.id === context.optimisticId ? response.data : proof)),
            }
          : old
      );
    },
    onError: (_error, _payload, context) => {
      queryClient.setQueryData(queryKeys.tasks.proofs(taskId), context?.previousProofs);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.proofs(taskId) });
    },
  });
}

export function useDeleteTaskProof(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (proofId: string): Promise<void> => {
      const response = await fetch(`/api/tasks/${taskId}/proofs/${proofId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete proof');
      }
    },
    onMutate: async (proofId) => {
      const queryKey = queryKeys.tasks.proofs(taskId);
      await queryClient.cancelQueries({ queryKey });
      const previousProofs = queryClient.getQueryData<{ data: Array<TaskProof> }>(queryKey);
      queryClient.setQueryData<{ data: Array<TaskProof> }>(queryKey, (old) =>
        old ? { ...old, data: old.data.filter((proof) => proof.id !== proofId) } : old
      );
      return { previousProofs };
    },
    onError: (_error, _proofId, context) => {
      queryClient.setQueryData(queryKeys.tasks.proofs(taskId), context?.previousProofs);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.proofs(taskId) });
    },
  });
}
