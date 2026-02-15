import { useAnnouncements } from '@/hooks/useAnnouncements';
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

describe('useAnnouncements', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches announcement list', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [],
        pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
      }),
    });

    const { result } = renderHook(() => useAnnouncements({ page: 1, pageSize: 10 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(global.fetch).toHaveBeenCalledWith('/api/announcements?page=1&pageSize=10');
  });

  it('passes search and status filters', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [],
        pagination: { page: 1, pageSize: 10, total: 0, totalPages: 0 },
      }),
    });

    const { result } = renderHook(
      () => useAnnouncements({ search: 'policy', status: 'published', page: 1, pageSize: 10 }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/announcements?search=policy&status=published&page=1&pageSize=10'
    );
  });
});
