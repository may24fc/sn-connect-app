import { getProjectAuthedContext } from '@/app/api/projects/_lib';
import { GET } from '@/app/api/admin/projects/overview/route';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/app/api/projects/_lib', () => ({
  getProjectAuthedContext: vi.fn(),
  isProjectAdmin: (role: string | null) => role === 'admin',
}));

function query(rows: Array<Record<string, unknown>>) {
  const result = { data: rows, error: null };
  const builder = {
    select: () => builder,
    eq: () => builder,
    neq: () => builder,
    not: () => builder,
    in: () => builder,
    is: () => builder,
    // biome-ignore lint/suspicious/noThenProperty: Supabase query builders are awaitable.
    then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
  };
  return builder;
}

describe('GET /api/admin/projects/overview', () => {
  it('counts shared projects once overall and once per department', async () => {
    const shared = {
      id: 'shared',
      lead_user_id: 'associate-a',
      progress_pct: 40,
      health: 'on_track',
    };
    const other = {
      id: 'other',
      lead_user_id: 'someone-else',
      progress_pct: 80,
      health: 'blocked',
    };
    let projectQueries = 0;
    const from = vi.fn((table: string) => {
      if (table === 'employee_directory') {
        return query([
          { user_id: 'associate-a', full_name: 'Avery', department_name: 'Operations', avatar_url: null },
          { user_id: 'associate-b', full_name: 'Blake', department_name: 'Operations', avatar_url: null },
        ]);
      }
      if (table === 'projects') {
        projectQueries += 1;
        return query(projectQueries === 1 ? [shared] : [shared, other]);
      }
      if (table === 'project_contributors') {
        return query([
          { project_id: 'shared', user_id: 'associate-a' },
          { project_id: 'shared', user_id: 'associate-b' },
          { project_id: 'other', user_id: 'associate-b' },
        ]);
      }
      if (table === 'user_gamification') return query([]);
      throw new Error(`Unexpected table: ${table}`);
    });
    vi.mocked(getProjectAuthedContext).mockResolvedValue({
      ok: true,
      context: { supabaseAdmin: { from }, user: { id: 'admin' }, role: 'admin' } as never,
    });

    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.totals).toMatchObject({ projects: 2, on_track: 1, blocked: 1 });
    expect(body.data.departments).toEqual([
      expect.objectContaining({ department: 'Operations', intern_count: 2, on_track: 1, blocked: 1 }),
    ]);
    expect(body.data.interns).toEqual(expect.arrayContaining([
      expect.objectContaining({ user_id: 'associate-a', project_count: 1 }),
      expect.objectContaining({ user_id: 'associate-b', project_count: 2 }),
    ]));
  });
});
