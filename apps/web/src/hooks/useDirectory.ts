import { queryKeys } from '@/lib/query-keys';
import { useQuery } from '@tanstack/react-query';

export interface DirectoryFilters {
  search?: string;
  role?: string;
  department?: string;
  status?: string;
  employmentType?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
}

export interface DirectoryEntry {
  user_id: string;
  employee_id: string | null;
  avatar_url: string | null;
  full_name: string;
  first_name: string | null;
  last_name: string | null;
  role: string;
  department_name: string | null;
  department_id: string | null;
  position: string | null;
  status: string | null;
  employment_type: string | null;
  start_date: string | null;
  email: string | null;
  contact_number: string | null;
  birthday: string | null;
  internship_id: string | null;
  internship_status: string | null;
  completed_hours: number | null;
  required_hours: number | null;
  school: string | null;
  program: string | null;
}

export interface DirectoryResponse {
  data: DirectoryEntry[];
  metadata: {
    total: number;
    active: number;
    interns: number;
    onLeave: number;
    probation: number;
  };
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export function useDirectory(filters: DirectoryFilters = {}) {
  return useQuery({
    queryKey: queryKeys.directory.list(filters),
    queryFn: async (): Promise<DirectoryResponse> => {
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.role) params.append('role', filters.role);
      if (filters.department) params.append('department', filters.department);
      if (filters.status) params.append('status', filters.status);
      if (filters.employmentType) params.append('employment_type', filters.employmentType);
      if (filters.sortBy) params.append('sort_by', filters.sortBy);
      if (filters.sortOrder) params.append('sort_order', filters.sortOrder);
      if (filters.page) params.append('page', String(filters.page));
      if (filters.pageSize) params.append('page_size', String(filters.pageSize));

      const query = params.toString();
      const response = await fetch(`/api/directory${query ? `?${query}` : ''}`);

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to fetch directory' }));
        throw new Error(error.error || 'Failed to fetch directory');
      }

      return response.json();
    },
  });
}

export function useDirectoryExport(filters: DirectoryFilters = {}) {
  return {
    exportCsv: async () => {
      const params = new URLSearchParams();
      params.append('format', 'csv');
      if (filters.role) params.append('role', filters.role);
      if (filters.department) params.append('department', filters.department);
      if (filters.status) params.append('status', filters.status);

      const response = await fetch(`/api/directory/export?${params.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to export directory');
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `employee-directory-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
  };
}
