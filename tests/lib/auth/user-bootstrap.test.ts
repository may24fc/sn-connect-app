import { resolveAuthenticatedUser } from '@/lib/auth/user-bootstrap';
import type { SupabaseClient } from '@supabase/supabase-js';
import { describe, expect, it, vi } from 'vitest';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

function createSupabaseMock(results: Record<string, Promise<unknown>>) {
  const requestedTables: Array<string> = [];
  const from = vi.fn((table: string) => ({
    select: () => ({
      eq: () => ({
        is: () => ({
          maybeSingle: () => {
            requestedTables.push(table);
            return results[table];
          },
        }),
      }),
    }),
  }));

  return {
    client: { from } as unknown as SupabaseClient,
    requestedTables,
  };
}

describe('resolveAuthenticatedUser', () => {
  it('loads employee account and onboarding records concurrently', async () => {
    const userResult = deferred<{ data: { role: string; status: string }; error: null }>();
    const onboardingResult = deferred<{
      data: {
        is_completed: boolean;
        first_name: string;
        last_name: string;
      };
      error: null;
    }>();
    const { client, requestedTables } = createSupabaseMock({
      users: userResult.promise,
      onboarding_profiles: onboardingResult.promise,
    });

    const pendingUser = resolveAuthenticatedUser(client, {
      id: 'user-1',
      email: 'jane@example.com',
      app_metadata: { db_role: 'employee' },
    });

    expect(requestedTables).toEqual(['users', 'onboarding_profiles']);

    userResult.resolve({ data: { role: 'employee', status: 'active' }, error: null });
    onboardingResult.resolve({
      data: { is_completed: true, first_name: 'Jane', last_name: 'Doe' },
      error: null,
    });

    await expect(pendingUser).resolves.toMatchObject({
      id: 'user-1',
      name: 'Jane Doe',
      role: 'employee',
      status: 'active',
      isOnboardingComplete: true,
    });
  });

  it('does not query onboarding for an administrator', async () => {
    const { client, requestedTables } = createSupabaseMock({
      users: Promise.resolve({ data: { role: 'admin', status: 'active' }, error: null }),
    });

    const user = await resolveAuthenticatedUser(client, {
      id: 'admin-1',
      email: 'admin@example.com',
      app_metadata: { db_role: 'admin' },
      user_metadata: { full_name: 'Admin User' },
    });

    expect(requestedTables).toEqual(['users']);
    expect(user).toMatchObject({ role: 'admin', isOnboardingComplete: true });
  });

  it('resolves an active reviewer without treating them as an employee', async () => {
    const expiresAt = new Date(Date.now() + 60_000).toISOString();
    const { client, requestedTables } = createSupabaseMock({
      users: Promise.resolve({
        data: {
          role: 'reviewer',
          status: 'active',
          account_kind: 'reviewer',
          access_expires_at: expiresAt,
        },
        error: null,
      }),
    });

    const user = await resolveAuthenticatedUser(client, {
      id: 'reviewer-1',
      email: 'reviewer@example.com',
      app_metadata: { db_role: 'reviewer', account_kind: 'reviewer' },
      user_metadata: { full_name: 'Product Reviewer' },
    });

    expect(requestedTables).toEqual(['users']);
    expect(user).toMatchObject({
      role: 'reviewer',
      accountKind: 'reviewer',
      isOnboardingComplete: true,
    });
  });

  it('rejects an expired reviewer during auth bootstrap', async () => {
    const { client } = createSupabaseMock({
      users: Promise.resolve({
        data: {
          role: 'reviewer',
          status: 'active',
          account_kind: 'reviewer',
          access_expires_at: new Date(Date.now() - 60_000).toISOString(),
        },
        error: null,
      }),
    });

    await expect(
      resolveAuthenticatedUser(client, {
        id: 'reviewer-1',
        email: 'reviewer@example.com',
        app_metadata: { db_role: 'reviewer' },
      })
    ).rejects.toThrow('Reviewer access has expired.');
  });
});
