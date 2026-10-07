import { appendServerTiming, recordTiming, startTiming } from '@/lib/observability/timing';

export type AuthTimingLayer = 'api-handler' | 'middleware' | 'server-layout';

interface AuthTimingDetails {
  layer: AuthTimingLayer;
  operation: string;
  route: string;
  startedAt: number;
}

export { appendServerTiming };

export function startAuthTiming(): number {
  return startTiming();
}

/**
 * Emits structured, PII-free `[auth-timing]` events when AUTH_TIMING_ENABLED=true
 * or LATENCY_TIMING_ENABLED=true, and returns the duration for Server-Timing.
 */
export function recordAuthTiming(details: AuthTimingDetails): number {
  const enabled =
    process.env.AUTH_TIMING_ENABLED === 'true' || process.env.LATENCY_TIMING_ENABLED === 'true';
  return recordTiming({ scope: 'auth', ...details }, enabled);
}
