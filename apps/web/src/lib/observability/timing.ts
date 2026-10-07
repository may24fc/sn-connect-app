/**
 * Feature-agnostic latency instrumentation. Emits structured, PII-free
 * `[<scope>-timing]` events that `pnpm performance:latency --log` can summarize,
 * and adds Server-Timing metrics that the live sampler reads from responses.
 *
 * Never put user identifiers, emails, query values, or record IDs in any field.
 */
export interface TimingEvent {
  /** Feature or domain, e.g. `auth`, `directory`, `finance`. Becomes `<scope>_timing`. */
  scope: string;
  layer: string;
  operation: string;
  /** Route template (e.g. `/api/employees/[id]`), never a URL containing IDs or query values. */
  route: string;
  startedAt: number;
}

export function startTiming(): number {
  return performance.now();
}

export function isLatencyTimingEnabled(): boolean {
  return process.env.LATENCY_TIMING_ENABLED === 'true';
}

/**
 * Returns the elapsed duration. Logs a structured event when `enabled` is true
 * (defaults to LATENCY_TIMING_ENABLED=true) so callers can also use Server-Timing.
 */
export function recordTiming(event: TimingEvent, enabled = isLatencyTimingEnabled()): number {
  const durationMs = Math.max(0, performance.now() - event.startedAt);

  if (enabled) {
    console.info(
      `[${event.scope}-timing]`,
      JSON.stringify({
        event: `${event.scope}_timing`,
        layer: event.layer,
        operation: event.operation,
        route: event.route,
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
