import { logActivity } from '@/lib/audit';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import type { EmployeeInsert } from '@hr-portal/database';
import { type NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/employees
 * List employees with pagination, search, and filters
 * Permissions: Admins see all, non-admins see only their own record (RLS + app-layer scoping)
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    // Verify authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Resolve role for authorization scoping
    const role = typeof user.app_metadata?.db_role === 'string' ? user.app_metadata.db_role : null;
    const isAdmin = ['admin', 'super_admin', 'hr', 'cos', 'ceo'].includes(role ?? '');

    // Parse query parameters
    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const department = searchParams.get('department') || '';
    const status = searchParams.get('status') || '';
    const page = Number.parseInt(searchParams.get('page') || '1', 10);
    const pageSize = Number.parseInt(searchParams.get('pageSize') || '10', 10);

    // Build query with explicit foreign key relationships and limited fields.
    // Excludes sensitive payroll/PII fields (payroll_account_name,
    // payroll_account_number, address, city, province, postal_code,
    // personal_email, emergency_contact_name, emergency_contact_number)
    // from list results. Use GET /api/employees/[id] for full details.
    let query = supabase
      .from('employees')
      .select(
        'id, user_id, employee_number, immediate_head, first_name, middle_name, last_name, birthday, date_hired, employment_type, work_arrangement, position, department, division, probation_end_date, phone, company_email, created_at, updated_at, deleted_at, users!employees_user_id_fkey!inner(id, role, status, department_id, division_id, avatar_url), manager:users!employees_immediate_head_fkey(id, role, status)',
        { count: 'exact' }
      )
      .is('deleted_at', null);

    // Non-admin users: scope to their own record only
    if (!isAdmin) {
      const userId = searchParams.get('userId') || '';
      // Force scoping to the current user's record
      query = query.eq('user_id', userId || user.id);
    } else {
      // Admin users can filter by userId if provided
      const userId = searchParams.get('userId') || '';
      if (userId) {
        query = query.eq('user_id', userId);
      }
    }

    // Apply filters
    if (search) {
      query = query.or(
        `first_name.ilike.%${search}%,last_name.ilike.%${search}%,employee_number.ilike.%${search}%`
      );
    }

    if (department) {
      query = query.eq('department', department);
    }

    if (status) {
      query = query.eq('users.status', status);
    } else {
      // Always exclude terminated employees from general list views
      query = query.neq('users.status', 'terminated');
    }

    const excludeInterns = searchParams.get('excludeInterns') === 'true';
    if (excludeInterns) {
      query = query.neq('employment_type', 'associate');
    }

    // Apply pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    // Execute query
    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching employees:', error);
      return NextResponse.json({ error: 'Failed to fetch employees' }, { status: 500 });
    }

    return NextResponse.json({
      data,
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
      },
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/employees:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/employees
 * Create new employee
 * Permissions: HR, Admin, Super Admin only
 */
export async function POST(request: NextRequest) {
  try {
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

    const allowedRoles = ['admin', 'super_admin'];
    if (!allowedRoles.includes(userData.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Parse request body
    const body: EmployeeInsert = await request.json();

    // Insert employee
    const { data, error } = await supabase
      .from('employees')
      .insert({
        ...body,
        created_by: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating employee:', error);
      return NextResponse.json({ error: 'Failed to create employee' }, { status: 500 });
    }

    logActivity(supabase, {
      userId: user.id,
      action: 'create_employee',
      tableName: 'employees',
      recordId: data.id,
      metadata: { employeeNumber: data.employee_number },
    });

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/employees:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
