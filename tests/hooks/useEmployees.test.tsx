import {
  useCreateEmployee,
  useDeleteEmployee,
  useEmployee,
  useEmployees,
  useUpdateEmployee,
} from '@/hooks/useEmployees';
import type { Employee, EmployeeInsert } from '@hr-portal/database';
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

// Mock employee data
const mockEmployee: Employee = {
  id: 'emp-123',
  user_id: 'user-123',
  employee_number: 'EMP-001',
  immediate_head: null,
  first_name: 'John',
  middle_name: 'M',
  last_name: 'Doe',
  birthday: '1990-01-01',
  date_hired: '2024-01-01',
  employment_type: 'regular',
  work_arrangement: 'full_time',
  position: 'Software Developer',
  department: 'Engineering',
  probation_end_date: null,
  payroll_account_name: 'John Doe',
  payroll_account_number: '1234567890',
  phone: '+63 912 345 6789',
  emergency_contact_name: 'Jane Doe',
  emergency_contact_number: '+63 912 987 6543',
  personal_email: 'john.doe@gmail.com',
  company_email: 'john.doe@company.com',
  address: '123 Main St',
  city: 'Makati',
  province: 'Metro Manila',
  postal_code: '1200',
  created_at: '2024-01-01T00:00:00Z',
  updated_at: '2024-01-01T00:00:00Z',
  created_by: null,
  deleted_at: null,
};

const mockEmployeeListResponse = {
  data: [mockEmployee],
  pagination: {
    page: 1,
    pageSize: 10,
    total: 1,
    totalPages: 1,
  },
};

describe('useEmployees', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch employees list successfully', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEmployeeListResponse,
    });

    const { result } = renderHook(() => useEmployees(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(mockEmployeeListResponse);
    expect(global.fetch).toHaveBeenCalledWith('/api/employees?');
  });

  it('should apply search filter', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEmployeeListResponse,
    });

    const { result } = renderHook(() => useEmployees({ search: 'John' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(global.fetch).toHaveBeenCalledWith('/api/employees?search=John');
  });

  it('should apply department filter', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEmployeeListResponse,
    });

    const { result } = renderHook(() => useEmployees({ department: 'Engineering' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(global.fetch).toHaveBeenCalledWith('/api/employees?department=Engineering');
  });

  it('should apply status filter', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEmployeeListResponse,
    });

    const { result } = renderHook(() => useEmployees({ status: 'active' }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(global.fetch).toHaveBeenCalledWith('/api/employees?status=active');
  });

  it('should apply pagination parameters', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEmployeeListResponse,
    });

    const { result } = renderHook(() => useEmployees({ page: 2, pageSize: 20 }), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(global.fetch).toHaveBeenCalledWith('/api/employees?page=2&pageSize=20');
  });

  it('should apply multiple filters', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => mockEmployeeListResponse,
    });

    const { result } = renderHook(
      () =>
        useEmployees({
          search: 'John',
          department: 'Engineering',
          status: 'active',
          page: 1,
          pageSize: 10,
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(global.fetch).toHaveBeenCalledWith(
      '/api/employees?search=John&department=Engineering&status=active&page=1&pageSize=10'
    );
  });

  it('should handle fetch error', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const { result } = renderHook(() => useEmployees(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(new Error('Failed to fetch employees'));
  });
});

describe('useEmployee', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch single employee successfully', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: mockEmployee }),
    });

    const { result } = renderHook(() => useEmployee('emp-123'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({ data: mockEmployee });
    expect(global.fetch).toHaveBeenCalledWith('/api/employees/emp-123');
  });

  it('should not fetch when id is null', async () => {
    const { result } = renderHook(() => useEmployee(null), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should not fetch when id is undefined', async () => {
    const { result } = renderHook(() => useEmployee(undefined), {
      wrapper: createWrapper(),
    });

    expect(result.current.fetchStatus).toBe('idle');
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('should handle fetch error', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 404,
    });

    const { result } = renderHook(() => useEmployee('emp-404'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(new Error('Failed to fetch employee'));
  });

  it('should throw error if id becomes null during fetch', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockImplementation(
      async () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: async () => ({ data: mockEmployee }),
              }),
            100
          )
        )
    );

    const { result, rerender } = renderHook(({ id }: { id: string | null }) => useEmployee(id), {
      wrapper: createWrapper(),
      initialProps: { id: 'emp-123' },
    });

    // Query starts
    await waitFor(() => expect(result.current.isFetching).toBe(true));

    // Change id to null mid-flight - query should be disabled
    rerender({ id: null });

    // Should not complete the fetch
    expect(result.current.fetchStatus).toBe('idle');
  });
});

