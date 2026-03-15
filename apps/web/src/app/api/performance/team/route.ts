import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';

interface DirectReportRow {
  employee_id: string;
  user_id: string;
  full_name: string;
  position: string | null;
  department: string | null;
}

export async function GET(_request: NextRequest) {
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

    const { data: directReports, error: reportsError } = await supabaseAdmin.rpc(
      'get_direct_reports',
      { manager_user_id: user.id }
    );

    if (reportsError) {
      return NextResponse.json(
        { error: 'Failed to load direct reports', details: reportsError.message },
        { status: 500 }
      );
    }

    const reports = (directReports || []) as DirectReportRow[];
    if (reports.length === 0) {
      return NextResponse.json({ data: [] });
    }

    const employeeIds = reports.map((report) => report.employee_id);

    const [{ data: okrs }, { data: kpis }, { data: reviews }] = await Promise.all([
      supabaseAdmin
        .from('okrs')
        .select('employee_id, progress')
        .in('employee_id', employeeIds)
        .neq('status', 'draft'),
      supabaseAdmin
        .from('kpis')
        .select('employee_id, progress_pct')
        .in('employee_id', employeeIds),
      supabaseAdmin
        .from('performance_reviews')
        .select('employee_id, id')
        .in('employee_id', employeeIds),
    ]);

    const data = reports.map((report) => {
      const employeeOkrs = (okrs || []).filter((okr) => okr.employee_id === report.employee_id);
      const employeeKpis = (kpis || []).filter((kpi) => kpi.employee_id === report.employee_id);
      const employeeReviews = (reviews || []).filter(
        (review) => review.employee_id === report.employee_id
      );

      const okrProgress =
        employeeOkrs.length > 0
          ? Math.round(
              employeeOkrs.reduce((sum, okr) => sum + Number(okr.progress || 0), 0) /
                employeeOkrs.length
            )
          : 0;

      const kpiProgress =
        employeeKpis.length > 0
          ? Math.round(
              employeeKpis.reduce(
                (sum, kpi) => sum + Number((kpi as { progress_pct?: number }).progress_pct || 0),
                0
              ) / employeeKpis.length
            )
          : 0;

      return {
        employeeId: report.employee_id,
        userId: report.user_id,
        fullName: report.full_name,
        position: report.position,
        department: report.department,
        okrProgress,
        kpiProgress,
        reviewCount: employeeReviews.length,
      };
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error('[performance/team] Internal error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}