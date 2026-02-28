import {
  createNotificationsForUsers,
  getAdminUserIds,
  getUserDisplayName,
} from '@/lib/notifications/create-notification';
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

    const { data, error } = await supabase
      .from('reports')
      .update({
        status: 'submitted',
        submitted_at: new Date().toISOString(),
      })
      .eq('id', id)
      .is('deleted_at', null)
      .select('*')
      .single();

    if (error || !data) {
      console.error('Error submitting report:', error);
      return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 });
    }

    // Notify all admins about the submitted report
    const submitterName = await getUserDisplayName(user.id);
    const adminIds = await getAdminUserIds();
    const adminRecipients = adminIds.filter((adminId) => adminId !== user.id);

    createNotificationsForUsers(adminRecipients, {
      type: 'report_submitted',
      title: 'Report Submitted for Review',
      message: `${submitterName} submitted a ${data.report_type?.replace(/_/g, ' ') ?? 'report'} for review`,
      link: `/admin/reports`,
      metadata: { reportId: id, submittedBy: user.id },
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error in POST /api/reports/[id]/submit:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
