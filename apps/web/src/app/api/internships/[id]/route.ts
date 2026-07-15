import {
  normalizeAttachmentRecords,
  normalizeProjectEntries,
  normalizeStringList,
} from '@/lib/associate-daily-log';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/server';
import { updateInternshipSchema } from '@/lib/schemas/internship.schema';
import { type NextRequest, NextResponse } from 'next/server';
import {
  canAccessInternship,
  getAuthedInternshipContext,
  isInternshipAdmin,
  toInternshipStatusBadge,
} from '../_lib';

interface DailyLogRow {
  id: string;
  internship_id: string;
  log_date: string;
  hours_worked: number;
  tasks_completed: string;
  learnings: string | null;
  challenges: string | null;
  project_entries?: unknown;
  attachments?: unknown;
  supervisor_notes: string | null;
  is_approved: boolean;
  approved_at: string | null;
  created_at: string;
  updated_at?: string;
  status?: string;
}

const DAILY_LOG_ATTACHMENT_BUCKET = 'associate-daily-log-attachments';
const DAILY_LOG_ATTACHMENT_SIGNED_URL_TTL_SECONDS = 60 * 10;

async function signDailyLogAttachments(attachments: unknown) {
  const adminClient = createSupabaseAdminClient();
  const normalizedAttachments = normalizeAttachmentRecords(attachments);

  return Promise.all(
    normalizedAttachments.map(async (attachment) => {
      const { data, error } = await adminClient.storage
        .from(DAILY_LOG_ATTACHMENT_BUCKET)
        .createSignedUrl(attachment.filePath, DAILY_LOG_ATTACHMENT_SIGNED_URL_TTL_SECONDS);

      return {
        ...attachment,
        signedUrl: error ? null : data?.signedUrl ?? null,
      };
    })
  );
}

