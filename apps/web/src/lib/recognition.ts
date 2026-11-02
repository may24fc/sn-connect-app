import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { sendCommunityTelegramMessage } from '@/lib/telegram';
import { getTelegramCommunityConfig } from '@/lib/telegram-community';

export type RecognitionCategory =
  | 'impact_delivery'
  | 'accountability_timeliness'
  | 'collaboration_initiative';
export const RECOGNITION_CATEGORIES: Record<RecognitionCategory, string> = {
  impact_delivery: 'Impact & Delivery',
  accountability_timeliness: 'Accountability & Timeliness',
  collaboration_initiative: 'Collaboration & Initiative',
};

const DAY = 86_400_000;
function isoDate(date: Date) {
  return date.toISOString().slice(0, 10);
}
function utcDate(value: string) {
  return new Date(`${value}T00:00:00.000Z`);
}
function addDays(value: string, days: number) {
  return isoDate(new Date(utcDate(value).getTime() + days * DAY));
}
export function manilaDate(now = new Date()) {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

export function recognitionPeriodForMonday(monday: string) {
  const date = utcDate(monday);
  if (date.getUTCDay() !== 1) throw new Error('Recognition generation date must be a Monday');
  if (date.getUTCDate() <= 7) {
    const previousMonthEnd = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 0));
    const previousMonthStart = new Date(
      Date.UTC(previousMonthEnd.getUTCFullYear(), previousMonthEnd.getUTCMonth(), 1)
    );
    return {
      periodType: 'monthly' as const,
      periodStart: isoDate(previousMonthStart),
      periodEnd: isoDate(previousMonthEnd),
    };
  }
  return {
    periodType: 'weekly' as const,
    periodStart: addDays(monday, -7),
    periodEnd: addDays(monday, -1),
  };
}

export async function requireRecognitionUser(adminOnly = false) {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false as const, status: 401, error: 'Unauthorized' };
  const admin = createSupabaseAdminClient();
  const { data: profile } = await admin
    .from('users')
    .select('id, role, status, deleted_at')
    .eq('id', user.id)
    .maybeSingle();
  const active =
    profile &&
    !profile.deleted_at &&
    !['terminated', 'inactive'].includes(profile.status) &&
    ['employee', 'associate', 'admin', 'super_admin'].includes(profile.role);
  if (!active || (adminOnly && !['admin', 'super_admin'].includes(profile.role))) {
    return { ok: false as const, status: 403, error: 'Forbidden' };
  }
  return { ok: true as const, admin, user: profile as { id: string; role: string } };
}

export async function ensureRecognitionPeriod(now = new Date()) {
  const monday = manilaDate(now);
  const period = recognitionPeriodForMonday(monday);
  const admin = createSupabaseAdminClient();
  const { data, error } = await admin
    .from('recognition_periods')
    .upsert(
      {
        period_type: period.periodType,
        period_start: period.periodStart,
        period_end: period.periodEnd,
        public_intro:
          period.periodType === 'monthly'
            ? 'This month, we are recognizing three distinct ways our team made a difference.'
            : 'Here are this week’s Community Wins—specific contributions that helped our team move forward.',
      },
      { onConflict: 'period_type,period_start,period_end', ignoreDuplicates: true }
    )
    .select('*')
    .maybeSingle();
  if (error) throw error;
  if (data) return data;
  const { data: existing, error: existingError } = await admin
    .from('recognition_periods')
    .select('*')
    .eq('period_type', period.periodType)
    .eq('period_start', period.periodStart)
    .eq('period_end', period.periodEnd)
    .single();
  if (existingError) throw existingError;
  return existing;
}

function lastWorkingDay(monthKey: string) {
  const [year, month] = monthKey.split('-').map(Number);
  if (!year || !month) throw new Error(`Invalid month key: ${monthKey}`);
  const date = new Date(Date.UTC(year, month, 0));
  while ([0, 6].includes(date.getUTCDay())) date.setUTCDate(date.getUTCDate() - 1);
  return isoDate(date);
}

function lastWorkingDayOfQuarter(quarterKey: string) {
  const match = /^(\d{4})-Q([1-4])$/.exec(quarterKey);
  if (!match) throw new Error(`Invalid quarter key: ${quarterKey}`);
  const year = Number(match[1]);
  const quarter = Number(match[2]);
  const date = new Date(Date.UTC(year, quarter * 3, 0));
  while ([0, 6].includes(date.getUTCDay())) date.setUTCDate(date.getUTCDate() - 1);
  return isoDate(date);
}

