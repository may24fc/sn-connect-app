import { resolveUserDisplayName } from '@/lib/user-display';
import { NextResponse } from 'next/server';
import { getPaTaskAuthedContext } from '../_lib';

export async function GET() {
  try {
    const auth = await getPaTaskAuthedContext();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { supabaseAdmin, canAccess } = auth.context;
    if (!canAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data: grants, error: grantsError } = await supabaseAdmin
      .from('pa_task_access_grants')
      .select('user_id, access_level')
      .is('deleted_at', null)
      .order('created_at', { ascending: true });

    if (grantsError) {
      console.error('Failed to load PA task grants:', grantsError);
      return NextResponse.json({ error: 'Failed to load assignable users' }, { status: 500 });
    }

    const userIds = [...new Set((grants ?? []).map((grant) => grant.user_id))];
    if (userIds.length === 0) {
      return NextResponse.json({ data: [] });
    }

    const { data: users, error: userError } = await supabaseAdmin
      .from('users')
      .select('id, role')
      .in('id', userIds)
      .is('deleted_at', null);

    if (userError) {
      console.error('Failed to load PA task users:', userError);
      return NextResponse.json({ error: 'Failed to load assignable users' }, { status: 500 });
    }

    const { data: employees, error: employeeError } = await supabaseAdmin
      .from('employees')
      .select('user_id, first_name, middle_name, last_name')
      .in('user_id', userIds)
      .is('deleted_at', null);

    if (employeeError) {
      console.error('Failed to load PA task employee names:', employeeError);
      return NextResponse.json({ error: 'Failed to load assignable users' }, { status: 500 });
    }

    const usersById = new Map((users ?? []).map((item) => [item.id, item]));
    const employeesByUserId = new Map((employees ?? []).map((item) => [item.user_id, item]));

    const data = (grants ?? [])
      .map((grant) => {
        const userRow = usersById.get(grant.user_id);
        const employee = employeesByUserId.get(grant.user_id);
        const fullName = employee
          ? resolveUserDisplayName({
              employeeFirstName: employee.first_name,
              employeeMiddleName: employee.middle_name,
              employeeLastName: employee.last_name,
              fallbackLabel: 'PA/EA user',
            })
          : 'PA/EA user';

        return {
          userId: grant.user_id,
          fullName,
          role: userRow?.role ?? null,
          accessLevel: grant.access_level,
        };
      })
      .sort((a, b) => a.fullName.localeCompare(b.fullName));

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error in GET /api/pa-tasks/assignable-users:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
