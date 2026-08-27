import { logActivity } from '@/lib/audit';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import type { Employee } from '@hr-portal/database';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { resolveDepartmentById, resolveDivisionById } from '@/app/api/users/_organization';

const employeePatchSchema = z.object({
  first_name: z.string().trim().min(1).nullable().optional(),
  last_name: z.string().trim().min(1).nullable().optional(),
  departmentId: z.string().uuid().nullable().optional(),
  divisionId: z.string().uuid().nullable().optional(),
  department: z.string().optional(),
  division: z.string().nullable().optional(),
  position: z.string().optional(),
  date_hired: z.union([z.string().date(), z.null()]).optional(),
  employment_type: z.string().optional(),
  immediate_head: z.string().uuid().nullable().optional(),
});

/**
 * GET /api/employees/[id]
 * Get single employee details
 * Permissions: Employees can view their own, managers can view their reports, admins can view all
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Fetch employee with user data and manager info
    // Explicitly specify foreign key relationships to avoid ambiguity
    const { data, error } = await supabase
      .from('employees')
      .select('*, users!employees_user_id_fkey(*), manager:users!employees_immediate_head_fkey(*)')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Authorization: non-admin users can only view their own record or their reports
    const role = typeof user.app_metadata?.db_role === 'string' ? user.app_metadata.db_role : null;
    const isAdmin = ['admin', 'super_admin', 'hr', 'cos', 'ceo'].includes(role ?? '');

    if (!isAdmin) {
      const employeeUserId = (data as { user_id?: string }).user_id;
      const isOwnRecord = employeeUserId === user.id;
      const isManager = (data as { immediate_head?: string }).immediate_head === user.id;

      if (!isOwnRecord && !isManager) {
        return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
      }
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error in GET /api/employees/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/employees/[id]
 * Update employee
 * Permissions: Employees can update their own basic info, admins can update all fields
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body
    const rawBody = await request.json();
    const parsedBody = employeePatchSchema.safeParse(rawBody);

    if (!parsedBody.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsedBody.error.flatten() },
        { status: 400 }
      );
    }

    const body = parsedBody.data;

    // Admin-only fields require role check
    const adminOnlyFields = [
      'first_name',
      'last_name',
      'department',
      'departmentId',
      'division',
      'divisionId',
      'position',
      'employment_type',
      'immediate_head',
      'date_hired',
    ];
    const hasAdminFields = adminOnlyFields.some((field) => field in body);

    if (hasAdminFields) {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if (userError || !userData) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      if (userData.role !== 'super_admin' && userData.role !== 'admin') {
        return NextResponse.json({ error: 'Forbidden: admin privileges required' }, { status: 403 });
      }
    }

    const adminClient = createSupabaseAdminClient();
    const updates: Omit<Partial<Employee>, 'date_hired' | 'immediate_head'> & {
      division?: string | null;
      date_hired?: string | null;
      immediate_head?: string | null;
    } = {};

    if (typeof body.first_name !== 'undefined') {
      updates.first_name = body.first_name as Employee['first_name'];
    }

    if (typeof body.last_name !== 'undefined') {
      updates.last_name = body.last_name as Employee['last_name'];
    }

    if (typeof body.position !== 'undefined') {
      updates.position = body.position as Employee['position'];
    }

    if (typeof body.date_hired !== 'undefined') {
      updates.date_hired = body.date_hired as Employee['date_hired'];
    }

    if (typeof body.employment_type !== 'undefined') {
      updates.employment_type = body.employment_type as Employee['employment_type'];
    }

    if (typeof body.immediate_head !== 'undefined') {
      updates.immediate_head = body.immediate_head as Employee['immediate_head'];
    }

    let resolvedDepartmentId: string | null | undefined;
    let resolvedDivisionId: string | null | undefined;

    if (typeof body.departmentId !== 'undefined') {
      if (body.departmentId) {
        const resolvedDepartment = await resolveDepartmentById(adminClient, body.departmentId);
        updates.department = resolvedDepartment.name;
        resolvedDepartmentId = resolvedDepartment.id;
      } else {
        updates.department = body.department ?? 'Unassigned';
        resolvedDepartmentId = null;
      }
    } else if (typeof body.department !== 'undefined') {
      updates.department = body.department;
    }

    if (typeof body.divisionId !== 'undefined') {
      if (body.divisionId) {
        const resolvedDivision = await resolveDivisionById(adminClient, body.divisionId);
        updates.division = resolvedDivision.name;
        resolvedDivisionId = resolvedDivision.id;
      } else {
        updates.division = null;
        resolvedDivisionId = null;
      }
    } else if (typeof body.division !== 'undefined') {
      updates.division = body.division;
    }

    // Update employee (use admin client to bypass RLS)
    const { data, error } = await adminClient
      .from('employees')
      .update(updates)
      .eq('id', id)
      .is('deleted_at', null)
      .select()
      .single();

    if (error) {
      console.error('Error updating employee:', error);
      return NextResponse.json({ error: 'Failed to update employee' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    if (typeof resolvedDepartmentId !== 'undefined' || typeof resolvedDivisionId !== 'undefined') {
      const userUpdates: Record<string, string | null> = {};

      if (typeof resolvedDepartmentId !== 'undefined') {
        userUpdates.department_id = resolvedDepartmentId;
      }

      if (typeof resolvedDivisionId !== 'undefined') {
        userUpdates.division_id = resolvedDivisionId;
      }

      if (Object.keys(userUpdates).length > 0) {
        const { error: syncUserError } = await adminClient
          .from('users')
          .update(userUpdates)
          .eq('id', data.user_id);

        if (syncUserError) {
          console.error('Error syncing employee org placement:', syncUserError);
          return NextResponse.json({ error: 'Failed to sync employee organization data' }, { status: 500 });
        }
      }
    }

    logActivity(supabase, {
      userId: user.id,
      action: 'update_employee',
      tableName: 'employees',
      recordId: id,
      metadata: { employeeId: id },
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error in PATCH /api/employees/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/employees/[id]
 * Soft delete employee
 * Permissions: Admin and Super Admin only
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check role permission
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (userData.role !== 'super_admin' && userData.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Soft delete employee (use admin client to bypass RLS)
    const adminClient = createSupabaseAdminClient();
    const { error } = await adminClient
      .from('employees')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .is('deleted_at', null);

    if (error) {
      console.error('Error deleting employee:', error);
      return NextResponse.json({ error: 'Failed to delete employee' }, { status: 500 });
    }

    logActivity(supabase, {
      userId: user.id,
      action: 'delete_employee',
      tableName: 'employees',
      recordId: id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/employees/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
