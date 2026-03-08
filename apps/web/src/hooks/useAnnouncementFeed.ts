import { type AnnouncementFilters, queryKeys } from '@/lib/query-keys';
import { useQuery } from '@tanstack/react-query';
import type { AnnouncementRecord } from './useAnnouncements';

interface AnnouncementFeedResponse {
  data: Array<AnnouncementRecord>;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export function useAnnouncementFeed(filters: AnnouncementFilters = {}) {
  return useQuery({
    queryKey: queryKeys.announcements.feed(filters),
    queryFn: async (): Promise<AnnouncementFeedResponse> => {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.categories && filters.categories.length > 0) {
        params.append('category', filters.categories.join(','));
      } else if (filters.category) {
        params.append('category', filters.category);
      }
      if (filters.readStatuses && filters.readStatuses.length > 0) {
        params.append('readStatus', filters.readStatuses.join(','));
      } else if (filters.readStatus) {
        params.append('readStatus', filters.readStatus);
      }
      if (filters.page) params.append('page', String(filters.page));
      if (filters.pageSize) params.append('pageSize', String(filters.pageSize));

      const response = await fetch(`/api/announcements/feed?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch announcements feed');
      return response.json();
    },
  });
}
