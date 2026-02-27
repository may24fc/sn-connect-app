import { type DepartmentFilters, queryKeys } from '@/lib/query-keys';
import { STALE_TIMES } from '@/lib/query-client';
import type { Department, DepartmentInsert } from '@hr-portal/database';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

interface DepartmentListResponse {
  data: Array<Department>;
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
    staleTime: STALE_TIMES.stable,
  });
}

/**
 * Hook to create a new department
 */
export function useCreateDepartment() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (department: DepartmentInsert): Promise<{ data: Department }> => {
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
