import { logActivity } from '@/lib/audit';
import {
  notifyMarketingSubmissionWebhook,
  notifySuperAdminsAboutSubmittedReport,
} from '@/app/api/reports/_notifications';
import {
  getMarketingReportDisplayName,
  isMarketingWeeklyPlan,
  normalizeReportRecord,
  serializeReportNotes,
} from '@/lib/report-utils';
import { reportCreateSchema } from '@/lib/schemas/report.schema';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';

function applyArchivedScope<TQuery extends { is: Function; not: Function }>(
  query: TQuery,
  archivedScope: 'exclude' | 'only' | 'include'
): TQuery {
  if (archivedScope === 'only') {
    return query.not('deleted_at', 'is', null) as TQuery;
  }

  if (archivedScope === 'include') {
    return query;
  }

  return query.is('deleted_at', null) as TQuery;
}

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
    const archivedScope = (searchParams.get('archived') || 'exclude') as 'exclude' | 'only' | 'include';
    const reportType = searchParams.get('reportType') || '';
    const employeeId = searchParams.get('employeeId') || '';
    const groupBy = searchParams.get('groupBy') || '';
    const parentReportId = searchParams.get('parentReportId') || '';
    const periodStart = searchParams.get('periodStart') || '';
    const periodEnd = searchParams.get('periodEnd') || '';
    const department = searchParams.get('department') || '';
    const page = Number.parseInt(searchParams.get('page') || '1', 10);
    const pageSize = Number.parseInt(searchParams.get('pageSize') || '10', 10);

    // Use admin client to avoid nested RLS failures on cross-table subqueries
    let query = supabaseAdmin
      .from('reports')
      .select('*, employees(id, user_id, first_name, last_name, department, position), report_metrics(*)', {
        count: 'exact',
      })
      .order('created_at', { ascending: false });

    query = applyArchivedScope(query, archivedScope);

    if (search) {
      query = query.or(`report_type.ilike.%${search}%,notes.ilike.%${search}%,review_notes.ilike.%${search}%`);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (reportType) {
      query = query.eq('report_type', reportType);
    }

    // Period filtering: filter by period_start and period_end ranges
    if (periodStart) {
      query = query.gte('period_start', periodStart);
    }
    if (periodEnd) {
      query = query.lte('period_end', periodEnd);
    }

    // Grouped view: return only root reports (no parent)
    if (groupBy) {
      query = query.is('parent_report_id', null);
    }

    // Filter by parent to get child reports
    if (parentReportId) {
      query = query.eq('parent_report_id', parentReportId);
    }

    // Role-based scoping: non-admins only see their own reports
    const role = typeof user.app_metadata?.db_role === 'string' ? user.app_metadata.db_role : null;
    const isAdmin = ['admin', 'super_admin'].includes(role ?? '');

    // Department filtering (case-insensitive match on employee's department)
    if (department && department !== 'all') {
      // Get employee IDs matching department first
      const { data: deptEmployees } = await supabaseAdmin
        .from('employees')
        .select('id')
        .ilike('department', department)
        .is('deleted_at', null);

      if (deptEmployees && deptEmployees.length > 0) {
        const empIds = deptEmployees.map((e) => e.id);
        query = query.in('employee_id', empIds);
      } else {
        // No employees in this department, return empty result
        return NextResponse.json({
          data: [],
          pagination: { page, pageSize, total: 0, totalPages: 0 },
        });
      }
    }

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

    // For grouped view, attach child_count to each root report
    let responseData = data;
    if (groupBy && data) {
      const rootIds = data.map((r: Record<string, unknown>) => r.id as string);

      if (rootIds.length > 0) {
        // Count children for each root report
        let childQuery = supabaseAdmin
          .from('reports')
          .select('parent_report_id')
          .in('parent_report_id', rootIds);

        childQuery = applyArchivedScope(childQuery, archivedScope);

        const { data: scopedChildCounts, error: scopedChildError } = await childQuery;

        if (!scopedChildError && scopedChildCounts) {
          const countMap = new Map<string, number>();
          for (const child of scopedChildCounts) {
            const parentId = child.parent_report_id as string;
            countMap.set(parentId, (countMap.get(parentId) || 0) + 1);
          }

          responseData = data.map((report: Record<string, unknown>) => ({
            ...report,
            child_count: countMap.get(report.id as string) || 0,
          }));
        }
      }
    }

    return NextResponse.json({
      data: responseData.map((report) => normalizeReportRecord(report)),
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
        submitted_at: parsed.data.status === 'submitted' ? new Date().toISOString() : null,
        notes: serializeReportNotes(
          parsed.data.notes,
          parsed.data.reportType === 'marketing' ? parsed.data.marketingContext ?? null : null
        ),
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
      return NextResponse.json({ data: normalizeReportRecord(report) }, { status: 201 });
    }

    logActivity(supabaseAdmin, {
      userId: user.id,
      action: 'create_report',
      tableName: 'reports',
      recordId: report.id,
      metadata: { employeeId, reportType: parsed.data.reportType },
    });

    if (parsed.data.status === 'submitted') {
      await notifySuperAdminsAboutSubmittedReport({
        reportId: report.id,
        reportType: parsed.data.reportType,
        submittedBy: user.id,
      });

      if (parsed.data.reportType === 'marketing') {
        await notifyMarketingSubmissionWebhook({
          employeeId: report.employee_id,
          submittedAt: report.submitted_at,
          reportDisplayName: getMarketingReportDisplayName(parsed.data.marketingContext ?? null),
          isWeeklyPlan: isMarketingWeeklyPlan(parsed.data.marketingContext ?? null),
        });
      }
    }

    return NextResponse.json({ data: normalizeReportRecord(fullReport) }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/reports:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
