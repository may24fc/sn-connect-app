import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
  createSupabaseAdminClient: vi.fn(),
}));

vi.mock('@/lib/email', () => ({
  sendUserInviteEmail: vi.fn(),
}));

vi.mock('@/lib/auth/redirect-config', () => ({
  getLoginUrl: vi.fn(() => 'http://localhost:3001/login'),
}));

vi.mock('@/lib/notifications/create-notification', () => ({
  createNotification: vi.fn(),
  getUserDisplayName: vi.fn(),
}));

vi.mock('@/lib/audit', () => ({
  logActivity: vi.fn(),
}));

import { POST } from '@/app/api/users/invite/route';
import { sendUserInviteEmail } from '@/lib/email';
import { createNotification, getUserDisplayName } from '@/lib/notifications/create-notification';
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from '@/lib/supabase/server';

type InviteRole = 'employee' | 'associate' | 'admin' | 'super_admin';

type ExistingUserMode = 'none' | 'pending';

type TestContextOptions = {
  actorRole?: InviteRole;
  inviteRole: InviteRole;
  existingUserMode?: ExistingUserMode;
};

function buildSupabaseMocks(options: TestContextOptions) {
  const actorRole = options.actorRole ?? 'admin';
  const existingUserMode = options.existingUserMode ?? 'none';
  const invitedUserId = existingUserMode === 'pending' ? 'existing-user-1' : 'new-user-1';

  const serverSupabase = {
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: { id: 'actor-1' } },
        error: null,
      })),
    },
    from: vi.fn((table: string) => {
      if (table !== 'users') {
        throw new Error(`Unexpected server table: ${table}`);
      }

      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn(async () => ({
              data: { role: actorRole },
              error: null,
            })),
          })),
        })),
      };
    }),
  };

  const adminListUsers = vi.fn(async () => {
    if (existingUserMode === 'pending') {
      return {
        data: {
          users: [
            {
              id: invitedUserId,
              email: 'invitee@example.com',
              app_metadata: { db_role: options.inviteRole },
              user_metadata: {},
            },
          ],
        },
        error: null,
      };
    }

    return {
      data: { users: [] },
      error: null,
    };
  });

  const adminSupabase = {
    auth: {
      admin: {
        listUsers: adminListUsers,
        createUser: vi.fn(async () => ({
          data: { user: { id: invitedUserId } },
          error: null,
        })),
        updateUserById: vi.fn(async () => ({ error: null })),
        deleteUser: vi.fn(async () => ({ error: null })),
      },
    },
    from: vi.fn((table: string) => {
      if (table === 'users') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              single: vi.fn(async () => ({
                data: existingUserMode === 'pending' ? { status: 'pending_onboarding' } : null,
                error: existingUserMode === 'pending' ? null : { code: 'PGRST116' },
              })),
            })),
          })),
          upsert: vi.fn(async () => ({ error: null })),
        };
      }

      if (table === 'onboarding_profiles') {
        return {
          upsert: vi.fn(async () => ({ error: null })),
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              is: vi.fn(async () => ({ error: null })),
            })),
          })),
        };
      }

      if (table === 'employees') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              is: vi.fn(() => ({
                maybeSingle: vi.fn(async () => ({ data: null, error: null })),
              })),
            })),
          })),
          insert: vi.fn(async () => ({ error: null })),
        };
      }

      throw new Error(`Unexpected admin table: ${table}`);
    }),
  };

  return { serverSupabase, adminSupabase, invitedUserId };
}

describe('/api/users/invite route', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(sendUserInviteEmail).mockResolvedValue({ sent: true });
    vi.mocked(getUserDisplayName).mockResolvedValue('Alex Admin');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('creates an onboarding notification for a newly invited employee', async () => {
    const { serverSupabase, adminSupabase, invitedUserId } = buildSupabaseMocks({
      inviteRole: 'employee',
      existingUserMode: 'none',
    });

    vi.mocked(createSupabaseServerClient).mockResolvedValue(serverSupabase as never);
    vi.mocked(createSupabaseAdminClient).mockReturnValue(adminSupabase as never);

    const response = await POST(
      new Request('http://localhost/api/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'invitee@example.com',
          role: 'employee',
          firstName: 'Ava',
          lastName: 'Castillo',
        }),
      }) as never
    );

    expect(response.status).toBe(201);
    expect(createNotification).toHaveBeenCalledWith({
      userId: invitedUserId,
      type: 'system',
      title: 'You have been invited to Control Hub',
      message: 'Alex Admin invited you to Control Hub. Sign in to complete your onboarding steps.',
      link: '/onboarding',
      metadata: {
        invitedBy: 'actor-1',
        invitedRole: 'employee',
        reinvite: false,
        requiresOnboarding: true,
      },
      dedupeKey: `user-invite:${invitedUserId}:new:pending_onboarding`,
      dedupeWindowHours: 1,
    });
  });

  it('creates a refreshed invite notification for a pending user reinvite', async () => {
    const { serverSupabase, adminSupabase, invitedUserId } = buildSupabaseMocks({
      inviteRole: 'employee',
      existingUserMode: 'pending',
    });

    vi.mocked(createSupabaseServerClient).mockResolvedValue(serverSupabase as never);
    vi.mocked(createSupabaseAdminClient).mockReturnValue(adminSupabase as never);

    const response = await POST(
      new Request('http://localhost/api/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'invitee@example.com',
          role: 'employee',
          firstName: 'Ava',
          lastName: 'Castillo',
        }),
      }) as never
    );

    expect(response.status).toBe(201);
    expect(adminSupabase.auth.admin.updateUserById).toHaveBeenCalledWith(
      invitedUserId,
      expect.objectContaining({
        email_confirm: true,
      })
    );
    expect(createNotification).toHaveBeenCalledWith({
      userId: invitedUserId,
      type: 'system',
      title: 'Your invite was refreshed',
      message: 'Alex Admin invited you to Control Hub. Sign in to complete your onboarding steps.',
      link: '/onboarding',
      metadata: {
        invitedBy: 'actor-1',
        invitedRole: 'employee',
        reinvite: true,
        requiresOnboarding: true,
      },
      dedupeKey: `user-invite:${invitedUserId}:refresh:pending_onboarding`,
      dedupeWindowHours: 1,
    });
  });
});
