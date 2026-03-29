import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getAuthedOffboardingContext,
  isMissingOffboardingTableError,
  isOffboardingAdmin,
} from './_lib';

interface OffboardingRow {
  id: string;
  employee_id: string;
  exit_type: 'resignation' | 'termination' | 'end_of_contract' | 'retirement';
  last_working_day: string;
  status: 'initiated' | 'in_progress' | 'completed';
  exit_interview_date: string | null;
  exit_interview_notes: string | null;
  initiated_by: string;
  created_at: string;
  updated_at: string;
}

interface OffboardingTaskRow {
  id: string;
  offboarding_id: string;
  title: string;
  description: string | null;
  category: string;
  is_completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
  due_date: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

interface EmployeeRow {
  id: string;
  user_id: string;
  first_name: string;
  middle_name: string | null;
  last_name: string;
  company_email: string | null;
  department: string | null;
  position: string | null;
}

export async function GET(request: NextRequest) {
  try {
    const { supabase, user, role, error } = await getAuthedOffboardingContext();
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const employeeIdParam = request.nextUrl.searchParams.get('employeeId');
    const employeeId = employeeIdParam
      ? z.string().uuid().safeParse(employeeIdParam).data ?? null
      : null;

    if (employeeIdParam && !employeeId) {
      return NextResponse.json({ error: 'Invalid employeeId' }, { status: 400 });
    }

    let scopedEmployeeId = employeeId;
    const admin = isOffboardingAdmin(role);

    if (!admin) {
      const { data: employee } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .maybeSingle();

      if (!employee?.id) {
        return NextResponse.json({ data: [] });
      }

      scopedEmployeeId = employee.id;
    }

    let offboardingQuery = supabase
      .from('offboarding')
      .select('id, employee_id, exit_type, last_working_day, status, exit_interview_date, exit_interview_notes, initiated_by, created_at, updated_at')
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (scopedEmployeeId) {
      offboardingQuery = offboardingQuery.eq('employee_id', scopedEmployeeId);
    }

    const { data: offboardingRows, error: offboardingError } = await offboardingQuery;

    if (offboardingError) {
      if (isMissingOffboardingTableError(offboardingError, 'offboarding')) {
        return NextResponse.json({ data: [] });
      }

      console.error('GET /api/offboarding offboarding query error:', offboardingError);
      return NextResponse.json({ error: 'Failed to fetch offboarding records' }, { status: 500 });
    }

    const records = (offboardingRows ?? []) as Array<OffboardingRow>;
    if (records.length === 0) {
      return NextResponse.json({ data: [] });
    }

    const offboardingIds = records.map((record) => record.id);
    const employeeIds = Array.from(new Set(records.map((record) => record.employee_id)));

    const [{ data: taskRows, error: tasksError }, { data: employeeRows, error: employeesError }] =
      await Promise.all([
        supabase
          .from('offboarding_tasks')
          .select('id, offboarding_id, title, description, category, is_completed, completed_at, completed_by, due_date, assigned_to, created_at, updated_at')
          .in('offboarding_id', offboardingIds)
          .is('deleted_at', null)
          .order('created_at', { ascending: true }),
        supabase
          .from('employees')
          .select('id, user_id, first_name, middle_name, last_name, company_email, department, position')
          .in('id', employeeIds)
          .is('deleted_at', null),
      ]);

    const safeTaskRows = isMissingOffboardingTableError(tasksError, 'offboarding_tasks')
      ? []
      : ((taskRows ?? []) as Array<OffboardingTaskRow>);

    if (tasksError) {
      if (isMissingOffboardingTableError(tasksError, 'offboarding_tasks')) {
        console.warn('GET /api/offboarding: offboarding_tasks table is not available in this environment.');
      } else {
        console.error('GET /api/offboarding tasks query error:', tasksError);
        return NextResponse.json({ error: 'Failed to fetch offboarding tasks' }, { status: 500 });
      }
    }

    if (employeesError) {
      console.error('GET /api/offboarding employees query error:', employeesError);
      return NextResponse.json({ error: 'Failed to fetch offboarding employees' }, { status: 500 });
    }

    const employees = (employeeRows ?? []) as Array<EmployeeRow>;
    const employeeUserIds = employees.map((employeeRow) => employeeRow.user_id);

    const { data: userRows, error: usersError } = employeeUserIds.length
      ? await supabase
          .from('users')
          .select('id, role')
          .in('id', employeeUserIds)
          .is('deleted_at', null)
      : { data: [], error: null };

    if (usersError) {
      console.error('GET /api/offboarding users query error:', usersError);
      return NextResponse.json({ error: 'Failed to resolve offboarding roles' }, { status: 500 });
    }

    const tasksByOffboardingId = safeTaskRows.reduce(
      (accumulator, task) => {
        const currentTasks = accumulator.get(task.offboarding_id) ?? [];
        currentTasks.push(task);
        accumulator.set(task.offboarding_id, currentTasks);
        return accumulator;
      },
      new Map<string, Array<OffboardingTaskRow>>()
    );

    const employeeById = new Map(employees.map((employeeRow) => [employeeRow.id, employeeRow]));
    const roleByUserId = new Map(
      ((userRows ?? []) as Array<{ id: string; role: string | null }>).map((userRow) => [
        userRow.id,
        userRow.role,
      ])
    );

    const hydrated = records.map((record) => {
      const employeeRow = employeeById.get(record.employee_id) ?? null;
      const employeeUserId = employeeRow?.user_id ?? null;
      const fullName = employeeRow
        ? [employeeRow.first_name, employeeRow.middle_name, employeeRow.last_name]
            .filter(Boolean)
            .join(' ')
        : 'Unknown employee';
      const roleLabel = employeeUserId ? roleByUserId.get(employeeUserId) ?? 'employee' : 'employee';

      const hydratedTasks = (tasksByOffboardingId.get(record.id) ?? []).map((task) => {
        const ownerType = task.assigned_to && employeeUserId && task.assigned_to !== employeeUserId
          ? 'internal'
          : 'employee';
        const canComplete = admin || ownerType === 'employee';

        return {
          ...task,
          owner_type: ownerType,
          owner_label: ownerType === 'employee' ? 'Employee action' : 'Internal action',
          can_complete: canComplete,
        };
      });

      return {
        ...record,
        employee: employeeRow
          ? {
              id: employeeRow.id,
              user_id: employeeRow.user_id,
              full_name: fullName,
              email: employeeRow.company_email,
              department: employeeRow.department,
              position: employeeRow.position,
              role: roleLabel,
            }
          : null,
        offboarding_tasks: hydratedTasks,
      };
    });

    return NextResponse.json({ data: hydrated });
  } catch (error) {
    console.error('GET /api/offboarding error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}