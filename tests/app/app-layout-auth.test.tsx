import {
  VERIFIED_AUTH_SNAPSHOT_HEADER,
  serializeVerifiedAuthSnapshot,
} from '@/lib/auth/request-snapshot';
import type { ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createSupabaseServerClient: vi.fn(),
  getUser: vi.fn(),
  headers: vi.fn(),
  redirect: vi.fn(),
  resolveAuthenticatedUser: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: mocks.createSupabaseServerClient,
  hasSupabaseAuthEnv: () => true,
}));

vi.mock('@/lib/auth/user-bootstrap', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/auth/user-bootstrap')>();
  return { ...original, resolveAuthenticatedUser: mocks.resolveAuthenticatedUser };
});

vi.mock('next/headers', () => ({ headers: mocks.headers }));
vi.mock('next/navigation', () => ({ redirect: mocks.redirect }));
vi.mock('@/contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
}));
vi.mock('@/components/layout/AppShell', () => ({
  AppShell: ({ children }: { children: React.ReactNode }) => children,
}));

describe('signed-in app layout authentication', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NEXT_PUBLIC_ENABLE_MOCK_AUTH', 'false');
    mocks.createSupabaseServerClient.mockResolvedValue({ auth: { getUser: mocks.getUser } });
    mocks.resolveAuthenticatedUser.mockImplementation(async (_client, user) => ({
      id: user.id,
      name: 'Jane Doe',
      email: user.email ?? '',
      role: 'employee',
      status: 'active',
    }));
  });

  it('reuses the middleware-verified snapshot without a second Auth request', async () => {
    const headerList = new Headers();
    headerList.set(
      VERIFIED_AUTH_SNAPSHOT_HEADER,
      serializeVerifiedAuthSnapshot({
        id: 'user-1',
        email: 'jane@example.com',
        app_metadata: { db_role: 'employee' },
      })
    );
    mocks.headers.mockResolvedValue(headerList);

    const { default: AppLayout } = await import('@/app/(app)/layout');
    const result = (await AppLayout({ children: <div>Dashboard</div> })) as ReactElement<{
      initialUser: { id: string };
    }>;

    expect(mocks.getUser).not.toHaveBeenCalled();
    expect(mocks.resolveAuthenticatedUser).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ id: 'user-1' })
    );
    expect(result.props.initialUser.id).toBe('user-1');
  });

  it('falls back to direct verification when the snapshot is unavailable', async () => {
    mocks.headers.mockResolvedValue(new Headers());
    mocks.getUser.mockResolvedValue({
      data: { user: { id: 'user-2', email: 'fallback@example.com' } },
      error: null,
    });

    const { default: AppLayout } = await import('@/app/(app)/layout');
    await AppLayout({ children: <div>Dashboard</div> });

    expect(mocks.getUser).toHaveBeenCalledOnce();
    expect(mocks.resolveAuthenticatedUser).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ id: 'user-2' })
    );
  });
});
