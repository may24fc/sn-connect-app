import { normalizeAttachmentRecords } from '@/lib/associate-daily-log';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';
import { canAccessInternship, getAuthedInternshipContext } from '../../../../_lib';
import { signDailyLogAttachments } from '../../_lib';

/**
 * Returns one daily log's attachments with fresh signed URLs.
 *
 * The admin EOD views read logs straight from Supabase (realtime), which only
 * yields raw storage paths; the bucket is private, so they fetch signed URLs
 * here when a report is opened.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string; logId: string }> }
) {
  try {
    const { id, logId } = await params;
    const { supabase, user, role, error } = await getAuthedInternshipContext();
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const access = await canAccessInternship(supabase, id, user.id, role);
    if (!access.allowed || !access.internship) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const internshipId = String(access.internship.id);
    const { data: log, error: queryError } = await supabase
      .from('intern_daily_logs')
      .select('attachments')
      .eq('id', logId)
      .eq('internship_id', internshipId)
      .maybeSingle();

    if (queryError) {
      console.error('Error fetching daily log attachments:', queryError);
      return NextResponse.json({ error: 'Failed to fetch attachments' }, { status: 500 });
    }

    if (!log) {
      return NextResponse.json({ error: 'Log not found' }, { status: 404 });
    }

    const attachments = await signDailyLogAttachments(
      createSupabaseAdminClient(),
      normalizeAttachmentRecords(log.attachments)
    );

    return NextResponse.json({ data: attachments });
  } catch (error) {
    console.error('Unexpected error in GET /api/internships/[id]/logs/[logId]/attachments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
