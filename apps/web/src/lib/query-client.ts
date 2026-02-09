import { QueryClient } from '@tanstack/react-query';

/**
 * Creates a configured QueryClient instance for TanStack Query.
 *
 * Configuration:
 * - staleTime: 1 minute - data considered fresh for this duration
 * - gcTime: 10 minutes - unused data garbage collected after this duration
 * - retry: 1 - single retry on failure for queries
 * - refetchOnWindowFocus: false - prevents refetch on tab focus (reduce API calls)
 * - refetchOnReconnect: true - refetch when network reconnects
 */
export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
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
