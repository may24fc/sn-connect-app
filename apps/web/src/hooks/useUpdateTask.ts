import { queryKeys } from '@/lib/query-keys';
import type { TaskUpdateInput } from '@/lib/schemas/task.schema';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { TaskRecord } from './useTasks';

export function useUpdateTask(taskId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: TaskUpdateInput): Promise<{ data: TaskRecord }> => {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update task');
      }

      return response.json();
    },
    // Optimistic update for instant UI feedback
    onMutate: async (payload) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.all });
      await queryClient.cancelQueries({ queryKey: queryKeys.tasks.detail(taskId) });
      await queryClient.cancelQueries({ queryKey: queryKeys.workTracker.all });

      // Snapshot previous values
      const previousTaskLists = queryClient.getQueriesData({
        queryKey: queryKeys.tasks.lists(),
      });
      const previousTask = queryClient.getQueryData(queryKeys.tasks.detail(taskId));
      const previousWorkTracker = queryClient.getQueriesData({
        queryKey: queryKeys.workTracker.all,
      });

      const taskPatch = {
        ...(payload.title !== undefined ? { title: payload.title } : {}),
        ...(payload.description !== undefined ? { description: payload.description } : {}),
        ...(payload.status !== undefined ? { status: payload.status } : {}),
        ...(payload.priority !== undefined ? { priority: payload.priority } : {}),
        ...(payload.dueDate !== undefined ? { due_date: payload.dueDate } : {}),
        ...(payload.projectId !== undefined ? { project_id: payload.projectId } : {}),
        ...(payload.milestoneId !== undefined ? { milestone_id: payload.milestoneId } : {}),
      };

      // Optimistically update detail view
      queryClient.setQueryData(queryKeys.tasks.detail(taskId), (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: { ...old.data, ...taskPatch, updated_at: new Date().toISOString() },
        };
      });

      // Optimistically update list views (use .lists() to avoid matching detail queries)
      queryClient.setQueriesData({ queryKey: queryKeys.tasks.lists() }, (old: any) => {
        if (!old?.data || !Array.isArray(old.data)) return old;
        return {
          ...old,
          data: old.data.map((task: TaskRecord) =>
            task.id === taskId
              ? { ...task, ...taskPatch, updated_at: new Date().toISOString() }
              : task
          ),
        };
      });

      queryClient.setQueriesData({ queryKey: queryKeys.workTracker.all }, (old: any) => {
        if (!old) return old;
        const patchPerson = (person: any) => {
          if (!person?.items) return person;
          const items = person.items.map((item: any) =>
            item.source === 'task' && item.id === taskId
              ? {
                  ...item,
                  ...(payload.title !== undefined ? { title: payload.title } : {}),
                  ...(payload.description !== undefined
                    ? { description: payload.description }
                    : {}),
                  ...(payload.status !== undefined ? { status: payload.status } : {}),
                  ...(payload.priority !== undefined ? { priority: payload.priority } : {}),
                  ...(payload.dueDate !== undefined ? { dueDate: payload.dueDate } : {}),
                  ...(payload.projectId !== undefined ? { projectId: payload.projectId } : {}),
                  updatedAt: new Date().toISOString(),
                }
              : item
          );
          const tasks = items.filter((item: any) => item.source === 'task');
          return {
            ...person,
            items,
            openTaskCount: tasks.filter((item: any) =>
              ['pending', 'in_progress', 'blocked'].includes(item.status)
            ).length,
            blockedCount: tasks.filter((item: any) => item.status === 'blocked').length,
          };
        };
        return {
          ...old,
          ...(old.person ? { person: patchPerson(old.person) } : {}),
          ...(old.people ? { people: old.people.map(patchPerson) } : {}),
        };
      });

      return { previousTaskLists, previousTask, previousWorkTracker };
    },
    onError: (_err, _payload, context) => {
      // Rollback on error
      for (const [key, data] of context?.previousTaskLists ?? []) {
        queryClient.setQueryData(key, data);
      }
      if (context?.previousTask) {
        queryClient.setQueryData(queryKeys.tasks.detail(taskId), context.previousTask);
      }
      for (const [key, data] of context?.previousWorkTracker ?? []) {
        queryClient.setQueryData(key, data);
      }
    },
    onSettled: () => {
      // Always refetch after mutation completes
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(taskId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.workTracker.all });
    },
  });
}
