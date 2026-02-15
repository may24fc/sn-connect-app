import { reportMetricSchema, reportSchema } from '@/lib/schemas/report.schema';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';

/**
 * GET /api/reports/[id]
 * Get single report details
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data, error } = await supabase
      .from('reports')
      .select(
        '*, employees!inner(id, user_id, first_name, last_name, department), report_metrics(*)'
      )
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    return NextResponse.json({ data });
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

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();

    const hasReportFields =
      body.reportType !== undefined ||
      body.periodStart !== undefined ||
      body.periodEnd !== undefined ||
      body.status !== undefined ||
      body.notes !== undefined;

    if (hasReportFields) {
      const parsedReport = reportSchema.partial().safeParse({
        reportType: body.reportType,
        periodStart: body.periodStart,
        periodEnd: body.periodEnd,
        status: body.status,
        notes: body.notes,
      });

      if (!parsedReport.success) {
        return NextResponse.json(
          { error: 'Invalid report payload', details: parsedReport.error.flatten() },
          { status: 400 }
        );
      }

      const updates: Record<string, string | null> = {};

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
      if (parsedReport.data.notes !== undefined) {
        updates.notes = parsedReport.data.notes || null;
      }

      const { error: updateError } = await supabase
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

      const { error: deleteMetricsError } = await supabase
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

        const { error: insertMetricsError } = await supabase
          .from('report_metrics')
          .insert(metricRows);

        if (insertMetricsError) {
          console.error('Error inserting report metrics:', insertMetricsError);
          return NextResponse.json({ error: 'Failed to update report metrics' }, { status: 500 });
        }
      }
    }

    const { data, error } = await supabase
      .from('reports')
      .select('*, report_metrics(*)')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    return NextResponse.json({ data });
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

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { error } = await supabase
      .from('reports')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .is('deleted_at', null);

    if (error) {
      console.error('Error deleting report:', error);
      return NextResponse.json({ error: 'Failed to delete report' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/reports/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
