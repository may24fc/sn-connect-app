import { resolveUserDisplayName } from '@/lib/user-display';
import { NextResponse } from 'next/server';
import { getPaTaskAuthedContext } from '../_lib';

export async function GET() {
  try {
    const auth = await getPaTaskAuthedContext();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { supabaseAdmin, canAccess, canManage, hasGrant, accessLevel, role } = auth.context;
    if (!canAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [statusesResult, prioritiesResult, categoriesResult, grantsResult] = await Promise.all([
      supabaseAdmin
        .from('pa_task_statuses')
        .select('*')
        .is('deleted_at', null)
        .order('sort_order', { ascending: true }),
      supabaseAdmin
        .from('pa_task_priorities')
        .select('*')
        .is('deleted_at', null)
        .order('sort_order', { ascending: true }),
      supabaseAdmin
        .from('pa_task_categories')
        .select('*')
        .is('deleted_at', null)
        .order('sort_order', { ascending: true }),
      supabaseAdmin
        .from('pa_task_access_grants')
        .select('user_id, access_level')
        .is('deleted_at', null)
        .order('created_at', { ascending: true }),
    ]);

    if (statusesResult.error) {
      console.error('Failed to fetch PA task statuses for bootstrap:', statusesResult.error);
      return NextResponse.json({ error: 'Failed to fetch statuses' }, { status: 500 });
    }

    if (prioritiesResult.error) {
      console.error('Failed to fetch PA task priorities for bootstrap:', prioritiesResult.error);
      return NextResponse.json({ error: 'Failed to fetch priorities' }, { status: 500 });
    }

    if (categoriesResult.error) {
      console.error('Failed to fetch PA task categories for bootstrap:', categoriesResult.error);
      return NextResponse.json({ error: 'Failed to fetch categories' }, { status: 500 });
    }

    if (grantsResult.error) {
      console.error('Failed to load PA task grants for bootstrap:', grantsResult.error);
      return NextResponse.json({ error: 'Failed to load assignable users' }, { status: 500 });
    }

    const grants = grantsResult.data ?? [];
    const userIds = [...new Set(grants.map((grant) => grant.user_id))];

    let assignees: Array<{
      userId: string;
      fullName: string;
      role: string | null;
      accessLevel: 'member' | 'manager' | 'admin';
    }> = [];

    if (userIds.length > 0) {
      const [usersResult, employeesResult] = await Promise.all([
        supabaseAdmin
          .from('users')
          .select('id, role')
          .in('id', userIds)
          .is('deleted_at', null),
        supabaseAdmin
          .from('employees')
          .select('user_id, first_name, middle_name, last_name')
          .in('user_id', userIds)
          .is('deleted_at', null),
      ]);

      if (usersResult.error) {
        console.error('Failed to load PA task users for bootstrap:', usersResult.error);
        return NextResponse.json({ error: 'Failed to load assignable users' }, { status: 500 });
      }

      if (employeesResult.error) {
        console.error('Failed to load PA task employee names for bootstrap:', employeesResult.error);
        return NextResponse.json({ error: 'Failed to load assignable users' }, { status: 500 });
      }

      const usersById = new Map((usersResult.data ?? []).map((item) => [item.id, item]));
      const employeesByUserId = new Map((employeesResult.data ?? []).map((item) => [item.user_id, item]));

      assignees = grants
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
    }

    return NextResponse.json({
      data: {
        access: {
          canAccess,
          canManage,
          hasGrant,
          accessLevel,
          role,
        },
        lookups: {
          statuses: statusesResult.data ?? [],
          priorities: prioritiesResult.data ?? [],
          categories: categoriesResult.data ?? [],
          assignees,
        },
      },
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/pa-tasks/bootstrap:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
