'use client';

import { queryKeys } from '@/lib/query-keys';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface AtsAccessResponse {
  canAccess: boolean;
  hasGrant: boolean;
  role: string | null;
}

interface AtsAccessEnvelope {
  data: AtsAccessResponse;
}

export interface AtsAccessGrantRecord {
  userId: string;
  accessLevel: string;
  grantedAt: string;
  grantedBy: string | null;
  fullName: string | null;
  email: string | null;
  role: string | null;
  department: string | null;
  position: string | null;
}

interface AtsAccessGrantsResponse {
  data: AtsAccessGrantRecord[];
}

async function readJson<T>(response: Response, fallbackMessage: string): Promise<T> {
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: fallbackMessage }));
    throw new Error(payload.error || fallbackMessage);
  }

  return response.json() as Promise<T>;
}

export function useAtsAccess(enabled = true) {
  return useQuery({
    queryKey: queryKeys.ats.access(),
    enabled,
    queryFn: async (): Promise<AtsAccessResponse> => {
      const response = await fetch('/api/ats/access');
      const payload = await readJson<AtsAccessEnvelope>(response, 'Failed to load ATS access');
      return payload.data;
    },
    staleTime: 60 * 1000,
  });
}

export function useAtsAccessGrants(enabled = true) {
  return useQuery({
    queryKey: queryKeys.ats.accessGrants(),
    enabled,
    queryFn: async (): Promise<AtsAccessGrantsResponse> => {
      const response = await fetch('/api/ats/access-grants');
      return readJson<AtsAccessGrantsResponse>(response, 'Failed to load ATS access grants');
    },
  });
}

export function useGrantAtsAccess() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string): Promise<AtsAccessGrantsResponse> => {
      const response = await fetch('/api/ats/access-grants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      return readJson<AtsAccessGrantsResponse>(response, 'Failed to grant ATS access');
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.ats.accessGrants() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.ats.access() });
    },
  });
}

export function useRevokeAtsAccess() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string): Promise<AtsAccessGrantsResponse> => {
      const response = await fetch('/api/ats/access-grants', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      return readJson<AtsAccessGrantsResponse>(response, 'Failed to revoke ATS access');
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.ats.accessGrants() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.ats.access() });
    },
  });
}