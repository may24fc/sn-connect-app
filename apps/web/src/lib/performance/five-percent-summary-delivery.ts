import { listPerformanceAudience } from '@/app/api/performance/_lib';
import { sendHrReportEmail } from '@/lib/email';
import type { EvaluationWindowStatus } from '@/lib/performance/evaluation-cadence';
import { generatePerformanceEvaluationSummary } from '@/lib/performance/evaluation-summary';
import {
  type FivePercentSummaryEmailTrigger,
  buildFivePercentSummaryEmail,
} from '@/lib/performance/five-percent-summary-email';
import type { createSupabaseAdminClient } from '@/lib/supabase/server';

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>;

const SUMMARY_TABLE = 'performance_evaluation_summaries';
const EVALUATION_KIND = 'five_percent';
const DEFAULT_APP_URL = 'https://app.sngroup.com.au';
const REVIEW_PATH = '/admin/performance/monthly-self-evaluations?tab=five-percent';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export type FivePercentDeliverySkipReason =
  | 'already_emailed'
  | 'no_audience'
  | 'awaiting_submissions'
  | 'before_deadline'
  | 'no_submissions';

export interface FivePercentCompletion {
  expectedCount: number;
  submittedCount: number;
  pendingNames: Array<string>;
}

export type FivePercentDeliveryDecision =
  | { send: true; trigger: FivePercentSummaryEmailTrigger }
  | { send: false; reason: FivePercentDeliverySkipReason };

/** Parses a comma/semicolon/whitespace separated recipient list, dropping invalid and duplicate addresses. */
export function parseSummaryRecipients(raw: string | undefined | null): Array<string> {
  if (!raw) {
    return [];
  }

  const seen = new Set<string>();
  const recipients: Array<string> = [];

  for (const candidate of raw.split(/[\s,;]+/)) {
    const email = candidate.trim();
    if (!(email && EMAIL_PATTERN.test(email)) || seen.has(email.toLowerCase())) {
      continue;
    }
    seen.add(email.toLowerCase());
    recipients.push(email);
  }

  return recipients;
}

export function evaluateFivePercentCompletion(
  audience: Array<{ userId: string; fullName: string }>,
  submittedUserIds: ReadonlySet<string>
): FivePercentCompletion {
  const pending = audience.filter((member) => !submittedUserIds.has(member.userId));

  return {
    expectedCount: audience.length,
    submittedCount: audience.length - pending.length,
    pendingNames: pending.map((member) => member.fullName),
  };
}

/**
 * Decides whether the month's summary email should go out now.
 * - `all_submitted` requests send only once every expected member has submitted.
 * - `deadline` requests send on/after the month's due date with whatever was submitted.
 */
export function decideFivePercentDelivery(params: {
  requestedTrigger: FivePercentSummaryEmailTrigger;
  monthKey: string;
  completion: FivePercentCompletion;
  window: Pick<EvaluationWindowStatus, 'key' | 'stage'>;
  alreadyEmailed: boolean;
}): FivePercentDeliveryDecision {
  const { requestedTrigger, monthKey, completion, window, alreadyEmailed } = params;

  if (alreadyEmailed) {
    return { send: false, reason: 'already_emailed' };
  }

  if (completion.expectedCount === 0) {
    return { send: false, reason: 'no_audience' };
  }

  const everyoneSubmitted = completion.pendingNames.length === 0;

  if (requestedTrigger === 'all_submitted') {
    return everyoneSubmitted
      ? { send: true, trigger: 'all_submitted' }
      : { send: false, reason: 'awaiting_submissions' };
  }

  if (window.key !== monthKey || window.stage !== 'deadline') {
    return { send: false, reason: 'before_deadline' };
  }

  if (completion.submittedCount === 0) {
    return { send: false, reason: 'no_submissions' };
  }

  return { send: true, trigger: everyoneSubmitted ? 'all_submitted' : 'deadline' };
}

export function getFivePercentReviewUrl(): string {
  const base = (process.env.NEXT_PUBLIC_SITE_URL || process.env.APP_URL || DEFAULT_APP_URL).replace(
    /\/+$/,
    ''
  );
  return `${base}${REVIEW_PATH}`;
}

export interface FivePercentEmailStatus {
  emailedAt: string;
  trigger: FivePercentSummaryEmailTrigger | null;
  recipientCount: number | null;
}

export async function loadFivePercentDeliveryState(
  supabaseAdmin: SupabaseAdminClient,
  monthKey: string
): Promise<{
  completion: FivePercentCompletion;
  alreadyEmailed: boolean;
  lastEmail: FivePercentEmailStatus | null;
}> {
  const [audience, submissionsResult, summaryResult] = await Promise.all([
    listPerformanceAudience(supabaseAdmin),
    supabaseAdmin
      .from('five_percent_reflections')
      .select('user_id')
      .eq('month_key', monthKey)
      .is('deleted_at', null),
    supabaseAdmin
      .from(SUMMARY_TABLE)
      .select('emailed_at, email_trigger, email_recipient_count')
      .eq('evaluation_kind', EVALUATION_KIND)
      .eq('period_key', monthKey)
      .is('deleted_at', null)
      .maybeSingle(),
  ]);

  if (submissionsResult.error) {
    throw new Error(`Failed to load 5% reflection submissions: ${submissionsResult.error.message}`);
  }

  if (summaryResult.error) {
    throw new Error(`Failed to load 5% reflection summary state: ${summaryResult.error.message}`);
  }

  const submittedUserIds = new Set<string>(
    ((submissionsResult.data as Array<{ user_id: string }> | null) ?? []).map((row) => row.user_id)
  );
  const summaryRow = summaryResult.data as {
    emailed_at: string | null;
    email_trigger: string | null;
    email_recipient_count: number | null;
  } | null;

  const lastEmail: FivePercentEmailStatus | null = summaryRow?.emailed_at
    ? {
        emailedAt: summaryRow.emailed_at,
        trigger: (summaryRow.email_trigger as FivePercentSummaryEmailTrigger | null) ?? null,
        recipientCount: summaryRow.email_recipient_count,
      }
    : null;

  return {
    completion: evaluateFivePercentCompletion(audience, submittedUserIds),
    alreadyEmailed: lastEmail !== null,
    lastEmail,
  };
}

