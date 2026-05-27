import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { writeAuditLog } from '../_shared/audit.ts';
import { validateAdminAuthFlexible } from '../_shared/auth.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { createBulkInAppNotifications } from '../_shared/in-app-notify.ts';
import { getSupabaseAdmin } from '../_shared/supabase-admin.ts';

const MS_PER_DAY = 86_400_000;

function toUtcDate(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
}

function addCalendarDays(date: Date, days: number): Date {
  return new Date(toUtcDate(date).getTime() + days * MS_PER_DAY);
}

function isWeekend(date: Date): boolean {
  const day = date.getUTCDay();
  return day === 0 || day === 6;
}

function addBusinessDays(date: Date, offset: number): Date {
  let cursor = toUtcDate(date);
  let remaining = Math.abs(offset);
  const direction = offset > 0 ? 1 : -1;

  while (remaining > 0) {
    cursor = addCalendarDays(cursor, direction);
    if (!isWeekend(cursor)) {
      remaining -= 1;
    }
  }

  return cursor;
}

function countBusinessDaysUntil(dueDate: Date, now: Date): number {
  const start = toUtcDate(now);
  const end = toUtcDate(dueDate);

  if (start >= end) {
    return 0;
  }

  let count = 0;
  let cursor = start;
  while (cursor < end) {
    cursor = addCalendarDays(cursor, 1);
    if (!isWeekend(cursor)) {
      count += 1;
    }
  }

  return count;
}

function countCalendarDaysUntil(dueDate: Date, now: Date): number {
  return Math.round((toUtcDate(dueDate).getTime() - toUtcDate(now).getTime()) / MS_PER_DAY);
}

function getLastWorkingDayOfMonth(date: Date): Date {
  let cursor = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0));
  while (isWeekend(cursor)) {
    cursor = addCalendarDays(cursor, -1);
  }
  return cursor;
}

function getLastWorkingDayOfQuarter(date: Date): Date {
  const quarterEndMonth = Math.floor(date.getUTCMonth() / 3) * 3 + 2;
  let cursor = new Date(Date.UTC(date.getUTCFullYear(), quarterEndMonth + 1, 0));
  while (isWeekend(cursor)) {
    cursor = addCalendarDays(cursor, -1);
  }
  return cursor;
}

