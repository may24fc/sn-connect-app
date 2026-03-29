import { type ApplicationFiltersQuery, queryKeys } from '@/lib/query-keys';
import { useQuery } from '@tanstack/react-query';

export interface ApplicationRecord {
  id: string;
  job_posting_id: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  cv_url: string | null;
  resume_url: string | null;
  cover_letter: string | null;
  status: 'pending' | 'reviewed' | 'shortlisted' | 'interview' | 'rejected' | 'approved' | 'hired';
  notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  job_postings: {
    id: string;
    title: string;
    is_active?: boolean | null;
    closes_at?: string | null;
    department?: string | null;
    location?: string | null;
    employment_type?: string | null;
    job_requisition?: {
      id: string;
      total_headcount: number;
      filled_headcount: number;
      status: 'open' | 'filled';
      created_at: string;
      updated_at: string;
      deleted_at: string | null;
    } | null;
  } | null;
}

interface ApplicationListResponse {
  data: Array<ApplicationRecord>;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export function useApplications(filters: ApplicationFiltersQuery = {}) {
  return useQuery({
    queryKey: queryKeys.applications.list(filters),
    queryFn: async (): Promise<ApplicationListResponse> => {
      const params = new URLSearchParams();
      if (filters.search) params.set('search', filters.search);
      if (filters.status) params.set('status', filters.status);
      if (filters.jobPostingId) params.set('jobPostingId', filters.jobPostingId);
      if (filters.page) params.set('page', String(filters.page));
      if (filters.pageSize) params.set('pageSize', String(filters.pageSize));

      const res = await fetch(`/api/applications?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Failed to fetch applications');
      }
      return res.json();
    },
  });
}

export function useApplication(id: string | null) {
  return useQuery({
    queryKey: queryKeys.applications.detail(id ?? ''),
    queryFn: async (): Promise<{ data: ApplicationRecord }> => {
      const res = await fetch(`/api/applications/${id}`);
      if (!res.ok) {
        throw new Error('Failed to fetch application');
      }
      return res.json();
    },
    enabled: !!id,
  });
}
