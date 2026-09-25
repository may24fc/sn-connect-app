import { STALE_TIMES } from '@/lib/query-client';
import { queryKeys } from '@/lib/query-keys';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface TaskComment {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
  commenter_name: string | null;
}

export function useTaskComments(taskId?: string | null, options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.tasks.comments(taskId ?? 'unknown'),
    queryFn: async (): Promise<{ data: Array<TaskComment> }> => {
      if (!taskId) {
        return { data: [] };
      }

      const response = await fetch(`/api/tasks/${taskId}/comments`);

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ error: 'Failed to fetch task comments' }));
        throw new Error(error.error || 'Failed to fetch task comments');
      }

      return response.json();
    },
    enabled: (options.enabled ?? true) && Boolean(taskId),
    staleTime: STALE_TIMES.dynamic,
  });
}

export function useCreateTaskComment(taskId?: string | null) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: { content: string }): Promise<{ data: TaskComment }> => {
      if (!taskId) {
        throw new Error('Task ID is required to add a comment');
      }

      const response = await fetch(`/api/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to post task comment' }));
        throw new Error(error.error || 'Failed to post task comment');
      }

      return response.json();
    },
    onMutate: async ({ content }) => {
      if (!taskId) return undefined;
      const queryKey = queryKeys.tasks.comments(taskId);
      await queryClient.cancelQueries({ queryKey });
      const previousComments = queryClient.getQueryData<{ data: Array<TaskComment> }>(queryKey);
      const optimisticId = `optimistic-comment-${crypto.randomUUID()}`;
      queryClient.setQueryData<{ data: Array<TaskComment> }>(queryKey, (old) =>
        old
          ? {
              ...old,
              data: [
                ...old.data,
                {
                  id: optimisticId,
                  task_id: taskId,
                  user_id: '',
                  content,
                  created_at: new Date().toISOString(),
                  commenter_name: 'You',
                },
              ],
            }
          : old
      );
      return { queryKey, previousComments, optimisticId };
    },
    onSuccess: (response, _payload, context) => {
      if (context) {
        queryClient.setQueryData<{ data: Array<TaskComment> }>(context.queryKey, (old) =>
          old
            ? {
                ...old,
                data: old.data.map((comment) =>
                  comment.id === context.optimisticId ? response.data : comment
                ),
              }
            : old
        );
      }
    },
    onError: (_error, _payload, context) => {
      if (context) queryClient.setQueryData(context.queryKey, context.previousComments);
    },
    onSettled: () => {
      if (taskId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.tasks.comments(taskId) });
      }
    },
  });
}
