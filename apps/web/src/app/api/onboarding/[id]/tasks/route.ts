import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthedOnboardingContext, isOnboardingAdmin } from '../../_lib';

const createTaskSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  category: z.string().min(1),
  isRequired: z.boolean().default(true),
  dueDaysFromStart: z.number().int().min(1).max(365).default(7),
  assignedTo: z.string().uuid().optional().nullable(),
});

const updateTaskSchema = z.object({
  taskId: z.string().uuid(),
  isCompleted: z.boolean(),
});

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { supabase, user, role, error } = await getAuthedOnboardingContext();
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: checklist, error: checklistError } = await supabase
      .from('onboarding_checklists')
      .select('id, employee_id, employees(user_id)')
      .eq('id', id)
      .maybeSingle();

    if (checklistError || !checklist) {
      return NextResponse.json({ error: 'Checklist not found' }, { status: 404 });
    }

    const ownerId = (
      checklist as { employees?: { user_id?: string } | Array<{ user_id?: string }> | null }
    ).employees;
    const ownerUserId = Array.isArray(ownerId) ? ownerId[0]?.user_id : ownerId?.user_id;
    if (!(isOnboardingAdmin(role) || ownerUserId === user.id)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { data, error: tasksError } = await supabase
      .from('onboarding_tasks')
      .select('*')
      .eq('checklist_id', id)
      .order('created_at', { ascending: true });

    if (tasksError) {
      return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
    }

    return NextResponse.json({ data: data ?? [] });
  } catch (error) {
    console.error('GET /api/onboarding/[id]/tasks error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { supabase, user, role, error } = await getAuthedOnboardingContext();
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isOnboardingAdmin(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createTaskSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const payload = parsed.data;

    const { data, error: insertError } = await supabase
      .from('onboarding_tasks')
      .insert({
        checklist_id: id,
        title: payload.title,
        description: payload.description ?? null,
        category: payload.category,
        is_required: payload.isRequired,
        due_days_from_start: payload.dueDaysFromStart,
        assigned_to: payload.assignedTo ?? null,
      })
      .select('*')
      .single();

    if (insertError) {
      return NextResponse.json({ error: 'Failed to create onboarding task' }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('POST /api/onboarding/[id]/tasks error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const { supabase, user, role, error } = await getAuthedOnboardingContext();
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = updateTaskSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { taskId, isCompleted } = parsed.data;

    if (!isOnboardingAdmin(role)) {
      const { data: task, error: taskError } = await supabase
        .from('onboarding_tasks')
        .select('id, checklist_id, onboarding_checklists(employee_id, employees(user_id))')
        .eq('id', taskId)
        .maybeSingle();

      if (taskError || !task) {
        return NextResponse.json({ error: 'Task not found' }, { status: 404 });
      }

      const checklistRel = (
        task as {
          onboarding_checklists?:
            | { employees?: { user_id?: string } | Array<{ user_id?: string }> | null }
            | Array<{ employees?: { user_id?: string } | Array<{ user_id?: string }> | null }>;
        }
      ).onboarding_checklists;
      const checklist = Array.isArray(checklistRel) ? checklistRel[0] : checklistRel;
      const employeesRel = checklist?.employees;
      const ownerUserId = Array.isArray(employeesRel)
        ? employeesRel[0]?.user_id
        : employeesRel?.user_id;
      if (ownerUserId !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const { data, error: updateError } = await supabase
      .from('onboarding_tasks')
      .update({
        is_completed: isCompleted,
        completed_at: isCompleted ? new Date().toISOString() : null,
      })
      .eq('id', taskId)
      .select('*')
      .single();

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update onboarding task' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('PATCH /api/onboarding/[id]/tasks error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
