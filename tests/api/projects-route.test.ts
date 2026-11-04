import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/work-management/permissions', () => ({
  getWorkManagementScope: vi.fn(async () => ({
    isGlobal: true,
    departmentId: null,
    ledDepartmentIds: [],
  })),
}));

vi.mock('@/app/api/projects/_lib', () => ({
  getProjectAuthedContext: vi.fn(),
  isProjectAdmin: vi.fn(() => false),
}));

vi.mock('@/lib/audit', () => ({
  logActivity: vi.fn(),
}));

import { getProjectAuthedContext } from '@/app/api/projects/_lib';
import { GET, POST } from '@/app/api/projects/route';
import { logActivity } from '@/lib/audit';

const LEAD_ID = '6f1c2b8e-4d3a-4f6b-9a1e-2c3d4e5f6a7b';
const CO_LEAD_ID = '6f1c2b8e-4d3a-4f6b-9a1e-2c3d4e5f6a7c';

const PROJECT_ID = '8f1c2b8e-4d3a-4f6b-9a1e-2c3d4e5f6a7d';

function createAdminClient(options: {
  pendingPrimary?: boolean;
  pendingInvitationCount?: number;
  error?: { code: string };
} = {}) {
  const rpc = vi.fn(async () => ({
    data: options.error ? null : {
      data: { id: PROJECT_ID },
      pendingPrimary: options.pendingPrimary ?? false,
      pendingInvitationCount: options.pendingInvitationCount ?? 0,
    },
    error: options.error ?? null,
  }));
  return { client: { rpc }, rpc };
}

function createRequest(coLeadUserIds: Array<string> = []) {
  return new NextRequest('http://localhost/api/projects', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Launch site',
      leadUserId: LEAD_ID,
      coLeadUserIds,
      startDate: '2026-10-01',
      targetEndDate: '2026-11-01',
    }),
  });
}

describe('POST /api/projects', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  it('creates the project and direct lead assignments through one atomic RPC', async () => {
    const admin = createAdminClient();
    vi.mocked(getProjectAuthedContext).mockResolvedValue({
      ok: true,
      context: { supabaseAdmin: admin.client, supabase: {}, user: { id: LEAD_ID }, role: 'associate' },
    } as never);

    const response = await POST(createRequest());

    expect(response.status).toBe(201);
    expect(admin.rpc).toHaveBeenCalledWith('create_project_with_leads', expect.objectContaining({
      p_actor: LEAD_ID,
      p_input: expect.objectContaining({ leadUserId: LEAD_ID, coLeadUserIds: [] }),
    }));
    expect(logActivity).toHaveBeenCalled();
  });

  it('returns pending primary and invitation counts from the transaction', async () => {
    const admin = createAdminClient({ pendingPrimary: true, pendingInvitationCount: 1 });
    vi.mocked(getProjectAuthedContext).mockResolvedValue({
      ok: true,
      context: { supabaseAdmin: admin.client, supabase: {}, user: { id: LEAD_ID }, role: 'employee' },
    } as never);

    const response = await POST(createRequest([CO_LEAD_ID, LEAD_ID, CO_LEAD_ID]));

    expect(response.status).toBe(201);
    expect(admin.rpc).toHaveBeenCalledWith('create_project_with_leads', expect.objectContaining({
      p_actor: LEAD_ID,
      p_input: expect.objectContaining({ coLeadUserIds: [CO_LEAD_ID, LEAD_ID, CO_LEAD_ID] }),
    }));
    await expect(response.json()).resolves.toMatchObject({
      pendingPrimary: true, pendingInvitationCount: 1,
    });
  });

  it('reports an inactive lead without claiming creation succeeded', async () => {
    const admin = createAdminClient({ error: { code: '23514' } });
    vi.mocked(getProjectAuthedContext).mockResolvedValue({
      ok: true,
      context: { supabaseAdmin: admin.client, supabase: {}, user: { id: LEAD_ID }, role: 'employee' },
    } as never);

    const response = await POST(createRequest([CO_LEAD_ID]));

    expect(response.status).toBe(400);
    expect(logActivity).not.toHaveBeenCalled();
  });

  it('reports transaction failures without claiming project creation succeeded', async () => {
    const admin = createAdminClient({ error: { code: 'XX000' } });
    vi.mocked(getProjectAuthedContext).mockResolvedValue({
      ok: true,
      context: { supabaseAdmin: admin.client, supabase: {}, user: { id: LEAD_ID }, role: 'associate' },
    } as never);

    const response = await POST(createRequest());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'Failed to create project and send invitations' });
    expect(logActivity).not.toHaveBeenCalled();
  });
});

describe('GET /api/projects', () => {
  it('combines the co-lead filter with the caller visibility filter', async () => {
    const coLedProjectId = '8f1c2b8e-4d3a-4f6b-9a1e-2c3d4e5f6a7c';
    const visibleProjectId = '8f1c2b8e-4d3a-4f6b-9a1e-2c3d4e5f6a7d';
    const or = vi.fn(() => projectQuery);
    const projectQuery = {
      select: () => projectQuery,
      is: () => projectQuery,
      order: () => projectQuery,
      eq: () => projectQuery,
      or,
      range: async () => ({ data: [], error: null, count: 0 }),
    };
    const from = vi.fn((table: string) => {
      if (table === 'projects') return projectQuery;
      if (table === 'project_contributors') {
        let isLeadQuery = false;
        const membershipQuery = {
          select: () => membershipQuery,
          eq: (column: string) => {
            if (column === 'role') isLeadQuery = true;
            return membershipQuery;
          },
          // biome-ignore lint/suspicious/noThenProperty: Supabase query builders are awaitable.
          then: (resolve: (value: { data: Array<{ project_id: string }>; error: null }) => unknown) =>
            Promise.resolve({
              data: [{ project_id: isLeadQuery ? coLedProjectId : visibleProjectId }],
              error: null,
            }).then(resolve),
        };
        return membershipQuery;
      }
      throw new Error(`Unexpected table: ${table}`);
    });
    vi.mocked(getProjectAuthedContext).mockResolvedValue({
      ok: true,
      context: { supabaseAdmin: { from }, supabase: {}, user: { id: LEAD_ID }, role: 'employee' },
    } as never);

    const response = await GET(
      new NextRequest(`http://localhost/api/projects?leadUserId=${CO_LEAD_ID}`)
    );

    expect(response.status).toBe(200);
    expect(or).toHaveBeenNthCalledWith(
      1,
      `lead_user_id.eq.${CO_LEAD_ID},id.in.(${coLedProjectId})`
    );
    expect(or).toHaveBeenNthCalledWith(
      2,
      `lead_user_id.eq.${LEAD_ID},supervisor_id.eq.${LEAD_ID},created_by.eq.${LEAD_ID},id.in.(${visibleProjectId})`
    );
  });
});
