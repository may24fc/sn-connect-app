import { ensureOk } from '@/lib/api-error';
import { queryKeys } from '@/lib/query-keys';
import { useQuery } from '@tanstack/react-query';

export interface SystemHealthStatus {
  status: string;
  timestamp: string;
  version: string;
}

const HEALTH_POLL_INTERVAL_MS = 60 * 1000;

/**
 * Polls `/api/health` for current application reachability.
 *
 * This endpoint reports only the live state of the web app — it carries no
 * historical uptime, database latency or security-alert data, so callers should
 * present it as a current-status indicator rather than a monitoring dashboard.
 */
export function useSystemHealth(options: { enabled?: boolean } = {}) {
  return useQuery({
    queryKey: queryKeys.system.health(),
    queryFn: async (): Promise<SystemHealthStatus> => {
      const response = await fetch('/api/health', { cache: 'no-store' });
      await ensureOk(response, 'Health check failed');
      return response.json();
    },
    enabled: options.enabled ?? true,
    refetchInterval: HEALTH_POLL_INTERVAL_MS,
    refetchOnWindowFocus: true,
    staleTime: 0,
    retry: 1,
  });
}
