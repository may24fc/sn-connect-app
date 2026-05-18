import { logActivity } from '@/lib/audit';
import {
  createNotification,
  getUserDisplayName,
} from '@/lib/notifications/create-notification';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

const approveBodySchema = z.object({
  action: z.enum(['approved', 'rejected']).default('approved'),
  notes: z.string().optional().nullable(),
});

/**
 * POST /api/reports/[id]/approve
 * Approve or reject report
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const { data: roleData, error: roleError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (roleError || !roleData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const approverRoles = ['admin', 'super_admin', 'hr', 'cos', 'ceo'];

    if (!approverRoles.includes(roleData.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = approveBodySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const supabaseAdmin = createSupabaseAdminClient();

    const { data: existingReport, error: existingReportError } = await supabaseAdmin
      .from('reports')
      .select('id, created_by, report_type, status, notes')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();

    if (existingReportError) {
      console.error('Error loading report for approval:', existingReportError);
      return NextResponse.json({ error: 'Failed to load report' }, { status: 500 });
    }

    if (!existingReport) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 });
    }

    if (existingReport.status !== 'submitted') {
      return NextResponse.json(
        { error: `Only submitted reports can be reviewed. Current status: ${existingReport.status}` },
        { status: 409 }
      );
    }

    const normalizedReviewNotes = parsed.data.notes?.trim() ? parsed.data.notes.trim() : null;

    const { data, error } = await supabaseAdmin
      .from('reports')
      .update({
        status: parsed.data.action,
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString(),
        review_notes: normalizedReviewNotes,
      })
      .eq('id', id)
      .eq('status', 'submitted')
      .is('deleted_at', null)
      .select('*')
      .maybeSingle();

    if (error) {
      console.error('Error approving report:', error);
      return NextResponse.json({ error: 'Failed to update report status' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json(
        { error: 'This report is no longer pending review. Refresh and try again.' },
        { status: 409 }
      );
    }

    // Notify the report owner about the approval/rejection
    if (data.created_by && data.created_by !== user.id) {
      const reviewerName = await getUserDisplayName(user.id);
      const isApproved = parsed.data.action === 'approved';

      await createNotification({
        userId: data.created_by,
        type: isApproved ? 'report_approved' : 'report_rejected',
        title: isApproved ? 'Report Approved' : 'Report Rejected',
        message: `${reviewerName} ${isApproved ? 'approved' : 'rejected'} your ${data.report_type?.replace(/_/g, ' ') ?? 'report'}${normalizedReviewNotes ? `: ${normalizedReviewNotes}` : ''}`,
        link: `/reports`,
        metadata: { reportId: id, reviewedBy: user.id, action: parsed.data.action },
      });
    }

    await logActivity(supabase, {
      userId: user.id,
      action: parsed.data.action === 'approved' ? 'approve_report' : 'reject_report',
      tableName: 'reports',
      recordId: id,
      metadata: {
        reportType: data.report_type,
        action: parsed.data.action,
        ...(normalizedReviewNotes ? { reviewNotes: normalizedReviewNotes } : {}),
      },
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error in POST /api/reports/[id]/approve:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