describe('useCreateEmployee', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create employee successfully', async () => {
    const newEmployee: EmployeeInsert = {
      user_id: 'user-456',
      employee_number: 'EMP-002',
      immediate_head: null,
      first_name: 'Jane',
      middle_name: 'A',
      last_name: 'Smith',
      birthday: '1992-05-15',
      date_hired: '2024-02-01',
      employment_type: 'regular',
      work_arrangement: 'full_time',
      position: 'Product Manager',
      department: 'Product',
      probation_end_date: null,
      payroll_account_name: null,
      payroll_account_number: null,
      phone: null,
      emergency_contact_name: null,
      emergency_contact_number: null,
      personal_email: null,
      company_email: null,
      address: null,
      city: null,
      province: null,
      postal_code: null,
      created_by: null,
    };

    const createdEmployee = { ...mockEmployee, ...newEmployee, id: 'emp-456' };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: createdEmployee }),
    });

    const { result } = renderHook(() => useCreateEmployee(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(newEmployee);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({ data: createdEmployee });
    expect(global.fetch).toHaveBeenCalledWith('/api/employees', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newEmployee),
    });
  });

  it('should handle validation errors', async () => {
    const newEmployee: EmployeeInsert = {
      user_id: '',
      employee_number: '',
      immediate_head: null,
      first_name: '',
      middle_name: null,
      last_name: '',
      birthday: null,
      date_hired: '',
      employment_type: 'regular',
      work_arrangement: 'full_time',
      position: '',
      department: '',
      probation_end_date: null,
      payroll_account_name: null,
      payroll_account_number: null,
      phone: null,
      emergency_contact_name: null,
      emergency_contact_number: null,
      personal_email: null,
      company_email: null,
      address: null,
      city: null,
      province: null,
      postal_code: null,
      created_by: null,
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 400,
      json: async () => ({ error: 'Validation failed' }),
    });

    const { result } = renderHook(() => useCreateEmployee(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(newEmployee);

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(new Error('Validation failed'));
  });

  it('should handle permission denied error', async () => {
    const newEmployee: EmployeeInsert = {
      user_id: 'user-456',
      employee_number: 'EMP-002',
      immediate_head: null,
      first_name: 'Jane',
      middle_name: null,
      last_name: 'Smith',
      birthday: null,
      date_hired: '2024-02-01',
      employment_type: 'regular',
      work_arrangement: 'full_time',
      position: 'Product Manager',
      department: 'Product',
      probation_end_date: null,
      payroll_account_name: null,
      payroll_account_number: null,
      phone: null,
      emergency_contact_name: null,
      emergency_contact_number: null,
      personal_email: null,
      company_email: null,
      address: null,
      city: null,
      province: null,
      postal_code: null,
      created_by: null,
    };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ error: 'Forbidden' }),
    });

    const { result } = renderHook(() => useCreateEmployee(), {
      wrapper: createWrapper(),
    });

    result.current.mutate(newEmployee);

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(new Error('Forbidden'));
  });
});

describe('useUpdateEmployee', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should update employee successfully', async () => {
    const updates = {
      phone: '+63 912 111 2222',
      address: '456 New St',
    };

    const updatedEmployee = { ...mockEmployee, ...updates };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: updatedEmployee }),
    });

    const { result } = renderHook(() => useUpdateEmployee('emp-123'), {
      wrapper: createWrapper(),
    });

    result.current.mutate(updates);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({ data: updatedEmployee });
    expect(global.fetch).toHaveBeenCalledWith('/api/employees/emp-123', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
  });

  it('should handle partial updates', async () => {
    const updates = {
      phone: '+63 912 111 2222',
    };

    const updatedEmployee = { ...mockEmployee, ...updates };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: updatedEmployee }),
    });

    const { result } = renderHook(() => useUpdateEmployee('emp-123'), {
      wrapper: createWrapper(),
    });

    result.current.mutate(updates);

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({ data: updatedEmployee });
  });

  it('should handle not found error', async () => {
    const updates = { phone: '+63 912 111 2222' };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ error: 'Employee not found' }),
    });

    const { result } = renderHook(() => useUpdateEmployee('emp-404'), {
      wrapper: createWrapper(),
    });

    result.current.mutate(updates);

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(new Error('Employee not found'));
  });

  it('should handle unauthorized update', async () => {
    const updates = { phone: '+63 912 111 2222' };

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ error: 'Forbidden' }),
    });

    const { result } = renderHook(() => useUpdateEmployee('emp-123'), {
      wrapper: createWrapper(),
    });

    result.current.mutate(updates);

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(new Error('Forbidden'));
  });
});

describe('useDeleteEmployee', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should delete employee successfully', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    });

    const { result } = renderHook(() => useDeleteEmployee(), {
      wrapper: createWrapper(),
    });

    result.current.mutate('emp-123');

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual({ success: true });
    expect(global.fetch).toHaveBeenCalledWith('/api/employees/emp-123', {
      method: 'DELETE',
    });
  });

  it('should handle not found error', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 404,
      json: async () => ({ error: 'Employee not found' }),
    });

    const { result } = renderHook(() => useDeleteEmployee(), {
      wrapper: createWrapper(),
    });

    result.current.mutate('emp-404');

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(new Error('Employee not found'));
  });

  it('should handle permission denied error', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 403,
      json: async () => ({ error: 'Forbidden' }),
    });

    const { result } = renderHook(() => useDeleteEmployee(), {
      wrapper: createWrapper(),
    });

    result.current.mutate('emp-123');

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(new Error('Forbidden'));
  });

  it('should handle generic errors gracefully', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({}),
    });

    const { result } = renderHook(() => useDeleteEmployee(), {
      wrapper: createWrapper(),
    });

    result.current.mutate('emp-123');

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(result.current.error).toEqual(new Error('Failed to delete employee'));
  });
});
