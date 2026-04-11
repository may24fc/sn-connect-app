import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { writeAuditLog } from '../_shared/audit.ts';
import { validateAdminAuth } from '../_shared/auth.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { createInAppNotification } from '../_shared/in-app-notify.ts';
import { sendEmail } from '../_shared/resend.ts';
import { getSupabaseAdmin } from '../_shared/supabase-admin.ts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface InternSummary {
  internshipId: string;
  employeeId: string;
  userId: string;
  supervisorId: string | null;
  supervisorEmail: string | null;
  firstName: string;
  lastName: string;
  workEmail: string | null;
  totalHours: number;
  logsCount: number;
  avgHoursPerDay: number;
}

// ---------------------------------------------------------------------------
// Main handler
// Runs Fridays at 5 PM PHT (0 9 * * 5 UTC).
// Aggregates the past 7 days of intern daily logs and sends a summary
// notification to each intern and their supervisor.
// ---------------------------------------------------------------------------

serve(async (req: Request): Promise<Response> => {
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    const auth = validateAdminAuth(req);
    if (!auth.ok) {
      return new Response(
        JSON.stringify({ success: false, error: auth.error }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = getSupabaseAdmin();

    const now = new Date();
    const weekEnd = now.toISOString().split('T')[0];
    const weekStart = new Date(now);
    weekStart.setDate(weekStart.getDate() - 6);
    const weekStartStr = weekStart.toISOString().split('T')[0];

    // ----- Step 1: Get all active internships -----
    const { data: activeInternships, error: internError } = await supabase
      .from('internships')
      .select(`
        id,
        employee_id,
        supervisor_id,
        employees!inner ( user_id, first_name, last_name, work_email )
      `)
      .eq('status', 'active')
      .is('deleted_at', null);

    if (internError) {
      console.error('[intern-weekly-summary] Internship query error:', internError.message);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to query internships' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!activeInternships || activeInternships.length === 0) {
      return new Response(
        JSON.stringify({ success: true, data: { summariesSent: 0, message: 'No active interns' } }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ----- Step 2: Get weekly logs for all active internships -----
    const internshipIds = activeInternships.map((i: { id: string }) => i.id);
    const { data: weekLogs, error: logError } = await supabase
      .from('intern_daily_logs')
      .select('internship_id, hours_worked')
      .in('internship_id', internshipIds)
      .gte('log_date', weekStartStr)
      .lte('log_date', weekEnd);

    if (logError) {
      console.error('[intern-weekly-summary] Log query error:', logError.message);
    }

    // Aggregate hours per internship
    const hoursMap = new Map<string, { total: number; count: number }>();
    for (const log of weekLogs ?? []) {
      const existing = hoursMap.get(log.internship_id) ?? { total: 0, count: 0 };
      existing.total += Number(log.hours_worked) || 0;
      existing.count += 1;
      hoursMap.set(log.internship_id, existing);
    }

    // ----- Step 3: Get supervisor emails if needed -----
    const supervisorIds = [
      ...new Set(
        activeInternships
          .map((i: { supervisor_id: string | null }) => i.supervisor_id)
          .filter(Boolean)
      ),
    ] as string[];

    const supervisorEmailMap = new Map<string, string>();
    if (supervisorIds.length > 0) {
      const { data: supervisors } = await supabase
        .from('employees')
        .select('user_id, work_email')
        .in('user_id', supervisorIds);

      for (const sup of supervisors ?? []) {
        if (sup.work_email) {
          supervisorEmailMap.set(sup.user_id, sup.work_email);
        }
      }
    }

    // ----- Step 4: Build summaries and send notifications -----
    const summaries: InternSummary[] = [];

    for (const internship of activeInternships) {
      const emp = internship.employees as unknown as {
        user_id: string;
        first_name: string;
        last_name: string;
        work_email: string | null;
      };

      if (!emp?.user_id) continue;

      const hours = hoursMap.get(internship.id) ?? { total: 0, count: 0 };

      const summary: InternSummary = {
        internshipId: internship.id,
        employeeId: internship.employee_id,
        userId: emp.user_id,
        supervisorId: internship.supervisor_id,
        supervisorEmail: internship.supervisor_id
          ? supervisorEmailMap.get(internship.supervisor_id) ?? null
          : null,
        firstName: emp.first_name,
        lastName: emp.last_name,
        workEmail: emp.work_email,
        totalHours: hours.total,
        logsCount: hours.count,
        avgHoursPerDay: hours.count > 0 ? Math.round((hours.total / hours.count) * 10) / 10 : 0,
      };

      summaries.push(summary);

      // Notify the intern
      await createInAppNotification(supabase, {
        userId: emp.user_id,
        type: 'system',
        title: 'Weekly Hours Summary',
        message: `Week of ${weekStartStr} to ${weekEnd}: You logged ${hours.total.toFixed(1)} hours across ${hours.count} day(s). Average: ${summary.avgHoursPerDay} hrs/day.`,
        link: '/intern/daily-log',
        dedupeKey: `intern-weekly-summary:${internship.employee_id}:${weekStartStr}:${weekEnd}`,
        metadata: {
          weekStart: weekStartStr,
          weekEnd,
          totalHours: hours.total,
          logsCount: hours.count,
        },
      });

      // Email supervisor if available
      if (summary.supervisorEmail && summary.supervisorId) {
        await sendEmail({
          to: summary.supervisorEmail,
          subject: `Weekly Intern Summary: ${emp.first_name} ${emp.last_name} (${weekStartStr} – ${weekEnd})`,
          html: `
            <h3>Intern Weekly Summary</h3>
            <p><strong>Intern:</strong> ${emp.first_name} ${emp.last_name}</p>
            <p><strong>Period:</strong> ${weekStartStr} to ${weekEnd}</p>
            <p><strong>Total Hours:</strong> ${hours.total.toFixed(1)}</p>
            <p><strong>Days Logged:</strong> ${hours.count} / 5</p>
            <p><strong>Avg Hours/Day:</strong> ${summary.avgHoursPerDay}</p>
            ${hours.count < 3 ? '<p style="color: #E74C3C;"><strong>⚠️ Less than 3 days logged this week.</strong></p>' : ''}
            <p><a href="${Deno.env.get('APP_URL') ?? 'https://app.snconnect.com'}/admin/interns/${internship.employee_id}">View Intern Profile →</a></p>
          `,
        });

        // Also send supervisor in-app notification
        await createInAppNotification(supabase, {
          userId: summary.supervisorId,
          type: 'system',
          title: `Weekly Summary: ${emp.first_name} ${emp.last_name}`,
          message: `${emp.first_name} logged ${hours.total.toFixed(1)} hours across ${hours.count} day(s) this week.`,
          link: `/admin/interns/${internship.employee_id}`,
          dedupeKey: `intern-weekly-summary-supervisor:${internship.employee_id}:${weekStartStr}:${weekEnd}`,
          metadata: {
            internshipId: internship.id,
            weekStart: weekStartStr,
            weekEnd,
            totalHours: hours.total,
          },
        });
      }
    }

    if (summaries.length > 0) {
      await writeAuditLog(supabase, {
        tableName: 'intern_daily_logs',
        recordId: `weekly-summary-${weekEnd}`,
        action: 'intern_weekly_summary_sent',
        metadata: {
          weekStart: weekStartStr,
          weekEnd,
          summariesSent: summaries.length,
          internNames: summaries.map((s) => `${s.firstName} ${s.lastName}`),
        },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          weekStart: weekStartStr,
          weekEnd,
          summariesSent: summaries.length,
          summaries: summaries.map((s) => ({
            name: `${s.firstName} ${s.lastName}`,
            totalHours: s.totalHours,
            logsCount: s.logsCount,
            avgHoursPerDay: s.avgHoursPerDay,
          })),
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[intern-weekly-summary] Error:', message);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
