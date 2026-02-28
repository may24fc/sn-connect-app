import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { z } from 'zod';
import { writeAuditLog } from '../_shared/audit.ts';
import { validateAdminAuth } from '../_shared/auth.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { createInAppNotification } from '../_shared/in-app-notify.ts';
import { sendEmail } from '../_shared/resend.ts';
import { getSupabaseAdmin } from '../_shared/supabase-admin.ts';

// ---------------------------------------------------------------------------
// Input Schema
// ---------------------------------------------------------------------------

const inputSchema = z.object({
  employeeId: z.string().uuid('employeeId must be a valid UUID'),
  employeeEmail: z.string().email().optional(),
  employeeName: z.string().optional(),
});

type OnboardingInput = z.infer<typeof inputSchema>;

// ---------------------------------------------------------------------------
// Default onboarding tasks
// ---------------------------------------------------------------------------

interface DefaultTask {
  title: string;
  description: string;
  category: string;
  dueDaysFromStart: number;
  isRequired: boolean;
}

const DEFAULT_TASKS: DefaultTask[] = [
  {
    title: 'Submit Required Documents',
    description:
      'Upload government IDs, tax forms, and other required documentation to complete your 201 file.',
    category: 'documents',
    dueDaysFromStart: 3,
    isRequired: true,
  },
  {
    title: 'Complete Orientation Training',
    description:
      'Attend the company orientation session covering policies, culture, and key processes.',
    category: 'training',
    dueDaysFromStart: 5,
    isRequired: true,
  },
  {
    title: 'Prepare Equipment',
    description:
      'Set up workstation, laptop, and any required peripherals. IT will assist with configuration.',
    category: 'equipment',
    dueDaysFromStart: 2,
    isRequired: true,
  },
  {
    title: 'Grant System Access',
    description:
      'Request and configure access to company email, HR portal, project management tools, and internal systems.',
    category: 'access',
    dueDaysFromStart: 2,
    isRequired: true,
  },
];

// ---------------------------------------------------------------------------
// Email templates
// ---------------------------------------------------------------------------

function buildWelcomeEmailHtml(employeeName: string, checklistId: string): string {
  return `
    <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <h1 style="color: #4F46E5; font-size: 24px;">Welcome to SN Connect! 🎉</h1>
      <p style="color: #3f3f46; font-size: 14px; line-height: 1.6;">
        Hi ${employeeName},
      </p>
      <p style="color: #3f3f46; font-size: 14px; line-height: 1.6;">
        Welcome aboard! We're excited to have you join the team. Your onboarding checklist has been created
        with a few tasks to help you get started.
      </p>
      <div style="background: #f4f4f5; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <h3 style="color: #18181b; font-size: 16px; margin-top: 0;">Your Onboarding Tasks:</h3>
        <ul style="color: #3f3f46; font-size: 14px; line-height: 1.8; padding-left: 20px;">
          <li>Submit Required Documents (due in 3 days)</li>
          <li>Complete Orientation Training (due in 5 days)</li>
          <li>Prepare Equipment (due in 2 days)</li>
          <li>Grant System Access (due in 2 days)</li>
        </ul>
      </div>
      <a href="${Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.vercel.app') ?? '#'}/onboarding"
         style="display: inline-block; background: #4F46E5; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-size: 14px; font-weight: 500;">
        View Your Checklist
      </a>
      <p style="color: #a1a1aa; font-size: 12px; margin-top: 24px;">
        Checklist ID: ${checklistId}
      </p>
    </div>
  `;
}