function formatMonthKey(date: Date): string {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`;
}

function formatQuarterKey(date: Date): string {
  return `${date.getUTCFullYear()}-Q${Math.floor(date.getUTCMonth() / 3) + 1}`;
}

function formatMonthLabel(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

function formatQuarterLabel(date: Date): string {
  const quarter = Math.floor(date.getUTCMonth() / 3) + 1;
  return `Q${quarter} ${date.getUTCFullYear()}`;
}

function formatDueDateLabel(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function parseIsoDate(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  return toUtcDate(parsed);
}

async function resolveActiveEvaluationAudience(supabase: ReturnType<typeof getSupabaseAdmin>) {
  const { data, error } = await supabase
    .from('users')
    .select('id, role')
    .in('role', ['employee', 'intern'])
    .is('deleted_at', null);

  if (error) {
    throw new Error(`Failed to fetch evaluation audience: ${error.message}`);
  }

  return data ?? [];
}

async function resolveMonthlyMissingUserIds(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  userIds: string[],
  monthKey: string
): Promise<string[]> {
  if (userIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('monthly_self_evaluations')
    .select('user_id')
    .in('user_id', userIds)
    .eq('month_key', monthKey);

  if (error) {
    throw new Error(`Failed to fetch monthly submissions: ${error.message}`);
  }

  const submitted = new Set((data ?? []).map((row) => row.user_id as string));
  return userIds.filter((userId) => !submitted.has(userId));
}

async function resolveQuarterlyMissingUserIds(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  userIds: string[],
  quarterKey: string
): Promise<string[]> {
  if (userIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from('quarterly_temperature_checks')
    .select('user_id')
    .in('user_id', userIds)
    .eq('quarter_key', quarterKey);

  if (error) {
    throw new Error(`Failed to fetch quarterly submissions: ${error.message}`);
  }

  const submitted = new Set((data ?? []).map((row) => row.user_id as string));
  return userIds.filter((userId) => !submitted.has(userId));
}

async function resolveAnnouncementAuthorId(
  supabase: ReturnType<typeof getSupabaseAdmin>
): Promise<string | null> {
  const { data, error } = await supabase
    .from('users')
    .select('id')
    .in('role', ['super_admin', 'admin'])
    .is('deleted_at', null)
    .limit(1);

  if (error) {
    console.error('[evaluation-cadence-reminders] Failed to resolve announcement author:', error.message);
    return null;
  }

  return data?.[0]?.id ?? null;
}

async function resolveQuarterlyCycleDueDate(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  today: Date
): Promise<Date | null> {
  const todayIso = today.toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from('review_cycles')
    .select('self_review_deadline, end_date')
    .eq('status', 'active')
    .lte('start_date', todayIso)
    .gte('end_date', todayIso)
    .order('start_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error(
      '[evaluation-cadence-reminders] Failed to resolve quarterly cycle deadline:',
      error.message
    );
    return null;
  }

  return parseIsoDate(data?.self_review_deadline ?? data?.end_date ?? null);
}

async function ensureQuarterlyLaunchAnnouncement(
  supabase: ReturnType<typeof getSupabaseAdmin>,
  quarterLabel: string,
  quarterKey: string,
  dueDate: Date
): Promise<string | null> {
  const title = `Quarterly Temperature Check Open • ${quarterLabel}`;
  const { data: existing, error: existingError } = await supabase
    .from('announcements')
    .select('id')
    .eq('title', title)
    .eq('status', 'published')
    .is('deleted_at', null)
    .limit(1);

  if (existingError) {
    console.error(
      '[evaluation-cadence-reminders] Failed to check quarterly launch announcement:',
      existingError.message
    );
  }

  if (existing && existing.length > 0) {
    return existing[0]?.id ?? null;
  }

  const authorId = await resolveAnnouncementAuthorId(supabase);
  if (!authorId) {
    return null;
  }

  const now = new Date().toISOString();
  const expiresAt = new Date(toUtcDate(dueDate).getTime() + MS_PER_DAY).toISOString();
  const dueLabel = formatDueDateLabel(dueDate);

  const { data, error } = await supabase
    .from('announcements')
    .insert({
      title,
      content: `The ${quarterLabel} Quarterly Temperature Check is now open. Please submit your feedback before ${dueLabel}.`,
      excerpt: `Quarterly Temperature Check for ${quarterLabel} is now open.`,
      category: 'performance',
      priority: 'high',
      status: 'published',
      published_at: now,
      expires_at: expiresAt,
      target_roles: ['employee', 'intern'],
      target_departments: [],
      target_employees: [],
      is_pinned: true,
      allow_comments: false,
      author_id: authorId,
      created_by: authorId,
    })
    .select('id')
    .single();

  if (error) {
    console.error(
      '[evaluation-cadence-reminders] Failed to create quarterly launch announcement:',
      error.message
    );
    return null;
  }

  return data?.id ?? null;
}

serve(async (req: Request): Promise<Response> => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const auth = await validateAdminAuthFlexible(req);
    if (!auth.ok) {
      return new Response(JSON.stringify({ success: false, error: auth.error }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = getSupabaseAdmin();
    const now = new Date();
    const today = toUtcDate(now);
    const workforce = await resolveActiveEvaluationAudience(supabase);
    const allUserIds = workforce.map((user) => user.id as string);

    const monthlyDueDate = getLastWorkingDayOfMonth(today);
    const monthlyBusinessDaysUntilDue = countBusinessDaysUntil(monthlyDueDate, today);
    const monthlyKey = formatMonthKey(today);
    const monthlyLabel = formatMonthLabel(today);
    const monthlyDueLabel = formatDueDateLabel(monthlyDueDate);
    const monthlyOpenDate = addBusinessDays(monthlyDueDate, -3);

    const quarterlyDueDate =
      (await resolveQuarterlyCycleDueDate(supabase, today)) ?? getLastWorkingDayOfQuarter(today);
    const quarterlyDaysUntilDue = countCalendarDaysUntil(quarterlyDueDate, today);
    const quarterlyKey = formatQuarterKey(today);
    const quarterlyLabel = formatQuarterLabel(today);
    const quarterlyDueLabel = formatDueDateLabel(quarterlyDueDate);

    const [monthlyMissingUserIds, quarterlyMissingUserIds] = await Promise.all([
      today >= monthlyOpenDate
        ? resolveMonthlyMissingUserIds(supabase, allUserIds, monthlyKey)
        : Promise.resolve([]),
      quarterlyDaysUntilDue <= 7
        ? resolveQuarterlyMissingUserIds(supabase, allUserIds, quarterlyKey)
        : Promise.resolve([]),
    ]);

    const results = {
      monthlyLaunchSent: 0,
      monthlyReminderSent: 0,
      monthlyDeadlineSent: 0,
      quarterlyAnnouncementSent: 0,
      quarterlyReminderSent: 0,
      quarterlyDeadlineSent: 0,
    };

    if (monthlyBusinessDaysUntilDue === 3 && monthlyMissingUserIds.length > 0) {
      await createBulkInAppNotifications(supabase, monthlyMissingUserIds, {
        type: 'reminder',
        title: 'Monthly Self-Evaluation is open',
        message: `Your ${monthlyLabel} self-evaluation window is now open. Please submit it by ${monthlyDueLabel}.`,
        link: '/performance/self-evaluation?tab=monthly',
        dedupeKey: `monthly-evaluation-launch:${monthlyKey}`,
        metadata: { cadence: 'monthly_launch', monthKey: monthlyKey },
        sendEmail: false,
        sendTelegram: false,
      });
      results.monthlyLaunchSent = monthlyMissingUserIds.length;
    }

    if (monthlyBusinessDaysUntilDue === 1 && monthlyMissingUserIds.length > 0) {
      await createBulkInAppNotifications(supabase, monthlyMissingUserIds, {
        type: 'reminder',
        title: 'Monthly Self-Evaluation due tomorrow',
        message: `Your ${monthlyLabel} self-evaluation is still pending. Please submit it before ${monthlyDueLabel}.`,
        link: '/performance/self-evaluation?tab=monthly',
        dedupeKey: `monthly-evaluation-reminder:${monthlyKey}`,
        metadata: { cadence: 'monthly_day_minus_1', monthKey: monthlyKey },
        sendEmail: true,
        sendTelegram: true,
      });
      results.monthlyReminderSent = monthlyMissingUserIds.length;
    }

    if (monthlyBusinessDaysUntilDue === 0 && monthlyMissingUserIds.length > 0) {
      await createBulkInAppNotifications(supabase, monthlyMissingUserIds, {
        type: 'reminder',
        title: 'Monthly Self-Evaluation due today',
        message: `Final reminder: your ${monthlyLabel} self-evaluation is due today.`,
        link: '/performance/self-evaluation?tab=monthly',
        dedupeKey: `monthly-evaluation-deadline:${monthlyKey}`,
        metadata: { cadence: 'monthly_deadline', monthKey: monthlyKey },
        sendEmail: true,
        sendTelegram: true,
      });
      results.monthlyDeadlineSent = monthlyMissingUserIds.length;
    }

    if (quarterlyDaysUntilDue === 7 && allUserIds.length > 0) {
      const announcementId = await ensureQuarterlyLaunchAnnouncement(
        supabase,
        quarterlyLabel,
        quarterlyKey,
        quarterlyDueDate
      );

      await createBulkInAppNotifications(supabase, allUserIds, {
        type: 'announcement_new',
        title: `Quarterly Temperature Check is open for ${quarterlyLabel}`,
        message: `Your quarterly temperature check window is now open. Submit it before ${quarterlyDueLabel}.`,
        link: '/performance/self-evaluation?tab=quarterly',
        dedupeKey: `quarterly-evaluation-launch:${quarterlyKey}`,
        metadata: {
          cadence: 'quarterly_launch',
          quarterKey: quarterlyKey,
          ...(announcementId ? { announcementId } : {}),
        },
        sendEmail: false,
        sendTelegram: false,
      });
      results.quarterlyAnnouncementSent = allUserIds.length;
    }

    if (quarterlyDaysUntilDue === 3 && quarterlyMissingUserIds.length > 0) {
      await createBulkInAppNotifications(supabase, quarterlyMissingUserIds, {
        type: 'reminder',
        title: 'Quarterly Temperature Check still pending',
        message: `You have not completed the ${quarterlyLabel} quarterly temperature check yet. Please submit it before ${quarterlyDueLabel}.`,
        link: '/performance/self-evaluation?tab=quarterly',
        dedupeKey: `quarterly-evaluation-reminder:${quarterlyKey}`,
        metadata: { cadence: 'quarterly_day_minus_3', quarterKey: quarterlyKey },
        sendEmail: true,
        sendTelegram: true,
      });
      results.quarterlyReminderSent = quarterlyMissingUserIds.length;
    }

    if (quarterlyDaysUntilDue === 1 && quarterlyMissingUserIds.length > 0) {
      await createBulkInAppNotifications(supabase, quarterlyMissingUserIds, {
        type: 'reminder',
        title: 'Quarterly Temperature Check due tomorrow',
        message: `Final countdown: your ${quarterlyLabel} quarterly temperature check is due tomorrow.`,
        link: '/performance/self-evaluation?tab=quarterly',
        dedupeKey: `quarterly-evaluation-deadline:${quarterlyKey}`,
        metadata: { cadence: 'quarterly_day_minus_1', quarterKey: quarterlyKey },
        sendEmail: true,
        sendTelegram: true,
      });
      results.quarterlyDeadlineSent = quarterlyMissingUserIds.length;
    }

    await writeAuditLog(supabase, {
      tableName: 'notifications',
      recordId: `evaluation-cadence-${today.toISOString().slice(0, 10)}`,
      action: 'cron_evaluation_cadence_reminders',
      metadata: {
        date: today.toISOString().slice(0, 10),
        monthKey: monthlyKey,
        quarterKey: quarterlyKey,
        ...results,
      },
    });

    return new Response(
      JSON.stringify({ success: true, data: results }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[evaluation-cadence-reminders] Error:', message);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});