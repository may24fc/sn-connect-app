import { useCreateResource } from '@/hooks/useResources';
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

describe('useCreateResource', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates resource with file path successfully', async () => {
    const newResource = {
      title: 'Employee Handbook 2026',
      description: 'Updated company policies',
      category: 'policies',
      filePath: 'policies/handbook-2026.pdf',
      externalUrl: null,
      isPublic: true,
      targetRoles: [],
    };

    const mockResponse = {
      data: {
        id: 'res-new',
        ...newResource,
        file_path: newResource.filePath,
        external_url: newResource.externalUrl,
        is_public: newResource.isPublic,
        target_roles: newResource.targetRoles,
        downloads_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
      },
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(() => useCreateResource(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(newResource);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(global.fetch).toHaveBeenCalledWith('/api/resources', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newResource),
    });

    expect(result.current.data?.data.title).toBe('Employee Handbook 2026');
  });

  it('creates resource with external URL successfully', async () => {
    const newResource = {
      title: 'Company Culture Video',
      description: 'Welcome video from CEO',
      category: 'culture',
      filePath: null,
      externalUrl: 'https://youtube.com/watch?v=abc123',
      isPublic: true,
      targetRoles: [],
    };

    const mockResponse = {
      data: {
        id: 'res-video',
        ...newResource,
        file_path: newResource.filePath,
        external_url: newResource.externalUrl,
        is_public: newResource.isPublic,
        target_roles: newResource.targetRoles,
        downloads_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
      },
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(() => useCreateResource(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(newResource);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.data.external_url).toBe('https://youtube.com/watch?v=abc123');
  });

  it('creates resource with role targeting', async () => {
    const newResource = {
      title: 'Associate Onboarding Guide',
      description: 'Guide for new interns',
      category: 'onboarding',
      filePath: 'onboarding/associate-guide.pdf',
      externalUrl: null,
      isPublic: false,
      targetRoles: ['associate'],
    };

    const mockResponse = {
      data: {
        id: 'res-associate',
        ...newResource,
        file_path: newResource.filePath,
        external_url: newResource.externalUrl,
        is_public: newResource.isPublic,
        target_roles: newResource.targetRoles,
        downloads_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
      },
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(() => useCreateResource(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(newResource);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.data.target_roles).toEqual(['associate']);
    expect(result.current.data?.data.is_public).toBe(false);
  });

  it('creates resource with multiple role targeting', async () => {
    const newResource = {
      title: 'Team Collaboration Guide',
      description: 'Best practices for team work',
      category: 'training',
      filePath: 'training/collaboration.pdf',
      externalUrl: null,
      isPublic: false,
      targetRoles: ['employee', 'associate', 'hr'],
    };

    const mockResponse = {
      data: {
        id: 'res-collab',
        ...newResource,
        file_path: newResource.filePath,
        external_url: newResource.externalUrl,
        is_public: newResource.isPublic,
        target_roles: newResource.targetRoles,
        downloads_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        deleted_at: null,
      },
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(() => useCreateResource(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(newResource);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.data.target_roles).toHaveLength(3);
  });

  it('handles validation error when neither filePath nor externalUrl provided', async () => {
    const invalidResource = {
      title: 'Invalid Resource',
      description: 'Missing both file and URL',
      category: 'policies',
      filePath: null,
      externalUrl: null,
      isPublic: true,
      targetRoles: [],
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        error: 'Invalid request body',
        details: {
          fieldErrors: {
            filePath: ['Either a file path or external URL is required'],
          },
        },
      }),
    });

    const { result } = renderHook(() => useCreateResource(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(invalidResource);

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error?.message).toContain('Invalid request body');
  });

  it('handles validation error for missing title', async () => {
    const invalidResource = {
      title: '',
      description: 'Valid description',
      category: 'policies',
      filePath: 'test.pdf',
      externalUrl: null,
      isPublic: true,
      targetRoles: [],
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        error: 'Invalid request body',
        details: {
          fieldErrors: {
            title: ['Title is required'],
          },
        },
      }),
    });

    const { result } = renderHook(() => useCreateResource(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(invalidResource);

    await waitFor(() => expect(result.current.isError).toBe(true));
  });

  it('handles unauthorized error (403)', async () => {
    const newResource = {
      title: 'Test Resource',
      description: 'Test',
      category: 'policies',
      filePath: 'test.pdf',
      externalUrl: null,
      isPublic: true,
      targetRoles: [],
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ error: 'Forbidden' }),
    });

    const { result } = renderHook(() => useCreateResource(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(newResource);

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error?.message).toContain('Forbidden');
  });

  it('handles server error (500)', async () => {
    const newResource = {
      title: 'Test Resource',
      description: 'Test',
      category: 'policies',
      filePath: 'test.pdf',
      externalUrl: null,
      isPublic: true,
      targetRoles: [],
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: 'Failed to create resource' }),
    });

    const { result } = renderHook(() => useCreateResource(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(newResource);

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error?.message).toContain('Failed to create resource');
  });

  it('handles network error', async () => {
    const newResource = {
      title: 'Test Resource',
      description: 'Test',
      category: 'policies',
      filePath: 'test.pdf',
      externalUrl: null,
      isPublic: true,
      targetRoles: [],
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error('Network error'));

    const { result } = renderHook(() => useCreateResource(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(newResource);

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error?.message).toBe('Network error');
  });

  it('invalidates resource list cache on success', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, gcTime: 0 },
        mutations: { retry: false },
      },
    });

    const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries');

    const newResource = {
      title: 'New Resource',
      description: 'Test',
      category: 'policies',
      filePath: 'test.pdf',
      externalUrl: null,
      isPublic: true,
      targetRoles: [],
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: {
          id: 'res-new',
          ...newResource,
          file_path: newResource.filePath,
          external_url: newResource.externalUrl,
          is_public: newResource.isPublic,
          target_roles: newResource.targetRoles,
          downloads_count: 0,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          deleted_at: null,
        },
      }),
    });

    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { result } = renderHook(() => useCreateResource(), { wrapper });

    result.current.mutate(newResource);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(invalidateSpy).toHaveBeenCalled();
  });
});
