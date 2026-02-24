import {
  createInternDailyLogSchema,
  updateInternDailyLogSchema,
} from '@/lib/schemas/internship.schema';
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

    const internshipUpdate = await supabase
      .from('internships')
      .update({ completed_hours: Number(internship.completed_hours || 0) + payload.hoursWorked })
      .eq('id', id)
      .select('id, completed_hours')
      .single();

    if (internshipUpdate.error) {
      console.error('Error updating internship completed hours:', internshipUpdate.error);
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

    const internship = access.internship as { supervisor_id: string | null };
    const isAdmin = isInternshipAdmin(role);
    const isSupervisor = internship.supervisor_id === user.id;

    if (!isAdmin && !isSupervisor) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
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

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error in PATCH /api/internships/[id]/logs:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
