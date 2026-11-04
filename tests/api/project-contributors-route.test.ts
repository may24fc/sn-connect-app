import { getProjectAuthedContext } from '@/app/api/projects/_lib';
import { DELETE, GET, POST } from '@/app/api/projects/[id]/contributors/route';
import { classifyProjectMemberAssignments } from '@/lib/work-management/permissions';
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/app/api/projects/_lib', () => ({ getProjectAuthedContext: vi.fn() }));
vi.mock('@/lib/audit', () => ({ logActivity: vi.fn() }));
vi.mock('@/lib/work-management/permissions', () => ({
  canManageProject: vi.fn(async (_client, _projectId, userId) => userId === ACTOR_ID),
  classifyProjectMemberAssignments: vi.fn(async () => ({
    ok: true, directUserIds: [], invitationUserIds: [TARGET_ID],
  })),
}));

const ACTOR_ID = 'aaaaaaaa-0000-4000-8000-000000000001';
const TARGET_ID = 'aaaaaaaa-0000-4000-8000-000000000002';
const PRIMARY_ID = 'aaaaaaaa-0000-4000-8000-000000000003';
const INVITATION_ID = 'aaaaaaaa-0000-4000-8000-000000000004';
const PROJECT_ID = 'bbbbbbbb-0000-4000-8000-000000000001';
const params = { params: Promise.resolve({ id: PROJECT_ID }) };

function createAdminClient(options: {
  assignment?: object;
  removal?: object;
  inviteError?: { code: string };
} = {}) {
  const filters: Array<[string, string, string]> = [];
  const searches: Array<[string, string]> = [];
  const directory = {
    select: () => directory,
    not: () => directory,
    neq: () => directory,
    filter: (column: string, operator: string, value: string) => {
      filters.push([column, operator, value]); return directory;
    },
    ilike: (column: string, value: string) => {
      searches.push([column, value]); return directory;
    },
    order: () => directory,
    range: async () => ({
      data: [{
        user_id: TARGET_ID, full_name: 'Ana Reyes', avatar_url: null,
        position: ' Designer ', department_name: 'Unassigned', role: 'employee',
      }],
      error: null, count: 1,
    }),
  };
  const from = vi.fn((table: string) => {
    if (table === 'project_contributors') {
      return { select: () => ({ eq: async () => ({ data: [{ user_id: PRIMARY_ID }], error: null }) }) };
    }
    if (table === 'employee_directory') return directory;
    throw new Error(`Unexpected table: ${table}`);
  });
  const rpc = vi.fn(async (name: string) => {
    if (name === 'assign_project_member') {
      return { data: options.assignment ?? { ok: true }, error: null };
    }
    if (name === 'remove_project_member') {
      return { data: options.removal ?? { ok: true }, error: null };
    }
    if (name === 'create_project_member_invitations') {
      return {
        data: options.inviteError ? null : [{ id: INVITATION_ID, userId: TARGET_ID }],
        error: options.inviteError ?? null,
      };
    }
    throw new Error(`Unexpected RPC: ${name}`);
  });
  return { client: { from, rpc }, rpc, filters, searches };
}

function authenticate(client: object, role = 'employee', userId = ACTOR_ID) {
  vi.mocked(getProjectAuthedContext).mockResolvedValue({
    ok: true, context: { supabaseAdmin: client, supabase: {}, user: { id: userId }, role },
  } as never);
}

function addRequest(role: 'lead' | 'contributor') {
  return new NextRequest(`http://localhost/api/projects/${PROJECT_ID}/contributors`, {
    method: 'POST', body: JSON.stringify({ userId: TARGET_ID, role }),
  });
}

describe('project contributors and invitation decisions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(classifyProjectMemberAssignments).mockResolvedValue({
      ok: true, directUserIds: [], invitationUserIds: [TARGET_ID],
    });
  });

  it.each(['employee', 'admin'])(
    'sends an out-of-scope contributor invitation for a %s actor',
    async (role) => {
      const admin = createAdminClient({ assignment: { error: 'invitation_required' } });
      authenticate(admin.client, role);
      const response = await POST(addRequest('contributor'), params);
      expect(response.status).toBe(201);
      await expect(response.json()).resolves.toEqual({ ok: true, outcome: 'invited' });
      expect(admin.rpc).toHaveBeenCalledWith('create_project_member_invitations', {
        p_project_id: PROJECT_ID, p_invited_by: ACTOR_ID,
        p_invitations: [{ userId: TARGET_ID, role: 'contributor' }],
      });
    }
  );

  it('invites an existing contributor before promoting them to lead', async () => {
    const admin = createAdminClient({ assignment: { error: 'invitation_required' } });
    authenticate(admin.client);
    expect((await POST(addRequest('lead'), params)).status).toBe(201);
    expect(admin.rpc).toHaveBeenCalledWith('create_project_member_invitations', expect.objectContaining({
      p_invitations: [{ userId: TARGET_ID, role: 'lead' }],
    }));
  });

  it('uses the database-confirmed direct assignment and demotion path', async () => {
    const admin = createAdminClient();
    authenticate(admin.client);
    const response = await POST(addRequest('lead'), params);
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ ok: true, outcome: 'assigned' });
    expect(admin.rpc).toHaveBeenCalledTimes(1);
    expect(admin.rpc).toHaveBeenCalledWith('assign_project_member', {
      p_project_id: PROJECT_ID, p_actor: ACTOR_ID, p_target: TARGET_ID, p_role: 'lead',
    });
  });

  it('reports an existing invitation and protects the primary lead', async () => {
    const admin = createAdminClient({
      assignment: { error: 'pending_invitation' }, removal: { error: 'primary_lead' },
    });
    authenticate(admin.client);
    expect((await POST(addRequest('lead'), params)).status).toBe(409);
    const remove = new NextRequest(
      `http://localhost/api/projects/${PROJECT_ID}/contributors?userId=${PRIMARY_ID}`,
      { method: 'DELETE' }
    );
    expect((await DELETE(remove, params)).status).toBe(400);
    expect(admin.rpc).not.toHaveBeenCalledWith('create_project_member_invitations', expect.anything());
  });

  it('does not report success when the invitation notification cannot be persisted', async () => {
    const admin = createAdminClient({
      assignment: { error: 'invitation_required' }, inviteError: { code: 'XX000' },
    });
    authenticate(admin.client);
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect((await POST(addRequest('lead'), params)).status).toBe(500);
  });

  it('returns searchable candidate identities with invitation labels', async () => {
    const admin = createAdminClient();
    authenticate(admin.client, 'associate');
    const response = await GET(
      new NextRequest(`http://localhost/api/projects/${PROJECT_ID}/contributors?search=50%25`),
      params
    );
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: [{
        user_id: TARGET_ID, full_name: 'Ana Reyes', avatar_url: null, position: 'Designer',
        department_name: null, role: 'employee', requires_invitation: true,
      }],
      total: 1,
    });
    expect(admin.filters).toEqual([['user_id', 'not.in', `(${PRIMARY_ID})`]]);
    expect(admin.searches).toEqual([['full_name', '%50\\%%']]);
  });

  it('refuses someone who cannot manage the project', async () => {
    const admin = createAdminClient();
    authenticate(admin.client, 'employee', TARGET_ID);
    expect((await POST(addRequest('lead'), params)).status).toBe(403);
    expect(admin.rpc).not.toHaveBeenCalled();
  });
});
