import { reportCreateSchema } from '@/lib/schemas/report.schema';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/reports
 * List reports with filters and pagination
 */
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

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const reportType = searchParams.get('reportType') || '';
    const employeeId = searchParams.get('employeeId') || '';
    const page = Number.parseInt(searchParams.get('page') || '1', 10);
    const pageSize = Number.parseInt(searchParams.get('pageSize') || '10', 10);

    let query = supabase
      .from('reports')
      .select(
        '*, employees!inner(id, user_id, first_name, last_name, department), report_metrics(*)',
        { count: 'exact' }
      )
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(`report_type.ilike.%${search}%,notes.ilike.%${search}%`);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (reportType) {
      query = query.eq('report_type', reportType);
    }

    if (employeeId) {
      query = query.eq('employee_id', employeeId);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data, error, count } = await query;

    if (error) {
      console.error('Error fetching reports:', error);
      return NextResponse.json({ error: 'Failed to fetch reports' }, { status: 500 });
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
    console.error('Unexpected error in GET /api/reports:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/reports
 * Create report with metrics
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = reportCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { data: employeeData, error: employeeError } = await supabase
      .from('employees')
      .select('id')
      .eq('user_id', user.id)
      .is('deleted_at', null)
      .maybeSingle();

    const employeeId =
      typeof body.employeeId === 'string' && body.employeeId.trim().length > 0
        ? body.employeeId
        : employeeData?.id;

    if (employeeError) {
      console.error('Error loading employee for report creation:', employeeError);
      return NextResponse.json({ error: 'Failed to resolve employee profile' }, { status: 500 });
    }

    if (!employeeId) {
      return NextResponse.json(
        { error: 'No employee profile found for current user' },
        { status: 400 }
      );
    }

    const { data: report, error: reportError } = await supabase
      .from('reports')
      .insert({
        employee_id: employeeId,
        report_type: parsed.data.reportType,
        period_start: parsed.data.periodStart,
        period_end: parsed.data.periodEnd,
        status: parsed.data.status,
        notes: parsed.data.notes || null,
        created_by: user.id,
      })
      .select('*')
      .single();

    if (reportError || !report) {
      console.error('Error creating report:', reportError);
      return NextResponse.json({ error: 'Failed to create report' }, { status: 500 });
    }

    if (parsed.data.metrics.length > 0) {
      const metricsPayload = parsed.data.metrics.map((metric) => ({
        report_id: report.id,
        metric_name: metric.metricName,
        metric_value: metric.metricValue,
        metric_unit: metric.metricUnit || null,
        notes: metric.notes || null,
      }));

      const { error: metricsError } = await supabase.from('report_metrics').insert(metricsPayload);

      if (metricsError) {
        console.error('Error creating report metrics:', metricsError);
        return NextResponse.json(
          { error: 'Report created but failed to save metrics' },
          { status: 500 }
        );
      }
    }

    const { data: fullReport, error: fullReportError } = await supabase
      .from('reports')
      .select('*, report_metrics(*)')
      .eq('id', report.id)
      .single();

    if (fullReportError) {
      return NextResponse.json({ data: report }, { status: 201 });
    }

    return NextResponse.json({ data: fullReport }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/reports:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
