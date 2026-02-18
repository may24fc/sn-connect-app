import { type ResourceFilters, queryKeys } from '@/lib/query-keys';
import type { CreateResourceInput, UpdateResourceInput } from '@/lib/schemas/resource.schema';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

// ============================================
// Types
// ============================================

export interface ResourceRecord {
  id: string;
  title: string;
  description: string | null;
  excerpt: string | null;
  resource_type: 'video' | 'document' | 'image' | 'link' | 'presentation' | 'interactive';
  category:
    | 'onboarding'
    | 'training'
    | 'policies'
    | 'benefits'
    | 'tools'
    | 'culture'
    | 'department_specific'
    | 'forms_templates'
    | 'performance'
    | 'emergency';
  subcategory: string | null;
  tags: Array<string>;
  file_path: string | null;
  external_url: string | null;
  thumbnail_path: string | null;
  file_size: number | null;
  mime_type: string | null;
  duration_seconds: number | null;
  status: 'draft' | 'published' | 'archived';
  published_at: string | null;
  expires_at: string | null;
  is_public: boolean;
  target_roles: Array<string>;
  target_departments: Array<string>;
  target_employees: Array<string>;
  is_featured: boolean;
  is_pinned: boolean;
  display_order: number;
  view_count: number;
  download_count: number;
  bookmark_count: number;
  version: number;
  previous_version_id: string | null;
  author_id: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  deleted_at: string | null;
}

interface ResourceListResponse {
  data: Array<ResourceRecord>;
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

export function useResources(filters: ResourceFilters = {}) {
  return useQuery({
    queryKey: queryKeys.resources.list(filters),
    queryFn: async (): Promise<ResourceListResponse> => {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.status) params.append('status', filters.status);
      if (filters.category) params.append('category', filters.category);
      if (filters.resourceType) params.append('resourceType', filters.resourceType);
      if (filters.tags) params.append('tags', filters.tags.join(','));
      if (filters.authorId) params.append('authorId', filters.authorId);
      if (filters.isFeatured !== undefined) params.append('isFeatured', String(filters.isFeatured));
      if (filters.isPinned !== undefined) params.append('isPinned', String(filters.isPinned));
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.page) params.append('page', String(filters.page));
      if (filters.pageSize) params.append('pageSize', String(filters.pageSize));
      if (filters.sortBy) params.append('sortBy', filters.sortBy);
      if (filters.sortOrder) params.append('sortOrder', filters.sortOrder);

      const response = await fetch(`/api/resources?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch resources');
      return response.json();
    },
  });
}

export function useResource(id: string) {
  return useQuery({
    queryKey: queryKeys.resources.detail(id),
    queryFn: async (): Promise<{ data: ResourceRecord }> => {
      const response = await fetch(`/api/resources/${id}`);
      if (!response.ok) throw new Error('Failed to fetch resource');
      return response.json();
    },
    enabled: !!id,
  });
}

export function useResourceAnalytics(id: string) {
  return useQuery({
    queryKey: queryKeys.resources.analytics(id),
    queryFn: async () => {
      const response = await fetch(`/api/resources/${id}/analytics`);
      if (!response.ok) throw new Error('Failed to fetch resource analytics');
      return response.json();
    },
    enabled: !!id,
  });
}

// ============================================
// Mutation Hooks
// ============================================

export function useCreateResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: CreateResourceInput): Promise<{ data: ResourceRecord }> => {
      const response = await fetch('/api/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to create resource');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.resources.all });
    },
  });
}

export function useUpdateResource(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateResourceInput): Promise<{ data: ResourceRecord }> => {
      const response = await fetch(`/api/resources/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update resource');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.resources.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.resources.detail(id) });
    },
  });
}

export function useDeleteResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<{ success: boolean }> => {
      const response = await fetch(`/api/resources/${id}`, { method: 'DELETE' });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to delete resource');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.resources.all });
    },
  });
}

export function usePublishResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<{ data: ResourceRecord }> => {
      const response = await fetch(`/api/resources/${id}/publish`, { method: 'POST' });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to publish resource');
      }
      return response.json();
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.resources.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.resources.detail(id) });
    },
  });
}

export function useArchiveResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<{ data: ResourceRecord }> => {
      const response = await fetch(`/api/resources/${id}/archive`, { method: 'POST' });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to archive resource');
      }
      return response.json();
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.resources.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.resources.detail(id) });
    },
  });
}

export function useToggleResourceFeatured() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      featured,
    }: { id: string; featured: boolean }): Promise<{ data: ResourceRecord }> => {
      const response = await fetch(`/api/resources/${id}/featured`, {
        method: featured ? 'POST' : 'DELETE',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to update featured status');
      }
      return response.json();
    },
    // Optimistic update for instant UI feedback
    onMutate: async ({ id, featured }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: queryKeys.resources.all });
      await queryClient.cancelQueries({ queryKey: queryKeys.resources.detail(id) });

      // Snapshot previous values
      const previousResources = queryClient.getQueryData(queryKeys.resources.all);
      const previousResource = queryClient.getQueryData(queryKeys.resources.detail(id));

      // Optimistically update detail view
      queryClient.setQueryData(queryKeys.resources.detail(id), (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: { ...old.data, is_featured: featured },
        };
      });

      // Optimistically update list views
      queryClient.setQueriesData({ queryKey: queryKeys.resources.all }, (old: any) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: old.data.map((resource: ResourceRecord) =>
            resource.id === id ? { ...resource, is_featured: featured } : resource
          ),
        };
      });

      return { previousResources, previousResource };
    },
    onError: (_err, { id }, context) => {
      // Rollback on error
      if (context?.previousResources) {
        queryClient.setQueryData(queryKeys.resources.all, context.previousResources);
      }
      if (context?.previousResource) {
        queryClient.setQueryData(queryKeys.resources.detail(id), context.previousResource);
      }
    },
    onSettled: (_, __, { id }) => {
      // Always refetch after mutation completes
      queryClient.invalidateQueries({ queryKey: queryKeys.resources.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.resources.detail(id) });
      queryClient.invalidateQueries({ queryKey: queryKeys.resources.featured() });
    },
  });
}

export function useUploadResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (
      formData: FormData
    ): Promise<{
      data: { filePath: string; fileName: string; fileSize: number; mimeType: string };
    }> => {
      const response = await fetch('/api/resources/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to upload resource');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.resources.all });
    },
  });
}
