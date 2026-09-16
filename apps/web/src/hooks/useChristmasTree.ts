import type { buildChristmasTreeSnapshot } from '@/app/api/christmas-tree/_lib';
import { STALE_TIMES } from '@/lib/query-client';
import { queryKeys } from '@/lib/query-keys';
import type {
  ChristmasOrnamentPlacementInput,
  ChristmasWishUpsertInput,
} from '@/lib/schemas/christmas-tree.schema';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import type { REALTIME_SUBSCRIBE_STATES } from '@supabase/supabase-js';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';

export type ChristmasTreeSnapshot = Awaited<ReturnType<typeof buildChristmasTreeSnapshot>>;

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const body = (await response.json().catch(() => ({}))) as { data?: T; error?: string };
  if (!response.ok) throw new Error(body.error ?? `Request failed (${response.status})`);
  return body.data as T;
}

export function useChristmasTree() {
  return useQuery({
    queryKey: queryKeys.christmasTree.current(),
    queryFn: () => fetchJson<ChristmasTreeSnapshot>('/api/christmas-tree/current'),
    staleTime: STALE_TIMES.dynamic,
  });
}

export function usePlaceChristmasOrnament() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ChristmasOrnamentPlacementInput) =>
      fetchJson<ChristmasTreeSnapshot>('/api/christmas-tree/ornament', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    onSuccess: (data) => queryClient.setQueryData(queryKeys.christmasTree.current(), data),
  });
}

export function useUpsertChristmasWish() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: ChristmasWishUpsertInput) =>
      fetchJson<ChristmasTreeSnapshot>('/api/christmas-tree/wishes', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }),
    onSuccess: (data) => queryClient.setQueryData(queryKeys.christmasTree.current(), data),
  });
}

export function useChristmasTreeRealtime(
  enabled = true
): 'connected' | 'connecting' | 'fallback' | 'unavailable' {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<'connected' | 'connecting' | 'fallback' | 'unavailable'>(
    'connecting'
  );
  const invalidationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fallbackTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const supabase = createSupabaseBrowserClient();
    if (!supabase) {
      setStatus('unavailable');
      return;
    }

    const invalidate = () => {
      if (invalidationTimerRef.current) clearTimeout(invalidationTimerRef.current);
      invalidationTimerRef.current = setTimeout(() => {
        void queryClient.invalidateQueries({ queryKey: queryKeys.christmasTree.all });
      }, 300);
    };
    const startFallbackPolling = () => {
      if (fallbackTimerRef.current) return;
      fallbackTimerRef.current = setInterval(invalidate, 30_000);
    };
    const stopFallbackPolling = () => {
      if (!fallbackTimerRef.current) return;
      clearInterval(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    };
    const channel = supabase
      .channel('christmas-tree:realtime')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'christmas_ornaments' },
        invalidate
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'christmas_wishes' },
        invalidate
      )
      .subscribe((nextStatus: REALTIME_SUBSCRIBE_STATES) => {
        if (nextStatus === 'SUBSCRIBED') {
          stopFallbackPolling();
          setStatus('connected');
          return;
        }
        if (
          nextStatus === 'CHANNEL_ERROR' ||
          nextStatus === 'TIMED_OUT' ||
          nextStatus === 'CLOSED'
        ) {
          startFallbackPolling();
          setStatus('fallback');
          return;
        }
        setStatus('connecting');
      });

    return () => {
      if (invalidationTimerRef.current) clearTimeout(invalidationTimerRef.current);
      stopFallbackPolling();
      void supabase.removeChannel(channel);
    };
  }, [enabled, queryClient]);

  return status;
}
