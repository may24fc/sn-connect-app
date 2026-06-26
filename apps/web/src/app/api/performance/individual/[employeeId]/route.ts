import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';
import { type OkrStateTargetRow, applyComputedOkrState } from '../../_okr-state';

const ADMIN_ROLES = ['admin', 'super_admin', 'hr', 'cos', 'ceo'];

interface EvaluatorIdentity {
  firstName: string | null;
  position: string | null;
  role: string | null;
}

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

    if (userData?.status === 'terminated') {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Resolve department name from the canonical users.department_id first.
    // Fall back to the legacy employees.department text only if the FK is missing.
    let departmentName: string | null = null;
    if (userData?.department_id) {
      const { data: dept } = await db
        .from('departments')
        .select('name')
        .eq('id', userData.department_id)
        .maybeSingle();
      departmentName = dept?.name ?? null;
    }

    if (!departmentName) {
      departmentName = employee.department ?? null;
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

    const evaluatorIds = Array.from(
      new Set(
        [...(kpis || []), ...(okrs || []), ...(okrTargets || [])]
          .map((item) => item.evaluated_by)
          .filter((value): value is string => typeof value === 'string' && value.length > 0)
      )
    );

    const evaluatorDirectory = new Map<string, EvaluatorIdentity>();
    const evaluatorRoleDirectory = new Map<string, string | null>();

    if (evaluatorIds.length > 0) {
      const { data: evaluatorUsers } = await db
        .from('users')
        .select('id, role')
        .in('id', evaluatorIds)
        .is('deleted_at', null);

      for (const evaluator of evaluatorUsers || []) {
        evaluatorRoleDirectory.set(evaluator.id, evaluator.role ?? null);
      }
    }

    if (evaluatorIds.length > 0) {
      const { data: evaluatorEmployees } = await db
        .from('employees')
        .select('user_id, first_name, position')
        .in('user_id', evaluatorIds)
        .is('deleted_at', null);

      for (const evaluator of evaluatorEmployees || []) {
        evaluatorDirectory.set(evaluator.user_id, {
          firstName: evaluator.first_name ?? null,
          position: evaluator.position ?? null,
          role: evaluatorRoleDirectory.get(evaluator.user_id) ?? null,
        });
      }
    }

    const okrTargetsByOkrId = new Map<string, Array<OkrStateTargetRow>>();
    for (const target of ((okrTargets || []) as Array<OkrStateTargetRow & Record<string, unknown>>)) {
      const existing = okrTargetsByOkrId.get(target.okr_id) || [];
      existing.push(target);
      okrTargetsByOkrId.set(target.okr_id, existing);
    }

    const enrichedKpis = (kpis || []).map((kpi) => {
      const evaluator = evaluatorDirectory.get(kpi.evaluated_by ?? '') ?? null;

      return {
        ...kpi,
        evaluator_first_name: evaluator?.firstName ?? null,
        evaluator_position: evaluator?.position ?? null,
      };
    });

    const enrichedOkrs = (okrs || []).map((okr) => {
      const evaluator = evaluatorDirectory.get(okr.evaluated_by ?? '') ?? null;

      return applyComputedOkrState(
        {
          ...okr,
          evaluator_first_name: evaluator?.firstName ?? null,
          evaluator_position: evaluator?.position ?? null,
          evaluator_role: evaluator?.role ?? null,
        },
        okrTargetsByOkrId.get(okr.id) || []
      );
    });

    const okrEvaluatorById = new Map(
      enrichedOkrs.map((okr) => [okr.id, evaluatorDirectory.get(okr.evaluated_by ?? '') ?? null])
    );

    const enrichedOkrTargets = (okrTargets || []).map((target) => {
      const evaluator =
        evaluatorDirectory.get(target.evaluated_by ?? '') ??
        okrEvaluatorById.get(target.okr_id) ??
        null;

      return {
        ...target,
        evaluator_first_name: evaluator?.firstName ?? null,
        evaluator_position: evaluator?.position ?? null,
      };
    });

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
                if (k.kpi_type === 'scale') {
                  return acc + (k.self_rating ? (k.self_rating / 4) * 100 : 0);
                }
                if (k.target_value && k.target_value > 0) {
                  return acc + (k.current_value / k.target_value) * 100;
                }
                return acc;
              }, 0) / kpis.length
            )
          : 0,
      weightedMeanRating: 0,
      weightedMeanPercentage: 0,
    };

    // Calculate weighted mean across all KPIs (scale uses self_rating/4, numeric uses current/target)
    if (kpis && kpis.length > 0) {
      const totalWeight = kpis.reduce((acc, k) => acc + (k.weight || 1), 0);
      if (totalWeight > 0) {
        const weightedSum = kpis.reduce((acc, k) => {
          const w = k.weight || 1;
          if (k.kpi_type === 'scale') {
            const rating = k.self_rating || 0;
            return acc + (rating / 4) * w;
          }
          if (k.target_value && k.target_value > 0) {
            const ratio = Math.min(k.current_value / k.target_value, 1);
            return acc + ratio * w;
          }
          return acc;
        }, 0);
        const normalizedScore = weightedSum / totalWeight; // 0..1
        kpiSummary.weightedMeanRating = Math.round(normalizedScore * 4 * 100) / 100; // e.g. 3.20
        kpiSummary.weightedMeanPercentage = Math.round(normalizedScore * 100); // e.g. 80
      }
    }

    const okrSummary = {
      total: enrichedOkrs.length,
      completed: enrichedOkrs.filter((o) => o.status === 'completed').length,
      avgProgress:
        enrichedOkrs.length > 0
          ? Math.round(enrichedOkrs.reduce((acc, o) => acc + (o.progress || 0), 0) / enrichedOkrs.length)
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
      kpis: enrichedKpis,
      kpiSummary,
      okrs: enrichedOkrs,
      okrTargets: enrichedOkrTargets,
      okrSummary,
      reviews: reviews || [],
      latestReview,
    });
  } catch (err) {
    console.error('[performance/individual] Internal error:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
