import { createSupabaseAdminClient } from '@/lib/supabase/server';
import {
  canAssignUser,
  canManageProject,
  classifyProjectMemberAssignments,
  getManagedMemberIds,
  getWorkManagementScope,
} from '@/lib/work-management/permissions';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  tables: {} as Record<string, Array<Record<string, unknown>>>,
  errorTable: '',
}));

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseAdminClient: () => ({
    from: (table: string) => {
      let rows = [...(state.tables[table] ?? [])];
      const result = () => ({
        data: rows,
        error: state.errorTable === table ? { message: 'Unavailable' } : null,
      });
      const builder = {
        select: () => builder,
        eq: (column: string, value: unknown) => {
          rows = rows.filter((row) => row[column] === value);
          return builder;
        },
        is: (column: string, value: unknown) => {
          rows = rows.filter((row) => (row[column] ?? null) === value);
          return builder;
        },
        neq: (column: string, value: unknown) => {
          rows = rows.filter((row) => row[column] !== value);
          return builder;
        },
        in: (column: string, values: Array<unknown>) => {
          rows = rows.filter((row) => values.includes(row[column]));
          return builder;
        },
        maybeSingle: async () => ({ ...result(), data: rows[0] ?? null }),
        // biome-ignore lint/suspicious/noThenProperty: Supabase query builders are awaitable.
        then: (resolve: (value: ReturnType<typeof result>) => unknown) =>
          Promise.resolve(result()).then(resolve),
      };
      return builder;
    },
  }),
}));

