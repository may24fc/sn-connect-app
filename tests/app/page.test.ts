import { beforeEach, describe, expect, it, vi } from 'vitest';

const createSupabaseServerClient = vi.fn();

class RedirectSignal extends Error {
  destination: string;

  constructor(destination: string) {
    super(`redirect:${destination}`);
    this.destination = destination;
  }
}

const redirect = vi.fn((destination: string) => {
  throw new RedirectSignal(destination);
});

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient,
}));

vi.mock('next/navigation', () => ({
  redirect,
}));

function createSupabaseMock(options: {
  user: { id: string; app_metadata?: Record<string, unknown> } | null;
  userRecord?: { role: string | null; status: string | null } | null;
  authError?: Error | null;
}) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: options.userRecord ?? null });
  const is = vi.fn().mockReturnValue({ maybeSingle });
  const eq = vi.fn().mockReturnValue({ is });
  const select = vi.fn().mockReturnValue({ eq });
  const from = vi.fn().mockReturnValue({ select });

  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({
        data: { user: options.user },
        error: options.authError ?? null,
      }),
    },
    from,
  };
}

describe('app/page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects unauthenticated users to login', async () => {
    createSupabaseServerClient.mockResolvedValue(
      createSupabaseMock({ user: null, authError: null }) as never
    );

    const { default: Home } = await import('../../apps/web/src/app/page');

    await expect(Home()).rejects.toMatchObject({ destination: '/login' });
  });

  it('redirects pending onboarding users to onboarding setup', async () => {
    createSupabaseServerClient.mockResolvedValue(
      createSupabaseMock({
        user: { id: 'user-1', app_metadata: { db_role: 'employee' } },
        userRecord: { role: 'employee', status: 'pending_onboarding' },
      }) as never
    );

    const { default: Home } = await import('../../apps/web/src/app/page');

    await expect(Home()).rejects.toMatchObject({ destination: '/onboarding/setup' });
  });

  it('redirects authenticated admins to the admin dashboard', async () => {
    createSupabaseServerClient.mockResolvedValue(
      createSupabaseMock({
        user: { id: 'user-2', app_metadata: { db_role: 'admin' } },
        userRecord: { role: 'admin', status: 'active' },
      }) as never
    );

    const { default: Home } = await import('../../apps/web/src/app/page');

    await expect(Home()).rejects.toMatchObject({ destination: '/admin/dashboard' });
  });
});