import { type EmployeeFilters, queryKeys } from '@/lib/query-keys';
import type { Employee, EmployeeInsert } from '@hr-portal/database';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

interface EmployeeListResponse {
  data: Array<Employee>;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Hook to fetch list of employees with pagination and filters
 */
export function useEmployees(filters: EmployeeFilters = {}) {
  return useQuery({
    queryKey: queryKeys.employees.list(filters),
    queryFn: async (): Promise<EmployeeListResponse> => {
      const params = new URLSearchParams();

      if (filters.search) params.append('search', filters.search);
      if (filters.department) params.append('department', filters.department);
      if (filters.status) params.append('status', filters.status);
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.pageSize) params.append('pageSize', filters.pageSize.toString());

      const response = await fetch(`/api/employees?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch employees');
      }

      return response.json();
    },
  });
}

/**
 * Hook to fetch single employee details
 */
export function useEmployee(id: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.employees.detail(id || ''),
    queryFn: async (): Promise<{ data: Employee }> => {
      if (!id) throw new Error('Employee ID is required');

      const response = await fetch(`/api/employees/${id}`);

      if (!response.ok) {
        throw new Error('Failed to fetch employee');
      }

      return response.json();
    },
    enabled: !!id,
  });
}

/**
 * Hook to create a new employee
 */
export function useCreateEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (employee: EmployeeInsert): Promise<{ data: Employee }> => {
      const response = await fetch('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(employee),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create employee');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate all employee queries to refetch data
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.all });
    },
  });
}

/**
 * Hook to update an employee
 */
export function useUpdateEmployee(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (updates: Partial<Employee>): Promise<{ data: Employee }> => {
      const response = await fetch(`/api/employees/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update employee');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate specific employee and all lists
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.lists() });
    },
  });
}

/**
 * Hook to delete an employee (soft delete)
 */
export function useDeleteEmployee() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<{ success: boolean }> => {
      const response = await fetch(`/api/employees/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete employee');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate all employee queries
      queryClient.invalidateQueries({ queryKey: queryKeys.employees.all });
    },
  });
}