export async function getRecognitionEvidence(period: { period_start: string; period_end: string }) {
  const admin = createSupabaseAdminClient();
  const start = `${period.period_start}T00:00:00+08:00`;
  const end = `${addDays(period.period_end, 1)}T00:00:00+08:00`;
  const [projects, pa, uhp, okrs, kpis, monthly, calls, reflections, quarterly, nominations] =
    await Promise.all([
      admin
        .from('project_milestones')
        .select('id,title,completed_by,completed_at,complexity_tier')
        .eq('status', 'completed')
        .gte('completed_at', start)
        .lt('completed_at', end)
        .is('deleted_at', null),
      admin
        .from('pa_tasks')
        .select(
          'id,title,assigned_to,due_date,updated_at,status:pa_task_statuses!pa_tasks_status_id_fkey(is_terminal)'
        )
        .gte('updated_at', start)
        .lt('updated_at', end)
        .is('deleted_at', null),
      admin
        .from('uhp_client_activities')
        .select('id,title,activity_type,created_by,occurred_at,reply_received,prospect_outcome')
        .eq('status', 'Complete')
        .gte('occurred_at', start)
        .lt('occurred_at', end)
        .is('deleted_at', null),
      admin
        .from('okrs')
        .select(
          'id,submitted_at,employee:employees(user_id),cycle:review_cycles(okr_submission_deadline)'
        )
        .not('submitted_at', 'is', null)
        .gte('submitted_at', start)
        .lt('submitted_at', end),
      admin
        .from('kpis')
        .select(
          'id,submitted_at,employee:employees(user_id),cycle:review_cycles(kpi_submission_deadline)'
        )
        .not('submitted_at', 'is', null)
        .gte('submitted_at', start)
        .lt('submitted_at', end),
      admin
        .from('monthly_self_evaluations')
        .select('id,user_id,month_key,submitted_at')
        .gte('submitted_at', start)
        .lt('submitted_at', end)
        .is('deleted_at', null),
      admin
        .from('monthly_call_feedback')
        .select('id,user_id,month_key,submitted_at')
        .gte('submitted_at', start)
        .lt('submitted_at', end)
        .is('deleted_at', null),
      admin
        .from('five_percent_reflections')
        .select('id,user_id,month_key,submitted_at')
        .gte('submitted_at', start)
        .lt('submitted_at', end)
        .is('deleted_at', null),
      admin
        .from('quarterly_temperature_checks')
        .select('id,user_id,quarter_key,submitted_at')
        .gte('submitted_at', start)
        .lt('submitted_at', end)
        .is('deleted_at', null),
      admin
        .from('recognition_nominations')
        .select('*')
        .in('status', ['pending', 'approved'])
        .lte('work_period_start', period.period_end)
        .gte('work_period_end', period.period_start),
    ]);
  const evidence: Array<Record<string, unknown>> = [];
  for (const row of projects.data ?? [])
    evidence.push({
      id: `project:${row.id}`,
      source: 'Projects',
      userId: row.completed_by,
      category: 'impact_delivery',
      summary: `Completed approved project milestone “${row.title}” (${row.complexity_tier ?? 'standard'} complexity).`,
    });
  for (const row of pa.data ?? [])
    if ((row.status as { is_terminal?: boolean } | null)?.is_terminal)
      evidence.push({
        id: `pa:${row.id}`,
        source: 'PA',
        userId: row.assigned_to,
        category: 'impact_delivery',
        summary: `Completed PA deliverable “${row.title}”. HR should verify the supporting context.`,
      });
  for (const row of uhp.data ?? [])
    evidence.push({
      id: `uhp:${row.id}`,
      source: 'UHP',
      userId: row.created_by,
      category: 'impact_delivery',
      summary: `Completed a verified UHP ${String(row.activity_type).toLowerCase()} outcome. Client details are intentionally hidden.`,
    });
  for (const row of okrs.data ?? []) {
    const cycle = row.cycle as unknown as { okr_submission_deadline?: string | null } | null;
    const employee = row.employee as unknown as { user_id?: string | null } | null;
    if (
      cycle?.okr_submission_deadline &&
      row.submitted_at?.slice(0, 10) <= cycle.okr_submission_deadline
    )
      evidence.push({
        id: `okr:${row.id}`,
        source: 'Performance',
        userId: employee?.user_id,
        category: 'accountability_timeliness',
        summary:
          'Submitted the applicable OKRs by the configured deadline. Response content remains private.',
      });
  }
  for (const row of kpis.data ?? []) {
    const cycle = row.cycle as unknown as { kpi_submission_deadline?: string | null } | null;
    const employee = row.employee as unknown as { user_id?: string | null } | null;
    if (
      cycle?.kpi_submission_deadline &&
      row.submitted_at?.slice(0, 10) <= cycle.kpi_submission_deadline
    )
      evidence.push({
        id: `kpi:${row.id}`,
        source: 'Performance',
        userId: employee?.user_id,
        category: 'accountability_timeliness',
        summary:
          'Submitted the applicable KPIs by the configured deadline. Response content remains private.',
      });
  }
  const addOnTime = (
    rows: Array<Record<string, unknown>>,
    label: string,
    key: 'month_key' | 'quarter_key'
  ) => {
    for (const row of rows) {
      const submitted = String(row.submitted_at);
      const periodKey = String(row[key]);
      const due =
        key === 'month_key' ? lastWorkingDay(periodKey) : lastWorkingDayOfQuarter(periodKey);
      if (submitted.slice(0, 10) <= due)
        evidence.push({
          id: `${label}:${row.id}`,
          source: 'Performance',
          userId: row.user_id,
          category: 'accountability_timeliness',
          summary: `Submitted the applicable ${label} by its deadline. Response content remains private.`,
        });
    }
  };
  addOnTime(
    (monthly.data ?? []) as Array<Record<string, unknown>>,
    'monthly self-evaluation',
    'month_key'
  );
  addOnTime(
    (calls.data ?? []) as Array<Record<string, unknown>>,
    'monthly call feedback',
    'month_key'
  );
  addOnTime(
    (reflections.data ?? []) as Array<Record<string, unknown>>,
    '5% reflection',
    'month_key'
  );
  addOnTime(
    (quarterly.data ?? []) as Array<Record<string, unknown>>,
    'quarterly temperature check',
    'quarter_key'
  );
  for (const row of nominations.data ?? [])
    evidence.push({
      id: `nomination:${row.id}`,
      source: 'Nomination',
      userId: row.nominee_user_id,
      category: row.category,
      summary: row.result_summary,
      evidenceUrl: row.evidence_url,
      nominationStatus: row.status,
    });
  return evidence.filter((item) => item.userId);
}

