'use client';

import { queryKeys } from '@/lib/query-keys';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

/**
 * Subscribes to real-time Postgres changes on the `okrs` and `kpis` tables
 * and invalidates the corresponding TanStack Query caches so the UI stays
 * in sync without a manual refetch.
 *
 * Data flow:
 *   Tier 1 (employee/intern) updates OKR progress or KPI value
 *     -> Supabase CDC broadcasts the row change
 *       -> This hook receives the event and invalidates the query cache
 *         -> TanStack Query refetches, Tier 2/3 admin sees the update immediately
 *
 *   Tier 2/3 (admin/super_admin) evaluates or rates an OKR/KPI
 *     -> Same CDC pipeline
 *       -> The employee's UI is updated in real time
 *
 * Security note: The Supabase Realtime subscription is gated by the
 * authenticated user's JWT. RLS policies on `okrs` and `kpis` ensure
 * that each subscriber only receives rows they are authorized to see.
 */

interface UsePerformanceRealtimeOptions {
  /** When false the subscription is not created. Defaults to true. */
  enabled?: boolean;
}

export function usePerformanceRealtime({ enabled = true }: UsePerformanceRealtimeOptions = {}): void {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      return;
    }

    // Invalidate all performance-related queries so that both the
    // top-level dashboard and the granular OKR/KPI lists refresh.
    const invalidateOkrQueries = (): void => {
      queryClient.invalidateQueries({ queryKey: queryKeys.performance.okrs() });
      queryClient.invalidateQueries({ queryKey: queryKeys.performance.all });
    };

    const invalidateKpiQueries = (): void => {
      queryClient.invalidateQueries({ queryKey: queryKeys.performance.kpis() });
      queryClient.invalidateQueries({ queryKey: queryKeys.performance.all });
    };

    const channel = supabase
      .channel('performance:realtime')
      // OKR events --------------------------------------------------------
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'okrs' },
        () => {
          invalidateOkrQueries();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'okrs' },
        () => {
          invalidateOkrQueries();
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'okrs' },
        () => {
          invalidateOkrQueries();
        }
      )
      // KPI events --------------------------------------------------------
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'kpis' },
        () => {
          invalidateKpiQueries();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'kpis' },
        () => {
          invalidateKpiQueries();
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'kpis' },
        () => {
          invalidateKpiQueries();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, queryClient]);
}
