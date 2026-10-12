import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/app/api/projects/_lib', () => ({
  getProjectAuthedContext: vi.fn(),
  isProjectAdmin: vi.fn((role: string | null) => role === 'admin'),
}));

vi.mock('@/lib/audit', () => ({
  logActivity: vi.fn(),
}));

import { getProjectAuthedContext } from '@/app/api/projects/_lib';
import { GET } from '@/app/api/projects/[id]/contributors/route';

const LEAD_ID = 'lead-user';

function createAdminClient(options: { leadUserId: string; existing: Array<string> }) {
  const filterCalls: Array<[string, string, string]> = [];
  const ilikeCalls: Array<[string, string]> = [];
  const directoryRows = [
    {
      user_id: 'person-1',
      full_name: 'Ana Reyes',
      avatar_url: null,
      position: ' Designer ',
      department_name: 'Unassigned',
      role: 'employee',
      email: 'ana@example.com',
    },
  ];
  const directoryQuery = {
    select: vi.fn(() => directoryQuery),
    not: vi.fn(() => directoryQuery),
    neq: vi.fn(() => directoryQuery),
    filter: vi.fn((column: string, operator: string, value: string) => {
      filterCalls.push([column, operator, value]);
      return directoryQuery;
    }),
    ilike: vi.fn((column: string, value: string) => {
      ilikeCalls.push([column, value]);
      return directoryQuery;
    }),
    order: vi.fn(() => directoryQuery),
    range: vi.fn(async () => ({ data: directoryRows, error: null, count: 1 })),
  };

  const from = vi.fn((table: string) => {
    if (table === 'projects') {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({
              data: { lead_user_id: options.leadUserId, supervisor_id: null },
              error: null,
            }),
          }),
        }),
      };
    }
    if (table === 'project_contributors') {
      return {
        select: () => ({
          eq: async () => ({ data: options.existing.map((user_id) => ({ user_id })), error: null }),
        }),
      };
    }
    if (table === 'employee_directory') {
      return directoryQuery;
    }
    throw new Error(`Unexpected table: ${table}`);
  });

  return { client: { from }, filterCalls, ilikeCalls };
}

function request(search = '') {
  const query = search ? `?search=${encodeURIComponent(search)}` : '';
  return new NextRequest(`http://localhost/api/projects/project-1/contributors${query}`);
}

const params = { params: Promise.resolve({ id: 'project-1' }) };

describe('GET /api/projects/[id]/contributors', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lets the project lead search people without directory access', async () => {
    const admin = createAdminClient({ leadUserId: LEAD_ID, existing: [LEAD_ID] });
    vi.mocked(getProjectAuthedContext).mockResolvedValue({
      ok: true,
      context: { supabaseAdmin: admin.client, supabase: {}, user: { id: LEAD_ID }, role: 'associate' },
    } as never);

    const response = await GET(request('50%'), params);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      data: [
        {
          user_id: 'person-1',
          full_name: 'Ana Reyes',
          avatar_url: null,
          position: 'Designer',
          department_name: null,
          role: 'employee',
        },
      ],
      total: 1,
    });
    // Current contributors are excluded server-side, and LIKE wildcards are matched literally.
    expect(admin.filterCalls).toEqual([['user_id', 'not.in', `(${LEAD_ID})`]]);
    expect(admin.ilikeCalls).toEqual([['full_name', '%50\\%%']]);
  });

  it('refuses people who cannot manage the project', async () => {
    const admin = createAdminClient({ leadUserId: LEAD_ID, existing: [] });
    vi.mocked(getProjectAuthedContext).mockResolvedValue({
      ok: true,
      context: { supabaseAdmin: admin.client, supabase: {}, user: { id: 'someone-else' }, role: 'employee' },
    } as never);

    const response = await GET(request(), params);

    expect(response.status).toBe(403);
    expect(admin.client.from).not.toHaveBeenCalledWith('employee_directory');
  });
});
