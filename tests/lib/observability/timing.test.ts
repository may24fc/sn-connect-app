import { appendServerTiming, recordTiming, startTiming } from '@/lib/observability/timing';
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('generic latency timing', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('stays silent unless LATENCY_TIMING_ENABLED is true', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    const event = {
      scope: 'directory',
      layer: 'api-handler',
      operation: 'listEmployees',
      route: '/api/directory',
      startedAt: startTiming(),
    };

    recordTiming(event);
    expect(info).not.toHaveBeenCalled();

    vi.stubEnv('LATENCY_TIMING_ENABLED', 'true');
    recordTiming(event);
    expect(info).toHaveBeenCalledWith(
      '[directory-timing]',
      expect.stringContaining('"event":"directory_timing"')
    );
  });

  it('lets wrappers force structured output with their own flag', () => {
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);

    recordTiming(
      { scope: 'finance', layer: 'page', operation: 'load', route: '/finance', startedAt: 0 },
      true
    );

    expect(info).toHaveBeenCalledTimes(1);
  });

  it('appends multiple Server-Timing metrics', () => {
    const headers = new Headers();
    appendServerTiming(headers, 'auth_middleware', 3, 'Auth');
    appendServerTiming(headers, 'db', 12.345, 'Query');

    expect(headers.get('server-timing')).toBe(
      'auth_middleware;dur=3.00;desc="Auth", db;dur=12.35;desc="Query"'
    );
  });
});
