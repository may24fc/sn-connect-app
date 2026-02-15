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
    onSuccess: (_, { resourceId }) => {
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
    onSuccess: (_, resourceId) => {
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
