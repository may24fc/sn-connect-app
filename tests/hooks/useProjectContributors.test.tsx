import { useAddProjectContributor, useRemoveProjectContributor } from '@/hooks/useProjects';
import { queryKeys } from '@/lib/query-keys';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
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

describe('useAddProjectContributor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('defaults the role to contributor', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true }),
    });

    const { result } = renderHook(() => useAddProjectContributor(), {
      wrapper: createWrapper(newQueryClient()),
    });

    await result.current.mutateAsync({ projectId: 'p-1', userId: 'u-1' });

    expect(global.fetch).toHaveBeenCalledWith('/api/projects/p-1/contributors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'u-1', role: 'contributor' }),
    });
  });

  it('sends an explicit role when given one', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true }),
    });

    const { result } = renderHook(() => useAddProjectContributor(), {
      wrapper: createWrapper(newQueryClient()),
    });

    await result.current.mutateAsync({ projectId: 'p-1', userId: 'u-1', role: 'lead' });

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/projects/p-1/contributors',
      expect.objectContaining({ body: JSON.stringify({ userId: 'u-1', role: 'lead' }) })
    );
  });

  it('invalidates the project detail after a successful add', async () => {
    const queryClient = newQueryClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true }),
    });

    const { result } = renderHook(() => useAddProjectContributor(), {
      wrapper: createWrapper(queryClient),
    });

    await result.current.mutateAsync({ projectId: 'p-1', userId: 'u-1' });

    expect(invalidate).toHaveBeenCalledWith({ queryKey: queryKeys.projects.detail('p-1') });
  });

  it('surfaces a permission failure from the API', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ error: 'Forbidden' }),
    });

    const { result } = renderHook(() => useAddProjectContributor(), {
      wrapper: createWrapper(newQueryClient()),
    });

    await expect(result.current.mutateAsync({ projectId: 'p-1', userId: 'u-1' })).rejects.toThrow(
      'Forbidden'
    );
  });
});

describe('useRemoveProjectContributor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('passes the user id as an encoded query parameter', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ok: true }),
    });

    const { result } = renderHook(() => useRemoveProjectContributor(), {
      wrapper: createWrapper(newQueryClient()),
    });

    await result.current.mutateAsync({ projectId: 'p-1', userId: 'u/1' });

    expect(global.fetch).toHaveBeenCalledWith('/api/projects/p-1/contributors?userId=u%2F1', {
      method: 'DELETE',
    });
  });
});
