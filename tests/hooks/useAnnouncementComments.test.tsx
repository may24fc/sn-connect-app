import {
  useAnnouncementComments,
  useCreateAnnouncementComment,
} from '@/hooks/useAnnouncementComments';
import { ApiError } from '@/lib/api-error';
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

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('useAnnouncementComments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches the thread and the server-side allowComments flag', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      jsonResponse({ data: [], meta: { allowComments: true } })
    );

    const { result } = renderHook(() => useAnnouncementComments('a-1'), {
      wrapper: createWrapper(newQueryClient()),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(global.fetch).toHaveBeenCalledWith('/api/announcements/a-1/comments');
    expect(result.current.data?.meta.allowComments).toBe(true);
  });

  it('stays disabled without an announcement id', () => {
    const { result } = renderHook(() => useAnnouncementComments(null), {
      wrapper: createWrapper(newQueryClient()),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe('useCreateAnnouncementComment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('posts the comment and invalidates the thread', async () => {
    const queryClient = newQueryClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      jsonResponse({ data: { id: 'c-1' } }, 201)
    );

    const { result } = renderHook(() => useCreateAnnouncementComment('a-1'), {
      wrapper: createWrapper(queryClient),
    });

    await result.current.mutateAsync({ content: 'Nice' });

    expect(invalidate).toHaveBeenCalledWith({
      queryKey: queryKeys.announcements.comments('a-1'),
    });
  });

  it('surfaces a 403 as an ApiError so the UI can explain comments are closed', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      jsonResponse({ error: 'Comments are disabled for this announcement' }, 403)
    );

    const { result } = renderHook(() => useCreateAnnouncementComment('a-1'), {
      wrapper: createWrapper(newQueryClient()),
    });

    await expect(result.current.mutateAsync({ content: 'Nice' })).rejects.toMatchObject({
      status: 403,
      message: 'Comments are disabled for this announcement',
    });
    await expect(result.current.mutateAsync({ content: 'Nice' })).rejects.toBeInstanceOf(Error);
  });

  it('rejects before calling the API when there is no announcement id', async () => {
    const { result } = renderHook(() => useCreateAnnouncementComment(null), {
      wrapper: createWrapper(newQueryClient()),
    });

    await expect(result.current.mutateAsync({ content: 'Nice' })).rejects.toThrow(
      'Announcement ID is required to add a comment'
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });
});

describe('ApiError integration', () => {
  it('is the error type thrown by the comments query on failure', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      jsonResponse({ error: 'Announcement not found' }, 404)
    );

    const { result } = renderHook(() => useAnnouncementComments('a-1'), {
      wrapper: createWrapper(newQueryClient()),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(ApiError);
    expect((result.current.error as ApiError).status).toBe(404);
  });
});
