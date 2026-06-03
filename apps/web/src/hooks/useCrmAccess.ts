'use client';

import { queryKeys } from '@/lib/query-keys';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export type CrmTrackerKey = 'meta_leads' | 'google_ads_leads' | 'sn_tech_inquiries';

export interface CrmAccessGrantRecord {
  id: string;
  userId: string;
  tracker: CrmTrackerKey;
  grantedAt: string;
  grantedBy: string | null;
  grantedByName: string | null;
  fullName: string | null;
  email: string | null;
  role: string | null;
  department: string | null;
  position: string | null;
}

interface CrmAccessGrantsResponse {
  data: CrmAccessGrantRecord[];
}

async function readJson<T>(response: Response, fallbackMessage: string): Promise<T> {
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: fallbackMessage }));
    throw new Error(payload.error || fallbackMessage);
  }

  return response.json() as Promise<T>;
}

export function useCrmAccessGrants(tracker: CrmTrackerKey, enabled = true) {
  return useQuery({
    queryKey: queryKeys.crm.accessGrants(tracker),
    enabled,
    queryFn: async (): Promise<CrmAccessGrantsResponse> => {
      const response = await fetch(`/api/crm/access-grants?tracker=${tracker}`);
      return readJson<CrmAccessGrantsResponse>(response, 'Failed to load CRM access grants');
    },
  });
}

export function useGrantCrmAccess(tracker: CrmTrackerKey) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string): Promise<CrmAccessGrantsResponse> => {
      const response = await fetch('/api/crm/access-grants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, tracker }),
      });

      return readJson<CrmAccessGrantsResponse>(response, 'Failed to grant CRM access');
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.crm.accessGrants(tracker) });
    },
  });
}

export function useRevokeCrmAccess(tracker: CrmTrackerKey) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string): Promise<CrmAccessGrantsResponse> => {
      const response = await fetch('/api/crm/access-grants', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId, tracker }),
      });

      return readJson<CrmAccessGrantsResponse>(response, 'Failed to revoke CRM access');
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.crm.accessGrants(tracker) });
    },
  });
}
