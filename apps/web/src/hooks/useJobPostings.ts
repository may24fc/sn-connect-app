import { type JobFilters, queryKeys } from '@/lib/query-keys';
import { useQuery } from '@tanstack/react-query';

export interface JobPostingRecord {
  id: string;
  title: string;
  business_unit_id: string | null;
  department: string | null;
  location: string | null;
  employment_type: 'full-time' | 'part-time' | 'internship' | 'contract';
  description: string;
  requirements: string | null;
  benefits: string | null;
  salary_range: string | null;
  is_active: boolean;
  published_at: string | null;
  closes_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  deleted_at: string | null;
  job_requisition: {
    id: string;
    total_headcount: number;
    filled_headcount: number;
    status: 'open' | 'filled';
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
  } | null;
}

interface JobPostingListResponse {
  data: Array<JobPostingRecord>;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export function useJobPostings(filters: JobFilters = {}) {
  return useQuery({
    queryKey: queryKeys.jobs.list(filters),
    queryFn: async (): Promise<JobPostingListResponse> => {
      const params = new URLSearchParams();
      if (filters.search) params.set('search', filters.search);
      if (filters.employmentType) params.set('employmentType', filters.employmentType);
      if (filters.isActive !== undefined) params.set('isActive', String(filters.isActive));
      if (filters.page) params.set('page', String(filters.page));
      if (filters.pageSize) params.set('pageSize', String(filters.pageSize));

      const res = await fetch(`/api/jobs?${params.toString()}`);
      if (!res.ok) {
        throw new Error('Failed to fetch job postings');
      }
      return res.json();
    },
  });
}

export function useJobPosting(id: string | null) {
  return useQuery({
    queryKey: queryKeys.jobs.detail(id ?? ''),
    queryFn: async (): Promise<{ data: JobPostingRecord }> => {
      const res = await fetch(`/api/jobs/${id}`);
      if (!res.ok) {
        throw new Error('Failed to fetch job posting');
      }
      return res.json();
    },
    enabled: !!id,
  });
}