function getWeekRange(dateValue: Date): { start: string; end: string; label: string } {
  const date = new Date(dateValue);
  const day = date.getDay();
  const diffToMonday = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diffToMonday);
  date.setHours(0, 0, 0, 0);

  const weekStart = new Date(date);
  const weekEnd = new Date(date);
  weekEnd.setDate(weekEnd.getDate() + 6);

  const start = weekStart.toISOString().split('T')[0] || '';
  const end = weekEnd.toISOString().split('T')[0] || '';

  return {
    start,
    end,
    label: `${start} to ${end}`,
  };
}

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { supabase, user, role, error } = await getAuthedInternshipContext();
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const access = await canAccessInternship(supabase, id, user.id, role);
    if (!access.allowed || !access.internship) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const internship = access.internship as {
      id: string;
      employee_id: string;
      start_date: string;
      end_date: string;
      required_hours: number;
      completed_hours: number;
      status: string;
      supervisor_id: string | null;
      department: string;
      school: string | null;
      program: string | null;
      created_at: string;
      updated_at: string;
    };

    const [{ data: internEmployee }, { data: supervisorEmployee }, { data: logs }] =
      await Promise.all([
        supabase
          .from('employees')
          .select('id, user_id, first_name, last_name, company_email, phone, department')
          .eq('id', internship.employee_id)
          .is('deleted_at', null)
          .single(),
        internship.supervisor_id
          ? supabase
              .from('employees')
              .select('user_id, first_name, last_name, company_email')
              .eq('user_id', internship.supervisor_id)
              .is('deleted_at', null)
              .maybeSingle()
          : Promise.resolve({ data: null }),
        supabase
          .from('intern_daily_logs')
          .select('*')
          .eq('internship_id', internship.id)
          .order('log_date', { ascending: false }),
      ]);

    if (!internEmployee) {
      return NextResponse.json({ error: 'Associate profile not found' }, { status: 404 });
    }

    const reportRows = await Promise.all(
      (((logs as Array<DailyLogRow> | null) || []).map(async (log) => ({
        id: log.id,
        internId: internship.employee_id,
        internshipPeriodId: internship.id,
        date: log.log_date,
        tasksCompleted: log.tasks_completed,
        hoursLogged: Number(log.hours_worked),
        learnings: log.learnings || '',
        challenges: log.challenges || undefined,
        projectEntries: normalizeProjectEntries(log.project_entries, log.tasks_completed),
        blockers: normalizeStringList(undefined, log.challenges),
        nextSteps: normalizeStringList(undefined, log.learnings),
        attachments: await signDailyLogAttachments(log.attachments),
        supervisorFeedback: log.supervisor_notes || undefined,
        status: log.status === 'draft' ? 'draft' : log.is_approved ? 'reviewed' : 'submitted',
        submittedAt: log.created_at,
        reviewedAt: log.approved_at || undefined,
        createdAt: log.created_at,
        updatedAt: log.updated_at || log.created_at,
      })))
    );

    const weeklyMap = new Map<string, { week: string; hours: number; target: number }>();
    for (const log of (logs as Array<DailyLogRow> | null) || []) {
      const week = getWeekRange(new Date(log.log_date));
      const current = weeklyMap.get(week.label) || { week: week.label, hours: 0, target: 40 };
      current.hours += Number(log.hours_worked || 0);
      weeklyMap.set(week.label, current);
    }

    const weeklyHours = Array.from(weeklyMap.values()).sort((a, b) =>
      a.week.localeCompare(b.week, undefined, { numeric: true })
    );

    return NextResponse.json({
      data: {
        id: internship.id,
        internshipId: internship.id,
        employeeId: internship.employee_id,
        userId: internEmployee.user_id,
        name: `${internEmployee.first_name} ${internEmployee.last_name}`,
        email: internEmployee.company_email || '',
        phone: internEmployee.phone || null,
        school: internship.school || 'N/A',
        program: internship.program || 'N/A',
        department: internship.department || internEmployee.department,
        supervisor: supervisorEmployee
          ? `${supervisorEmployee.first_name} ${supervisorEmployee.last_name}`
          : 'Unassigned',
        supervisorId: internship.supervisor_id,
        supervisorEmail: supervisorEmployee?.company_email || null,
        startDate: internship.start_date,
        endDate: internship.end_date,
        requiredHours: Number(internship.required_hours || 0),
        completedHours: Number(internship.completed_hours || 0),
        status: toInternshipStatusBadge(internship.status),
        pendingReports: reportRows.filter((row) => row.status === 'submitted').length,
        recentReports: reportRows,
        weeklyHours,
        createdAt: internship.created_at,
        updatedAt: internship.updated_at,
      },
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/internships/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { supabase, user, role, error } = await getAuthedInternshipContext();
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const access = await canAccessInternship(supabase, id, user.id, role);
    if (!access.allowed) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = updateInternshipSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const isAdmin = isInternshipAdmin(role);
    const current = access.internship as { supervisor_id: string | null };
    const isSupervisor = current.supervisor_id === user.id;

    if (!isAdmin && !isSupervisor) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const payload = parsed.data;
    const updates: Record<string, unknown> = {};

    if (payload.startDate !== undefined) updates.start_date = payload.startDate;
    if (payload.endDate !== undefined) updates.end_date = payload.endDate;
    if (payload.requiredHours !== undefined) updates.required_hours = payload.requiredHours;
    if (payload.completedHours !== undefined) updates.completed_hours = payload.completedHours;
    if (payload.status !== undefined) updates.status = payload.status;
    if (payload.supervisorId !== undefined) updates.supervisor_id = payload.supervisorId;
    if (payload.department !== undefined) updates.department = payload.department;
    if (payload.school !== undefined) updates.school = payload.school;
    if (payload.program !== undefined) updates.program = payload.program;

    const { data, error: updateError } = await supabase
      .from('internships')
      .update(updates)
      .eq('id', id)
      .select('*')
      .single();

    if (updateError || !data) {
      console.error('Error updating internship:', updateError);
      return NextResponse.json({ error: 'Failed to update internship' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error in PATCH /api/internships/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/internships/[id]
 * Soft delete internship and associated employee record
 * Permissions: Super Admin only
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check role permission - super_admin only
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (userData.role !== 'super_admin') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Fetch the internship to get the employee_id
    const { data: internship, error: fetchError } = await supabase
      .from('internships')
      .select('id, employee_id')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (fetchError || !internship) {
      return NextResponse.json({ error: 'Internship not found' }, { status: 404 });
    }

    // Soft delete the internship
    const { error: deleteError } = await supabase
      .from('internships')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .is('deleted_at', null);

    if (deleteError) {
      console.error('Error deleting internship:', deleteError);
      return NextResponse.json({ error: 'Failed to delete internship' }, { status: 500 });
    }

    // Also soft delete the associated employee record
    if (internship.employee_id) {
      const { error: empDeleteError } = await supabase
        .from('employees')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', internship.employee_id)
        .is('deleted_at', null);

      if (empDeleteError) {
        console.error('Error deleting associated employee:', empDeleteError);
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/internships/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
