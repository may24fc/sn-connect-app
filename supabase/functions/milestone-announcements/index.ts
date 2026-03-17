import { serve } from 'https://deno.land/std@0.208.0/http/server.ts';
import { writeAuditLog } from '../_shared/audit.ts';
import { validateAdminAuth } from '../_shared/auth.ts';
import { corsHeaders, handleCors } from '../_shared/cors.ts';
import { createBulkInAppNotifications } from '../_shared/in-app-notify.ts';
import { getSupabaseAdmin } from '../_shared/supabase-admin.ts';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface EmployeeRow {
  id: string;
  user_id: string | null;
  first_name: string;
  last_name: string;
  work_email: string | null;
  birthday: string | null;
  date_hired: string | null;
  position: string | null;
  department: string | null;
}

interface MilestoneRecord {
  employee: EmployeeRow;
  type: 'birthday' | 'anniversary';
  yearsCount?: number;
  auditKey: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns true when the given date's month + day matches today.
 * Comparison is done against the Philippine timezone (UTC+8) date,
 * since the function runs at 00:00 UTC = 08:00 PHT.
 */
function isToday(dateStr: string, todayMonth: number, todayDay: number): boolean {
  const d = new Date(dateStr);
  // Use UTC month/day since date columns are plain dates stored at midnight UTC
  return d.getUTCMonth() === todayMonth && d.getUTCDate() === todayDay;
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

function buildBirthdayAnnouncementContent(emp: EmployeeRow): { title: string; content: string } {
  const fullName = `${emp.first_name} ${emp.last_name}`.trim();
  const detail = [emp.position, emp.department].filter(Boolean).join(' · ');

  return {
    title: `🎂 Happy Birthday, ${fullName}!`,
    content: `Please join us in wishing ${fullName}${detail ? ` (${detail})` : ''} a very Happy Birthday! 🎉 We hope your day is filled with joy and celebration. Cheers to another wonderful year!`,
  };
}

function buildAnniversaryAnnouncementContent(
  emp: EmployeeRow,
  yearsCount: number
): { title: string; content: string } {
  const fullName = `${emp.first_name} ${emp.last_name}`.trim();
  const detail = [emp.position, emp.department].filter(Boolean).join(' · ');
  const ordinalYears = ordinal(yearsCount);

  const emoji = yearsCount >= 10 ? '🏆' : yearsCount >= 5 ? '⭐' : '🎉';

  return {
    title: `${emoji} ${ordinalYears} Work Anniversary — ${fullName}!`,
    content: `Today marks ${fullName}'s ${ordinalYears} work anniversary with SN Connect${detail ? ` (${detail})` : ''}. Thank you for your ${yearsCount === 1 ? 'first incredible year' : `${yearsCount} years of dedication and outstanding contributions`}! We are grateful to have you on the team. Here's to many more! ${emoji}`,
  };
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
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
    // 1. Validate auth
    const auth = validateAdminAuth(req);
    if (!auth.ok) {
      return new Response(JSON.stringify({ success: false, error: auth.error }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabase = getSupabaseAdmin();

    // 2. Resolve today's month/day in UTC (function runs at 00:00 UTC)
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0] as string; // YYYY-MM-DD
    const todayMonth = now.getUTCMonth(); // 0-indexed
    const todayDay = now.getUTCDate();

    // 3. Fetch all active employees
    const { data: employees, error: empError } = await supabase
      .from('employees')
      .select('id, user_id, first_name, last_name, work_email, birthday, date_hired, position, department')
      .is('deleted_at', null);

    if (empError) {
      throw new Error(`Failed to query employees: ${empError.message}`);
    }

    if (!employees || employees.length === 0) {
      return new Response(
        JSON.stringify({ success: true, processed: 0, created: 0, skipped: 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 4. Identify today's milestones
    const todayMilestones: MilestoneRecord[] = [];

    for (const emp of employees as EmployeeRow[]) {
      // Birthday check
      if (emp.birthday && isToday(emp.birthday, todayMonth, todayDay)) {
        todayMilestones.push({
          employee: emp,
          type: 'birthday',
          auditKey: `milestone_birthday_${todayStr}_${emp.id}`,
        });
      }

      // Work anniversary check (only for employees with a hire date, and hired at least 1 year ago)
      if (emp.date_hired && isToday(emp.date_hired, todayMonth, todayDay)) {
        const hireDate = new Date(emp.date_hired);
        const yearsCount = now.getUTCFullYear() - hireDate.getUTCFullYear();
        // Skip 0-year anniversaries (hired today)
        if (yearsCount > 0) {
          todayMilestones.push({
            employee: emp,
            type: 'anniversary',
            yearsCount,
            auditKey: `milestone_anniversary_${todayStr}_${emp.id}`,
          });
        }
      }
    }

    if (todayMilestones.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          processed: employees.length,
          created: 0,
          skipped: 0,
          message: 'No milestones today',
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 5. Get a super_admin or admin user ID to use as announcement author
    const { data: systemUsers } = await supabase
      .from('users')
      .select('id')
      .in('role', ['super_admin', 'admin'])
      .is('deleted_at', null)
      .limit(1);

    const authorId = systemUsers?.[0]?.id;
    if (!authorId) {
      throw new Error('No admin user found to author milestone announcements');
    }

    // 6. Fetch all active user IDs to send in-app notifications
    const { data: allUsers } = await supabase
      .from('users')
      .select('id')
      .is('deleted_at', null);

    const allUserIds = (allUsers ?? []).map((u: { id: string }) => u.id);

    // 7. Process each milestone with idempotency
    let created = 0;
    let skipped = 0;

    for (const milestone of todayMilestones) {
      const { employee, type, yearsCount, auditKey } = milestone;

      // Idempotency: check if already processed today
      const { data: existingLog } = await supabase
        .from('audit_logs')
        .select('id')
        .eq('operation', auditKey)
        .gte('performed_at', `${todayStr}T00:00:00Z`)
        .lt('performed_at', `${todayStr}T23:59:59Z`)
        .maybeSingle();

      if (existingLog) {
        skipped++;
        continue;
      }

      // Build announcement content
      const { title, content } =
        type === 'birthday'
          ? buildBirthdayAnnouncementContent(employee)
          : buildAnniversaryAnnouncementContent(employee, yearsCount ?? 1);

      // Create the announcement (status=published, target_roles={} = all users)
      const { data: announcement, error: annError } = await supabase
        .from('announcements')
        .insert({
          title,
          content,
          excerpt: content.slice(0, 160),
          category: 'events',
          priority: 'normal',
          status: 'published',
          published_at: now.toISOString(),
          target_roles: [],
          target_departments: [],
          target_employees: [],
          is_pinned: false,
          allow_comments: true,
          author_id: authorId,
          created_by: authorId,
        })
        .select('id')
        .single();

      if (annError || !announcement) {
        console.error(
          `[milestone-announcements] Failed to create announcement for ${employee.first_name} ${employee.last_name}:`,
          annError?.message
        );
        continue;
      }

      // Send in-app notification to all users
      if (allUserIds.length > 0) {
        await createBulkInAppNotifications(supabase, allUserIds, {
          type: 'announcement_new',
          title,
          message: content.slice(0, 120),
          link: `/announcements/${announcement.id}`,
          metadata: {
            announcementId: announcement.id,
            milestoneType: type,
            employeeId: employee.id,
            ...(yearsCount !== undefined ? { yearsCount } : {}),
          },
        });
      }

      // Write audit log for idempotency
      await writeAuditLog(supabase, {
        tableName: 'announcements',
        recordId: announcement.id,
        action: auditKey,
        metadata: {
          employee_id: employee.id,
          employee_name: `${employee.first_name} ${employee.last_name}`,
          milestone_type: type,
          announcement_id: announcement.id,
          date: todayStr,
          ...(yearsCount !== undefined ? { years_count: yearsCount } : {}),
        },
      });

      created++;
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: employees.length,
        milestones_found: todayMilestones.length,
        created,
        skipped,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('[milestone-announcements] Error:', message);

    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
