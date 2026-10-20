import {
  TASK_ASSIGNABLE_ROLES,
  getTaskAuthedContext,
} from '@/app/api/tasks/_lib';
import { loadDirectoryPeople } from '@/lib/people/directory-people';
import { getManagedMemberIds } from '@/lib/work-management/permissions';
import { NextResponse } from 'next/server';

interface TaskAssigneeOption {
  id: string;
  role: (typeof TASK_ASSIGNABLE_ROLES)[number];
  name: string;
  email: string | null;
  department: string | null;
  position: string | null;
  avatar_url: string | null;
}

export async function GET() {
  try {
    const auth = await getTaskAuthedContext();

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { supabaseAdmin, user, role } = auth.context;

    const managedMemberIds = await getManagedMemberIds(supabaseAdmin, user.id, role);
    if (managedMemberIds?.length === 0) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let usersQuery = supabaseAdmin
      .from('users')
      .select('id, role')
      .in('role', TASK_ASSIGNABLE_ROLES)
      .is('deleted_at', null)
      .neq('status', 'terminated');
    if (managedMemberIds) usersQuery = usersQuery.in('id', managedMemberIds);
    const { data: users, error: usersError } = await usersQuery.order('created_at', {
      ascending: true,
    });

    if (usersError) {
      console.error('Failed to fetch task assignee users:', usersError);
      return NextResponse.json({ error: 'Failed to fetch task assignees' }, { status: 500 });
    }

    const userRows: Array<{ id: string; role: string }> = users || [];

    if (userRows.length === 0) {
      return NextResponse.json({ data: [] satisfies Array<TaskAssigneeOption> });
    }

    const people = await loadDirectoryPeople(
      supabaseAdmin,
      userRows.map((entry) => entry.id)
    );

    const data: Array<TaskAssigneeOption> = userRows
      .map((entry) => {
        const person = people.get(entry.id);

        return {
          id: entry.id,
          role: entry.role as (typeof TASK_ASSIGNABLE_ROLES)[number],
          // Accounts without an employee record have no name; show their email rather than a made-up one.
          name: person?.name ?? person?.email ?? 'Unnamed account',
          email: person?.email ?? null,
          department: person?.department ?? null,
          position: person?.position ?? null,
          avatar_url: person?.avatarUrl ?? null,
        };
      })
      .sort((left, right) => left.name.localeCompare(right.name));

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error in GET /api/tasks/assignees:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
