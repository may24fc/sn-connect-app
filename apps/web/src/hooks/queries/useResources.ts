import { type ResourceFilters, queryKeys } from '@/lib/query-keys';
import type { Resource } from '@hr-portal/database';
import { useQuery } from '@tanstack/react-query';

export interface ResourceListResponse {
  data: Array<Resource>;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Hook to fetch list of resources with filters (admin view)
 * Supports pagination, filtering by status, category, type, tags, and more
 *
 * @param filters - Filter and pagination options
 * @returns Query result with resource list and pagination info
 */
export function useResources(filters: ResourceFilters = {}) {
  return useQuery({
    queryKey: queryKeys.resources.list(filters),
    queryFn: async (): Promise<ResourceListResponse> => {
      const params = new URLSearchParams();

      if (filters.search) params.append('search', filters.search);
      if (filters.status) params.append('status', filters.status);
      if (filters.category) params.append('category', filters.category);
      if (filters.resourceType) params.append('resourceType', filters.resourceType);
      if (filters.tags && filters.tags.length > 0) {
        params.append('tags', filters.tags.join(','));
      }
      if (filters.authorId) params.append('authorId', filters.authorId);
      if (filters.isFeatured !== undefined) {
        params.append('isFeatured', String(filters.isFeatured));
      }
      if (filters.isPinned !== undefined) {
        params.append('isPinned', String(filters.isPinned));
      }
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.page) params.append('page', String(filters.page));
      if (filters.pageSize) params.append('pageSize', String(filters.pageSize));
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

      const response = await fetch(`/api/resources?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch resources');
      }

      return response.json();
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
}
