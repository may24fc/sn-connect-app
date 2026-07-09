'use client';

import { queryKeys } from '@/lib/query-keys';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export interface RevenueForecastEntry {
  id: string;
  year: number;
  month: number;
  actualRevenueAud: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

interface RevenueForecastEntriesResponse {
  data: Array<{
    id: string;
    year: number;
    month: number;
    actual_revenue_aud: number;
    notes: string | null;
    created_at: string;
    updated_at: string;
  }>;
}

interface UpsertEntryPayload {
  year: number;
  month: number;
  actualRevenueAud: number;
  notes?: string | null;
}

interface UpdateEntryPayload {
  id: string;
  actualRevenueAud?: number;
  notes?: string | null;
}

async function readJson<T>(response: Response, fallbackMessage: string): Promise<T> {
  if (!response.ok) {
    const payload = await response.json().catch(() => ({ error: fallbackMessage }));
    throw new Error(payload.error || fallbackMessage);
  }

  return response.json() as Promise<T>;
}

function mapEntries(payload: RevenueForecastEntriesResponse): Array<RevenueForecastEntry> {
  return payload.data.map((entry) => ({
    id: entry.id,
    year: entry.year,
    month: entry.month,
    actualRevenueAud: Number(entry.actual_revenue_aud ?? 0),
    notes: entry.notes,
    createdAt: entry.created_at,
    updatedAt: entry.updated_at,
  }));
}

export function useRevenueForecastEntries(year?: number, enabled = true) {
  return useQuery({
    queryKey: queryKeys.revenueForecast.entries(year),
    enabled,
    queryFn: async (): Promise<Array<RevenueForecastEntry>> => {
      const params = typeof year === 'number' ? `?year=${year}` : '';
      const response = await fetch(`/api/revenue-forecast/entries${params}`);
      const payload = await readJson<RevenueForecastEntriesResponse>(
        response,
        'Failed to load Revenue Forecast entries'
      );
      return mapEntries(payload);
    },
  });
}

export function useUpsertRevenueForecastEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpsertEntryPayload): Promise<Array<RevenueForecastEntry>> => {
      const response = await fetch('/api/revenue-forecast/entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await readJson<RevenueForecastEntriesResponse>(
        response,
        'Failed to save Revenue Forecast entry'
      );
      return mapEntries(data);
    },
    onSuccess: (_data, payload) => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.revenueForecast.entries(payload.year),
      });
      void queryClient.invalidateQueries({ queryKey: queryKeys.revenueForecast.entries() });
    },
  });
}

export function useUpdateRevenueForecastEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: UpdateEntryPayload): Promise<void> => {
      const response = await fetch(`/api/revenue-forecast/entries/${payload.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...(payload.actualRevenueAud !== undefined
            ? { actualRevenueAud: payload.actualRevenueAud }
            : {}),
          ...(payload.notes !== undefined ? { notes: payload.notes } : {}),
        }),
      });

      await readJson<{ success: boolean }>(response, 'Failed to update Revenue Forecast entry');
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.revenueForecast.entries() });
    },
  });
}

export function useDeleteRevenueForecastEntry() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      const response = await fetch(`/api/revenue-forecast/entries/${id}`, {
        method: 'DELETE',
      });

      await readJson<{ success: boolean }>(response, 'Failed to delete Revenue Forecast entry');
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.revenueForecast.entries() });
    },
  });
}
