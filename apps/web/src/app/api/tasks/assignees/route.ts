import {
  TASK_ASSIGNABLE_ROLES,
  TASK_ASSIGNER_ROLE,
  getTaskAuthedContext,
} from '@/app/api/tasks/_lib';
import { NextResponse } from 'next/server';

interface TaskAssigneeOption {
  id: string;
  role: (typeof TASK_ASSIGNABLE_ROLES)[number];
  name: string;
  email: string | null;
}

interface EmployeeNameRow {
  user_id: string;
  first_name: string;
  last_name: string;
  company_email: string | null;
  personal_email: string | null;
}

export async function GET() {
  try {
    const auth = await getTaskAuthedContext();

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { supabase, role } = auth.context;

    if (role !== TASK_ASSIGNER_ROLE) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: users, error: usersError } = await supabase
      .from('users')
      .select('id, role')
      .in('role', TASK_ASSIGNABLE_ROLES)
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    if (usersError) {
      console.error('Failed to fetch task assignee users:', usersError);
      return NextResponse.json({ error: 'Failed to fetch task assignees' }, { status: 500 });
    }

    const userRows: Array<{ id: string; role: string }> = users || [];

    if (userRows.length === 0) {
      return NextResponse.json({ data: [] satisfies Array<TaskAssigneeOption> });
    }

    const userIds = userRows.map((entry) => entry.id);

    const { data: employees, error: employeesError } = await supabase
      .from('employees')
      .select('user_id, first_name, last_name, company_email, personal_email')
      .in('user_id', userIds)
      .is('deleted_at', null);

    if (employeesError) {
      console.error('Failed to fetch task assignee employee records:', employeesError);
      return NextResponse.json({ error: 'Failed to fetch task assignees' }, { status: 500 });
    }

    const profileByUserId = new Map<string, EmployeeNameRow>();
    ((employees || []) as Array<EmployeeNameRow>).forEach((entry) => {
      profileByUserId.set(entry.user_id, entry);
    });

    const data: Array<TaskAssigneeOption> = userRows
      .map((entry) => {
        const profile = profileByUserId.get(entry.id);
        const name = profile
          ? `${profile.first_name} ${profile.last_name}`
          : entry.role === 'intern'
            ? 'Intern User'
            : 'Employee User';

        return {
          id: entry.id,
          role: entry.role as (typeof TASK_ASSIGNABLE_ROLES)[number],
          name,
          email: profile?.company_email || profile?.personal_email || null,
        };
      })
      .sort((left, right) => left.name.localeCompare(right.name));

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error in GET /api/tasks/assignees:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
