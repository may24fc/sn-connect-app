import { type ResourceFeedFilters, queryKeys } from '@/lib/query-keys';
import { useQuery } from '@tanstack/react-query';
import type { ResourceRecord } from './useResources';

interface ResourceFeedResponse {
  data: Array<ResourceRecord>;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export function useResourceFeed(filters: ResourceFeedFilters = {}) {
  return useQuery({
    queryKey: queryKeys.resources.feed(filters),
    queryFn: async (): Promise<ResourceFeedResponse> => {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.category) params.append('category', filters.category);
      if (filters.resourceType) params.append('resourceType', filters.resourceType);
      if (filters.tags) params.append('tags', filters.tags.join(','));
      if (filters.page) params.append('page', String(filters.page));
      if (filters.pageSize) params.append('pageSize', String(filters.pageSize));

      const response = await fetch(`/api/resources/feed?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch resource feed');
      return response.json();
    },
  });
}

export function useFeaturedResources() {
  return useQuery({
    queryKey: queryKeys.resources.featured(),
    queryFn: async (): Promise<{ data: Array<ResourceRecord> }> => {
      const response = await fetch('/api/resources/featured');
      if (!response.ok) throw new Error('Failed to fetch featured resources');
      return response.json();
    },
  });
}

export function useRecentResources() {
  return useQuery({
    queryKey: queryKeys.resources.recent(),
    queryFn: async (): Promise<{ data: Array<ResourceRecord> }> => {
      const response = await fetch('/api/resources/recent');
      if (!response.ok) throw new Error('Failed to fetch recent resources');
      return response.json();
    },
  });
}

export function useSearchResources(
  query: string,
  filters?: { category?: string; resourceType?: string }
) {
  return useQuery({
    queryKey: queryKeys.resources.search(query, filters),
    queryFn: async (): Promise<{ data: Array<ResourceRecord> }> => {
      const params = new URLSearchParams({ query });
      if (filters?.category) params.append('category', filters.category);
      if (filters?.resourceType) params.append('resourceType', filters.resourceType);

      const response = await fetch(`/api/resources/search?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to search resources');
      return response.json();
    },
    enabled: query.length >= 2,
  });
}

export function useResourcesByCategory(category: string) {
  return useQuery({
    queryKey: queryKeys.resources.category(category),
    queryFn: async (): Promise<{ data: Array<ResourceRecord> }> => {
      const response = await fetch(`/api/resources/feed?category=${category}`);
      if (!response.ok) throw new Error('Failed to fetch resources by category');
      return response.json();
    },
    enabled: !!category,
  });
}
