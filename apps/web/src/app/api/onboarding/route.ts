import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getAuthedOnboardingContext, isOnboardingAdmin } from './_lib';

const createChecklistSchema = z.object({
  employeeId: z.string().uuid(),
  tasks: z
    .array(
      z.object({
        title: z.string().min(1),
        description: z.string().optional().nullable(),
        category: z.string().min(1),
        isRequired: z.boolean().default(true),
        dueDaysFromStart: z.number().int().min(1).max(365).default(7),
        assignedTo: z.string().uuid().optional().nullable(),
      })
    )
    .default([]),
});

export async function GET(request: NextRequest) {
  try {
    const { supabase, user, role, error } = await getAuthedOnboardingContext();
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const employeeId = request.nextUrl.searchParams.get('employeeId');

    let query = supabase
      .from('onboarding_checklists')
      .select('*, onboarding_tasks(*)')
      .order('created_at', { ascending: false });

    if (employeeId) {
      if (!isOnboardingAdmin(role)) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      query = query.eq('employee_id', employeeId);
    } else {
      const { data: employee } = await supabase
        .from('employees')
        .select('id')
        .eq('user_id', user.id)
        .is('deleted_at', null)
        .maybeSingle();

      if (!employee?.id) {
        return NextResponse.json({ data: [] });
      }
      query = query.eq('employee_id', employee.id);
    }

    const { data, error: queryError } = await query;
    if (queryError) {
      return NextResponse.json({ error: 'Failed to fetch onboarding checklists' }, { status: 500 });
    }

    return NextResponse.json({ data: data ?? [] });
  } catch (error) {
    console.error('GET /api/onboarding error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user, role, error } = await getAuthedOnboardingContext();
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isOnboardingAdmin(role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const parsed = createChecklistSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const payload = parsed.data;

    const { data: checklist, error: checklistError } = await supabase
      .from('onboarding_checklists')
      .insert({
        employee_id: payload.employeeId,
        status: 'not_started',
      })
      .select('*')
      .single();

    if (checklistError || !checklist) {
      return NextResponse.json({ error: 'Failed to create onboarding checklist' }, { status: 500 });
    }

    if (payload.tasks.length > 0) {
      const tasksPayload = payload.tasks.map((task) => ({
        checklist_id: checklist.id,
        title: task.title,
        description: task.description ?? null,
        category: task.category,
        is_required: task.isRequired,
        due_days_from_start: task.dueDaysFromStart,
        assigned_to: task.assignedTo ?? null,
      }));

      const { error: tasksError } = await supabase.from('onboarding_tasks').insert(tasksPayload);

      if (tasksError) {
        return NextResponse.json(
          { error: 'Checklist created but failed to create tasks' },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({ data: checklist }, { status: 201 });
  } catch (error) {
    console.error('POST /api/onboarding error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
