import { queryKeys } from '@/lib/query-keys';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface DepartmentLeadRecord {
  id: string;
  department_id: string;
  user_id: string;
  appointed_at: string;
  name: string;
  avatarUrl: string | null;
  position: string | null;
}

const key = [...queryKeys.departments.all, 'leads'] as const;

export function useDepartmentLeads(enabled = true) {
  return useQuery({
    queryKey: key,
    enabled,
    queryFn: async (): Promise<{ data: Array<DepartmentLeadRecord> }> => {
      const response = await fetch('/api/departments/leads');
      if (!response.ok) throw new Error('Failed to load department leads');
      return response.json();
    },
  });
}

export function useAppointDepartmentLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { departmentId: string; userId: string }) => {
      const response = await fetch('/api/departments/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'Failed to appoint department lead');
      return body;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: key }),
  });
}

export function useRemoveDepartmentLead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { departmentId: string; userId: string }) => {
      const response = await fetch('/api/departments/leads', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'Failed to remove department lead');
      return body;
    },
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: key }),
  });
}
