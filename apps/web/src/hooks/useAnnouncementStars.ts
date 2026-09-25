import { queryKeys } from '@/lib/query-keys';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AnnouncementRecord } from './useAnnouncements';

interface StarRecord {
  id: string;
  announcement_id: string;
  user_id: string;
  created_at: string;
  announcement: AnnouncementRecord;
}

interface StarredAnnouncementsResponse {
  data: Array<StarRecord>;
}

interface AnnouncementCacheResponse {
  data: AnnouncementRecord | Array<AnnouncementRecord>;
}

function updateStarredState(
  old: AnnouncementCacheResponse | undefined,
  id: string,
  isStarred: boolean
): AnnouncementCacheResponse | undefined {
  if (!old) return old;

  if (Array.isArray(old.data)) {
    return {
      ...old,
      data: old.data.map((announcement) =>
        announcement.id === id ? { ...announcement, is_starred: isStarred } : announcement
      ),
    };
  }

  return old.data.id === id
    ? { ...old, data: { ...old.data, is_starred: isStarred } }
    : old;
}

export function useStarredAnnouncements() {
  return useQuery({
    queryKey: queryKeys.announcements.starred(),
    queryFn: async (): Promise<StarredAnnouncementsResponse> => {
      const response = await fetch('/api/announcements/starred');
      if (!response.ok) throw new Error('Failed to fetch starred announcements');
      return response.json();
    },
  });
}

export function useStarAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/announcements/${id}/star`, {
        method: 'POST',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to star announcement');
      }
      return response.json();
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.announcements.all });
      const previousAnnouncements = queryClient.getQueriesData<unknown>({
        queryKey: queryKeys.announcements.all,
      });

      queryClient.setQueriesData<AnnouncementCacheResponse>(
        { queryKey: queryKeys.announcements.all },
        (old) => updateStarredState(old, id, true)
      );

      return { previousAnnouncements };
    },
    onError: (_error, _id, context) => {
      context?.previousAnnouncements.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.announcements.starred() });
      queryClient.invalidateQueries({ queryKey: queryKeys.announcements.all });
    },
  });
}

export function useUnstarAnnouncement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/announcements/${id}/star`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to unstar announcement');
      }
      return response.json();
    },
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.announcements.all });
      const previousAnnouncements = queryClient.getQueriesData<unknown>({
        queryKey: queryKeys.announcements.all,
      });

      queryClient.setQueriesData<AnnouncementCacheResponse>(
        { queryKey: queryKeys.announcements.all },
        (old) => updateStarredState(old, id, false)
      );
      queryClient.setQueryData<StarredAnnouncementsResponse>(queryKeys.announcements.starred(), (old) =>
        old ? { ...old, data: old.data.filter((star) => star.announcement_id !== id) } : old
      );

      return { previousAnnouncements };
    },
    onError: (_error, _id, context) => {
      context?.previousAnnouncements.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.announcements.starred() });
      queryClient.invalidateQueries({ queryKey: queryKeys.announcements.all });
    },
  });
}
