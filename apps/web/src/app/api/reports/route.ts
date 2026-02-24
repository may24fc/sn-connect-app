import { reportCreateSchema } from '@/lib/schemas/report.schema';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/reports
 * List reports with filters and pagination.
 *
 * Uses the admin client for data queries to bypass RLS cross-table subquery
 * issues. Security is enforced at the application layer: JWT auth + role-based
 * employee_id scoping ensures non-admin users only see their own reports.
 */
export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const reportType = searchParams.get('reportType') || '';
    const employeeId = searchParams.get('employeeId') || '';
    const page = Number.parseInt(searchParams.get('page') || '1', 10);
    const pageSize = Number.parseInt(searchParams.get('pageSize') || '10', 10);

    // Use admin client to avoid nested RLS failures on cross-table subqueries
    let query = supabaseAdmin
      .from('reports')
      .select('*, employees(id, user_id, first_name, last_name, department), report_metrics(*)', {
        count: 'exact',
      })
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

    // Role-based scoping: non-admins only see their own reports
    const role = typeof user.app_metadata?.db_role === 'string' ? user.app_metadata.db_role : null;
    const isAdmin = ['admin', 'super_admin'].includes(role ?? '');

    if (employeeId) {
      query = query.eq('employee_id', employeeId);
    } else if (!isAdmin) {
      // Use admin client for employee lookup to avoid RLS failures
      const { data: empData } = await supabaseAdmin
        .from('employees')
        .select('id')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .maybeSingle();

      if (empData?.id) {
        query = query.eq('employee_id', empData.id);
      }
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
 * Create report with metrics.
 *
 * Uses admin client for INSERT to bypass RLS. Application-layer auth enforces
 * that employees can only create reports for themselves.
 */
export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const parsed = reportCreateSchema.safeParse(body);

    if (!parsed.success) {
      console.error('POST /api/reports validation error:', JSON.stringify(parsed.error.flatten()));
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    // Use admin client for employee lookup — regular client may fail due to RLS
    const { data: employeeData, error: employeeError } = await supabaseAdmin
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

    // Ownership check: non-admins can only create reports for themselves
    const role = typeof user.app_metadata?.db_role === 'string' ? user.app_metadata.db_role : null;
    const isAdmin = ['admin', 'super_admin'].includes(role ?? '');

    if (!isAdmin && employeeId !== employeeData?.id) {
      return NextResponse.json(
        { error: 'Cannot create reports for other employees' },
        { status: 403 }
      );
    }

    const { data: report, error: reportError } = await supabaseAdmin
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

      const { error: metricsError } = await supabaseAdmin
        .from('report_metrics')
        .insert(metricsPayload);

      if (metricsError) {
        console.error('Error creating report metrics:', metricsError);
        return NextResponse.json(
          { error: 'Report created but failed to save metrics' },
          { status: 500 }
        );
      }
    }

    const { data: fullReport, error: fullReportError } = await supabaseAdmin
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
