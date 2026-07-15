'use client';

import { queryKeys } from '@/lib/query-keys';
import { createSupabaseBrowserClient } from '@/lib/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef } from 'react';

/**
 * Subscribes to real-time Postgres changes on the `reports` and
 * `report_metrics` tables and invalidates the corresponding TanStack Query
 * caches so the admin UI stays in sync without a manual refetch.
 *
 * Data flow:
 *   Tier 1 (employee/associate) submits a report or saves a draft
 *     -> Supabase CDC (Change Data Capture) broadcasts the row change
 *       -> This hook receives the event and invalidates the query cache
 *         -> TanStack Query refetches, Tier 2/3 admin sees the update immediately
 *
 *   Tier 2/3 (admin/super_admin) approves or rejects a report
 *     -> Same CDC pipeline
 *       -> The employee's report list is updated in real time
 *
 * Why both tables?
 *   - `reports` covers status transitions (draft -> submitted -> approved/rejected)
 *     which drive the Submissions tab.
 *   - `report_metrics` covers the numeric data that powers the Analytics and
 *     Compare tabs. A report INSERT is often followed by multiple metric INSERTs;
 *     subscribing to both ensures the analytics reflect the latest numbers.
 *
 * Why invalidate rather than patch the cache directly?
 *   Patching would require reconstructing the full query response shape
 *   (including joined employee data, pagination metadata, and computed stats).
 *   Invalidation triggers a clean refetch through the existing API route,
 *   which already handles joins, filtering, and pagination correctly.
 *   The tradeoff is one extra network round-trip, but it guarantees
 *   consistency and avoids cache shape drift.
 *
 * Security note: The Supabase Realtime subscription is gated by the
 * authenticated user's JWT. RLS policies on `reports` and `report_metrics`
 * ensure that each subscriber only receives rows they are authorized to see.
 * Admins see all reports; employees see only their own.
 */

interface UseReportsRealtimeOptions {
  /** When false the subscription is not created. Defaults to true. */
  enabled?: boolean;
}

/**
 * Minimum interval (in milliseconds) between cache invalidations.
 *
 * Why debounce?
 *   When an employee submits a report, the API route typically performs two
 *   writes in quick succession: an UPDATE on `reports` (status -> 'submitted')
 *   and one or more INSERTs on `report_metrics`. Without debouncing, each
 *   CDC event would trigger a separate refetch, causing unnecessary network
 *   traffic and UI flicker. A 300ms window batches these into a single
 *   invalidation cycle.
 */
const INVALIDATION_DEBOUNCE_MS = 300;

export function useReportsRealtime({ enabled = true }: UseReportsRealtimeOptions = {}): void {
  const queryClient = useQueryClient();

  // Ref-based debounce timer so we can clear it on unmount without
  // including the timer value in the effect dependency array.
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const invalidateReportQueries = useCallback((): void => {
    // Clear any pending debounce so rapid-fire CDC events coalesce.
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      // Invalidate the top-level 'reports' key prefix. This covers:
      //   - queryKeys.reports.all        -> ['reports']
      //   - queryKeys.reports.lists()     -> ['reports', 'list']
      //   - queryKeys.reports.list({...}) -> ['reports', 'list', {...}]
      //   - queryKeys.reports.detail(id)  -> ['reports', 'detail', id]
      //   - queryKeys.reports.analytics() -> ['reports', 'analytics', {...}]
      //   - queryKeys.reports.weekly()    -> ['reports', 'weekly', weekId]
      //
      // This single invalidation refreshes all three admin tabs
      // (Submissions, Analytics, Compare) because they all derive from
      // queries under the 'reports' key prefix.
      queryClient.invalidateQueries({ queryKey: queryKeys.reports.all });
    }, INVALIDATION_DEBOUNCE_MS);
  }, [queryClient]);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const supabase = createSupabaseBrowserClient();

    if (!supabase) {
      return;
    }

    const channel = supabase
      .channel('reports:realtime')
      // ── Reports table events ──────────────────────────────────────
      // INSERT: Employee creates a new report (draft or direct submit)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'reports' }, () => {
        invalidateReportQueries();
      })
      // UPDATE: Status transitions (draft->submitted, submitted->approved/rejected)
      // This is the primary event for real-time sync — an employee hitting
      // "Submit" triggers an UPDATE that flips status from 'draft' to 'submitted'.
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'reports' }, () => {
        invalidateReportQueries();
      })
      // DELETE: Soft-delete via deleted_at column, or hard delete if applicable.
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'reports' }, () => {
        invalidateReportQueries();
      })
      // ── Report Metrics table events ───────────────────────────────
      // These drive the Analytics and Compare tabs. When a report is
      // submitted, metric rows are inserted alongside the report.
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'report_metrics' },
        () => {
          invalidateReportQueries();
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'report_metrics' },
        () => {
          invalidateReportQueries();
        }
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'report_metrics' },
        () => {
          invalidateReportQueries();
        }
      )
      .subscribe();

    // Cleanup: remove the channel when the component unmounts or when
    // the enabled flag changes. This prevents memory leaks and avoids
    // stale subscriptions that would fire invalidations on an unmounted
    // component's query client.
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      supabase.removeChannel(channel);
    };
  }, [enabled, queryClient, invalidateReportQueries]);
}