function buildHrNotificationHtml(
  employeeName: string,
  employeeEmail: string,
  checklistId: string
): string {
  return `
    <div style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px;">
      <h2 style="color: #18181b; font-size: 20px;">New Employee Onboarding Initiated</h2>
      <div style="background: #f4f4f5; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <table style="width: 100%; font-size: 14px; color: #3f3f46;">
          <tr><td style="padding: 4px 8px; font-weight: 600;">Employee:</td><td>${employeeName}</td></tr>
          <tr><td style="padding: 4px 8px; font-weight: 600;">Email:</td><td>${employeeEmail}</td></tr>
          <tr><td style="padding: 4px 8px; font-weight: 600;">Checklist ID:</td><td>${checklistId}</td></tr>
          <tr><td style="padding: 4px 8px; font-weight: 600;">Tasks Created:</td><td>4</td></tr>
        </table>
      </div>
      <h3 style="color: #18181b; font-size: 16px;">Action Items:</h3>
      <ul style="color: #3f3f46; font-size: 14px; line-height: 1.8; padding-left: 20px;">
        <li>Review and approve submitted documents</li>
        <li>Schedule orientation session</li>
        <li>Coordinate equipment setup with IT</li>
        <li>Configure system access permissions</li>
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

    // 2. Parse and validate input
    const body = await req.json();
    const parseResult = inputSchema.safeParse(body);
    if (!parseResult.success) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid input',
          details: parseResult.error.flatten(),
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    const input: OnboardingInput = parseResult.data;
    const supabase = getSupabaseAdmin();

    // 3. Idempotency check — if checklist already exists, return it
    const { data: existingChecklist } = await supabase
      .from('onboarding_checklists')
      .select('id')
      .eq('employee_id', input.employeeId)
      .is('deleted_at', null)
      .maybeSingle();

    if (existingChecklist) {
      return new Response(
        JSON.stringify({
          success: true,
          checklistId: existingChecklist.id,
          employeeId: input.employeeId,
          tasksCreated: 0,
          message: 'Onboarding checklist already exists for this employee',
          idempotent: true,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // 4. Look up employee details if not provided
    let employeeName = input.employeeName ?? 'New Employee';
    let employeeEmail = input.employeeEmail ?? '';

    if (!input.employeeName || !input.employeeEmail) {
      const { data: employee } = await supabase
        .from('employees')
        .select('first_name, last_name, work_email')
        .eq('id', input.employeeId)
        .maybeSingle();

      if (employee) {
        employeeName = input.employeeName ?? `${employee.first_name} ${employee.last_name}`.trim();
        employeeEmail = input.employeeEmail ?? employee.work_email ?? '';
      }
    }

    // 5. Create onboarding checklist
    const { data: checklist, error: checklistError } = await supabase
      .from('onboarding_checklists')
      .insert({
        employee_id: input.employeeId,
        status: 'not_started',
        started_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (checklistError || !checklist) {
      throw new Error(`Failed to create onboarding checklist: ${checklistError?.message}`);
    }

    // 6. Build and insert default tasks
    const tasks = DEFAULT_TASKS.map((task) => ({
      checklist_id: checklist.id,
      title: task.title,
      description: task.description,
      category: task.category,
      is_required: task.isRequired,
      is_completed: false,
      due_days_from_start: task.dueDaysFromStart,
    }));

    const { error: tasksError } = await supabase.from('onboarding_tasks').insert(tasks);

    if (tasksError) {
      throw new Error(`Failed to create onboarding tasks: ${tasksError.message}`);
    }

    // 7. Send emails (best-effort — don't fail the whole operation)
    const emailResults = await Promise.allSettled([
      // Welcome email to employee
      employeeEmail
        ? sendEmail({
            to: employeeEmail,
            subject: 'Welcome to SN Connect — Your Onboarding Checklist',
            html: buildWelcomeEmailHtml(employeeName, checklist.id),
          })
        : Promise.resolve(null),

      // HR notification email
      sendEmail({
        to: 'hr@snconnect.com',
        subject: `New Employee Onboarding: ${employeeName}`,
        html: buildHrNotificationHtml(employeeName, employeeEmail, checklist.id),
      }),
    ]);

    for (const result of emailResults) {
      if (result.status === 'rejected') {
        console.error('[onboarding] Email send failed:', result.reason);
      }
    }

    // 8. Create in-app notifications for admin/HR users
    const { data: adminUsers } = await supabase
      .from('users')
      .select('id')
      .in('role', ['admin', 'super_admin'])
      .is('deleted_at', null);

    if (adminUsers && adminUsers.length > 0) {
      const adminUserIds = adminUsers.map((u: { id: string }) => u.id);
      await Promise.allSettled(
        adminUserIds.map((userId: string) =>
          createInAppNotification(supabase, {
            userId,
            type: 'onboarding_step',
            title: `New employee onboarding: ${employeeName}`,
            message: `Onboarding checklist created with 4 tasks. Review and ensure timely completion.`,
            link: `/admin/employee-management?checklistId=${checklist.id}`,
            metadata: {
              employeeId: input.employeeId,
              checklistId: checklist.id,
              employeeName,
            },
          })
        )
      );
    }

    // 9. Write audit log
    await writeAuditLog(supabase, {
      tableName: 'onboarding_checklists',
      recordId: checklist.id,
      action: 'onboarding_initiated',
      metadata: {
        employee_id: input.employeeId,
        employee_name: employeeName,
        employee_email: employeeEmail,
        tasks_created: DEFAULT_TASKS.length,
        checklist_id: checklist.id,
      },
    });

    // 10. Return success
    return new Response(
      JSON.stringify({
        success: true,
        checklistId: checklist.id,
        employeeId: input.employeeId,
        tasksCreated: DEFAULT_TASKS.length,
      }),
      {
        status: 201,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[onboarding-new-employee] Error:', message);

    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
