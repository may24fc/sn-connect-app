import { createSupabaseServerClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';

const ADMIN_ROLES = ['admin', 'super_admin'];

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check role - only admin/super_admin can access directory
    let role: string | null = null;
    if (typeof user.app_metadata?.db_role === 'string') {
      role = user.app_metadata.db_role;
    }
    if (!role) {
      const { data: roleData } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .is('deleted_at', null)
        .maybeSingle();
      role = roleData?.role ?? null;
    }

    if (!role || !ADMIN_ROLES.includes(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const roleFilter = searchParams.get('role') || '';
    const department = searchParams.get('department') || '';
    const status = searchParams.get('status') || '';
    const employmentType = searchParams.get('employment_type') || '';
    const sortBy = searchParams.get('sort_by') || 'full_name';
    const sortOrder = searchParams.get('sort_order') === 'desc' ? false : true;
    const page = Number.parseInt(searchParams.get('page') || '1', 10);
    const pageSize = Math.min(Number.parseInt(searchParams.get('page_size') || '20', 10), 100);

    // Build query on the employee_directory view
    let query = supabase.from('employee_directory').select('*', { count: 'exact' });

    // Search filter
    if (search) {
      query = query.or(
        `full_name.ilike.%${search}%,email.ilike.%${search}%,position.ilike.%${search}%`
      );
    }

    // Role filter
    if (roleFilter) {
      query = query.eq('role', roleFilter);
    }

    // Department filter
    if (department) {
      query = query.eq('department_name', department);
    }

    // Status filter
    if (status) {
      query = query.eq('status', status);
    }

    // Employment type filter
    if (employmentType) {
      query = query.eq('employment_type', employmentType);
    }

    // Sorting
    const validSortColumns = [
      'full_name',
      'department_name',
      'start_date',
      'status',
      'role',
      'position',
    ];
    const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'full_name';
    query = query.order(sortColumn, { ascending: sortOrder });

    // Pagination
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      return NextResponse.json(
        { error: 'Failed to fetch directory', details: error.message },
        { status: 500 }
      );
    }

    // Get aggregate metadata
    const { data: allData } = await supabase
      .from('employee_directory')
      .select('role, status, internship_status');

    const metadata = {
      total: count || 0,
      active: allData?.filter((e) => e.status === 'active').length || 0,
      interns: allData?.filter((e) => e.role === 'intern').length || 0,
      onLeave: allData?.filter((e) => e.status === 'on_leave').length || 0,
      probation: allData?.filter((e) => e.status === 'probation').length || 0,
    };

    return NextResponse.json({
      data: data || [],
      metadata,
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
      },
    });
  } catch (err) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
