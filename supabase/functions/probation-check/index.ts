import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { getSupabaseAdmin } from '../_shared/supabase-admin.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { validateAdminAuth } from '../_shared/auth.ts';
import { sendEmail } from '../_shared/resend.ts';
import { createInAppNotification } from '../_shared/in-app-notify.ts';
import { writeAuditLog } from '../_shared/audit.ts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EmployeeProbation {
  id: string;
  first_name: string;
  last_name: string;
  work_email: string;
  probation_end_date: string;
  user_id: string | null;
  immediate_head: string | null;
  manager_first_name: string | null;
  manager_last_name: string | null;
  manager_work_email: string | null;
  manager_user_id: string | null;
}

type MilestoneType = 'prepare_evaluation' | 'reminder' | 'escalation' | 'end_date_resolution';

interface MilestoneConfig {
  type: MilestoneType;
  daysRemaining: number;
  urgency: 'low' | 'medium' | 'high' | 'critical';
  includeHr: boolean;
  includeSuperAdmin: boolean;
  subjectPrefix: string;
}

// ---------------------------------------------------------------------------
// Milestone configuration
// ---------------------------------------------------------------------------

const MILESTONES: MilestoneConfig[] = [
  {
    type: 'prepare_evaluation',
    daysRemaining: 30,
    urgency: 'low',
    includeHr: false,
    includeSuperAdmin: false,
    subjectPrefix: '📋 Prepare Evaluation',
  },
  {
    type: 'reminder',
    daysRemaining: 14,
    urgency: 'medium',
    includeHr: true,
    includeSuperAdmin: false,
    subjectPrefix: '⏰ Probation Reminder',
  },
  {
    type: 'escalation',
    daysRemaining: 7,
    urgency: 'high',
    includeHr: true,
    includeSuperAdmin: false,
    subjectPrefix: '⚠️ Probation Escalation',
  },
  {
    type: 'end_date_resolution',
    daysRemaining: 0,
    urgency: 'critical',
    includeHr: true,
    includeSuperAdmin: true,
    subjectPrefix: '🚨 Probation End Date',
  },
];

// ---------------------------------------------------------------------------
// Email template
// ---------------------------------------------------------------------------

