import {
  createInternDailyLogSchema,
  updateInternDailyLogSchema,
  updateInternDraftLogSchema,
} from '@/lib/schemas/internship.schema';
import {
  createNotificationsForUsers,
  getAdminUserIds,
  getUserDisplayName,
} from '@/lib/notifications/create-notification';
import { logActivity } from '@/lib/audit';
import { type NextRequest, NextResponse } from 'next/server';
import { canAccessInternship, getAuthedInternshipContext, isInternshipAdmin } from '../../_lib';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const { data, error: queryError } = await supabase
      .from('intern_daily_logs')
      .select('*')
      .eq('internship_id', id)
      .order('log_date', { ascending: false });

    if (queryError) {
      console.error('Error fetching intern daily logs:', queryError);
      return NextResponse.json({ error: 'Failed to fetch daily logs' }, { status: 500 });
    }

    return NextResponse.json({ data: data || [] });
  } catch (error) {
    console.error('Unexpected error in GET /api/internships/[id]/logs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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

    const internship = access.internship as { employee_id: string; completed_hours?: number };
    const isAdmin = isInternshipAdmin(role);
    const canSubmitForSelf =
      access.employeeId !== null && access.employeeId === internship.employee_id;

    if (!isAdmin && !canSubmitForSelf) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createInternDailyLogSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const payload = parsed.data;

    const { data, error: insertError } = await supabase
      .from('intern_daily_logs')
      .insert({
        internship_id: id,
        log_date: payload.logDate,
        hours_worked: payload.hoursWorked,
        tasks_completed: payload.tasksCompleted,
        learnings: payload.learnings || null,
        challenges: payload.challenges || null,
        status: payload.status ?? 'submitted',
        is_approved: false,
        approved_by: null,
        approved_at: null,
      })
      .select('*')
      .single();

    if (insertError || !data) {
      if (insertError?.code === '23505') {
        return NextResponse.json(
          { error: 'A daily log already exists for this date' },
          { status: 409 }
        );
      }
      console.error('Error creating intern daily log:', insertError);
      return NextResponse.json({ error: 'Failed to create daily log' }, { status: 500 });
    }

    // Only increment completed hours when the log is submitted
    if ((payload.status ?? 'submitted') === 'submitted') {
      const internshipUpdate = await supabase
        .from('internships')
        .update({ completed_hours: Number(internship.completed_hours || 0) + payload.hoursWorked })
        .eq('id', id)
        .select('id, completed_hours')
        .single();

      if (internshipUpdate.error) {
        console.error('Error updating internship completed hours:', internshipUpdate.error);
      }

      // Notify admins that an intern has submitted a daily log
      const submitterName = await getUserDisplayName(user.id);
      const adminIds = await getAdminUserIds();
      const adminRecipients = adminIds.filter((adminId) => adminId !== user.id);

      createNotificationsForUsers(adminRecipients, {
        type: 'intern_log_submitted',
        title: 'Intern Daily Log Submitted',
        message: `${submitterName} submitted a daily log for ${payload.logDate}`,
        link: `/admin/interns/${id}`,
        metadata: { internshipId: id, logDate: payload.logDate, submittedBy: user.id },
      });

      logActivity(supabase, {
        userId: user.id,
        action: 'submit_intern_daily_log',
        tableName: 'intern_daily_logs',
        recordId: data.id,
      });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/internships/[id]/logs:', error);
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
    if (!access.allowed || !access.internship) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const internship = access.internship as { supervisor_id: string | null; employee_id: string; completed_hours?: number };
    const isAdmin = isInternshipAdmin(role);
    const isSupervisor = internship.supervisor_id === user.id;
    const isOwnIntern = access.employeeId !== null && access.employeeId === internship.employee_id;

    const body = await request.json();

    // Intern self-editing their own draft log
    if (isOwnIntern && !isAdmin && !isSupervisor) {
      const parsed = updateInternDraftLogSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: 'Invalid request body', details: parsed.error.flatten() },
          { status: 400 }
        );
      }

      const payload = parsed.data;

      // Verify the log exists and is a draft
      const { data: existingLog } = await supabase
        .from('intern_daily_logs')
        .select('id, status, hours_worked')
        .eq('id', payload.logId)
        .eq('internship_id', id)
        .single();

      if (!existingLog) {
        return NextResponse.json({ error: 'Log not found' }, { status: 404 });
      }

      if (existingLog.status !== 'draft') {
        return NextResponse.json(
          { error: 'Only draft logs can be edited' },
          { status: 403 }
        );
      }

      const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
      if (payload.logDate !== undefined) updates.log_date = payload.logDate;
      if (payload.hoursWorked !== undefined) updates.hours_worked = payload.hoursWorked;
      if (payload.tasksCompleted !== undefined) updates.tasks_completed = payload.tasksCompleted;
      if (payload.learnings !== undefined) updates.learnings = payload.learnings;
      if (payload.challenges !== undefined) updates.challenges = payload.challenges;
      if (payload.status !== undefined) updates.status = payload.status;

      const { data, error: updateError } = await supabase
        .from('intern_daily_logs')
        .update(updates)
        .eq('id', payload.logId)
        .eq('internship_id', id)
        .select('*')
        .single();

      if (updateError || !data) {
        console.error('Error updating draft log:', updateError);
        return NextResponse.json({ error: 'Failed to update daily log' }, { status: 500 });
      }

      // If submitting a draft, increment completed hours
      if (payload.status === 'submitted') {
        const hoursToAdd = payload.hoursWorked ?? existingLog.hours_worked;
        const internshipUpdate = await supabase
          .from('internships')
          .update({ completed_hours: Number(internship.completed_hours || 0) + Number(hoursToAdd) })
          .eq('id', id)
          .select('id, completed_hours')
          .single();

        if (internshipUpdate.error) {
          console.error('Error updating internship completed hours:', internshipUpdate.error);
        }
      }

      return NextResponse.json({ data });
    }

    if (!isAdmin && !isSupervisor) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    const parsed = updateInternDailyLogSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const payload = parsed.data;
    const updates: Record<string, unknown> = {};

    if (payload.supervisorNotes !== undefined) {
      updates.supervisor_notes = payload.supervisorNotes;
    }

    if (payload.isApproved !== undefined) {
      updates.is_approved = payload.isApproved;
      updates.approved_by = payload.isApproved ? user.id : null;
      updates.approved_at = payload.isApproved ? new Date().toISOString() : null;
    }

    const { data, error: updateError } = await supabase
      .from('intern_daily_logs')
      .update(updates)
      .eq('id', payload.logId)
      .eq('internship_id', id)
      .select('*')
      .single();

    if (updateError || !data) {
      console.error('Error updating daily log:', updateError);
      return NextResponse.json({ error: 'Failed to update daily log' }, { status: 500 });
    }

    // Notify intern that their daily log was approved/rejected
    if (payload.isApproved !== undefined && access.employeeId) {
      const approverName = await getUserDisplayName(user.id);
      const isApproved = payload.isApproved;

      if (isApproved) {
        createNotificationsForUsers([access.employeeId], {
          type: 'intern_log_approved',
          title: 'Daily Log Approved',
          message: `${approverName} approved your daily log for ${data.log_date}`,
          link: `/intern/dashboard`,
          metadata: { internshipId: id, logDate: data.log_date, approvedBy: user.id },
        });
      } else {
        // For rejection (is_approved set to false)
        createNotificationsForUsers([access.employeeId], {
          type: 'system',
          title: 'Daily Log Review',
          message: `${approverName} reviewed your daily log for ${data.log_date}${data.supervisor_notes ? `: ${data.supervisor_notes}` : ''}`,
          link: `/intern/dashboard`,
          metadata: { internshipId: id, logDate: data.log_date, reviewedBy: user.id },
        });
      }

      logActivity(supabase, {
        userId: user.id,
        action: isApproved ? 'approve_intern_log' : 'review_intern_log',
        tableName: 'intern_daily_logs',
        recordId: data.id,
        metadata: { isApproved, supervisorNotes: data.supervisor_notes },
      });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error in PATCH /api/internships/[id]/logs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
