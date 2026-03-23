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
    onSuccess: () => {
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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.announcements.starred() });
      queryClient.invalidateQueries({ queryKey: queryKeys.announcements.all });
    },
  });
}
