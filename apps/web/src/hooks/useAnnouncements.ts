import { type AnnouncementFilters, queryKeys } from '@/lib/query-keys';
import { useQuery } from '@tanstack/react-query';

export interface AnnouncementRecord {
  id: string;
  title: string;
  content: string;
  excerpt: string | null;
  category:
    | 'hr_updates'
    | 'benefits'
    | 'events'
    | 'performance'
    | 'training'
    | 'policy'
    | 'general'
    | 'emergency';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'draft' | 'scheduled' | 'published' | 'expired' | 'archived';
  published_at: string | null;
  expires_at: string | null;
  target_roles: Array<string>;
  target_departments: Array<string>;
  target_employees: Array<string>;
  is_pinned: boolean;
  allow_comments: boolean;
  has_attachments: boolean;
  author_id: string;
  read_count: number;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  is_read?: boolean;
}

interface AnnouncementListResponse {
  data: Array<AnnouncementRecord>;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export function useAnnouncements(filters: AnnouncementFilters = {}) {
  return useQuery({
    queryKey: queryKeys.announcements.list(filters),
    queryFn: async (): Promise<AnnouncementListResponse> => {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.status) params.append('status', filters.status);
      if (filters.category) params.append('category', filters.category);
      if (filters.priority) params.append('priority', filters.priority);
      if (filters.authorId) params.append('authorId', filters.authorId);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.page) params.append('page', String(filters.page));
      if (filters.pageSize) params.append('pageSize', String(filters.pageSize));

      const response = await fetch(`/api/announcements?${params.toString()}`);
      if (!response.ok) throw new Error('Failed to fetch announcements');
      return response.json();
    },
  });
}
