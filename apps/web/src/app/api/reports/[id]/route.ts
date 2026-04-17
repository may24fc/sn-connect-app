import { logActivity } from '@/lib/audit';
import { notifySuperAdminsAboutSubmittedReport } from '@/app/api/reports/_notifications';
import { extractMarketingContext, normalizeReportRecord, serializeReportNotes } from '@/lib/report-utils';
import { reportMetricSchema, reportSchema } from '@/lib/schemas/report.schema';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';

function buildDuplicateReportErrorMessage(
  reportType: string,
  periodStart: string,
  periodEnd: string,
  existingStatus: string
): string {
  const title = `${reportType.charAt(0).toUpperCase()}${reportType.slice(1)} report`;
  const statusLabel = existingStatus === 'draft' ? 'draft' : `${existingStatus} submission`;
  return `${title} for ${periodStart} to ${periodEnd} already exists as a ${statusLabel}. Update the existing report instead of keeping two entries for the same period.`;
}

/**
 * GET /api/reports/[id]
 * Get single report details.
 *
 * Uses the admin client for the data query to bypass RLS cross-table join
 * issues (same pattern as GET /api/reports list route). Authorization is
 * enforced at the application layer: non-admin users may only access their
 * own reports.
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    const supabaseAdmin = createSupabaseAdminClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = typeof user.app_metadata?.db_role === 'string' ? user.app_metadata.db_role : null;
    const isAdmin = ['admin', 'super_admin', 'hr', 'cos', 'ceo'].includes(role ?? '');

    const { data, error } = await supabaseAdmin
      .from('reports')
      .select(
        '*, employees(id, user_id, first_name, last_name, department), report_metrics(*)'
      )
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    // Non-admin users may only access their own reports
    if (!isAdmin) {
      const employeeData = data.employees as { user_id: string } | null;
      if (!employeeData || employeeData.user_id !== user.id) {
        return NextResponse.json({ error: 'Report not found' }, { status: 404 });
      }
    }

    return NextResponse.json({ data: normalizeReportRecord(data) });
  } catch (error) {
    console.error('Unexpected error in GET /api/reports/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/reports/[id]
 * Update report details (supports full metric replacement)
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    const supabaseAdmin = createSupabaseAdminClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = typeof user.app_metadata?.db_role === 'string' ? user.app_metadata.db_role : null;
    const isPrivileged = ['admin', 'super_admin', 'hr', 'cos', 'ceo'].includes(role ?? '');

    const { data: existingReport, error: existingReportError } = await supabaseAdmin
      .from('reports')
      .select('id, employee_id, report_type, period_start, period_end, notes, status, employees(user_id)')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();

    if (existingReportError) {
      console.error('Error loading report before update:', existingReportError);
      return NextResponse.json({ error: 'Failed to load report' }, { status: 500 });
    }

    if (!existingReport) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    const reportOwner = Array.isArray(existingReport.employees)
      ? existingReport.employees[0]
      : existingReport.employees;

    if (!isPrivileged) {
      if (!reportOwner || reportOwner.user_id !== user.id) {
        return NextResponse.json({ error: 'Report not found' }, { status: 404 });
      }

      if (existingReport.status !== 'draft') {
        return NextResponse.json(
          { error: 'Only draft reports can be edited.' },
          { status: 409 }
        );
      }
    }

    const body = await request.json();
    const hasMarketingContext = body.marketingContext !== undefined;

    const hasReportFields =
      body.reportType !== undefined ||
      body.periodStart !== undefined ||
      body.periodEnd !== undefined ||
      body.status !== undefined ||
      body.notes !== undefined ||
      hasMarketingContext;

    if (hasReportFields) {
      const parsedReport = reportSchema.partial().safeParse({
        reportType: body.reportType,
        periodStart: body.periodStart,
        periodEnd: body.periodEnd,
        status: body.status,
        notes: body.notes,
        marketingContext: body.marketingContext,
      });

      if (!parsedReport.success) {
        return NextResponse.json(
          { error: 'Invalid report payload', details: parsedReport.error.flatten() },
          { status: 400 }
        );
      }

      const updates: Record<string, string | null> = {};
      const existingNoteData = extractMarketingContext(existingReport.notes);
      const nextReportType = parsedReport.data.reportType ?? existingReport.report_type;
      const nextMarketingContext = nextReportType === 'marketing'
        ? parsedReport.data.marketingContext !== undefined
          ? parsedReport.data.marketingContext ?? null
          : existingNoteData.marketingContext
        : null;

      if (parsedReport.data.reportType !== undefined) {
        updates.report_type = parsedReport.data.reportType;
      }
      if (parsedReport.data.periodStart !== undefined) {
        updates.period_start = parsedReport.data.periodStart;
      }
      if (parsedReport.data.periodEnd !== undefined) {
        updates.period_end = parsedReport.data.periodEnd;
      }
      if (parsedReport.data.status !== undefined) {
        updates.status = parsedReport.data.status;
      }
      if (
        parsedReport.data.notes !== undefined ||
        parsedReport.data.marketingContext !== undefined ||
        parsedReport.data.reportType !== undefined
      ) {
        const nextNotes = parsedReport.data.notes !== undefined
          ? parsedReport.data.notes
          : existingNoteData.cleanNotes;

        updates.notes = serializeReportNotes(nextNotes, nextMarketingContext);
      }

      if (
        parsedReport.data.reportType !== undefined ||
        parsedReport.data.periodStart !== undefined ||
        parsedReport.data.periodEnd !== undefined
      ) {
        const nextPeriodStart = parsedReport.data.periodStart ?? existingReport.period_start;
        const nextPeriodEnd = parsedReport.data.periodEnd ?? existingReport.period_end;

        const { data: duplicateReport, error: duplicateReportError } = await supabaseAdmin
          .from('reports')
          .select('id, status')
          .eq('employee_id', existingReport.employee_id)
          .eq('report_type', nextReportType)
          .eq('period_start', nextPeriodStart)
          .eq('period_end', nextPeriodEnd)
          .neq('id', id)
          .is('deleted_at', null)
          .limit(1)
          .maybeSingle();

        if (duplicateReportError) {
          console.error('Error checking for duplicate report period during update:', duplicateReportError);
          return NextResponse.json({ error: 'Failed to validate report period' }, { status: 500 });
        }

        if (duplicateReport) {
          return NextResponse.json(
            {
              error: buildDuplicateReportErrorMessage(
                nextReportType,
                nextPeriodStart,
                nextPeriodEnd,
                duplicateReport.status
              ),
              existingReportId: duplicateReport.id,
            },
            { status: 409 }
          );
        }
      }

      const { error: updateError } = await supabaseAdmin
        .from('reports')
        .update(updates)
        .eq('id', id)
        .is('deleted_at', null);

      if (updateError) {
        console.error('Error updating report:', updateError);
        return NextResponse.json({ error: 'Failed to update report' }, { status: 500 });
      }
    }

    if (Array.isArray(body.metrics)) {
      const metricValidation = (body.metrics as Array<unknown>).map((metric: unknown) =>
        reportMetricSchema.safeParse(metric)
      );

      const invalidMetric = metricValidation.find((result) => !result.success);
      if (invalidMetric && !invalidMetric.success) {
        return NextResponse.json(
          { error: 'Invalid metric payload', details: invalidMetric.error.flatten() },
          { status: 400 }
        );
      }

      const { error: deleteMetricsError } = await supabaseAdmin
        .from('report_metrics')
        .delete()
        .eq('report_id', id);

      if (deleteMetricsError) {
        console.error('Error clearing report metrics:', deleteMetricsError);
        return NextResponse.json({ error: 'Failed to update report metrics' }, { status: 500 });
      }

      if (body.metrics.length > 0) {
        const metricRows = metricValidation.map((result) => {
          const metric = result.success ? result.data : null;
          return {
            report_id: id,
            metric_name: metric?.metricName || '',
            metric_value: metric?.metricValue || 0,
            metric_unit: metric?.metricUnit || null,
            notes: metric?.notes || null,
          };
        });

        const { error: insertMetricsError } = await supabaseAdmin
          .from('report_metrics')
          .insert(metricRows);

        if (insertMetricsError) {
          console.error('Error inserting report metrics:', insertMetricsError);
          return NextResponse.json({ error: 'Failed to update report metrics' }, { status: 500 });
        }
      }
    }

    const { data, error } = await supabaseAdmin
      .from('reports')
      .select('*, employees(id, user_id, first_name, last_name, department), report_metrics(*)')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    logActivity(supabase, {
      userId: user.id,
      action: 'update_report',
      tableName: 'reports',
      recordId: id,
    });

    if (existingReport.status !== 'submitted' && data.status === 'submitted') {
      await notifySuperAdminsAboutSubmittedReport({
        reportId: id,
        reportType: data.report_type,
        submittedBy: user.id,
      });
    }

    return NextResponse.json({ data: normalizeReportRecord(data) });
  } catch (error) {
    console.error('Unexpected error in PATCH /api/reports/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/reports/[id]
 * Soft delete report
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();
    const supabaseAdmin = createSupabaseAdminClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const role = typeof user.app_metadata?.db_role === 'string' ? user.app_metadata.db_role : null;
    const isPrivileged = ['admin', 'super_admin', 'hr', 'cos', 'ceo'].includes(role ?? '');

    const { data: existingReport, error: existingReportError } = await supabaseAdmin
      .from('reports')
      .select('id, status, employees(user_id)')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();

    if (existingReportError) {
      console.error('Error loading report before delete:', existingReportError);
      return NextResponse.json({ error: 'Failed to load report' }, { status: 500 });
    }

    if (!existingReport) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    const reportOwner = Array.isArray(existingReport.employees)
      ? existingReport.employees[0]
      : existingReport.employees;

    if (!isPrivileged) {
      if (!reportOwner || reportOwner.user_id !== user.id) {
        return NextResponse.json({ error: 'Report not found' }, { status: 404 });
      }
    }

    const { error } = await supabaseAdmin
      .from('reports')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .is('deleted_at', null);

    if (error) {
      console.error('Error deleting report:', error);
      return NextResponse.json({ error: 'Failed to delete report' }, { status: 500 });
    }

    logActivity(supabase, {
      userId: user.id,
      action: 'delete_report',
      tableName: 'reports',
      recordId: id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/reports/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
