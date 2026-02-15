import { queryKeys } from '@/lib/query-keys';
import { useQuery } from '@tanstack/react-query';
import type { AnnouncementRecord } from './useAnnouncements';

export function useAnnouncement(id: string | null | undefined) {
  return useQuery({
    queryKey: queryKeys.announcements.detail(id || ''),
    queryFn: async (): Promise<{ data: AnnouncementRecord }> => {
      if (!id) throw new Error('Announcement ID is required');
      const response = await fetch(`/api/announcements/${id}`);
      if (!response.ok) throw new Error('Failed to fetch announcement');
      return response.json();
    },
    enabled: !!id,
  });
}
