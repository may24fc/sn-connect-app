import { queryKeys } from '@/lib/query-keys';
import { useQuery } from '@tanstack/react-query';

export interface TicketAssigneeOption {
  id: string;
  team: 'hr' | 'it';
  role: 'admin' | 'employee';
  name: string;
  email: string | null;
}

interface TicketAssigneesResponse {
  data: Array<TicketAssigneeOption>;
}

export function useTicketAssignees(enabled = true) {
  return useQuery({
    queryKey: queryKeys.tickets.assignees(),
    queryFn: async (): Promise<TicketAssigneesResponse> => {
      const response = await fetch('/api/tickets/assignees');

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to fetch ticket assignees' }));
        throw new Error(error.error || 'Failed to fetch ticket assignees');
      }

      return response.json();
    },
    enabled,
  });
}