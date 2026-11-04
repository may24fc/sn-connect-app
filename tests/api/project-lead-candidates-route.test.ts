import { getProjectAuthedContext } from '@/app/api/projects/_lib';
import { GET } from '@/app/api/projects/lead-candidates/route';
import { getWorkManagementScope } from '@/lib/work-management/permissions';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/app/api/projects/_lib', () => ({ getProjectAuthedContext: vi.fn() }));
vi.mock('@/lib/work-management/permissions', () => ({
  getWorkManagementScope: vi.fn(),
  isGlobalWorkManager: (role: string) => role === 'admin' || role === 'super_admin',
}));

function createDirectory() {
  const rows = [
    {
      user_id: 'member-1', full_name: 'Alex Example', email: 'alex@example.test',
      role: 'employee', department_name: 'Operations', position: 'Analyst', avatar_url: null,
    },
    {
      user_id: 'member-2', full_name: 'Sam Example', email: 'sam@example.test',
      role: 'associate', department_name: 'Marketing', position: null, avatar_url: null,
    },
  ];
  const directoryQuery = {
    select: () => directoryQuery,
    not: () => directoryQuery,
    neq: () => directoryQuery,
    order: () => directoryQuery,
    range: async (start: number, end: number) => ({
      data: rows.slice(start, end + 1), error: null,
    }),
  };
  const usersQuery = {
    select: () => usersQuery,
    in: () => usersQuery,
    is: () => usersQuery,
    neq: async () => ({
      data: [
        { id: 'member-1', department_id: 'operations' },
        { id: 'member-2', department_id: 'marketing' },
      ],
      error: null,
    }),
  };
  const from = vi.fn((table: string) => table === 'users' ? usersQuery : directoryQuery);
  return { client: { from } };
}

describe('GET /api/projects/lead-candidates', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getWorkManagementScope).mockResolvedValue({
      isGlobal: false, departmentId: null, ledDepartmentIds: ['operations'],
    });
  });

  it('returns all active directory people and labels out-of-scope invitations', async () => {
    const directory = createDirectory();
    vi.mocked(getProjectAuthedContext).mockResolvedValue({
      ok: true,
      context: { supabaseAdmin: directory.client, user: { id: 'manager' }, role: 'employee' },
    } as never);

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data).toMatchObject([
      { id: 'member-1', requiresInvitation: false, email: null },
      { id: 'member-2', requiresInvitation: true, email: null },
    ]);
  });

  it('does not let administrator status bypass the invitation requirement', async () => {
    const directory = createDirectory();
    vi.mocked(getProjectAuthedContext).mockResolvedValue({
      ok: true,
      context: { supabaseAdmin: directory.client, user: { id: 'admin' }, role: 'admin' },
    } as never);
    vi.mocked(getWorkManagementScope).mockResolvedValue({
      isGlobal: true, departmentId: null, ledDepartmentIds: [],
    });

    const response = await GET();
    const body = await response.json();
    expect(body.data).toMatchObject([
      { id: 'member-1', requiresInvitation: true },
      { id: 'member-2', requiresInvitation: true },
    ]);
  });

  it('surfaces a scope lookup failure', async () => {
    const directory = createDirectory();
    vi.mocked(getProjectAuthedContext).mockResolvedValue({
      ok: true,
      context: { supabaseAdmin: directory.client, user: { id: 'manager' }, role: 'employee' },
    } as never);
    vi.mocked(getWorkManagementScope).mockRejectedValue(new Error('Unavailable'));
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect((await GET()).status).toBe(500);
    expect(directory.client.from).not.toHaveBeenCalled();
  });
});
