import { queryKeys } from '@/lib/query-keys';
import type { TaskUpdateInput } from '@/lib/schemas/task.schema';
import { type QueryClient, useMutation, useQueryClient } from '@tanstack/react-query';
import type { TaskRecord } from './useTasks';

interface TaskMutationContext {
  previousTaskLists: Array<[ReadonlyArray<unknown>, unknown]>;
  previousTask: unknown;
  previousWorkTracker: Array<[ReadonlyArray<unknown>, unknown]>;
}

async function applyOptimisticTaskUpdate(
  queryClient: QueryClient,
  taskId: string,
  payload: TaskUpdateInput
): Promise<TaskMutationContext> {
  await queryClient.cancelQueries({ queryKey: queryKeys.tasks.all });
  await queryClient.cancelQueries({ queryKey: queryKeys.workTracker.all });

  const previousTaskLists = queryClient.getQueriesData({
    queryKey: queryKeys.tasks.lists(),
  });
  const previousTask = queryClient.getQueryData(queryKeys.tasks.detail(taskId));
  const previousWorkTracker = queryClient.getQueriesData({
    queryKey: queryKeys.workTracker.all,
  });
  const updatedAt = new Date().toISOString();
  const taskPatch = {
    ...(payload.title !== undefined ? { title: payload.title } : {}),
    ...(payload.description !== undefined ? { description: payload.description } : {}),
    ...(payload.status !== undefined ? { status: payload.status } : {}),
    ...(payload.priority !== undefined ? { priority: payload.priority } : {}),
    ...(payload.dueDate !== undefined ? { due_date: payload.dueDate } : {}),
    ...(payload.projectId !== undefined ? { project_id: payload.projectId } : {}),
    ...(payload.milestoneId !== undefined ? { milestone_id: payload.milestoneId } : {}),
    ...(payload.blockedReason !== undefined ? { blocked_reason: payload.blockedReason } : {}),
  };

  queryClient.setQueryData(queryKeys.tasks.detail(taskId), (old: any) => {
    if (!old?.data) return old;
    return { ...old, data: { ...old.data, ...taskPatch, updated_at: updatedAt } };
  });

  queryClient.setQueriesData({ queryKey: queryKeys.tasks.lists() }, (old: any) => {
    if (!old?.data || !Array.isArray(old.data)) return old;
    return {
      ...old,
      data: old.data.map((task: TaskRecord) =>
        task.id === taskId ? { ...task, ...taskPatch, updated_at: updatedAt } : task
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
              ...(payload.description !== undefined ? { description: payload.description } : {}),
              ...(payload.status !== undefined ? { status: payload.status } : {}),
              ...(payload.priority !== undefined ? { priority: payload.priority } : {}),
              ...(payload.dueDate !== undefined ? { dueDate: payload.dueDate } : {}),
              ...(payload.projectId !== undefined ? { projectId: payload.projectId } : {}),
              ...(payload.blockedReason !== undefined
                ? { blockedReason: payload.blockedReason }
                : {}),
              updatedAt,
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
}

function rollbackOptimisticTaskUpdate(
  queryClient: QueryClient,
  taskId: string,
  context: TaskMutationContext | undefined
): void {
  for (const [key, data] of context?.previousTaskLists ?? []) {
    queryClient.setQueryData(key, data);
  }
  if (context?.previousTask !== undefined) {
    queryClient.setQueryData(queryKeys.tasks.detail(taskId), context.previousTask);
  }
  for (const [key, data] of context?.previousWorkTracker ?? []) {
    queryClient.setQueryData(key, data);
  }
}

function invalidateTaskQueries(queryClient: QueryClient, taskId: string): void {
  void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
  void queryClient.invalidateQueries({ queryKey: queryKeys.workTracker.all });
  void queryClient.invalidateQueries({ queryKey: queryKeys.tasks.detail(taskId) });
  // Project progress and health are server-computed from all child tasks.
  void queryClient.invalidateQueries({ queryKey: queryKeys.projects.all });
  void queryClient.invalidateQueries({ queryKey: queryKeys.adminProjects.all });
}

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
    onMutate: (payload) => applyOptimisticTaskUpdate(queryClient, taskId, payload),
    onError: (_err, _payload, context) => {
      rollbackOptimisticTaskUpdate(queryClient, taskId, context);
    },
    onSettled: () => {
      invalidateTaskQueries(queryClient, taskId);
    },
  });
}

export function useUpdateTaskStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      taskId,
      status,
      blockedReason,
    }: {
      taskId: string;
      status: TaskRecord['status'];
      blockedReason?: string | null | undefined;
    }): Promise<{ data: TaskRecord }> => {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, blockedReason }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update task');
      }

      return response.json();
    },
    onMutate: ({ taskId, status, blockedReason }) =>
      applyOptimisticTaskUpdate(queryClient, taskId, { status, blockedReason }),
    onError: (_error, { taskId }, context) => {
      rollbackOptimisticTaskUpdate(queryClient, taskId, context);
    },
    onSettled: (_data, _error, { taskId }) => {
      invalidateTaskQueries(queryClient, taskId);
    },
  });
}
