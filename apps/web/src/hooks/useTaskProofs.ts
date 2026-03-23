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
    onSuccess: () => {
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.proofs(taskId) });
    },
  });
}
