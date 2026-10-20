import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/work-management/permissions', () => ({
  canAssignUser: vi.fn(async () => true),
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
import { POST } from '@/app/api/projects/route';
import { logActivity } from '@/lib/audit';

const LEAD_ID = '6f1c2b8e-4d3a-4f6b-9a1e-2c3d4e5f6a7b';

function createAdminClient(contributorError: { message: string } | null) {
  const deleteEq = vi.fn(async () => ({ error: null }));
  const upsert = vi.fn(async () => ({ error: contributorError }));
  const from = vi.fn((table: string) => {
    if (table === 'projects') {
      return {
        insert: vi.fn(() => ({
          select: () => ({ single: async () => ({ data: { id: 'project-1' }, error: null }) }),
        })),
        delete: vi.fn(() => ({ eq: deleteEq })),
      };
    }
    if (table === 'project_contributors') {
      return { upsert };
    }
    if (table === 'users') {
      const usersQuery = {
        select: vi.fn(() => usersQuery),
        eq: vi.fn(() => usersQuery),
        maybeSingle: vi.fn(async () => ({ data: { department_id: null }, error: null })),
      };
      return usersQuery;
    }
    throw new Error(`Unexpected table: ${table}`);
  });
  return { client: { from }, upsert, deleteEq };
}

function createRequest() {
  return new NextRequest('http://localhost/api/projects', {
    method: 'POST',
    body: JSON.stringify({
      name: 'Launch site',
      leadUserId: LEAD_ID,
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

  it('adds the lead as a contributor when the project is created', async () => {
    const admin = createAdminClient(null);
    vi.mocked(getProjectAuthedContext).mockResolvedValue({
      ok: true,
      context: { supabaseAdmin: admin.client, supabase: {}, user: { id: LEAD_ID }, role: 'associate' },
    } as never);

    const response = await POST(createRequest());

    expect(response.status).toBe(201);
    expect(admin.upsert).toHaveBeenCalledWith(
      { project_id: 'project-1', user_id: LEAD_ID, role: 'lead' },
      { onConflict: 'project_id,user_id' }
    );
    expect(admin.deleteEq).not.toHaveBeenCalled();
  });

  it('removes the project instead of leaving it without its lead contributor', async () => {
    const admin = createAdminClient({ message: 'record "new" has no field "id"' });
    vi.mocked(getProjectAuthedContext).mockResolvedValue({
      ok: true,
      context: { supabaseAdmin: admin.client, supabase: {}, user: { id: LEAD_ID }, role: 'associate' },
    } as never);

    const response = await POST(createRequest());

    expect(response.status).toBe(500);
    await expect(response.json()).resolves.toEqual({ error: 'Failed to create project' });
    expect(admin.deleteEq).toHaveBeenCalledWith('id', 'project-1');
    expect(logActivity).not.toHaveBeenCalled();
  });
});
