import { type CollectionFilters, queryKeys } from '@/lib/query-keys';
import type { CreateCollectionInput, UpdateCollectionInput } from '@/lib/schemas/resource.schema';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ResourceRecord } from './useResources';

export interface CollectionRecord {
  id: string;
  title: string;
  description: string | null;
  thumbnail_path: string | null;
  is_public: boolean;
  target_roles: Array<string>;
  target_departments: Array<string>;
  author_id: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  resource_count?: number;
}

interface CollectionListResponse {
  data: Array<CollectionRecord>;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// ============================================
// Query Hooks
// ============================================

export function useResourceCollections(filters: CollectionFilters = {}) {
  return useQuery({
    queryKey: queryKeys.collections.list(filters),
    queryFn: async (): Promise<CollectionListResponse> => {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.page) params.append('page', String(filters.page));
      if (filters.pageSize) params.append('pageSize', String(filters.pageSize));

      const response = await fetch(`/api/collections?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch collections');
      return response.json();
    },
  });
}

export function useResourceCollection(id: string) {
  return useQuery({
    queryKey: queryKeys.collections.detail(id),
    queryFn: async (): Promise<{ data: CollectionRecord }> => {
      const response = await fetch(`/api/collections/${id}`);
      if (!response.ok) throw new Error('Failed to fetch collection');
      return response.json();
    },
    enabled: !!id,
  });
}

export function useCollectionResources(collectionId: string) {
  return useQuery({
    queryKey: queryKeys.collections.resources(collectionId),
    queryFn: async (): Promise<{ data: Array<ResourceRecord> }> => {
      const response = await fetch(`/api/collections/${collectionId}/resources`);
      if (!response.ok) throw new Error('Failed to fetch collection resources');
      return response.json();
    },
    enabled: !!collectionId,
  });
}

// ============================================
// Mutation Hooks
// ============================================

export function useCreateCollection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateCollectionInput): Promise<{ data: CollectionRecord }> => {
      const response = await fetch('/api/collections', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create collection');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.collections.all });
    },
  });
}

export function useUpdateCollection(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateCollectionInput): Promise<{ data: CollectionRecord }> => {
      const response = await fetch(`/api/collections/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update collection');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.collections.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.collections.detail(id) });
    },
  });
}

export function useDeleteCollection() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<{ success: boolean }> => {
      const response = await fetch(`/api/collections/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete collection');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.collections.all });
    },
  });
}

export function useAddResourceToCollection(collectionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      resourceId,
      displayOrder,
    }: { resourceId: string; displayOrder?: number }): Promise<{ success: boolean }> => {
      const response = await fetch(`/api/collections/${collectionId}/resources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resourceId, displayOrder }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to add resource to collection');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.collections.resources(collectionId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.collections.detail(collectionId) });
    },
  });
}

export function useRemoveResourceFromCollection(collectionId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (resourceId: string): Promise<{ success: boolean }> => {
      const response = await fetch(
        `/api/collections/${collectionId}/resources?resourceId=${resourceId}`,
        {
          method: 'DELETE',
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to remove resource from collection');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.collections.resources(collectionId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.collections.detail(collectionId) });
    },
  });
}
