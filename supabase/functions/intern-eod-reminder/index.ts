import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { writeAuditLog } from '../_shared/audit.ts';
import { validateAdminAuth } from '../_shared/auth.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { createInAppNotification } from '../_shared/in-app-notify.ts';
import { getSupabaseAdmin } from '../_shared/supabase-admin.ts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ActiveIntern {
  id: string; // internship id
  employee_id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  supervisor_id: string | null;
}

// ---------------------------------------------------------------------------
// Main handler
// Runs weekdays at 4 PM PHT (0 8 * * 1-5 UTC) to remind interns who
// haven't submitted their daily log for today.
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

    // Today's date in YYYY-MM-DD format (UTC, but the cron runs at 8 AM UTC = 4 PM PHT,
    // so the "today" in PHT is the same UTC date)
    const today = new Date().toISOString().split('T')[0];

    // ----- Step 1: Get all active internships -----
    const { data: activeInternships, error: internError } = await supabase
      .from('internships')
      .select(`
        id,
        employee_id,
        supervisor_id,
        employees!inner ( user_id, first_name, last_name )
      `)
      .eq('status', 'active')
      .is('deleted_at', null);

    if (internError) {
      console.error('[intern-eod-reminder] Internship query error:', internError.message);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to query internships' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!activeInternships || activeInternships.length === 0) {
      return new Response(
        JSON.stringify({ success: true, data: { remindedCount: 0, message: 'No active interns' } }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // ----- Step 2: Get today's submitted logs -----
    const internshipIds = activeInternships.map((i: { id: string }) => i.id);
    const { data: todaysLogs, error: logError } = await supabase
      .from('intern_daily_logs')
      .select('internship_id')
      .in('internship_id', internshipIds)
      .eq('log_date', today);

    if (logError) {
      console.error('[intern-eod-reminder] Log query error:', logError.message);
    }

    const submittedIds = new Set(
      (todaysLogs ?? []).map((l: { internship_id: string }) => l.internship_id)
    );

    // ----- Step 3: Send reminders to those who haven't submitted -----
    const missingInterns: ActiveIntern[] = [];

    for (const internship of activeInternships) {
      if (submittedIds.has(internship.id)) continue;

      const emp = internship.employees as unknown as {
        user_id: string;
        first_name: string;
        last_name: string;
      };

      if (!emp?.user_id) continue;

      missingInterns.push({
        id: internship.id,
        employee_id: internship.employee_id,
        user_id: emp.user_id,
        first_name: emp.first_name,
        last_name: emp.last_name,
        supervisor_id: internship.supervisor_id,
      });
    }

    let remindedCount = 0;

    for (const intern of missingInterns) {
      await createInAppNotification(supabase, {
        userId: intern.user_id,
        type: 'reminder',
        title: 'EOD Log Reminder',
        message: `Hi ${intern.first_name}, please submit your daily log for ${today} before end of day.`,
        link: '/intern/daily-log',
        metadata: { internshipId: intern.id, logDate: today },
      });
      remindedCount++;
    }

    if (remindedCount > 0) {
      await writeAuditLog(supabase, {
        tableName: 'intern_daily_logs',
        recordId: `eod-reminder-${today}`,
        action: 'intern_eod_reminder_sent',
        metadata: {
          date: today,
          remindedCount,
          internNames: missingInterns.map((i) => `${i.first_name} ${i.last_name}`),
        },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          date: today,
          activeInterns: activeInternships.length,
          alreadySubmitted: submittedIds.size,
          remindedCount,
        },
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[intern-eod-reminder] Error:', message);
    return new Response(
      JSON.stringify({ success: false, error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
