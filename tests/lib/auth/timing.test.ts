import { appendServerTiming, recordAuthTiming } from '@/lib/auth/timing';
import { afterEach, describe, expect, it, vi } from 'vitest';

describe('auth timing instrumentation', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('emits a structured PII-free event when production timing is enabled', () => {
    vi.stubEnv('AUTH_TIMING_ENABLED', 'true');
    const info = vi.spyOn(console, 'info').mockImplementation(() => undefined);

    const duration = recordAuthTiming({
      layer: 'middleware',
      operation: 'getUser',
      route: '/dashboard',
      startedAt: performance.now() - 5,
    });

    expect(duration).toBeGreaterThanOrEqual(0);
    expect(info).toHaveBeenCalledWith(
      '[auth-timing]',
      expect.stringContaining('"event":"auth_timing"')
    );
    expect(info.mock.calls[0]?.join(' ')).not.toContain('user-');
  });

  it('adds a browser-visible Server-Timing metric', () => {
    const headers = new Headers();
    appendServerTiming(headers, 'auth_middleware', 12.345, 'Supabase Auth getUser');
    expect(headers.get('server-timing')).toBe(
      'auth_middleware;dur=12.35;desc="Supabase Auth getUser"'
    );
  });
});
