import { useAnnouncementFeed } from '@/hooks/useAnnouncementFeed';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

global.fetch = vi.fn();

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

describe('useAnnouncementFeed', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches feed list', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [],
        pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
      }),
    });

    const { result } = renderHook(() => useAnnouncementFeed({ page: 1, pageSize: 10 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(global.fetch).toHaveBeenCalledWith('/api/announcements/feed?page=1&pageSize=10');
  });

  it('passes read and category filters', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [],
        pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
      }),
    });

    const { result } = renderHook(
      () =>
        useAnnouncementFeed({ category: 'general', readStatus: 'unread', page: 2, pageSize: 10 }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/announcements/feed?category=general&readStatus=unread&page=2&pageSize=10'
    );
  });
});
