import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';

const ADMIN_ROLES = ['admin', 'super_admin', 'hr', 'cos', 'ceo'];

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ employeeId: string }> }
) {
  try {
    const supabase = await createSupabaseServerClient();
    const supabaseAdmin = createSupabaseAdminClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check role - admins can view any, employees can only view own
    let role: string | null = null;
    if (typeof user.app_metadata?.db_role === 'string') {
      role = user.app_metadata.db_role;
    }
    if (!role) {
      const { data: roleData } = await supabaseAdmin
        .from('users')
        .select('role')
        .eq('id', user.id)
        .is('deleted_at', null)
        .maybeSingle();
      role = roleData?.role ?? null;
    }

    const { employeeId } = await params;

    const { data: requestedEmployee } = await supabaseAdmin
      .from('employees')
      .select('id, user_id')
      .eq('id', employeeId)
      .is('deleted_at', null)
      .maybeSingle();

    if (!requestedEmployee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Non-admins can only view their own data
    if (!ADMIN_ROLES.includes(role || '')) {
      const { data: ownEmployee } = await supabaseAdmin
        .from('employees')
        .select('id')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .maybeSingle();

      if (!ownEmployee || ownEmployee.id !== employeeId) {
        const { data: managesEmployee, error: managerCheckError } = await supabaseAdmin.rpc(
          'is_manager_of',
          {
            manager_id: user.id,
            employee_user_id: requestedEmployee.user_id,
          }
        );

        if (managerCheckError || !managesEmployee) {
          return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }
      }
    }

    // Use admin client to bypass RLS — app-level auth above already scopes access
    const db = supabaseAdmin;

    // Fetch employee details
    const { data: employee, error: empError } = await db
      .from('employees')
      .select(
        `
        id, user_id, first_name, last_name, position, department,
        employment_type, date_hired
      `
      )
      .eq('id', employeeId)
      .is('deleted_at', null)
      .maybeSingle();

    if (empError || !employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Fetch user data for avatar, role, status, and department_id
    const { data: userData } = await db
      .from('users')
      .select('avatar_url, role, email, department_id, status')
      .eq('id', employee.user_id)
      .maybeSingle();

    // Resolve department name: use employees.department text, or look up from users.department_id
    let departmentName: string | null = employee.department ?? null;
    if (!departmentName && userData?.department_id) {
      const { data: dept } = await db
        .from('departments')
        .select('name')
        .eq('id', userData.department_id)
        .maybeSingle();
      departmentName = dept?.name ?? null;
    }

    // Fetch KPIs
    const { data: kpis } = await db
      .from('kpis')
      .select('*')
      .eq('employee_id', employeeId)
      .order('created_at', { ascending: false });

    // Fetch OKRs
    const { data: okrs } = await db
      .from('okrs')
      .select('*')
      .eq('employee_id', employeeId)
      .order('created_at', { ascending: false });

    // Fetch OKR Targets
    const { data: okrTargets } = await db
      .from('okr_targets')
      .select('*')
      .eq('employee_id', employeeId)
      .is('deleted_at', null)
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true });

    // Fetch performance reviews
    const { data: reviews } = await db
      .from('performance_reviews')
      .select(
        `
        *,
        review_cycles (id, name, start_date, end_date, status)
      `
      )
      .eq('employee_id', employeeId)
      .order('created_at', { ascending: false });

    // Calculate summaries
    const kpiSummary = {
      total: kpis?.length || 0,
      completed: kpis?.filter((k) => k.status === 'completed').length || 0,
      avgProgress:
        kpis && kpis.length > 0
          ? Math.round(
              kpis.reduce((acc, k) => {
                if (k.target_value && k.target_value > 0) {
                  return acc + (k.current_value / k.target_value) * 100;
                }
                return acc;
              }, 0) / kpis.length
            )
          : 0,
    };

    const okrSummary = {
      total: okrs?.length || 0,
      completed: okrs?.filter((o) => o.status === 'completed').length || 0,
      avgProgress:
        okrs && okrs.length > 0
          ? Math.round(okrs.reduce((acc, o) => acc + (o.progress || 0), 0) / okrs.length)
          : 0,
    };

    const latestReview = reviews?.[0] || null;

    return NextResponse.json({
      employee: {
        id: employee.id,
        userId: employee.user_id,
        fullName: `${employee.first_name || ''} ${employee.last_name || ''}`.trim(),
        position: employee.position,
        department: departmentName,
        status: userData?.status ?? null,
        employmentType: employee.employment_type,
        dateHired: employee.date_hired,
        avatarUrl: userData?.avatar_url ?? null,
        role: userData?.role ?? null,
        email: userData?.email ?? null,
      },
      kpis: kpis || [],
      kpiSummary,
      okrs: okrs || [],
      okrTargets: okrTargets || [],
      okrSummary,
      reviews: reviews || [],
      latestReview,
    });
  } catch (err) {
    console.error('[performance/individual] Internal error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
