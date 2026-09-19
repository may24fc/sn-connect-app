import { useCreateTaskComment, useTaskComments } from '@/hooks/useTaskComments';
import { queryKeys } from '@/lib/query-keys';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

global.fetch = vi.fn();

function createWrapper(queryClient: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

function newQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

describe('useTaskComments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches the comment thread for a task', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [{ id: 'c-1', content: 'Hello' }] }),
    });

    const { result } = renderHook(() => useTaskComments('task-1'), {
      wrapper: createWrapper(newQueryClient()),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(global.fetch).toHaveBeenCalledWith('/api/tasks/task-1/comments');
    expect(result.current.data?.data).toHaveLength(1);
  });

  it('stays disabled without a task id', () => {
    const { result } = renderHook(() => useTaskComments(null), {
      wrapper: createWrapper(newQueryClient()),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('surfaces the API error message', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'You do not have access to this task' }),
    });

    const { result } = renderHook(() => useTaskComments('task-1'), {
      wrapper: createWrapper(newQueryClient()),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('You do not have access to this task');
  });
});

describe('useCreateTaskComment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('posts the comment and invalidates the thread', async () => {
    const queryClient = newQueryClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { id: 'c-1', content: 'Hello' } }),
    });

    const { result } = renderHook(() => useCreateTaskComment('task-1'), {
      wrapper: createWrapper(queryClient),
    });

    await result.current.mutateAsync({ content: 'Hello' });

    expect(global.fetch).toHaveBeenCalledWith('/api/tasks/task-1/comments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content: 'Hello' }),
    });
    expect(invalidate).toHaveBeenCalledWith({
      queryKey: queryKeys.tasks.comments('task-1'),
    });
  });

  it('rejects with the API error message', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Task not found' }),
    });

    const { result } = renderHook(() => useCreateTaskComment('task-1'), {
      wrapper: createWrapper(newQueryClient()),
    });

    await expect(result.current.mutateAsync({ content: 'Hello' })).rejects.toThrow(
      'Task not found'
    );
  });

  it('rejects before calling the API when there is no task id', async () => {
    const { result } = renderHook(() => useCreateTaskComment(null), {
      wrapper: createWrapper(newQueryClient()),
    });

    await expect(result.current.mutateAsync({ content: 'Hello' })).rejects.toThrow(
      'Task ID is required to add a comment'
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
