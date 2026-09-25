import { queryKeys } from '@/lib/query-keys';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { AnnouncementRecord } from './useAnnouncements';

interface AnnouncementCacheResponse {
  data: AnnouncementRecord | Array<AnnouncementRecord>;
}

function markReadInCache(
  old: AnnouncementCacheResponse | undefined,
  id: string
): AnnouncementCacheResponse | undefined {
  if (!old) return old;

  if (Array.isArray(old.data)) {
    return {
      ...old,
      data: old.data.map((announcement) =>
        announcement.id === id ? { ...announcement, is_read: true } : announcement
      ),
    };
  }

  return old.data.id === id ? { ...old, data: { ...old.data, is_read: true } } : old;
}

export function useMarkAnnouncementRead() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const response = await fetch(`/api/announcements/${id}/read`, {
        method: 'POST',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to mark announcement as read');
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
        (old) => markReadInCache(old, id)
      );

      return { previousAnnouncements };
    },
    onError: (_error, _id, context) => {
      context?.previousAnnouncements.forEach(([key, data]) => queryClient.setQueryData(key, data));
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.announcements.all });
    },
  });
}
