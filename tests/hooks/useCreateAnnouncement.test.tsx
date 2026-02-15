import { useCreateAnnouncement } from '@/hooks/useCreateAnnouncement';
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

describe('useCreateAnnouncement', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates announcement successfully', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { id: 'ann-1', title: 'A', content: 'B' } }),
    });

    const { result } = renderHook(() => useCreateAnnouncement(), {
      wrapper: createWrapper(),
    });

    result.current.mutate({
      title: 'A',
      content: 'B',
      category: 'general',
      priority: 'normal',
      status: 'draft',
      targetRoles: [],
      targetDepartments: [],
      targetEmployees: [],
      isPinned: false,
      allowComments: false,
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/announcements',
      expect.objectContaining({ method: 'POST' })
    );
  });
});
