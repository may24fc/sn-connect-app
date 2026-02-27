import { QueryClient } from '@tanstack/react-query';

/**
 * Creates a configured QueryClient instance for TanStack Query.
 *
 * Configuration:
 * - staleTime: 5 minutes — default for stable data (departments, bank registry)
 *   Override per-query with 30s for dynamic data (notifications, tasks)
 * - gcTime: 10 minutes — unused data garbage collected after this duration
 * - retry: 1 — single retry on failure for queries
 * - refetchOnWindowFocus: false — prevents refetch on tab focus (reduce API calls)
 * - refetchOnReconnect: true — refetch when network reconnects
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60 * 1000, // 5 minutes (stable data default)
        gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
        retry: 1,
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
      },
      mutations: {
        retry: 0,
      },
    },
  });
}

/**
 * Pre-defined staleTime values for different data volatility levels.
 *
 * Usage:
 * ```ts
 * useQuery({
 *   queryKey: queryKeys.notifications.list(),
 *   queryFn: fetchNotifications,
 *   staleTime: STALE_TIMES.dynamic,
 * });
 * ```
 */
export const STALE_TIMES = {
  /** 30 seconds — notifications, tasks, real-time feeds */
  dynamic: 30 * 1000,
  /** 5 minutes — employee lists, reports, milestones */
  standard: 5 * 60 * 1000,
  /** 1 hour — departments, bank registry, resource categories */
  stable: 60 * 60 * 1000,
} as const;
