import type { BingoPartnerOption, WellnessBingoSnapshot } from '@/app/api/wellness-bingo/_lib';
import { STALE_TIMES } from '@/lib/query-client';
import { queryKeys } from '@/lib/query-keys';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);

  if (!response.ok) {
    const body = (await response.json().catch(() => ({}))) as { error?: string };
    throw new Error(body.error ?? `Request failed (${response.status})`);
  }

  return response.json() as Promise<T>;
}

export function useCurrentBingo() {
  return useQuery({
    queryKey: queryKeys.bingo.current(),
    queryFn: () => fetchJson<{ data: WellnessBingoSnapshot }>('/api/wellness-bingo/current'),
    staleTime: STALE_TIMES.dynamic,
    select: (response) => response.data,
  });
}

export function useBingoPartners() {
  return useQuery({
    queryKey: queryKeys.bingo.partners(),
    queryFn: () => fetchJson<{ data: Array<BingoPartnerOption> }>('/api/wellness-bingo/partners'),
    staleTime: STALE_TIMES.dynamic,
    select: (response) => response.data,
  });
}

export function useUpdateBingoBoard() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (payload: {
      tileId?: string;
      checked?: boolean;
      customHabitText?: string | null;
    }) => {
      const response = await fetch('/api/wellness-bingo/board', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? 'Failed to update bingo board');
      }

      return (await response.json()) as { data: WellnessBingoSnapshot };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.bingo.current() });
    },
  });
}

export function useUpdateBingoPartner() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (partnerUserId: string | null) => {
      const response = await fetch('/api/wellness-bingo/partner', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ partnerUserId }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? 'Failed to update bingo partner');
      }

      return (await response.json()) as { data: WellnessBingoSnapshot };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.bingo.current() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.bingo.partners() });
    },
  });
}

export function useUpdateBingoWeeklyRecording() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (recordingUrl: string | null) => {
      const response = await fetch('/api/wellness-bingo/recording', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recordingUrl }),
      });

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string };
        throw new Error(body.error ?? 'Failed to update weekly recording link');
      }

      return (await response.json()) as { data: WellnessBingoSnapshot };
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.bingo.current() });
    },
  });
}
