import { logActivity } from '@/lib/audit';
import { notifySuperAdminsAboutSubmittedReport } from '@/app/api/reports/_notifications';
import {
  extractMarketingContext,
  hydrateMarketingContextWithDerivedSpend,
  serializeReportNotes,
} from '@/lib/report-utils';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';

/**
 * POST /api/reports/[id]/submit
 * Submit report for review
 */
export async function POST(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const { data: existingReport, error: existingReportError } = await supabase
      .from('reports')
      .select('id, report_type, notes, report_metrics(metric_name, metric_value, metric_unit)')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (existingReportError || !existingReport) {
      console.error('Error loading report before submit:', existingReportError);
      return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 });
    }

    let nextNotes = existingReport.notes;

    if (existingReport.report_type === 'marketing') {
      const { marketingContext, cleanNotes } = extractMarketingContext(existingReport.notes);
      const hydratedMarketingContext = hydrateMarketingContextWithDerivedSpend(
        marketingContext,
        existingReport.report_metrics ?? []
      );

      if (hydratedMarketingContext && hydratedMarketingContext.totalSpend > 0) {
        nextNotes = serializeReportNotes(cleanNotes, hydratedMarketingContext);
      }
    }

    const { data, error } = await supabase
      .from('reports')
      .update({
        status: 'submitted',
        submitted_at: new Date().toISOString(),
        notes: nextNotes,
      })
      .eq('id', id)
      .is('deleted_at', null)
      .select('*')
      .single();

    if (error || !data) {
      console.error('Error submitting report:', error);
      return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 });
    }

    await notifySuperAdminsAboutSubmittedReport({
      reportId: id,
      reportType: data.report_type,
      submittedBy: user.id,
    });

    await logActivity(supabase, {
      userId: user.id,
      action: 'submit_report',
      tableName: 'reports',
      recordId: id,
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error in POST /api/reports/[id]/submit:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
