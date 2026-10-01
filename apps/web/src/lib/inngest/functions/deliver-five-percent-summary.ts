import { getMonthlyEvaluationWindow } from '@/lib/performance/evaluation-cadence';
import {
  decideFivePercentDelivery,
  generateFivePercentSummary,
  loadFivePercentDeliveryState,
  parseSummaryRecipients,
  sendFivePercentSummaryEmail,
} from '@/lib/performance/five-percent-summary-delivery';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { inngest } from '../client';

/**
 * Emails the monthly 5% Reflection AI summary to FIVE_PERCENT_SUMMARY_RECIPIENTS.
 *
 * - On every new submission: sends once every expected member has submitted.
 * - Daily at 18:00 Manila: on/after the month's last working day, sends with whatever
 *   was submitted and lists who is still pending.
 *
 * `performance_evaluation_summaries.emailed_at` guarantees one email per month.
 */
export const deliverFivePercentSummary = inngest.createFunction(
  {
    id: 'performance-five-percent-summary-email',
    retries: 3,
    concurrency: { limit: 1 },
  },
  [{ event: 'performance/five-percent.submitted' }, { cron: 'TZ=Asia/Manila 0 18 * * *' }],
  async ({ event, step }) => {
    const plan = await step.run('check-completion', async () => {
      const window = getMonthlyEvaluationWindow(new Date());
      const isSubmissionEvent = event.name === 'performance/five-percent.submitted';
      const monthKey = isSubmissionEvent ? event.data.monthKey : window.key;
      const recipients = parseSummaryRecipients(process.env.FIVE_PERCENT_SUMMARY_RECIPIENTS);

      const { completion, alreadyEmailed } = await loadFivePercentDeliveryState(
        createSupabaseAdminClient(),
        monthKey
      );

      const decision = decideFivePercentDelivery({
        requestedTrigger: isSubmissionEvent ? 'all_submitted' : 'deadline',
        monthKey,
        completion,
        window,
        alreadyEmailed,
      });

      return { monthKey, recipients, completion, decision, dueDateLabel: window.dueDateLabel };
    });

    if (!plan.decision.send) {
      return { status: 'skipped', reason: plan.decision.reason, monthKey: plan.monthKey };
    }

    if (plan.recipients.length === 0) {
      console.warn(
        '[five-percent-summary] Skipped email: FIVE_PERCENT_SUMMARY_RECIPIENTS is not configured.'
      );
      return { status: 'skipped', reason: 'no_recipients', monthKey: plan.monthKey };
    }

    const trigger = plan.decision.trigger;

    const summary = await step.run('generate-summary', () =>
      generateFivePercentSummary(createSupabaseAdminClient(), plan.monthKey)
    );

    const sent = await step.run('send-email', () =>
      sendFivePercentSummaryEmail(createSupabaseAdminClient(), {
        monthKey: plan.monthKey,
        trigger,
        recipients: plan.recipients,
        completion: plan.completion,
        dueDateLabel: plan.dueDateLabel,
        summaryMarkdown: summary.summaryMarkdown,
        generatedAt: summary.generatedAt,
        sentBy: null,
      })
    );

    return {
      status: sent ? 'sent' : 'skipped',
      reason: sent ? trigger : 'already_emailed',
      monthKey: plan.monthKey,
      recipientCount: plan.recipients.length,
    };
  }
);
