import {
  VERIFIED_AUTH_SNAPSHOT_HEADER,
  parseVerifiedAuthSnapshot,
} from '@/lib/auth/request-snapshot';
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  createServerClient: vi.fn(),
  getUser: vi.fn(),
}));

vi.mock('@supabase/ssr', () => ({ createServerClient: mocks.createServerClient }));

import {
  HANDLER_AUTHENTICATED_API_ROUTES,
  getRequestWorkspace,
  isWorkspaceRequestAllowed,
  isHandlerAuthenticatedApiRoute,
  middleware,
} from '../apps/web/middleware';

describe('authentication middleware optimization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('NEXT_PUBLIC_ENABLE_MOCK_AUTH', 'false');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'public-anon-key');
    vi.stubEnv('CONTROL_HUB_ENV', 'local');
    mocks.getUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-1',
          email: 'jane@example.com',
          app_metadata: { db_role: 'employee' },
          user_metadata: { full_name: 'Jane Doe' },
        },
      },
    });
    mocks.createServerClient.mockImplementation((_url, _key, options) => ({
      auth: {
        getUser: async () => {
          options.cookies.setAll([
            { name: 'sb-refreshed', value: 'token', options: { httpOnly: true, path: '/' } },
          ]);
          return mocks.getUser();
        },
      },
    }));
  });

  it('uses an exact allowlist for APIs that authenticate inside their handlers', () => {
    expect([...HANDLER_AUTHENTICATED_API_ROUTES]).toEqual([
      '/api/dashboard/analytics',
      '/api/dashboard/pending',
      '/api/dashboard/stats',
      '/api/dashboard/super-admin-stats',
    ]);
    expect(isHandlerAuthenticatedApiRoute('/api/dashboard/stats')).toBe(true);
    expect(isHandlerAuthenticatedApiRoute('/api/dashboard/future-route')).toBe(false);
  });

  it('maps every workspace route and enforces read-only grants', () => {
    expect(getRequestWorkspace('/api/pa-tasks/123')).toBe('pa');
    expect(getRequestWorkspace('/api/crm/sfo')).toBe('sfo');
    expect(getRequestWorkspace('/api/uhp/clients')).toBe('uhp');
    expect(getRequestWorkspace('/api/finance/properties')).toBe('property');
    expect(getRequestWorkspace('/api/announcements')).toBe('internal');

    const grants = [{ workspace: 'sfo', access_level: 'read' }];
    expect(isWorkspaceRequestAllowed('GET', 'sfo', grants)).toBe(true);
    expect(isWorkspaceRequestAllowed('POST', 'sfo', grants)).toBe(false);
    expect(isWorkspaceRequestAllowed('GET', 'uhp', grants)).toBe(false);
    expect(
      isWorkspaceRequestAllowed('DELETE', 'sfo', [
        { workspace: 'sfo', access_level: 'write' },
      ])
    ).toBe(true);
  });

  it('does not repeat middleware authentication for an allowlisted dashboard API', async () => {
    const response = await middleware(
      new NextRequest('https://app.example.com/api/dashboard/stats', {
        headers: { [VERIFIED_AUTH_SNAPSHOT_HEADER]: 'spoofed' },
      })
    );
    expect(mocks.createServerClient).not.toHaveBeenCalled();
    expect(
      response.headers.get(`x-middleware-request-${VERIFIED_AUTH_SNAPSHOT_HEADER}`)
    ).toBeNull();
  });

  it('still protects non-allowlisted APIs', async () => {
    await middleware(new NextRequest('https://app.example.com/api/tasks'));
    expect(mocks.getUser).toHaveBeenCalledOnce();
  });

  it('replaces a spoofed snapshot and preserves refreshed cookies', async () => {
    const request = new NextRequest('https://app.example.com/dashboard', {
      headers: { [VERIFIED_AUTH_SNAPSHOT_HEADER]: 'spoofed' },
    });
    const response = await middleware(request);
    const forwardedSnapshot = response.headers.get(
      `x-middleware-request-${VERIFIED_AUTH_SNAPSHOT_HEADER}`
    );

    expect(parseVerifiedAuthSnapshot(forwardedSnapshot)).toMatchObject({ id: 'user-1' });
    expect(response.cookies.get('sb-refreshed')).toMatchObject({ value: 'token' });
    expect(response.headers.get('x-middleware-request-cookie')).toContain('sb-refreshed=token');
    expect(response.headers.get('server-timing')).toMatch(/^auth_middleware;dur=/);
  });

  it('blocks reviewer identities outside the isolated review environment', async () => {
    mocks.getUser.mockResolvedValue({
      data: {
        user: {
          id: 'reviewer-1',
          email: 'reviewer@example.com',
          app_metadata: { db_role: 'reviewer', account_kind: 'reviewer' },
          user_metadata: {},
        },
      },
    });

    const response = await middleware(new NextRequest('https://app.example.com/review'));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('https://app.example.com/account-disabled');
  });

  it('default-denies ordinary APIs for reviewers in the review environment', async () => {
    vi.stubEnv('CONTROL_HUB_ENV', 'review');
    mocks.getUser.mockResolvedValue({
      data: {
        user: {
          id: 'reviewer-1',
          email: 'reviewer@example.com',
          app_metadata: { db_role: 'reviewer', account_kind: 'reviewer' },
          user_metadata: {},
        },
      },
    });

    const response = await middleware(new NextRequest('https://review.example.com/api/directory'));
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: 'Reviewer accounts cannot access this resource',
    });
  });

  it('allows reviewers to reach only the review shell and review APIs', async () => {
    vi.stubEnv('CONTROL_HUB_ENV', 'review');
    mocks.getUser.mockResolvedValue({
      data: {
        user: {
          id: 'reviewer-1',
          email: 'reviewer@example.com',
          app_metadata: { db_role: 'reviewer', account_kind: 'reviewer' },
          user_metadata: {},
        },
      },
    });

    const pageResponse = await middleware(new NextRequest('https://review.example.com/review'));
    const apiResponse = await middleware(
      new NextRequest('https://review.example.com/api/review/items')
    );
    expect(pageResponse.status).toBe(200);
    expect(apiResponse.status).toBe(200);
  });
});
