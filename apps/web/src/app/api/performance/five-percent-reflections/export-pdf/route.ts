import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import type { FivePercentReflectionRecord } from '@/components/performance/fivePercentReflectionDetailConfig';
import {
  getFivePercentReflectionPdfFileName,
  renderFivePercentReflectionPdf,
} from '@/lib/performance/five-percent-reflection-pdf';
import { getAuthedPerformanceContext } from '../../_lib';
import { notifyFivePercentReflectionWebhook } from '../../_notifications';

export const runtime = 'nodejs';

const monthKeySchema = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/);

function getCurrentMonthKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

type SubmissionLookup =
  | { submission: FivePercentReflectionRecord & { user_id: string; employee_id: string | null }; response?: never }
  | { submission?: never; response: NextResponse };

async function loadOwnSubmission(request: NextRequest, method: 'GET' | 'POST'): Promise<SubmissionLookup> {
  const { supabaseAdmin, user, error } = await getAuthedPerformanceContext();
  if (error || !user) {
    return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }

  const { searchParams } = new URL(request.url);
  const parsedMonthKey = monthKeySchema.safeParse(searchParams.get('monthKey') ?? getCurrentMonthKey());
  if (!parsedMonthKey.success) {
    return { response: NextResponse.json({ error: 'Invalid monthKey' }, { status: 400 }) };
  }

  const { data: submission, error: fetchError } = await supabaseAdmin
    .from('five_percent_reflections')
    .select('*')
    .eq('user_id', user.id)
    .eq('month_key', parsedMonthKey.data)
    .is('deleted_at', null)
    .maybeSingle();

  if (fetchError) {
    console.error(`${method} /api/performance/five-percent-reflections/export-pdf fetch error:`, fetchError);
    return { response: NextResponse.json({ error: 'Failed to fetch submission' }, { status: 500 }) };
  }

  if (!submission) {
    return { response: NextResponse.json({ error: 'No submission found for this month' }, { status: 404 }) };
  }

  return { submission };
}

/**
 * GET /api/performance/five-percent-reflections/export-pdf
 *
 * Renders the caller's saved submission for the month as a PDF and returns it
 * as a file download.
 */
export async function GET(request: NextRequest) {
  try {
    const { submission, response } = await loadOwnSubmission(request, 'GET');
    if (response) return response;

    const pdfBuffer = await renderFivePercentReflectionPdf(submission);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${getFivePercentReflectionPdfFileName(submission.month_key)}"`,
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (error) {
    console.error('GET /api/performance/five-percent-reflections/export-pdf error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/performance/five-percent-reflections/export-pdf
 *
 * Re-fires the n8n delivery webhook for the current month's saved submission,
 * forcing Telegram-only delivery (gmail: false, telegram: true).
 * Does NOT modify the submission or create a new one.
 */
export async function POST(request: NextRequest) {
  try {
    const { submission, response } = await loadOwnSubmission(request, 'POST');
    if (response) return response;

    await notifyFivePercentReflectionWebhook({
      submission: {
        id: submission.id,
        user_id: submission.user_id,
        employee_id: submission.employee_id,
        month_key: submission.month_key,
        full_name: submission.full_name,
        department_role: submission.department_role,
        work_feelings: submission.work_feelings,
        work_headline: submission.work_headline,
        work_significance: submission.work_significance,
        work_rank: submission.work_rank,
        work_action: submission.work_action,
        family_feelings: submission.family_feelings,
        family_headline: submission.family_headline,
        family_significance: submission.family_significance,
        family_rank: submission.family_rank,
        family_action: submission.family_action,
        personal_feelings: submission.personal_feelings,
        personal_headline: submission.personal_headline,
        personal_significance: submission.personal_significance,
        personal_rank: submission.personal_rank,
        personal_action: submission.personal_action,
        deep_dive_parking_lot: submission.deep_dive_parking_lot,
        exploration_topics: submission.exploration_topics,
        submitted_at: submission.submitted_at,
      },
      event: 'five_percent_reflection.exported',
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('POST /api/performance/five-percent-reflections/export-pdf error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
