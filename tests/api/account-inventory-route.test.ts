import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth/active-role', () => ({
  getActiveUserRole: vi.fn(async () => 'super_admin'),
}));
vi.mock('@/lib/audit', () => ({ logActivity: vi.fn() }));
vi.mock('@/lib/email', () => ({
  sendUserInviteEmail: vi.fn(async () => ({ sent: true })),
}));
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
  createSupabaseAdminClient: vi.fn(),
}));

import { PATCH } from '@/app/api/account-inventory/route';
import { POST as POST_WORKSPACE_ACCOUNT } from '@/app/api/account-inventory/workspace-accounts/route';
import { logActivity } from '@/lib/audit';
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from '@/lib/supabase/server';

const targetUserId = '10000000-0000-4000-8000-000000000010';

describe('/api/account-inventory PATCH', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: {
        getUser: vi.fn(async () => ({
          data: { user: { id: 'super-admin-actor' } },
          error: null,
        })),
      },
    } as never);
  });

  it('reclassifies an eligible leadership account without changing its role', async () => {
    const updateEq = vi.fn(async () => ({ error: null }));
    const update = vi.fn(() => ({ eq: updateEq }));
    const updateUserById = vi.fn(async () => ({ data: {}, error: null }));
    const admin = {
      auth: {
        admin: {
          getUserById: vi.fn(async () => ({
            data: {
              user: {
                id: targetUserId,
                app_metadata: { db_role: 'super_admin', account_kind: 'workforce' },
              },
            },
            error: null,
          })),
          updateUserById,
        },
      },
      from: vi.fn((table: string) => {
        if (table !== 'users') throw new Error(`Unexpected table: ${table}`);
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              is: vi.fn(() => ({
                single: vi.fn(async () => ({
                  data: {
                    id: targetUserId,
                    role: 'super_admin',
                    account_kind: 'workforce',
                    account_purpose: null,
                    sponsor_user_id: null,
                  },
                  error: null,
                })),
              })),
            })),
          })),
          update,
        };
      }),
    };
    vi.mocked(createSupabaseAdminClient).mockReturnValue(admin as never);

    const response = await PATCH(
      new Request('http://localhost/api/account-inventory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: targetUserId,
          accountKind: 'privileged',
          purpose: 'Production configuration verification',
        }),
      }) as never
    );

    expect(response.status).toBe(200);
    expect(update).toHaveBeenCalledWith({
      account_kind: 'privileged',
      account_purpose: 'Production configuration verification',
      sponsor_user_id: 'super-admin-actor',
    });
    expect(updateEq).toHaveBeenCalledWith('id', targetUserId);
    expect(updateUserById).toHaveBeenCalledWith(targetUserId, {
      app_metadata: { db_role: 'super_admin', account_kind: 'privileged' },
    });
    expect(logActivity).toHaveBeenCalledWith(
      admin,
      expect.objectContaining({
        action: 'classify_account',
        recordId: targetUserId,
      })
    );
  });

  it('rolls back the database classification when auth metadata synchronization fails', async () => {
    const updateEq = vi.fn(async () => ({ error: null }));
    const update = vi.fn(() => ({ eq: updateEq }));
    const admin = {
      auth: {
        admin: {
          getUserById: vi.fn(async () => ({
            data: { user: { id: targetUserId, app_metadata: { db_role: 'super_admin' } } },
            error: null,
          })),
          updateUserById: vi.fn(async () => ({
            data: null,
            error: { message: 'auth unavailable' },
          })),
        },
      },
      from: vi.fn(() => ({
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            is: vi.fn(() => ({
              single: vi.fn(async () => ({
                data: {
                  id: targetUserId,
                  role: 'super_admin',
                  account_kind: 'workforce',
                  account_purpose: null,
                  sponsor_user_id: null,
                },
                error: null,
              })),
            })),
          })),
        })),
        update,
      })),
    };
    vi.mocked(createSupabaseAdminClient).mockReturnValue(admin as never);

    const response = await PATCH(
      new Request('http://localhost/api/account-inventory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: targetUserId,
          accountKind: 'privileged',
          purpose: 'Production configuration verification',
        }),
      }) as never
    );

    expect(response.status).toBe(500);
    expect(update).toHaveBeenLastCalledWith({
      account_kind: 'workforce',
      account_purpose: null,
      sponsor_user_id: null,
    });
    expect(logActivity).not.toHaveBeenCalled();
  });

  it('requires a recorded purpose for privileged accounts', async () => {
    const response = await PATCH(
      new Request('http://localhost/api/account-inventory', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: targetUserId,
          accountKind: 'privileged',
          purpose: 'short',
        }),
      }) as never
    );

    expect(response.status).toBe(400);
    expect(createSupabaseAdminClient).not.toHaveBeenCalled();
  });
});

describe('/api/account-inventory/workspace-accounts POST', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: {
        getUser: vi.fn(async () => ({
          data: { user: { id: 'super-admin-actor' } },
          error: null,
        })),
      },
    } as never);
  });

  it('requires at least one explicit workspace permission', async () => {
    const response = await POST_WORKSPACE_ACCOUNT(
      new Request('http://localhost/api/account-inventory/workspace-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'external@example.com',
          displayName: 'External User',
          purpose: 'External production workspace access',
          grants: [],
        }),
      }) as never
    );

    expect(response.status).toBe(400);
    expect(createSupabaseAdminClient).not.toHaveBeenCalled();
  });

  it('upserts the profile created by the auth signup trigger', async () => {
    const workspaceUserId = '20000000-0000-4000-8000-000000000020';
    const upsert = vi.fn(async () => ({ error: null }));
    const insertGrants = vi.fn(async () => ({ error: null }));
    const admin = {
      auth: {
        admin: {
          listUsers: vi.fn(async () => ({ data: { users: [] }, error: null })),
          createUser: vi.fn(async () => ({
            data: { user: { id: workspaceUserId } },
            error: null,
          })),
          deleteUser: vi.fn(async () => ({ error: null })),
        },
      },
      from: vi.fn((table: string) => {
        if (table === 'users') return { upsert };
        if (table === 'workspace_access_grants') return { insert: insertGrants };
        throw new Error(`Unexpected table: ${table}`);
      }),
    };
    vi.mocked(createSupabaseAdminClient).mockReturnValue(admin as never);

    const response = await POST_WORKSPACE_ACCOUNT(
      new Request('http://localhost/api/account-inventory/workspace-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'external@example.com',
          displayName: 'External User',
          purpose: 'External production workspace access',
          grants: [{ workspace: 'sfo', accessLevel: 'read' }],
        }),
      }) as never
    );

    expect(response.status).toBe(201);
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        id: workspaceUserId,
        role: 'workspace_user',
        account_kind: 'workspace',
        deleted_at: null,
      }),
      { onConflict: 'id' }
    );
    expect(insertGrants).toHaveBeenCalledWith([
      expect.objectContaining({
        user_id: workspaceUserId,
        workspace: 'sfo',
        access_level: 'read',
      }),
    ]);
  });
});