describe('multi-department work-management permissions', () => {
  beforeEach(() => {
    state.errorTable = '';
    state.tables = {
      users: [
        {
          id: 'lead',
          department_id: 'home',
          status: 'active',
          role: 'employee',
          account_kind: 'workforce',
        },
        {
          id: 'operations-member',
          department_id: 'operations',
          status: 'active',
          role: 'employee',
        },
        { id: 'marketing-member', department_id: 'marketing', status: 'active', role: 'associate' },
        { id: 'outside-member', department_id: 'other', status: 'active', role: 'employee' },
        {
          id: 'former-member',
          department_id: 'operations',
          status: 'terminated',
          role: 'employee',
        },
      ],
      department_leads: [
        { user_id: 'lead', department_id: 'operations', revoked_at: null },
        { user_id: 'lead', department_id: 'marketing', revoked_at: null },
        { user_id: 'lead', department_id: 'revoked', revoked_at: '2026-11-01' },
      ],
      projects: [{ id: 'project', lead_user_id: 'someone-else' }],
      project_departments: [
        { project_id: 'project', department_id: 'operations', status: 'active' },
      ],
      project_contributors: [
        { project_id: 'project', user_id: 'outside-member', role: 'lead' },
        { project_id: 'project', user_id: 'marketing-member', role: 'contributor' },
      ],
    };
  });

  it('derives authority from all active appointments, not the home department', async () => {
    const scope = await getWorkManagementScope(createSupabaseAdminClient(), 'lead', 'employee');
    expect(scope).toEqual({
      isGlobal: false,
      departmentId: 'home',
      ledDepartmentIds: ['operations', 'marketing'],
    });
    state.tables.users[0].department_id = 'new-home';
    expect(
      (await getWorkManagementScope(createSupabaseAdminClient(), 'lead', 'employee'))
        .ledDepartmentIds
    ).toEqual(['operations', 'marketing']);
  });

  it('permits members of either appointed department but not other or terminated members', async () => {
    const client = createSupabaseAdminClient();
    expect(await canAssignUser(client, 'lead', 'employee', 'operations-member')).toBe(true);
    expect(await canAssignUser(client, 'lead', 'employee', 'marketing-member')).toBe(true);
    expect(await canAssignUser(client, 'lead', 'employee', 'outside-member')).toBe(false);
    expect(await canAssignUser(client, 'lead', 'employee', 'former-member')).toBe(false);
    expect(await getManagedMemberIds(client, 'lead', 'employee')).toEqual([
      'operations-member',
      'marketing-member',
    ]);
  });

  it('supports a lead with no home department', async () => {
    state.tables.users[0].department_id = null;
    expect(
      (await getWorkManagementScope(createSupabaseAdminClient(), 'lead', 'employee'))
        .ledDepartmentIds
    ).toEqual(['operations', 'marketing']);
  });

  it('still requires the target department to be active on a project', async () => {
    const client = createSupabaseAdminClient();
    expect(await canManageProject(client, 'project', 'lead', 'employee')).toBe(true);
    expect(await canAssignUser(client, 'lead', 'employee', 'operations-member', 'project')).toBe(
      true
    );
    expect(await canAssignUser(client, 'lead', 'employee', 'marketing-member', 'project')).toBe(
      false
    );
  });

  it('revokes one department without removing authority over the other', async () => {
    state.tables.department_leads[0].revoked_at = '2026-11-04';
    const client = createSupabaseAdminClient();
    expect(await canAssignUser(client, 'lead', 'employee', 'operations-member')).toBe(false);
    expect(await canAssignUser(client, 'lead', 'employee', 'marketing-member')).toBe(true);
    expect(await canManageProject(client, 'project', 'lead', 'employee')).toBe(false);
  });

  it.each(['terminated', 'deleted', 'missing'])(
    'ignores appointments for a %s lead',
    async (status) => {
      if (status === 'missing') state.tables.users.shift();
      else if (status === 'deleted') state.tables.users[0].deleted_at = '2026-11-04';
      else state.tables.users[0].status = status;
      expect(
        (await getWorkManagementScope(createSupabaseAdminClient(), 'lead', 'employee'))
          .ledDepartmentIds
      ).toEqual([]);
    }
  );

  it('does not turn a failed scope lookup into a successful empty scope', async () => {
    state.errorTable = 'department_leads';
    await expect(
      getWorkManagementScope(createSupabaseAdminClient(), 'lead', 'employee')
    ).rejects.toThrow('Failed to load work-management scope');
  });

  it.each([
    ['projects', 'Failed to load project management access'],
    ['project_departments', 'Failed to load project departments'],
  ])('surfaces a failed %s lookup while checking project management', async (table, message) => {
    state.errorTable = table;
    await expect(
      canManageProject(createSupabaseAdminClient(), 'project', 'lead', 'employee')
    ).rejects.toThrow(message);
  });

  it.each(['workforce', 'privileged', 'workspace'])(
    'grants appointment-derived authority to an active %s lead',
    async (accountKind) => {
      state.tables.users[0].account_kind = accountKind;
      state.tables.users[0].role = 'leadership';
      const client = createSupabaseAdminClient();
      expect((await getWorkManagementScope(client, 'lead', 'leadership')).ledDepartmentIds).toEqual(
        ['operations', 'marketing']
      );
      expect(await canAssignUser(client, 'lead', 'leadership', 'operations-member')).toBe(true);
    }
  );

  it('preserves global admin scope', async () => {
    expect(await getManagedMemberIds(createSupabaseAdminClient(), 'lead', 'admin')).toBeNull();
  });

  it('grants management to existing lead-role contributors, but not ordinary contributors', async () => {
    const client = createSupabaseAdminClient();
    expect(await canManageProject(client, 'project', 'outside-member', 'employee')).toBe(true);
    expect(await canManageProject(client, 'project', 'marketing-member', 'associate')).toBe(false);
  });

  it('preserves project management for a creator who is not a project lead', async () => {
    state.tables.projects[0].created_by = 'marketing-member';
    expect(
      await canManageProject(createSupabaseAdminClient(), 'project', 'marketing-member', 'associate')
    ).toBe(true);
  });

  it.each(['terminated', 'deleted', 'missing'])(
    'does not grant co-lead management to a %s user',
    async (status) => {
      const index = state.tables.users.findIndex((user) => user.id === 'outside-member');
      if (status === 'missing') state.tables.users.splice(index, 1);
      else if (status === 'deleted') state.tables.users[index].deleted_at = '2026-11-04';
      else state.tables.users[index].status = status;
      expect(
        await canManageProject(createSupabaseAdminClient(), 'project', 'outside-member', 'employee')
      ).toBe(false);
    }
  );

  it('surfaces failures loading project lead grants', async () => {
    state.errorTable = 'project_contributors';
    await expect(
      canManageProject(createSupabaseAdminClient(), 'project', 'outside-member', 'employee')
    ).rejects.toThrow('Failed to load project lead access');
  });

  it('classifies project assignments by appointments even for an administrator', async () => {
    const client = createSupabaseAdminClient();
    expect(
      await classifyProjectMemberAssignments(client, 'lead', 'employee', [
        'lead',
        'operations-member',
        'marketing-member',
        'outside-member',
      ])
    ).toEqual({
      ok: true,
      directUserIds: ['lead', 'operations-member', 'marketing-member'],
      invitationUserIds: ['outside-member'],
    });
    expect(
      await classifyProjectMemberAssignments(client, 'lead', 'employee', ['former-member'])
    ).toMatchObject({ ok: false, status: 400 });
    expect(
      await classifyProjectMemberAssignments(client, 'lead', 'employee', ['missing'])
    ).toMatchObject({ ok: false, status: 400 });
    expect(
      await classifyProjectMemberAssignments(client, 'lead', 'admin', ['outside-member'])
    ).toEqual({ ok: true, directUserIds: [], invitationUserIds: ['outside-member'] });
  });
});
