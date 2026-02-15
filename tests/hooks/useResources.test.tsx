import { useDeleteResource, useResources, useUpdateResource } from '@/hooks/useResources';
import type { ResourceFilters } from '@/lib/query-keys';
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

const mockResourceResponse = {
  data: [
    {
      id: 'res-1',
      title: 'Employee Handbook',
      description: 'Company policies and procedures',
      category: 'policies',
      file_path: 'policies/res-1/handbook.pdf',
      external_url: null,
      is_public: true,
      target_roles: [],
      downloads_count: 25,
      created_at: '2026-01-15T10:00:00Z',
      updated_at: '2026-01-15T10:00:00Z',
      deleted_at: null,
    },
    {
      id: 'res-2',
      title: 'Onboarding Video',
      description: 'Welcome to the company',
      category: 'onboarding',
      file_path: null,
      external_url: 'https://youtube.com/watch?v=abc123',
      is_public: false,
      target_roles: ['employee', 'intern'],
      downloads_count: 10,
      created_at: '2026-01-16T10:00:00Z',
      updated_at: '2026-01-16T10:00:00Z',
      deleted_at: null,
    },
  ],
  pagination: {
    page: 1,
    pageSize: 10,
    total: 2,
    totalPages: 1,
  },
};

describe('useResources', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches resource list with default filters', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResourceResponse,
    });

    const { result } = renderHook(() => useResources(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(global.fetch).toHaveBeenCalledWith('/api/resources?');
    expect(result.current.data?.data).toHaveLength(2);
    expect(result.current.data?.data[0].title).toBe('Employee Handbook');
  });

  it('applies search filter', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ...mockResourceResponse,
        data: [mockResourceResponse.data[0]],
      }),
    });

    const filters: ResourceFilters = { search: 'handbook' };
    const { result } = renderHook(() => useResources(filters), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(global.fetch).toHaveBeenCalledWith('/api/resources?search=handbook');
    expect(result.current.data?.data).toHaveLength(1);
  });

  it('applies category filter', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        ...mockResourceResponse,
        data: [mockResourceResponse.data[1]],
      }),
    });

    const filters: ResourceFilters = { category: 'onboarding' };
    const { result } = renderHook(() => useResources(filters), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(global.fetch).toHaveBeenCalledWith('/api/resources?category=onboarding');
    expect(result.current.data?.data[0].category).toBe('onboarding');
  });

  it('applies pagination filters', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResourceResponse,
    });

    const filters: ResourceFilters = { page: 2, pageSize: 20 };
    const { result } = renderHook(() => useResources(filters), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(global.fetch).toHaveBeenCalledWith('/api/resources?page=2&pageSize=20');
  });

  it('applies multiple filters simultaneously', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResourceResponse,
    });

    const filters: ResourceFilters = {
      search: 'policy',
      category: 'policies',
      isPublic: true,
      page: 1,
      pageSize: 10,
    };

    const { result } = renderHook(() => useResources(filters), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/resources?search=policy&category=policies&page=1&pageSize=10'
    );
  });

  it('handles fetch error gracefully', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(() => useResources(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeTruthy();
  });

  it('handles network error', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useResources(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('Network error');
  });

  it('returns loading state initially', () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
      () => new Promise(() => {}) // Never resolves
    );

    const { result } = renderHook(() => useResources(), {
      wrapper: createWrapper(),
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });
});

describe('useUpdateResource', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates resource successfully', async () => {
    const resourceId = 'res-1';
    const updatedData = {
      title: 'Updated Handbook',
      description: 'New description',
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: { ...mockResourceResponse.data[0], ...updatedData },
      }),
    });

    const { result } = renderHook(() => useUpdateResource(resourceId), {
      wrapper: createWrapper(),
    });

    result.current.mutate(updatedData);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(global.fetch).toHaveBeenCalledWith(`/api/resources/${resourceId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedData),
    });
  });

  it('handles update error', async () => {
    const resourceId = 'res-1';

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Update failed' }),
    });

    const { result } = renderHook(() => useUpdateResource(resourceId), {
      wrapper: createWrapper(),
    });

    result.current.mutate({ title: 'New Title' });

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toContain('Update failed');
  });
});

describe('useDeleteResource', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deletes resource successfully', async () => {
    const resourceId = 'res-1';

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    const { result } = renderHook(() => useDeleteResource(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(resourceId);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(global.fetch).toHaveBeenCalledWith(`/api/resources/${resourceId}`, { method: 'DELETE' });
  });

  it('handles delete error', async () => {
    const resourceId = 'res-1';

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Delete failed' }),
    });

    const { result } = renderHook(() => useDeleteResource(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(resourceId);

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toContain('Delete failed');
  });
});
