import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys, type DepartmentFilters } from '@/lib/query-keys';
import type { Department, DepartmentInsert } from '@hr-portal/database';

interface DepartmentListResponse {
  data: Department[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Hook to fetch list of departments with pagination and filters
 */
export function useDepartments(filters: DepartmentFilters = {}) {
  return useQuery({
    queryKey: queryKeys.departments.list(filters),
    queryFn: async (): Promise<DepartmentListResponse> => {
      const params = new URLSearchParams();

      if (filters.search) params.append('search', filters.search);
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.pageSize) params.append('pageSize', filters.pageSize.toString());

      const response = await fetch(`/api/departments?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch departments');
      }

      return response.json();
    },
  });
}

/**
 * Hook to create a new department
 */
export function useCreateDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      department: DepartmentInsert
    ): Promise<{ data: Department }> => {
      const response = await fetch('/api/departments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(department),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create department');
      }

      return response.json();
    },
    onSuccess: () => {
      // Invalidate all department queries to refetch data
      queryClient.invalidateQueries({ queryKey: queryKeys.departments.all });
    },
  });
}
