import { getProjectAuthedContext } from '@/app/api/projects/_lib';
import { GET as GET_MINE } from '@/app/api/projects/invitations/route';
import { POST as RESPOND } from '@/app/api/projects/invitations/[id]/route';
import { DELETE as CANCEL, GET as GET_PROJECT } from '@/app/api/projects/[id]/invitations/route';
import { PATCH as PATCH_PROJECT } from '@/app/api/projects/[id]/route';
import { canManageProject } from '@/lib/work-management/permissions';
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/app/api/projects/_lib', () => ({
  getProjectAuthedContext: vi.fn(),
  isProjectAdmin: (role: string) => role === 'admin',
  userCanAccessProject: vi.fn(),
}));
vi.mock('@/lib/audit', () => ({ logActivity: vi.fn() }));
vi.mock('@/lib/work-management/permissions', () => ({
  canManageProject: vi.fn(async () => true),
}));
vi.mock('@/lib/people/directory-people', () => ({
  loadDirectoryPeople: vi.fn(async () => new Map([[ACTOR, { name: 'Project manager' }]])),
}));

const ACTOR = 'aaaaaaaa-0000-4000-8000-000000000001';
const TARGET = 'aaaaaaaa-0000-4000-8000-000000000002';
const INVITATION = 'aaaaaaaa-0000-4000-8000-000000000003';
const PROJECT = 'bbbbbbbb-0000-4000-8000-000000000001';
const inviteParams = { params: Promise.resolve({ id: INVITATION }) };
const projectParams = { params: Promise.resolve({ id: PROJECT }) };

function authenticate(client: object, role = 'employee') {
  vi.mocked(getProjectAuthedContext).mockResolvedValue({
    ok: true, context: { supabaseAdmin: client, supabase: {}, user: { id: ACTOR }, role },
  } as never);
}

function clientWithRpc(result: object, error: { code: string } | null = null) {
  const rpc = vi.fn(async (name: string) => {
    if (name === 'create_project_member_invitations') {
      return { data: [{ id: INVITATION, userId: TARGET }], error: null };
    }
    return { data: result, error };
  });
  return { client: { rpc }, rpc };
}

function responseRequest(action: string) {
  return new NextRequest(`http://localhost/api/projects/invitations/${INVITATION}`, {
    method: 'POST', body: JSON.stringify({ action }),
  });
}

describe('project member invitation routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(canManageProject).mockResolvedValue(true);
  });

  it('lets only the authenticated recipient respond and returns stale-primary information', async () => {
    const admin = clientWithRpc({
      ok: true, status: 'accepted', projectId: PROJECT, makePrimary: true, primaryChanged: false,
    });
    authenticate(admin.client);
    const response = await RESPOND(responseRequest('accept'), inviteParams);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ primaryChanged: false, makePrimary: true });
    expect(admin.rpc).toHaveBeenCalledWith('respond_project_member_invitation', {
      p_invitation_id: INVITATION, p_invitee_id: ACTOR, p_action: 'accept',
    });
  });

  it.each([
    ['forbidden', 403], ['not_pending', 409], ['inactive', 400], ['project_unavailable', 404],
  ])('reports %s responses without claiming success', async (code, status) => {
    const admin = clientWithRpc({ error: code });
    authenticate(admin.client);
    expect((await RESPOND(responseRequest('decline'), inviteParams)).status).toBe(status);
  });

  it('rejects invalid responses before calling the database', async () => {
    const admin = clientWithRpc({ ok: true });
    authenticate(admin.client);
    expect((await RESPOND(responseRequest('maybe'), inviteParams)).status).toBe(400);
    expect(admin.rpc).not.toHaveBeenCalled();
  });

  it('loads only the caller’s pending invitations and safe project previews', async () => {
    const filters: Array<[string, string]> = [];
    const invitationQuery = {
      select: () => invitationQuery,
      eq: (column: string, value: string) => { filters.push([column, value]); return invitationQuery; },
      order: async () => ({
        data: [{ id: INVITATION, project_id: PROJECT, invited_by: ACTOR, role: 'lead', make_primary: true, created_at: '2026-11-04' }],
        error: null,
      }),
    };
    const projectQuery = {
      select: () => projectQuery,
      in: () => projectQuery,
      is: async () => ({ data: [{ id: PROJECT, name: 'Launch', description: 'Project goals' }], error: null }),
    };
    authenticate({ from: (table: string) => table === 'projects' ? projectQuery : invitationQuery });
    const response = await GET_MINE();
    expect(response.status).toBe(200);
    expect(filters).toEqual([['invitee_id', ACTOR], ['status', 'pending']]);
    await expect(response.json()).resolves.toMatchObject({
      data: [{ id: INVITATION, project_name: 'Launch', inviter_name: 'Project manager', make_primary: true }],
    });
  });

  it('requires project management authority to inspect or cancel invitations', async () => {
    const admin = clientWithRpc({ ok: true });
    authenticate(admin.client);
    vi.mocked(canManageProject).mockResolvedValue(false);
    const get = new NextRequest(`http://localhost/api/projects/${PROJECT}/invitations`);
    const cancel = new NextRequest(
      `http://localhost/api/projects/${PROJECT}/invitations?invitationId=${INVITATION}`,
      { method: 'DELETE' }
    );
    expect((await GET_PROJECT(get, projectParams)).status).toBe(403);
    expect((await CANCEL(cancel, projectParams)).status).toBe(403);
    expect(admin.rpc).not.toHaveBeenCalled();
  });

  it('cancels a pending invitation through the transactional RPC', async () => {
    const admin = clientWithRpc({ ok: true });
    authenticate(admin.client);
    const request = new NextRequest(
      `http://localhost/api/projects/${PROJECT}/invitations?invitationId=${INVITATION}`,
      { method: 'DELETE' }
    );
    expect((await CANCEL(request, projectParams)).status).toBe(200);
    expect(admin.rpc).toHaveBeenCalledWith('cancel_project_member_invitation', {
      p_project_id: PROJECT, p_invitation_id: INVITATION, p_actor: ACTOR,
    });
  });

  it('invites an out-of-scope primary instead of changing it immediately', async () => {
    const admin = clientWithRpc({
      error: 'invitation_required', data: { id: PROJECT, lead_user_id: ACTOR },
    });
    authenticate(admin.client, 'admin');
    const request = new NextRequest(`http://localhost/api/projects/${PROJECT}`, {
      method: 'PATCH', body: JSON.stringify({ leadUserId: TARGET }),
    });
    const response = await PATCH_PROJECT(request, projectParams);
    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({ invitationSent: true, data: { lead_user_id: ACTOR } });
    expect(admin.rpc).toHaveBeenCalledWith('create_project_member_invitations', {
      p_project_id: PROJECT, p_invited_by: ACTOR,
      p_invitations: [{
        userId: TARGET, role: 'lead', makePrimary: true, expectedPrimaryId: ACTOR,
      }],
    });
  });

  it('refuses supervisor assignment until an out-of-scope person accepts lead access', async () => {
    const admin = clientWithRpc({ error: 'invite_lead_first' });
    authenticate(admin.client, 'admin');
    const request = new NextRequest(`http://localhost/api/projects/${PROJECT}`, {
      method: 'PATCH', body: JSON.stringify({ supervisorId: TARGET }),
    });
    const response = await PATCH_PROJECT(request, projectParams);
    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toMatchObject({
      error: expect.stringContaining('wait for acceptance'),
    });
  });
});
