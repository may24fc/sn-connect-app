import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useOnboardingProfiles } from '../../apps/web/src/hooks/useOnboardingProfiles';

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

describe('useOnboardingProfiles', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches onboarding profile list with default params', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [],
        summary: { total: 0, completed: 0, inProgress: 0 },
        pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
      }),
    });

    const { result } = renderHook(() => useOnboardingProfiles(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(global.fetch).toHaveBeenCalledWith('/api/onboarding/profiles');
  });

  it('passes search/status/role filters', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: [],
        summary: { total: 0, completed: 0, inProgress: 0 },
        pagination: { page: 1, pageSize: 20, total: 0, totalPages: 0 },
      }),
    });

    const { result } = renderHook(
      () =>
        useOnboardingProfiles({
          search: 'john',
          status: 'completed',
          role: 'employee',
          page: 2,
          pageSize: 10,
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(global.fetch).toHaveBeenCalledWith(
      '/api/onboarding/profiles?search=john&status=completed&role=employee&page=2&pageSize=10'
    );
  });
});
