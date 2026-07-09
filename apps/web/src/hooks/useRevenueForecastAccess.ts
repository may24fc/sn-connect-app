'use client';

import { queryKeys } from '@/lib/query-keys';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface RevenueForecastAccessResponse {
  canAccess: boolean;
  hasGrant: boolean;
  role: string | null;
}

interface RevenueForecastAccessEnvelope {
  data: RevenueForecastAccessResponse;
}

export interface RevenueForecastAccessGrantRecord {
  id: string;
  userId: string;
  accessLevel: string;
  grantedAt: string;
  grantedBy: string | null;
  grantedByName: string | null;
  fullName: string | null;
  email: string | null;
  role: string | null;
  department: string | null;
  position: string | null;
}

interface RevenueForecastAccessGrantsResponse {
  data: Array<RevenueForecastAccessGrantRecord>;
}

async function readJson<T>(response: Response, fallbackMessage: string): Promise<T> {
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: fallbackMessage }));
    throw new Error(payload.error || fallbackMessage);
  }

  return response.json() as Promise<T>;
}

export function useRevenueForecastAccess(enabled = true) {
  return useQuery({
    queryKey: queryKeys.revenueForecast.access(),
    enabled,
    queryFn: async (): Promise<RevenueForecastAccessResponse> => {
      const response = await fetch('/api/revenue-forecast/access');
      const payload = await readJson<RevenueForecastAccessEnvelope>(
        response,
        'Failed to load Revenue Forecast access'
      );
      return payload.data;
    },
    staleTime: 60 * 1000,
  });
}

export function useRevenueForecastAccessGrants(enabled = true) {
  return useQuery({
    queryKey: queryKeys.revenueForecast.accessGrants(),
    enabled,
    queryFn: async (): Promise<RevenueForecastAccessGrantsResponse> => {
      const response = await fetch('/api/revenue-forecast/access-grants');
      return readJson<RevenueForecastAccessGrantsResponse>(
        response,
        'Failed to load Revenue Forecast access grants'
      );
    },
  });
}

export function useGrantRevenueForecastAccess() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string): Promise<RevenueForecastAccessGrantsResponse> => {
      const response = await fetch('/api/revenue-forecast/access-grants', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      return readJson<RevenueForecastAccessGrantsResponse>(
        response,
        'Failed to grant Revenue Forecast access'
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.revenueForecast.accessGrants() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.revenueForecast.access() });
    },
  });
}

export function useRevokeRevenueForecastAccess() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (userId: string): Promise<RevenueForecastAccessGrantsResponse> => {
      const response = await fetch('/api/revenue-forecast/access-grants', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });

      return readJson<RevenueForecastAccessGrantsResponse>(
        response,
        'Failed to revoke Revenue Forecast access'
      );
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.revenueForecast.accessGrants() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.revenueForecast.access() });
    },
  });
}
