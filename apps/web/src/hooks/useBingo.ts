import type {
  BingoAdminCycleSnapshot,
  BingoPartnerOption,
  WellnessBingoSnapshot,
} from '@/app/api/wellness-bingo/_lib';
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

export function useBingoAdminSummary(cycleId: string | null, enabled = true) {
  const searchParams = new URLSearchParams();
  if (cycleId) {
    searchParams.set('cycleId', cycleId);
  }
  const url = `/api/wellness-bingo/admin-summary${
    searchParams.toString() ? `?${searchParams.toString()}` : ''
  }`;

  return useQuery({
    queryKey: queryKeys.bingo.adminSummary(cycleId),
    queryFn: () => fetchJson<{ data: BingoAdminCycleSnapshot }>(url),
    staleTime: STALE_TIMES.dynamic,
    select: (response) => response.data,
    enabled,
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
    onMutate: async (payload) => {
      const queryKey = queryKeys.bingo.current();
      await queryClient.cancelQueries({ queryKey });
      const previousSnapshot = queryClient.getQueryData<{ data: WellnessBingoSnapshot }>(queryKey);
      queryClient.setQueryData<{ data: WellnessBingoSnapshot }>(queryKey, (old) => {
        if (!old) return old;
        return {
          ...old,
          data: {
            ...old.data,
            board: {
              ...old.data.board,
              ...(payload.customHabitText !== undefined
                ? { customHabitText: payload.customHabitText }
                : {}),
              ...(payload.tileId && payload.checked !== undefined
                ? {
                    tileState: {
                      ...old.data.board.tileState,
                      [payload.tileId]: payload.checked,
                    },
                  }
                : {}),
            },
          },
        };
      });
      return { previousSnapshot };
    },
    onError: (_error, _payload, context) => {
      queryClient.setQueryData(queryKeys.bingo.current(), context?.previousSnapshot);
    },
    onSuccess: (response) => {
      queryClient.setQueryData(queryKeys.bingo.current(), response);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.bingo.current() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.bingo.all });
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
    onMutate: async (partnerUserId) => {
      const queryKey = queryKeys.bingo.current();
      await queryClient.cancelQueries({ queryKey });
      const previousSnapshot = queryClient.getQueryData<{ data: WellnessBingoSnapshot }>(queryKey);
      const partners = queryClient.getQueryData<{ data: Array<BingoPartnerOption> }>(
        queryKeys.bingo.partners()
      );
      const partner = partners?.data.find((candidate) => candidate.id === partnerUserId) ?? null;
      queryClient.setQueryData<{ data: WellnessBingoSnapshot }>(queryKey, (old) =>
        old ? { ...old, data: { ...old.data, partner } } : old
      );
      return { previousSnapshot };
    },
    onError: (_error, _partnerUserId, context) => {
      queryClient.setQueryData(queryKeys.bingo.current(), context?.previousSnapshot);
    },
    onSuccess: (response) => {
      queryClient.setQueryData(queryKeys.bingo.current(), response);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.bingo.current() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.bingo.partners() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.bingo.all });
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
    onMutate: async (recordingUrl) => {
      const queryKey = queryKeys.bingo.current();
      await queryClient.cancelQueries({ queryKey });
      const previousSnapshot = queryClient.getQueryData<{ data: WellnessBingoSnapshot }>(queryKey);
      queryClient.setQueryData<{ data: WellnessBingoSnapshot }>(queryKey, (old) =>
        old
          ? {
              ...old,
              data: {
                ...old.data,
                currentWeekRecording:
                  recordingUrl && old.data.currentWeekRecording
                    ? { ...old.data.currentWeekRecording, recordingUrl }
                    : null,
              },
            }
          : old
      );
      return { previousSnapshot };
    },
    onError: (_error, _recordingUrl, context) => {
      queryClient.setQueryData(queryKeys.bingo.current(), context?.previousSnapshot);
    },
    onSuccess: (response) => {
      queryClient.setQueryData(queryKeys.bingo.current(), response);
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.bingo.current() });
      void queryClient.invalidateQueries({ queryKey: queryKeys.bingo.all });
    },
  });
}
