import { logActivity } from '@/lib/audit';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import type { Employee } from '@hr-portal/database';
import { type NextRequest, NextResponse } from 'next/server';

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
    const body: Partial<Employee> = await request.json();

    // Admin-only fields require role check
    const adminOnlyFields = ['department', 'position', 'employment_type', 'immediate_head', 'date_hired'];
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

    // Update employee (use admin client to bypass RLS)
    const adminClient = createSupabaseAdminClient();
    const { data, error } = await adminClient
      .from('employees')
      .update(body)
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
