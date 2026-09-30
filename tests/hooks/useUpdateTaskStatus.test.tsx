import type { TaskRecord } from '@/hooks/useTasks';
import { useUpdateTaskStatus } from '@/hooks/useUpdateTask';
import { queryKeys } from '@/lib/query-keys';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

global.fetch = vi.fn();

const task: TaskRecord = {
  id: 'task-1',
  title: 'Prepare launch checklist',
  description: null,
  assigned_to: 'user-1',
  assigned_by: 'admin-1',
  priority: 'high',
  status: 'pending',
  category: 'launch',
  tags: null,
  due_date: null,
  completed_at: null,
  created_at: '2026-09-01T00:00:00.000Z',
  updated_at: '2026-09-01T00:00:00.000Z',
  created_by: 'admin-1',
  deleted_at: null,
  project_id: null,
  milestone_id: null,
};

function setup() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: Number.POSITIVE_INFINITY },
      mutations: { retry: false },
    },
  });
  const listKey = queryKeys.tasks.list({ page: 1, pageSize: 100 });
  const filteredListKey = queryKeys.tasks.list({ assigneeId: 'user-1' });
  const taskList = {
    data: [task],
    pagination: { page: 1, pageSize: 100, total: 1, totalPages: 1 },
  };

  queryClient.setQueryData(listKey, taskList);
  queryClient.setQueryData(filteredListKey, taskList);

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const hook = renderHook(() => useUpdateTaskStatus(), { wrapper });

  return { ...hook, queryClient, listKey, filteredListKey };
}

describe('useUpdateTaskStatus', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('moves a task in every cached list before the request resolves', async () => {
    let resolveRequest: ((value: unknown) => void) | undefined;
    (global.fetch as ReturnType<typeof vi.fn>).mockReturnValueOnce(
      new Promise((resolve) => {
        resolveRequest = resolve;
      })
    );
    const { result, queryClient, listKey, filteredListKey } = setup();

    act(() => {
      result.current.mutate({ taskId: task.id, status: 'in_progress' });
    });

    await waitFor(() => {
      const firstList = queryClient.getQueryData<{ data: Array<TaskRecord> }>(listKey);
      const filteredList = queryClient.getQueryData<{ data: Array<TaskRecord> }>(filteredListKey);
      expect(firstList?.data[0]?.status).toBe('in_progress');
      expect(filteredList?.data[0]?.status).toBe('in_progress');
    });
    expect(result.current.isPending).toBe(true);

    resolveRequest?.({
      ok: true,
      json: async () => ({ data: { ...task, status: 'in_progress' } }),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
  });

  it('restores every cached list when the request fails', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Update rejected' }),
    });
    const { result, queryClient, listKey, filteredListKey } = setup();

    act(() => {
      result.current.mutate({ taskId: task.id, status: 'completed' });
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    const firstList = queryClient.getQueryData<{ data: Array<TaskRecord> }>(listKey);
    const filteredList = queryClient.getQueryData<{ data: Array<TaskRecord> }>(filteredListKey);
    expect(firstList?.data[0]?.status).toBe('pending');
    expect(filteredList?.data[0]?.status).toBe('pending');
  });
});
