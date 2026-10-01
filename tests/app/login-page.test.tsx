import { beforeEach, describe, expect, it, vi } from 'vitest';

const createSupabaseServerClient = vi.fn();
const hasSupabaseAuthEnv = vi.fn(() => true);

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
  hasSupabaseAuthEnv,
}));

vi.mock('next/navigation', () => ({
  redirect,
}));

vi.mock('@/app/(auth)/login/LoginForm', () => ({
  default: function MockLoginForm() {
    return null;
  },
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

describe('app/(auth)/login/page', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NEXT_PUBLIC_ENABLE_MOCK_AUTH', 'false');
    hasSupabaseAuthEnv.mockReturnValue(true);
  });

  it('renders the login form when there is no authenticated user', async () => {
    createSupabaseServerClient.mockResolvedValue(
      createSupabaseMock({ user: null }) as never
    );

    const { default: LoginPage } = await import(
      '../../apps/web/src/app/(auth)/login/page'
    );
    const result = await LoginPage({ searchParams: Promise.resolve({}) });

    expect(result).toBeTruthy();
    expect(redirect).not.toHaveBeenCalled();
  });

  it('redirects an authenticated user before rendering the login form', async () => {
    createSupabaseServerClient.mockResolvedValue(
      createSupabaseMock({
        user: { id: 'user-1', app_metadata: { db_role: 'admin' } },
        userRecord: { role: 'admin', status: 'active' },
      }) as never
    );

    const { default: LoginPage } = await import(
      '../../apps/web/src/app/(auth)/login/page'
    );

    await expect(
      LoginPage({ searchParams: Promise.resolve({}) })
    ).rejects.toMatchObject({ destination: '/admin/dashboard' });
  });

  it('preserves a safe return path for an authenticated user', async () => {
    createSupabaseServerClient.mockResolvedValue(
      createSupabaseMock({
        user: { id: 'user-2', app_metadata: { db_role: 'employee' } },
        userRecord: { role: 'employee', status: 'active' },
      }) as never
    );

    const { default: LoginPage } = await import(
      '../../apps/web/src/app/(auth)/login/page'
    );

    await expect(
      LoginPage({ searchParams: Promise.resolve({ returnTo: '/tasks?view=mine' }) })
    ).rejects.toMatchObject({ destination: '/tasks?view=mine' });
  });

  it('ignores return paths when onboarding is still required', async () => {
    createSupabaseServerClient.mockResolvedValue(
      createSupabaseMock({
        user: { id: 'user-3', app_metadata: { db_role: 'employee' } },
        userRecord: { role: 'employee', status: 'pending_onboarding' },
      }) as never
    );

    const { default: LoginPage } = await import(
      '../../apps/web/src/app/(auth)/login/page'
    );

    await expect(
      LoginPage({ searchParams: Promise.resolve({ returnTo: '/tasks' }) })
    ).rejects.toMatchObject({ destination: '/onboarding/setup' });
  });
});