/** Generates (or reuses a fresh) 5% summary. `userId` is null for background jobs. */
export async function generateFivePercentSummary(
  supabaseAdmin: SupabaseAdminClient,
  monthKey: string,
  userId: string | null = null
): Promise<{ summaryMarkdown: string; generatedAt: string }> {
  const summary = await generatePerformanceEvaluationSummary(supabaseAdmin, userId, {
    evaluationKind: EVALUATION_KIND,
    periodKey: monthKey,
    forceRegenerate: false,
  });

  return { summaryMarkdown: summary.summaryMarkdown, generatedAt: summary.generatedAt };
}

/**
 * Sends the month's summary email and records the delivery.
 *
 * Automated sends (`sentBy: null`) first claim the row (only while `emailed_at` is empty)
 * and release the claim if sending fails, so a retry can try again; they return `false`
 * when another run already delivered it. Manual sends by an admin always go out and
 * overwrite the delivery record.
 */
export async function sendFivePercentSummaryEmail(
  supabaseAdmin: SupabaseAdminClient,
  params: {
    monthKey: string;
    trigger: FivePercentSummaryEmailTrigger;
    recipients: Array<string>;
    completion: FivePercentCompletion;
    dueDateLabel: string;
    summaryMarkdown: string;
    generatedAt: string;
    sentBy: string | null;
  }
): Promise<boolean> {
  const deliveryRecord = {
    emailed_at: new Date().toISOString(),
    email_trigger: params.trigger,
    email_recipient_count: params.recipients.length,
    emailed_by: params.sentBy,
  };
  const isAutomated = params.sentBy === null;

  let claimedId: string | null = null;
  if (isAutomated) {
    const { data: claimed, error: claimError } = await supabaseAdmin
      .from(SUMMARY_TABLE)
      .update(deliveryRecord)
      .eq('evaluation_kind', EVALUATION_KIND)
      .eq('period_key', params.monthKey)
      .is('deleted_at', null)
      .is('emailed_at', null)
      .select('id')
      .maybeSingle();

    if (claimError) {
      throw new Error(`Failed to claim 5% reflection summary for delivery: ${claimError.message}`);
    }

    if (!claimed) {
      return false;
    }

    claimedId = claimed.id;
  }

  const email = buildFivePercentSummaryEmail({
    monthKey: params.monthKey,
    trigger: params.trigger,
    summaryMarkdown: params.summaryMarkdown,
    submittedCount: params.completion.submittedCount,
    expectedCount: params.completion.expectedCount,
    pendingNames: params.completion.pendingNames,
    dueDateLabel: params.dueDateLabel,
    generatedAt: params.generatedAt,
    reviewUrl: getFivePercentReviewUrl(),
  });

  const result = await sendHrReportEmail({
    to: params.recipients,
    subject: email.subject,
    html: email.html,
  });

  if (!result.sent) {
    if (claimedId) {
      await supabaseAdmin
        .from(SUMMARY_TABLE)
        .update({
          emailed_at: null,
          email_trigger: null,
          email_recipient_count: null,
          emailed_by: null,
        })
        .eq('id', claimedId);
    }
    throw new Error(
      `Failed to send 5% reflection summary email: ${result.error ?? 'unknown error'}`
    );
  }

  if (!claimedId) {
    const { data: recorded, error: recordError } = await supabaseAdmin
      .from(SUMMARY_TABLE)
      .update(deliveryRecord)
      .eq('evaluation_kind', EVALUATION_KIND)
      .eq('period_key', params.monthKey)
      .is('deleted_at', null)
      .select('id')
      .maybeSingle();

    if (recordError) {
      console.error(
        '[five-percent-summary] Email sent but delivery record failed:',
        recordError.message
      );
    }

    claimedId = recorded?.id ?? null;
  }

  if (claimedId) {
    const { error: auditError } = await supabaseAdmin.from('audit_logs').insert({
      table_name: SUMMARY_TABLE,
      record_id: claimedId,
      operation: 'UPDATE',
      performed_by: params.sentBy,
      action: 'email_five_percent_summary',
      metadata: {
        monthKey: params.monthKey,
        trigger: params.trigger,
        recipientCount: params.recipients.length,
        submittedCount: params.completion.submittedCount,
        expectedCount: params.completion.expectedCount,
      },
    });

    if (auditError) {
      console.error('[Audit] Failed to log 5% reflection summary email:', auditError.message);
    }
  }

  return true;
}
