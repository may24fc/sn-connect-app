import {
  generateFivePercentSummary,
  loadFivePercentDeliveryState,
  parseSummaryRecipients,
  sendFivePercentSummaryEmail,
} from '@/lib/performance/five-percent-summary-delivery';
import {
  fivePercentSummaryEmailQuerySchema,
  sendFivePercentSummaryEmailSchema,
} from '@/lib/schemas/performance.schema';
import { type NextRequest, NextResponse } from 'next/server';
import { getAuthedPerformanceContext, isPerformanceAdmin } from '../../_lib';

const NO_RECIPIENTS_ERROR =
  'Summary email recipients are not configured. Set FIVE_PERCENT_SUMMARY_RECIPIENTS on the server.';

/** Delivery status of the month's 5% Reflection summary email. */
export async function GET(request: NextRequest) {
  try {
    const { supabaseAdmin, user, role, error } = await getAuthedPerformanceContext();
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isPerformanceAdmin(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const parsed = fivePercentSummaryEmailQuerySchema.safeParse({
      monthKey: request.nextUrl.searchParams.get('monthKey'),
    });

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid summary email query', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const state = await loadFivePercentDeliveryState(supabaseAdmin, parsed.data.monthKey);
    const recipients = parseSummaryRecipients(process.env.FIVE_PERCENT_SUMMARY_RECIPIENTS);

    return NextResponse.json({
      data: {
        monthKey: parsed.data.monthKey,
        recipientsConfigured: recipients.length > 0,
        recipientCount: recipients.length,
        completion: state.completion,
        lastEmail: state.lastEmail,
      },
    });
  } catch (error) {
    console.error('GET /api/performance/five-percent-reflections/summary-email error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/** Manually emails the month's 5% Reflection summary to the configured recipients. */
export async function POST(request: NextRequest) {
  try {
    const { supabaseAdmin, user, role, error } = await getAuthedPerformanceContext();
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isPerformanceAdmin(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const parsed = sendFivePercentSummaryEmailSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const recipients = parseSummaryRecipients(process.env.FIVE_PERCENT_SUMMARY_RECIPIENTS);
    if (recipients.length === 0) {
      return NextResponse.json({ error: NO_RECIPIENTS_ERROR }, { status: 503 });
    }

    const { monthKey, resend } = parsed.data;
    const state = await loadFivePercentDeliveryState(supabaseAdmin, monthKey);

    if (state.lastEmail && !resend) {
      return NextResponse.json(
        {
          error: 'This month’s summary was already emailed. Confirm to send it again.',
          lastEmail: state.lastEmail,
        },
        { status: 409 }
      );
    }

    if (state.completion.submittedCount === 0) {
      return NextResponse.json(
        { error: 'No 5% reflections have been submitted for this month yet.' },
        { status: 400 }
      );
    }

    const summary = await generateFivePercentSummary(supabaseAdmin, monthKey, user.id);

    await sendFivePercentSummaryEmail(supabaseAdmin, {
      monthKey,
      trigger: 'manual',
      recipients,
      completion: state.completion,
      dueDateLabel: '',
      summaryMarkdown: summary.summaryMarkdown,
      generatedAt: summary.generatedAt,
      sentBy: user.id,
    });

    const updated = await loadFivePercentDeliveryState(supabaseAdmin, monthKey);

    return NextResponse.json({
      data: {
        recipientCount: recipients.length,
        lastEmail: updated.lastEmail,
      },
    });
  } catch (error) {
    console.error('POST /api/performance/five-percent-reflections/summary-email error:', error);
    return NextResponse.json({ error: 'Failed to send the summary email' }, { status: 500 });
  }
}
