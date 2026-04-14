import { type ApplicationFiltersQuery, queryKeys } from '@/lib/query-keys';
import { useQuery } from '@tanstack/react-query';

interface UseApplicationsOptions {
  refetchInterval?: number | false;
}

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
  // ATS AI evaluation fields
  parsed_resume_markdown: string | null;
  ai_evaluation_status: 'idle' | 'queued' | 'parsing' | 'evaluating' | 'completed' | 'failed';
  ai_match_score: number | null;
  ai_top_strengths: string[] | null;
  ai_missing_requirements: string[] | null;
  ai_executive_summary: string | null;
  ai_evaluated_at: string | null;
  ai_evaluation_model: string | null;
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

export function useApplications(
  filters: ApplicationFiltersQuery = {},
  options: UseApplicationsOptions = {},
) {
  return useQuery<ApplicationListResponse>({
    queryKey: queryKeys.applications.list(filters),
    queryFn: async (): Promise<ApplicationListResponse> => {
      const params = new URLSearchParams();
      if (filters.search) params.set('search', filters.search);
      if (filters.status) params.set('status', filters.status);
      if (filters.jobPostingId) params.set('jobPostingId', filters.jobPostingId);
      if (filters.sortBy) params.set('sortBy', filters.sortBy);
      if (filters.minScore != null) params.set('minScore', String(filters.minScore));
      if (filters.maxScore != null) params.set('maxScore', String(filters.maxScore));
      if (filters.page) params.set('page', String(filters.page));
      if (filters.pageSize) params.set('pageSize', String(filters.pageSize));

      const res = await fetch(`/api/applications?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Failed to fetch applications');
      }
      return res.json();
    },
    ...(options.refetchInterval !== undefined
      ? { refetchInterval: options.refetchInterval }
      : {}),
  });
}

export function useApplication(id: string | null, options: UseApplicationsOptions = {}) {
  return useQuery<{ data: ApplicationRecord }>({
    queryKey: queryKeys.applications.detail(id ?? ''),
    queryFn: async (): Promise<{ data: ApplicationRecord }> => {
      const res = await fetch(`/api/applications/${id}`);
      if (!res.ok) {
        throw new Error('Failed to fetch application');
      }
      return res.json();
    },
    enabled: !!id,
    ...(options.refetchInterval !== undefined
      ? { refetchInterval: options.refetchInterval }
      : {}),
  });
}
