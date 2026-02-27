import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { getSupabaseAdmin } from '../_shared/supabase-admin.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { validateAdminAuth } from '../_shared/auth.ts';
import { createInAppNotification, createBulkInAppNotifications } from '../_shared/in-app-notify.ts';
import { writeAuditLog } from '../_shared/audit.ts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LateEmployee {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  work_email: string;
  report_type: string;
  last_report_date: string | null;
  days_late: number;
}

interface LateIntern {
  employee_id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  work_email: string;
  last_log_date: string | null;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------

serve(async (req: Request): Promise<Response> => {
  // CORS
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  // Only POST allowed (triggered by cron or manual invocation)
  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Validate admin auth (service key or admin JWT)
    const authResult = await validateAdminAuth(req);
    if (!authResult.authorized) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = getSupabaseAdmin();
    const now = new Date();
    const today = now.toISOString().slice(0, 10);

    // Calculate date boundaries
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = yesterday.toISOString().slice(0, 10);

    // Last week boundary (for weekly reports)
    const lastWeekStart = new Date(now);
    lastWeekStart.setDate(lastWeekStart.getDate() - 7);
    const lastWeekStartStr = lastWeekStart.toISOString().slice(0, 10);

    // -----------------------------------------------------------------------
    // 1. Check for employees with late weekly reports
    // -----------------------------------------------------------------------

    // Get all active employees
    const { data: activeEmployees, error: empError } = await supabase
      .from('employees')
      .select('id, user_id, first_name, last_name, work_email')
      .is('deleted_at', null)
      .not('user_id', 'is', null);

    if (empError) {
      console.error('Failed to fetch employees:', empError.message);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch employees' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const lateEmployees: LateEmployee[] = [];

    if (activeEmployees && activeEmployees.length > 0) {
      // Check who submitted a report in the last week
      const employeeIds = activeEmployees.map((e) => e.id);

      const { data: recentReports } = await supabase
        .from('reports')
        .select('employee_id, submitted_at')
        .in('employee_id', employeeIds)
        .in('status', ['submitted', 'approved'])
        .gte('submitted_at', lastWeekStartStr)
        .order('submitted_at', { ascending: false });

      const submittedEmployeeIds = new Set(
        (recentReports ?? []).map((r) => r.employee_id)
      );

      for (const emp of activeEmployees) {
        if (!submittedEmployeeIds.has(emp.id)) {
          // Find last report date
          const { data: lastReport } = await supabase
            .from('reports')
            .select('submitted_at')
            .eq('employee_id', emp.id)
            .in('status', ['submitted', 'approved'])
            .order('submitted_at', { ascending: false })
            .limit(1);

          const lastDate = lastReport?.[0]?.submitted_at ?? null;
          const daysLate = lastDate
            ? Math.floor((now.getTime() - new Date(lastDate).getTime()) / 86_400_000) - 7
            : 99; // Never submitted

          if (daysLate > 0) {
            lateEmployees.push({
              id: emp.id,
              user_id: emp.user_id!,
              first_name: emp.first_name,
              last_name: emp.last_name,
              work_email: emp.work_email ?? '',
              report_type: 'weekly',
              last_report_date: lastDate,
              days_late: daysLate,
            });
          }
        }
      }
    }

    // -----------------------------------------------------------------------
    // 2. Check for interns with no EOD log yesterday
    // -----------------------------------------------------------------------

    const { data: activeInternships } = await supabase
      .from('internships')
      .select('employee_id')
      .eq('status', 'active');

    const lateInterns: LateIntern[] = [];

    if (activeInternships && activeInternships.length > 0) {
      const internEmployeeIds = activeInternships.map((i) => i.employee_id);

      // Check who submitted yesterday
      const { data: yesterdayLogs } = await supabase
        .from('intern_daily_logs')
        .select('employee_id')
        .in('employee_id', internEmployeeIds)
        .eq('log_date', yesterdayStr);

      const submittedInternIds = new Set(
        (yesterdayLogs ?? []).map((l) => l.employee_id)
      );

      for (const internship of activeInternships) {
        if (!submittedInternIds.has(internship.employee_id)) {
          const { data: empData } = await supabase
            .from('employees')
            .select('user_id, first_name, last_name, work_email')
            .eq('id', internship.employee_id)
            .single();

          if (empData && empData.user_id) {
            lateInterns.push({
              employee_id: internship.employee_id,
              user_id: empData.user_id,
              first_name: empData.first_name,
              last_name: empData.last_name,
              work_email: empData.work_email ?? '',
              last_log_date: null,
            });
          }
        }
      }
    }

    // -----------------------------------------------------------------------
    // 3. Send notifications based on escalation level
    // -----------------------------------------------------------------------

    let notificationsSent = 0;

    // Notify late employees
    for (const emp of lateEmployees) {
      let title: string;
      let message: string;

      if (emp.days_late <= 1) {
        // Day 1: Gentle reminder
        title = 'Report Reminder';
        message = `Your weekly report is due. Please submit it at your earliest convenience.`;
      } else if (emp.days_late <= 3) {
        // Day 3: Firmer reminder
        title = 'Report Overdue';
        message = `Your weekly report is ${emp.days_late} days overdue. Please submit as soon as possible.`;
      } else {
        // Day 7+: Escalation
        title = 'Report Significantly Overdue';
        message = `Your weekly report is ${emp.days_late} days overdue. This has been escalated to your manager.`;
      }

      await createInAppNotification(supabase, {
        userId: emp.user_id,
        type: 'reminder',
        title,
        message,
        link: '/reports',
        metadata: {
          daysLate: emp.days_late,
          reportType: emp.report_type,
          escalationLevel: emp.days_late <= 1 ? 'gentle' : emp.days_late <= 3 ? 'firm' : 'escalation',
        },
      });
      notificationsSent++;
    }

    // Notify late interns
    for (const intern of lateInterns) {
      await createInAppNotification(supabase, {
        userId: intern.user_id,
        type: 'reminder',
        title: 'EOD Report Missing',
        message: `You did not submit your End-of-Day report for ${yesterdayStr}. Please submit it.`,
        link: '/intern/dashboard',
        metadata: {
          missingDate: yesterdayStr,
          type: 'intern_eod',
        },
      });
      notificationsSent++;
    }

    // -----------------------------------------------------------------------
    // 4. Send summary to HR/Admin
    // -----------------------------------------------------------------------

    if (lateEmployees.length > 0 || lateInterns.length > 0) {
      // Get HR/Admin users to notify
      const { data: adminUsers } = await supabase
        .from('users')
        .select('id')
        .in('role', ['admin', 'hr'])
        .is('deleted_at', null);

      if (adminUsers && adminUsers.length > 0) {
        const adminIds = adminUsers.map((u) => u.id);
        await createBulkInAppNotifications(supabase, adminIds, {
          type: 'system',
          title: 'Late Reports Summary',
          message: `${lateEmployees.length} employee(s) and ${lateInterns.length} intern(s) have late report submissions.`,
          link: '/admin/reports?tab=submissions',
          metadata: {
            date: today,
            lateEmployeeCount: lateEmployees.length,
            lateInternCount: lateInterns.length,
          },
        });
        notificationsSent += adminIds.length;
      }
    }

    // -----------------------------------------------------------------------
    // 5. Audit log
    // -----------------------------------------------------------------------

    await writeAuditLog(supabase, {
      tableName: 'notifications',
      recordId: 'check-late-reports',
      action: 'cron_check_late_reports',
      metadata: {
        date: today,
        lateEmployeesCount: lateEmployees.length,
        lateInternsCount: lateInterns.length,
        notificationsSent,
        lateEmployees: lateEmployees.map((e) => ({
          id: e.id,
          name: `${e.first_name} ${e.last_name}`,
          daysLate: e.days_late,
        })),
      },
    });

    const result = {
      date: today,
      lateEmployees: lateEmployees.length,
      lateInterns: lateInterns.length,
      notificationsSent,
      summary: {
        employees: lateEmployees.map((e) => ({
          name: `${e.first_name} ${e.last_name}`,
          daysLate: e.days_late,
          escalation: e.days_late <= 1 ? 'gentle' : e.days_late <= 3 ? 'firm' : 'escalation',
        })),
        interns: lateInterns.map((i) => ({
          name: `${i.first_name} ${i.last_name}`,
          missingDate: yesterdayStr,
        })),
      },
    };

    console.log(`[check-late-reports] Completed: ${JSON.stringify(result)}`);

    return new Response(
      JSON.stringify({ data: result }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[check-late-reports] Fatal error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
