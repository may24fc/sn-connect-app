import { useCreateDepartment, useDepartments } from '@/hooks/useDepartments';
import type { Department, DepartmentInsert } from '@hr-portal/database';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock fetch globally
global.fetch = vi.fn();

// Helper to create a wrapper with QueryClient
function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

// Mock department data
const mockDepartment: Department = {
  id: 'dept-123',
  name: 'Engineering',
  description: 'Software development and engineering team',
  head_employee_id: 'emp-456',
  parent_department_id: null,
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  created_by: 'user-123',
  deleted_at: null,
};

const mockDepartmentListResponse = {
  data: [mockDepartment],
  pagination: {
    page: 1,
    pageSize: 10,
    total: 1,
    totalPages: 1,
  },
};

describe('useDepartments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch departments list successfully', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockDepartmentListResponse,
    });

    const { result } = renderHook(() => useDepartments(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockDepartmentListResponse);
    expect(global.fetch).toHaveBeenCalledWith('/api/departments?');
  });

  it('should apply search filter', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockDepartmentListResponse,
    });

    const { result } = renderHook(() => useDepartments({ search: 'Engineering' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(global.fetch).toHaveBeenCalledWith('/api/departments?search=Engineering');
  });

  it('should apply pagination parameters', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockDepartmentListResponse,
    });

    const { result } = renderHook(() => useDepartments({ page: 2, pageSize: 20 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(global.fetch).toHaveBeenCalledWith('/api/departments?page=2&pageSize=20');
  });

  it('should apply multiple filters', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockDepartmentListResponse,
    });

    const { result } = renderHook(
      () =>
        useDepartments({
          search: 'Engineering',
          page: 1,
          pageSize: 10,
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/departments?search=Engineering&page=1&pageSize=10'
    );
  });

  it('should handle fetch error', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(() => useDepartments(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(new Error('Failed to fetch departments'));
  });

  it('should handle empty results', async () => {
    const emptyResponse = {
      data: [],
      pagination: {
        page: 1,
        pageSize: 10,
        total: 0,
        totalPages: 0,
      },
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => emptyResponse,
    });

    const { result } = renderHook(() => useDepartments(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(emptyResponse);
    expect(result.current.data.data).toHaveLength(0);
  });

  it('should return data with correct structure', async () => {
    const multiDepartmentResponse = {
      data: [
        mockDepartment,
        {
          ...mockDepartment,
          id: 'dept-124',
          name: 'Marketing',
          description: 'Marketing and communications team',
        },
        {
          ...mockDepartment,
          id: 'dept-125',
          name: 'Sales',
          description: 'Sales and business development team',
        },
      ],
      pagination: {
        page: 1,
        pageSize: 10,
        total: 3,
        totalPages: 1,
      },
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => multiDepartmentResponse,
    });

    const { result } = renderHook(() => useDepartments(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data?.data).toHaveLength(3);
    expect(result.current.data?.pagination.total).toBe(3);
  });
});

describe('useCreateDepartment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create department successfully', async () => {
    const newDepartment: DepartmentInsert = {
      name: 'Human Resources',
      description: 'HR and talent management team',
      head_employee_id: 'emp-789',
    };

    const mockResponse = {
      data: {
        ...mockDepartment,
        id: 'dept-new',
        name: newDepartment.name,
        description: newDepartment.description,
        head_employee_id: newDepartment.head_employee_id,
      },
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(() => useCreateDepartment(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(newDepartment);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockResponse);
    expect(global.fetch).toHaveBeenCalledWith('/api/departments', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newDepartment),
    });
  });

  it('should create department with minimal fields', async () => {
    const newDepartment: DepartmentInsert = {
      name: 'Finance',
    };

    const mockResponse = {
      data: {
        ...mockDepartment,
        id: 'dept-new',
        name: newDepartment.name,
        description: null,
        head_employee_id: null,
      },
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(() => useCreateDepartment(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(newDepartment);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockResponse);
  });

  it('should handle duplicate name error', async () => {
    const newDepartment: DepartmentInsert = {
      name: 'Engineering',
      description: 'Engineering team',
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Department with this name already exists' }),
    });

    const { result } = renderHook(() => useCreateDepartment(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(newDepartment);

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(
      new Error('Department with this name already exists')
    );
  });

  it('should handle validation error', async () => {
    const invalidDepartment: DepartmentInsert = {
      name: '',
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Department name is required' }),
    });

    const { result } = renderHook(() => useCreateDepartment(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(invalidDepartment);

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(new Error('Department name is required'));
  });

  it('should handle generic error without custom message', async () => {
    const newDepartment: DepartmentInsert = {
      name: 'Support',
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      json: async () => ({}),
    });

    const { result } = renderHook(() => useCreateDepartment(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(newDepartment);

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(new Error('Failed to create department'));
  });

  it('should handle unauthorized error', async () => {
    const newDepartment: DepartmentInsert = {
      name: 'Legal',
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ error: 'Unauthorized' }),
    });

    const { result } = renderHook(() => useCreateDepartment(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(newDepartment);

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(new Error('Unauthorized'));
  });

  it('should create department with parent department', async () => {
    const newDepartment: DepartmentInsert = {
      name: 'Frontend Team',
      description: 'Frontend development sub-team',
      parent_department_id: 'dept-123',
    };

    const mockResponse = {
      data: {
        ...mockDepartment,
        id: 'dept-sub',
        name: newDepartment.name,
        description: newDepartment.description,
        parent_department_id: newDepartment.parent_department_id,
      },
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(() => useCreateDepartment(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(newDepartment);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockResponse);
    expect(result.current.data?.data.parent_department_id).toBe('dept-123');
  });

  it('should handle network error', async () => {
    const newDepartment: DepartmentInsert = {
      name: 'Operations',
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
      new Error('Network error')
    );

    const { result } = renderHook(() => useCreateDepartment(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(newDepartment);

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(new Error('Network error'));
  });
});
