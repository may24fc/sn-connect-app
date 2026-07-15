import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { writeAuditLog } from '../_shared/audit.ts';
import { validateAdminAuthFlexible } from '../_shared/auth.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { createBulkInAppNotifications, createInAppNotification } from '../_shared/in-app-notify.ts';
import { getSupabaseAdmin } from '../_shared/supabase-admin.ts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LateEmployee {
  id: string;
  user_id: string;
  manager_id: string | null;
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
  supervisor_id: string | null;
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
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    // Validate admin auth (service key or admin JWT)
    const authResult = await validateAdminAuthFlexible(req);
    if (!authResult.ok) {
      return new Response(JSON.stringify({ error: authResult.error ?? 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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
      .select('id, user_id, first_name, last_name, work_email, users!employees_user_id_fkey(manager_id)')
      .is('deleted_at', null)
      .not('user_id', 'is', null);

    if (empError) {
      console.error('Failed to fetch employees:', empError.message);
      return new Response(JSON.stringify({ error: 'Failed to fetch employees' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
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

      const submittedEmployeeIds = new Set((recentReports ?? []).map((r) => r.employee_id));

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
              manager_id: emp.users?.manager_id ?? null,
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
      .select('employee_id, supervisor_id')
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

      const submittedInternIds = new Set((yesterdayLogs ?? []).map((l) => l.employee_id));

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
              supervisor_id: internship.supervisor_id ?? null,
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
        title = 'Report Reminder';
        message = `${emp.first_name}, your weekly report is due. Please submit it at your earliest convenience.`;
      } else if (emp.days_late <= 3) {
        title = 'Report Overdue';
        message = `${emp.first_name}, your weekly report is ${emp.days_late} day(s) overdue. Please submit it as soon as possible.`;
      } else {
        title = 'Report Significantly Overdue';
        message = `${emp.first_name}, your weekly report is ${emp.days_late} day(s) overdue. This has been escalated to your manager.`;
      }

      await createInAppNotification(supabase, {
        userId: emp.user_id,
        type: 'reminder',
        title,
        message,
        link: '/reports',
        dedupeKey: `late-report:${emp.id}:${emp.report_type}:${emp.days_late}`,
        metadata: {
          daysLate: emp.days_late,
          reportType: emp.report_type,
          escalationLevel:
            emp.days_late <= 1 ? 'gentle' : emp.days_late <= 3 ? 'firm' : 'escalation',
        },
      });
      notificationsSent++;

      if (emp.days_late >= 7 && emp.manager_id) {
        await createInAppNotification(supabase, {
          userId: emp.manager_id,
          type: 'system',
          title: 'Direct Report Escalation',
          message: `${emp.first_name} ${emp.last_name} has a weekly report overdue by ${emp.days_late} days.`,
          link: '/admin/reports?tab=submissions&late=true',
          dedupeKey: `late-report-manager:${emp.id}:${emp.days_late}`,
          metadata: {
            employeeId: emp.id,
            employeeUserId: emp.user_id,
            escalationLevel: 'manager',
            daysLate: emp.days_late,
          },
        });
        notificationsSent++;
      }
    }

    // Notify late interns
    for (const associate of lateInterns) {
      await createInAppNotification(supabase, {
        userId: associate.user_id,
        type: 'reminder',
        title: 'EOD Report Missing',
        message: `${associate.first_name}, you did not submit your End-of-Day report for ${yesterdayStr}. Please submit it.`,
        link: '/associate/dashboard',
        dedupeKey: `associate-eod-missing:${associate.employee_id}:${yesterdayStr}`,
        metadata: {
          missingDate: yesterdayStr,
          type: 'intern_eod',
        },
      });
      notificationsSent++;

      if (associate.supervisor_id) {
        await createInAppNotification(supabase, {
          userId: associate.supervisor_id,
          type: 'system',
          title: 'Associate EOD Missing',
          message: `${associate.first_name} ${associate.last_name} did not submit an EOD report for ${yesterdayStr}.`,
          link: '/admin/interns?tab=eod-reports',
          dedupeKey: `associate-eod-supervisor:${associate.employee_id}:${yesterdayStr}`,
          metadata: {
            employeeId: associate.employee_id,
            missingDate: yesterdayStr,
            escalationLevel: 'supervisor',
          },
        });
        notificationsSent++;
      }
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
          message: `${lateEmployees.length} employee(s) and ${lateInterns.length} associate(s) have late report submissions.`,
          link: '/admin/reports?tab=submissions',
          dedupeKey: `late-reports-summary:${today}`,
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
          escalation: e.days_late <= 1 ? 'day_1' : e.days_late <= 3 ? 'day_3' : 'day_7',
        })),
        interns: lateInterns.map((i) => ({
          name: `${i.first_name} ${i.last_name}`,
          missingDate: yesterdayStr,
        })),
      },
    };

    console.log(`[check-late-reports] Completed: ${JSON.stringify(result)}`);

    return new Response(JSON.stringify({ data: result }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('[check-late-reports] Fatal error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
