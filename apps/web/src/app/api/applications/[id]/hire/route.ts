import { logActivity } from '@/lib/audit';
import { sendApplicationStatusUpdate } from '@/lib/email';
import { type NextRequest, NextResponse } from 'next/server';
import { getAuthedSupabase, hasAtsAccess } from '../../../jobs/_lib';

interface Params {
  params: Promise<{ id: string }>;
}

export async function POST(_request: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const { supabase, user, role, hasAtsGrant, error } = await getAuthedSupabase();

    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!hasAtsAccess(role, hasAtsGrant)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data, error: hireError } = await supabase.rpc('hire_job_application_transaction', {
      application_uuid: id,
    });

    if (hireError || !data) {
      const message = hireError?.message ?? 'Failed to hire application';
      const normalizedMessage = message.toLowerCase();
      const statusCode =
        normalizedMessage.includes('not found')
          ? 404
          : normalizedMessage.includes('already hired') ||
              normalizedMessage.includes('must be approved') ||
              normalizedMessage.includes('remaining headcount') ||
              normalizedMessage.includes('not linked to a job posting')
            ? 400
            : 500;

      return NextResponse.json({ error: message }, { status: statusCode });
    }

    logActivity(supabase, {
      userId: user.id,
      action: 'hire_job_application',
      tableName: 'job_applications',
      recordId: id,
      metadata: data as Record<string, unknown>,
    });

    const { data: applicationDetails, error: applicationDetailsError } = await supabase
      .from('job_applications')
      .select('email, full_name, job_postings(title)')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (applicationDetailsError) {
      console.error('[Email] Failed to load hired application details:', applicationDetailsError);
    } else if (applicationDetails?.email && applicationDetails?.full_name) {
      const jobTitle =
        typeof applicationDetails.job_postings === 'object' &&
        applicationDetails.job_postings !== null &&
        'title' in applicationDetails.job_postings
          ? (applicationDetails.job_postings.title as string) ?? 'the position you applied for'
          : 'the position you applied for';

      sendApplicationStatusUpdate({
        to: applicationDetails.email as string,
        applicantName: applicationDetails.full_name as string,
        positionTitle: jobTitle,
        status: 'hired',
      }).catch((err) => {
        console.error('[Email] Unhandled error sending hired status update:', err);
      });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error in POST /api/applications/[id]/hire:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}