export async function publishRecognitionPeriod(periodId: string, publisherId?: string) {
  const admin = createSupabaseAdminClient();
  const { data: period } = await admin
    .from('recognition_periods')
    .select('*')
    .eq('id', periodId)
    .single();
  if (period.status === 'published' && period.telegram_message_id) return period;
  if (period.status !== 'approved')
    throw new Error('Only approved recognition periods can be published');
  const { data: selections } = await admin
    .from('recognition_selections')
    .select('*')
    .eq('period_id', periodId)
    .order('display_order');
  if (period.period_type === 'monthly') {
    const categories = new Set((selections ?? []).map((item) => item.category));
    if (
      selections?.length !== 3 ||
      Object.keys(RECOGNITION_CATEGORIES).some((category) => !categories.has(category))
    )
      throw new Error('Monthly recognition requires one recipient in each category');
  }
  if (!selections?.length) throw new Error('Select at least one recipient before publishing');
  const ids = selections.map((item) => item.recipient_user_id);
  const { data: employees } = await admin
    .from('employees')
    .select('user_id,first_name,last_name')
    .in('user_id', ids)
    .is('deleted_at', null);
  const names = new Map(
    (employees ?? []).map((employee) => [
      employee.user_id,
      `${employee.first_name} ${employee.last_name}`.trim(),
    ])
  );
  const body = [
    period.period_type === 'monthly' ? '🏆 Monthly Community Awards' : '🌟 Weekly Community Wins',
    `${period.period_start} to ${period.period_end}`,
    '',
    period.public_intro ?? '',
    '',
    ...selections.flatMap((selection) => [
      `${selection.category ? `${RECOGNITION_CATEGORIES[selection.category as RecognitionCategory]} — ` : ''}${names.get(selection.recipient_user_id) ?? 'Team member'}`,
      selection.public_reason,
      '',
    ]),
  ]
    .join('\n')
    .trim();
  const config = getTelegramCommunityConfig();
  if (!config.chatId || !config.highlightsTopicId)
    throw new Error('Telegram Community Highlights topic is not configured');
  const { data: claimed } = await admin
    .from('recognition_periods')
    .update({ status: 'publishing', last_error: null })
    .eq('id', periodId)
    .eq('status', 'approved')
    .select('id')
    .maybeSingle();
  if (!claimed) throw new Error('This recognition period is already being published');
  const sent = await sendCommunityTelegramMessage({
    chatId: config.chatId,
    messageThreadId: config.highlightsTopicId,
    text: body,
  });
  if (!sent.sent) {
    await admin
      .from('recognition_periods')
      .update({ status: 'failed', last_error: sent.error })
      .eq('id', periodId);
    throw new Error(sent.error ?? 'Telegram publication failed');
  }
  const { data: updated, error } = await admin
    .from('recognition_periods')
    .update({
      status: 'published',
      published_by: publisherId ?? null,
      published_at: new Date().toISOString(),
      telegram_message_id: sent.messageId ?? null,
      last_error: null,
    })
    .eq('id', periodId)
    .select('*')
    .single();
  if (error) throw error;
  return updated;
}
