import { type AISourceFilters, queryKeys } from '@/lib/query-keys';
import type { AccessLevel, FileStatus, KnowledgeSource } from '@hr-portal/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

interface AISourcesResponse {
  data: Array<KnowledgeSource>;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

interface UploadSourceResponse {
  data: KnowledgeSource;
}

interface UpdateSourcePayload {
  id: string;
  accessLevel?: AccessLevel;
  fileName?: string;
}

/**
 * Hook to fetch AI knowledge sources with filters and pagination
 */
export function useAISources(filters: AISourceFilters = {}) {
  return useQuery({
    queryKey: queryKeys.aiKnowledge.sourcesList(filters),
    queryFn: async (): Promise<AISourcesResponse> => {
      const params = new URLSearchParams();

      if (filters.search) params.append('search', filters.search);
      if (filters.status) params.append('status', filters.status);
      if (filters.accessLevel) params.append('access_level', filters.accessLevel);
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.pageSize) params.append('pageSize', filters.pageSize.toString());

      const response = await fetch(`/api/ai/sources?${params.toString()}`);

      if (!response.ok) {
        throw new Error('Failed to fetch AI knowledge sources');
      }

      return response.json();
    },
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to fetch a single AI knowledge source
 */
export function useAISource(id: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.aiKnowledge.source(id || ''),
    queryFn: async (): Promise<{ data: KnowledgeSource }> => {
      if (!id) throw new Error('Source ID is required');

      const response = await fetch(`/api/ai/sources/${id}`);

      if (!response.ok) {
        throw new Error('Failed to fetch knowledge source');
      }

      return response.json();
    },
    enabled: !!id,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Hook to upload a new knowledge source file.
 * Returns upload progress through onProgress callback.
 */
export function useUploadSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      file,
      accessLevel = 'all',
      onProgress,
    }: {
      file: File;
      accessLevel?: AccessLevel;
      onProgress?: (stage: FileStatus) => void;
    }): Promise<UploadSourceResponse> => {
      onProgress?.('scanning');

      // Derive a human-readable title from the filename (strip extension, replace separators)
      const derivedTitle = file.name
        .replace(/\.[^.]+$/, '')          // remove extension
        .replace(/[-_]+/g, ' ')           // hyphens/underscores → spaces
        .replace(/\s+/g, ' ')             // collapse multiple spaces
        .trim();

      const formData = new FormData();
      formData.append('file', file);
      formData.append('title', derivedTitle || file.name);
      formData.append('access_level', accessLevel);

      const response = await fetch('/api/ai/sources/upload', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Upload failed' }));
        throw new Error(error.error || 'Failed to upload knowledge source');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.aiKnowledge.sources() });
    },
  });
}

/**
 * Hook to update a knowledge source (access level, etc.)
 */
export function useUpdateSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateSourcePayload): Promise<{ data: KnowledgeSource }> => {
      const { id, ...updates } = payload;
      const response = await fetch(`/api/ai/sources/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Update failed' }));
        throw new Error(error.error || 'Failed to update knowledge source');
      }

      return response.json();
    },
    onMutate: async (payload) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.aiKnowledge.sources() });

      const previousSources = queryClient.getQueriesData<AISourcesResponse>({
        queryKey: queryKeys.aiKnowledge.sources(),
      });

      // Optimistic update across all cached source lists
      queryClient.setQueriesData<AISourcesResponse>(
        { queryKey: queryKeys.aiKnowledge.sources() },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.map((source) =>
              source.id === payload.id
                ? { ...source, ...(payload.accessLevel && { accessLevel: payload.accessLevel }) }
                : source
            ),
          };
        }
      );

      return { previousSources };
    },
    onError: (_err, _payload, context) => {
      if (context?.previousSources) {
        for (const [key, data] of context.previousSources) {
          queryClient.setQueryData(key, data);
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.aiKnowledge.sources() });
    },
  });
}

/**
 * Hook to delete a knowledge source
 */
export function useDeleteSource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<{ success: boolean }> => {
      const response = await fetch(`/api/ai/sources/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Delete failed' }));
        throw new Error(error.error || 'Failed to delete knowledge source');
      }

      return response.json();
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.aiKnowledge.sources() });

      const previousSources = queryClient.getQueriesData<AISourcesResponse>({
        queryKey: queryKeys.aiKnowledge.sources(),
      });

      queryClient.setQueriesData<AISourcesResponse>(
        { queryKey: queryKeys.aiKnowledge.sources() },
        (old) => {
          if (!old) return old;
          return {
            ...old,
            data: old.data.filter((source) => source.id !== id),
            pagination: {
              ...old.pagination,
              total: old.pagination.total - 1,
            },
          };
        }
      );

      return { previousSources };
    },
    onError: (_err, _id, context) => {
      if (context?.previousSources) {
        for (const [key, data] of context.previousSources) {
          queryClient.setQueryData(key, data);
        }
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.aiKnowledge.sources() });
    },
  });
}
