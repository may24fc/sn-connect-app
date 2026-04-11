import { STALE_TIMES } from '@/lib/query-client';
import { type DivisionFilters, queryKeys } from '@/lib/query-keys';
import type { Division, DivisionInsert } from '@hr-portal/database';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

interface DivisionListResponse {
  data: Array<Division>;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export function useDivisions(filters: DivisionFilters = {}) {
  return useQuery({
    queryKey: queryKeys.divisions.list(filters),
    queryFn: async (): Promise<DivisionListResponse> => {
      const params = new URLSearchParams();

      if (filters.search) params.append('search', filters.search);
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.pageSize) params.append('pageSize', filters.pageSize.toString());

      const response = await fetch(`/api/divisions?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch divisions');
      }

      return response.json();
    },
    staleTime: STALE_TIMES.stable,
  });
}

export function useCreateDivision() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (division: DivisionInsert): Promise<{ data: Division }> => {
      const response = await fetch('/api/divisions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(division),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create division');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.divisions.all });
    },
  });
}