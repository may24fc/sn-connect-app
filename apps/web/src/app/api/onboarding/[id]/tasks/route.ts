import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getAuthedOnboardingContext,
  isMissingOnboardingChecklistsTableError,
  isOnboardingAdmin,
} from '../../_lib';

const onboardingTaskInputSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  category: z.string().min(1),
  isRequired: z.boolean().default(true),
  dueDaysFromStart: z.number().int().min(1).max(365).default(7),
  assignedTo: z.string().uuid().optional().nullable(),
  requiresSubmission: z.boolean().default(false),
  submissionType: z.enum(['none', 'link', 'document', 'link_or_document']).default('none'),
  submissionLabel: z.string().optional().nullable(),
  submissionDescription: z.string().optional().nullable(),
  referenceUrl: z.string().url().optional().nullable(),
});

function normalizeTaskInput(task: z.infer<typeof onboardingTaskInputSchema>) {
  if (task.requiresSubmission && task.submissionType === 'none') {
    throw new Error('Submission type is required when proof is required.');
  }

  return {
    title: task.title,
    description: task.description ?? null,
    category: task.category,
    is_required: task.isRequired,
    due_days_from_start: task.dueDaysFromStart,
    assigned_to: task.assignedTo ?? null,
    requires_submission: task.requiresSubmission,
    submission_type: task.requiresSubmission ? task.submissionType : 'none',
    submission_label: task.requiresSubmission ? task.submissionLabel ?? null : null,
    submission_description: task.requiresSubmission ? task.submissionDescription ?? null : null,
    reference_url: task.referenceUrl ?? null,
  };
}

const createTaskSchema = onboardingTaskInputSchema;

const updateTaskSchema = z.object({
  taskId: z.string().uuid(),
  isCompleted: z.boolean(),
});

const updateTaskDetailsSchema = z.object({
  taskId: z.string().uuid(),
}).merge(onboardingTaskInputSchema);

const deleteTaskSchema = z.object({
  taskId: z.string().uuid(),
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

    if (isMissingOnboardingChecklistsTableError(checklistError)) {
      return NextResponse.json(
        { error: 'Onboarding checklist feature is not available in this environment' },
        { status: 503 }
      );
    }

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

    let taskPayload;

    try {
      taskPayload = normalizeTaskInput(payload);
    } catch (validationError) {
      return NextResponse.json(
        {
          error:
            validationError instanceof Error ? validationError.message : 'Invalid task payload',
        },
        { status: 400 }
      );
    }

    const { data, error: insertError } = await supabase
      .from('onboarding_tasks')
      .insert({
        checklist_id: id,
        ...taskPayload,
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

      if (isMissingOnboardingChecklistsTableError(taskError)) {
        return NextResponse.json(
          { error: 'Onboarding checklist feature is not available in this environment' },
          { status: 503 }
        );
      }

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

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
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
    const parsed = updateTaskDetailsSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const payload = parsed.data;

    let taskPayload;

    try {
      taskPayload = normalizeTaskInput(payload);
    } catch (validationError) {
      return NextResponse.json(
        {
          error:
            validationError instanceof Error ? validationError.message : 'Invalid task payload',
        },
        { status: 400 }
      );
    }

    const { data, error: updateError } = await supabase
      .from('onboarding_tasks')
      .update({
        ...taskPayload,
      })
      .eq('id', payload.taskId)
      .eq('checklist_id', id)
      .select('*')
      .maybeSingle();

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update onboarding task' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('PUT /api/onboarding/[id]/tasks error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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
    const parsed = deleteTaskSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { taskId } = parsed.data;

    const { data, error: deleteError } = await supabase
      .from('onboarding_tasks')
      .delete()
      .eq('id', taskId)
      .eq('checklist_id', id)
      .select('id')
      .maybeSingle();

    if (deleteError) {
      return NextResponse.json({ error: 'Failed to delete onboarding task' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('DELETE /api/onboarding/[id]/tasks error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