function buildProbationEmailHtml(
  employee: EmployeeProbation,
  milestone: MilestoneConfig,
  daysRemaining: number
): string {
  const fullName = `${employee.first_name} ${employee.last_name}`;
  const endDate = new Date(employee.probation_end_date).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const urgencyColors: Record<string, { bg: string; border: string; text: string }> = {
    low: { bg: '#f0fdf4', border: '#bbf7d0', text: '#166534' },
    medium: { bg: '#fefce8', border: '#fef08a', text: '#854d0e' },
    high: { bg: '#fff7ed', border: '#fed7aa', text: '#9a3412' },
    critical: { bg: '#fef2f2', border: '#fecaca', text: '#991b1b' },
  };

  const colors = urgencyColors[milestone.urgency];

  let actionItems: string;
  switch (milestone.type) {
    case 'prepare_evaluation':
      actionItems = `
        <li>Begin preparing the probation evaluation form</li>
        <li>Review employee's performance during probation period</li>
        <li>Schedule informal check-in with the employee</li>
      `;
      break;
    case 'reminder':
      actionItems = `
        <li>Complete probation evaluation assessment</li>
        <li>Schedule formal probation review meeting</li>
        <li>Prepare recommendation (regularize, extend, or terminate)</li>
      `;
      break;
    case 'escalation':
      actionItems = `
        <li><strong>Urgent:</strong> Finalize probation evaluation</li>
        <li>Conduct probation review meeting if not done</li>
        <li>Submit recommendation to HR for processing</li>
      `;
      break;
    case 'end_date_resolution':
      actionItems = `
        <li><strong>Action required today:</strong> Probation period ends today</li>
        <li>Process regularization or termination</li>
        <li>Update employee status in the system</li>
        <li>Communicate decision to the employee</li>
      `;
      break;
  }

  return `
    <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #18181b; font-size: 20px;">${milestone.subjectPrefix}</h2>
      <div style="background: ${colors.bg}; border: 1px solid ${colors.border}; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <p style="color: ${colors.text}; font-size: 14px; font-weight: 600; margin: 0;">
          ${daysRemaining === 0 ? 'Probation ends TODAY' : `${daysRemaining} days remaining`}
        </p>
      </div>
      <table style="width: 100%; font-size: 14px; color: #3f3f46; margin: 16px 0;">
        <tr><td style="padding: 4px 8px; font-weight: 600;">Employee:</td><td>${fullName}</td></tr>
        <tr><td style="padding: 4px 8px; font-weight: 600;">Email:</td><td>${employee.work_email}</td></tr>
        <tr><td style="padding: 4px 8px; font-weight: 600;">Probation End Date:</td><td>${endDate}</td></tr>
        <tr><td style="padding: 4px 8px; font-weight: 600;">Manager:</td><td>${employee.manager_first_name ? `${employee.manager_first_name} ${employee.manager_last_name}` : 'N/A'}</td></tr>
      </table>
      <h3 style="color: #18181b; font-size: 16px;">Required Actions:</h3>
      <ul style="color: #3f3f46; font-size: 14px; line-height: 1.8; padding-left: 20px;">
        ${actionItems}
      </ul>
    </div>
  `;
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;

  try {
    // 1. Validate auth
    const auth = validateAdminAuth(req);
    if (!auth.ok) {
      return new Response(JSON.stringify({ success: false, error: auth.error }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = getSupabaseAdmin();

    // 2. Query employees with probation_end_date in the next 30 days (inclusive of today)
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    const thirtyDaysLater = new Date(today);
    thirtyDaysLater.setDate(thirtyDaysLater.getDate() + 30);
    const thirtyDaysStr = thirtyDaysLater.toISOString().split('T')[0];

    const { data: employees, error: queryError } = await supabase
      .from('employees')
      .select(`
        id,
        first_name,
        last_name,
        work_email,
        probation_end_date,
        user_id,
        immediate_head
      `)
      .not('probation_end_date', 'is', null)
      .gte('probation_end_date', todayStr)
      .lte('probation_end_date', thirtyDaysStr)
      .is('deleted_at', null);

    if (queryError) {
      throw new Error(`Failed to query employees: ${queryError.message}`);
    }

    if (!employees || employees.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          processed: 0,
          notified: 0,
          skipped: 0,
          message: 'No employees with upcoming probation end dates found',
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 3. Look up manager info for employees with immediate_head
    const managerIds = [...new Set(employees.filter((e) => e.immediate_head).map((e) => e.immediate_head))];
    let managersMap: Record<string, { first_name: string; last_name: string; work_email: string; user_id: string | null }> = {};

    if (managerIds.length > 0) {
      const { data: managers } = await supabase
        .from('employees')
        .select('id, first_name, last_name, work_email, user_id')
        .in('id', managerIds);

      if (managers) {
        managersMap = Object.fromEntries(
          managers.map((m) => [m.id, m])
        );
      }
    }

    // 4. Get HR/Admin user IDs for in-app notifications
    const { data: hrUsers } = await supabase
      .from('users')
      .select('id, role')
      .in('role', ['admin', 'super_admin'])
      .is('deleted_at', null);

    const hrUserIds = hrUsers?.filter((u) => u.role === 'admin').map((u) => u.id) ?? [];
    const superAdminIds = hrUsers?.filter((u) => u.role === 'super_admin').map((u) => u.id) ?? [];

    // 5. Process each employee against milestones
    let processed = 0;
    let notified = 0;
    let skipped = 0;

    for (const emp of employees) {
      processed++;

      const probationEnd = new Date(emp.probation_end_date);
      const daysRemaining = Math.floor(
        (probationEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      );

      // Find matching milestone
      const milestone = MILESTONES.find((m) => m.daysRemaining === daysRemaining);
      if (!milestone) {
        skipped++;
        continue;
      }

      // Idempotency check: has this milestone been sent today for this employee?
      const { data: existingLog } = await supabase
        .from('audit_logs')
        .select('id')
        .eq('action', `probation_milestone_${milestone.type}`)
        .gte('performed_at', `${todayStr}T00:00:00Z`)
        .lt('performed_at', `${todayStr}T23:59:59Z`)
        .filter('metadata->>employee_id', 'eq', emp.id)
        .maybeSingle();

      if (existingLog) {
        skipped++;
        continue;
      }

      // Build enriched employee record
      const manager = emp.immediate_head ? managersMap[emp.immediate_head] : null;
      const enrichedEmployee: EmployeeProbation = {
        ...emp,
        manager_first_name: manager?.first_name ?? null,
        manager_last_name: manager?.last_name ?? null,
        manager_work_email: manager?.work_email ?? null,
        manager_user_id: manager?.user_id ?? null,
      };

      // Build recipient list
      const emailRecipients: string[] = [];
      const inAppRecipientIds: string[] = [];

      // Manager is always a recipient
      if (manager?.work_email) {
        emailRecipients.push(manager.work_email);
      }
      if (manager?.user_id) {
        inAppRecipientIds.push(manager.user_id);
      }

      // Include HR for 14d, 7d, 0d
      if (milestone.includeHr) {
        emailRecipients.push('hr@snconnect.com');
        inAppRecipientIds.push(...hrUserIds);
      }

      // Include Super Admin for 0d
      if (milestone.includeSuperAdmin) {
        inAppRecipientIds.push(...superAdminIds);
      }

      if (emailRecipients.length === 0) {
        // Fallback: always notify HR if no other recipients
        emailRecipients.push('hr@snconnect.com');
      }

      // Send email
      const emailHtml = buildProbationEmailHtml(enrichedEmployee, milestone, daysRemaining);
      const fullName = `${emp.first_name} ${emp.last_name}`;

      try {
        await sendEmail({
          to: emailRecipients,
          subject: `${milestone.subjectPrefix}: ${fullName} — ${daysRemaining === 0 ? 'Ends Today' : `${daysRemaining} Days Left`}`,
          html: emailHtml,
        });
      } catch (emailErr) {
        console.error(
          `[probation-check] Email failed for ${fullName}:`,
          emailErr instanceof Error ? emailErr.message : emailErr
        );
      }

      // Create in-app notifications
      const uniqueRecipientIds = [...new Set(inAppRecipientIds)];
      for (const userId of uniqueRecipientIds) {
        await createInAppNotification(supabase, {
          userId,
          type: 'probation_update',
          title: `${milestone.subjectPrefix}: ${fullName}`,
          message: `Probation ${daysRemaining === 0 ? 'ends today' : `ends in ${daysRemaining} days`}. Action required.`,
          link: `/admin/employee-management?employeeId=${emp.id}`,
          metadata: {
            employeeId: emp.id,
            daysRemaining,
            milestoneType: milestone.type,
            urgency: milestone.urgency,
          },
        });
      }

      // Write audit log
      await writeAuditLog(supabase, {
        tableName: 'employees',
        recordId: emp.id,
        action: `probation_milestone_${milestone.type}`,
        metadata: {
          employee_id: emp.id,
          employee_name: fullName,
          days_remaining: daysRemaining,
          milestone_type: milestone.type,
          urgency: milestone.urgency,
          recipients: emailRecipients,
          in_app_recipients: uniqueRecipientIds.length,
        },
      });

      notified++;
    }

    // 6. Return summary
    return new Response(
      JSON.stringify({
        success: true,
        processed,
        notified,
        skipped,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[probation-check] Error:', message);

    return new Response(
      JSON.stringify({ success: false, error: message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
