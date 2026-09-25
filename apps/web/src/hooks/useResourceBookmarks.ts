import { queryKeys } from '@/lib/query-keys';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ResourceRecord } from './useResources';

export interface BookmarkRecord {
  id: string;
  resource_id: string;
  user_id: string;
  notes: string | null;
  created_at: string;
  resource?: ResourceRecord;
}

interface BookmarksResponse {
  data: Array<BookmarkRecord>;
}

export function useResourceBookmarks() {
  return useQuery({
    queryKey: queryKeys.resources.bookmarks(),
    queryFn: async (): Promise<BookmarksResponse> => {
      const response = await fetch('/api/resources/bookmarks');
      if (!response.ok) throw new Error('Failed to fetch bookmarks');
      return response.json();
    },
  });
}

export function useBookmarkResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      resourceId,
      notes,
    }: { resourceId: string; notes?: string }): Promise<{ data: BookmarkRecord }> => {
      const response = await fetch(`/api/resources/${resourceId}/bookmark`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to bookmark resource');
      }

      return response.json();
    },
    onMutate: async ({ resourceId, notes }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.resources.bookmarks() });
      const previousBookmarks = queryClient.getQueryData<BookmarksResponse>(queryKeys.resources.bookmarks());
      const resource = queryClient.getQueryData<{ data: ResourceRecord }>(
        queryKeys.resources.detail(resourceId)
      )?.data;

      queryClient.setQueryData<BookmarksResponse>(queryKeys.resources.bookmarks(), (old) => {
        if (!old || old.data.some((bookmark) => bookmark.resource_id === resourceId)) return old;
        return {
          ...old,
          data: [
            {
              id: `optimistic-bookmark-${resourceId}`,
              resource_id: resourceId,
              user_id: '',
              notes: notes ?? null,
              created_at: new Date().toISOString(),
              ...(resource ? { resource } : {}),
            },
            ...old.data,
          ],
        };
      });

      return { previousBookmarks };
    },
    onError: (_error, _variables, context) => {
      queryClient.setQueryData(queryKeys.resources.bookmarks(), context?.previousBookmarks);
    },
    onSettled: (_data, _error, { resourceId }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.resources.bookmarks() });
      queryClient.invalidateQueries({ queryKey: queryKeys.resources.detail(resourceId) });
    },
  });
}

export function useRemoveBookmark() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (resourceId: string): Promise<{ success: boolean }> => {
      const response = await fetch(`/api/resources/${resourceId}/bookmark`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to remove bookmark');
      }

      return response.json();
    },
    onMutate: async (resourceId) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.resources.bookmarks() });
      const previousBookmarks = queryClient.getQueryData<BookmarksResponse>(queryKeys.resources.bookmarks());
      queryClient.setQueryData<BookmarksResponse>(queryKeys.resources.bookmarks(), (old) =>
        old
          ? { ...old, data: old.data.filter((bookmark) => bookmark.resource_id !== resourceId) }
          : old
      );

      return { previousBookmarks };
    },
    onError: (_error, _resourceId, context) => {
      queryClient.setQueryData(queryKeys.resources.bookmarks(), context?.previousBookmarks);
    },
    onSettled: (_data, _error, resourceId) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.resources.bookmarks() });
      queryClient.invalidateQueries({ queryKey: queryKeys.resources.detail(resourceId) });
    },
  });
}

export function useTrackResourceView() {
  return useMutation({
    mutationFn: async ({
      resourceId,
      durationSeconds,
      completed,
    }: { resourceId: string; durationSeconds?: number; completed?: boolean }): Promise<{
      success: boolean;
    }> => {
      const response = await fetch(`/api/resources/${resourceId}/view`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ durationSeconds, completed }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to track view');
      }

      return response.json();
    },
  });
}
