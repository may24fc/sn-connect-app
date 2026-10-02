export type AuthTimingLayer = 'api-handler' | 'middleware' | 'server-layout';

interface AuthTimingDetails {
  layer: AuthTimingLayer;
  operation: string;
  route: string;
  startedAt: number;
}

export function startAuthTiming(): number {
  return performance.now();
}

/**
 * Emits structured, PII-free timing when AUTH_TIMING_ENABLED=true and returns
 * the duration so callers can also expose it through Server-Timing.
 */
export function recordAuthTiming(details: AuthTimingDetails): number {
  const durationMs = Math.max(0, performance.now() - details.startedAt);

  if (process.env.AUTH_TIMING_ENABLED === 'true') {
    console.info(
      '[auth-timing]',
      JSON.stringify({
        event: 'auth_timing',
        layer: details.layer,
        operation: details.operation,
        route: details.route,
        duration_ms: Math.round(durationMs * 100) / 100,
      })
    );
  }

  return durationMs;
}

export function appendServerTiming(
  headers: Headers,
  metric: string,
  durationMs: number,
  description: string
): void {
  headers.append('Server-Timing', `${metric};dur=${durationMs.toFixed(2)};desc="${description}"`);
}
