import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import {
  getAuthedOffboardingContext,
  isMissingOffboardingTableError,
  isOffboardingAdmin,
} from '../../_lib';

const offboardingTaskDetailsSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional().nullable(),
  category: z.string().min(1),
  dueDate: z.string().date().optional().nullable(),
  ownerType: z.enum(['employee', 'internal']).default('employee'),
});

const updateTaskSchema = z.object({
  taskId: z.string().uuid(),
  isCompleted: z.boolean(),
});

const createTaskSchema = offboardingTaskDetailsSchema;

const updateTaskDetailsSchema = z
  .object({
    taskId: z.string().uuid(),
  })
  .merge(offboardingTaskDetailsSchema);

const deleteTaskSchema = z.object({
  taskId: z.string().uuid(),
});

async function resolveAssignedTo(
  supabase: Awaited<ReturnType<typeof getAuthedOffboardingContext>>['supabase'],
  offboardingId: string,
  ownerType: 'employee' | 'internal'
): Promise<{ assignedTo: string | null; error?: NextResponse }> {
  const { data: offboarding, error: offboardingError } = await supabase
    .from('offboarding')
    .select('employee_id, initiated_by')
    .eq('id', offboardingId)
    .is('deleted_at', null)
    .maybeSingle();

  if (isMissingOffboardingTableError(offboardingError, 'offboarding')) {
    return {
      assignedTo: null,
      error: NextResponse.json(
        { error: 'Offboarding checklist feature is not available in this environment' },
        { status: 503 }
      ),
    };
  }

  if (offboardingError || !offboarding) {
    return {
      assignedTo: null,
      error: NextResponse.json({ error: 'Offboarding record not found' }, { status: 404 }),
    };
  }

  if (ownerType === 'internal') {
    return { assignedTo: offboarding.initiated_by };
  }

  const { data: employee, error: employeeError } = await supabase
    .from('employees')
    .select('user_id')
    .eq('id', offboarding.employee_id)
    .is('deleted_at', null)
    .maybeSingle();

  if (employeeError || !employee?.user_id) {
    return {
      assignedTo: null,
      error: NextResponse.json({ error: 'Employee not found' }, { status: 404 }),
    };
  }

  return { assignedTo: employee.user_id };
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { supabase, user, role, error } = await getAuthedOffboardingContext();
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
    const admin = isOffboardingAdmin(role);

    const { data: task, error: taskError } = await supabase
      .from('offboarding_tasks')
      .select('id, offboarding_id, assigned_to')
      .eq('id', taskId)
      .eq('offboarding_id', id)
      .is('deleted_at', null)
      .maybeSingle();

    if (isMissingOffboardingTableError(taskError, 'offboarding_tasks')) {
      return NextResponse.json(
        { error: 'Offboarding checklist feature is not available in this environment' },
        { status: 503 }
      );
    }

    if (taskError || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    if (!admin) {
      const { data: offboarding, error: offboardingError } = await supabase
        .from('offboarding')
        .select('employee_id')
        .eq('id', id)
        .is('deleted_at', null)
        .maybeSingle();

      if (isMissingOffboardingTableError(offboardingError, 'offboarding')) {
        return NextResponse.json(
          { error: 'Offboarding checklist feature is not available in this environment' },
          { status: 503 }
        );
      }

      if (offboardingError || !offboarding) {
        return NextResponse.json({ error: 'Offboarding record not found' }, { status: 404 });
      }

      const { data: employee, error: employeeError } = await supabase
        .from('employees')
        .select('user_id')
        .eq('id', offboarding.employee_id)
        .is('deleted_at', null)
        .maybeSingle();

      if (employeeError || !employee) {
        return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
      }

      const employeeUserId = employee.user_id;
      const assignedTo = task.assigned_to;
      const canComplete = employeeUserId === user.id && (!assignedTo || assignedTo === user.id);

      if (!canComplete) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    const { data, error: updateError } = await supabase
      .from('offboarding_tasks')
      .update({
        is_completed: isCompleted,
        completed_at: isCompleted ? new Date().toISOString() : null,
        completed_by: isCompleted ? user.id : null,
      })
      .eq('id', taskId)
      .eq('offboarding_id', id)
      .select('id, offboarding_id, title, description, category, is_completed, completed_at, completed_by, due_date, assigned_to, created_at, updated_at')
      .maybeSingle();

    if (updateError || !data) {
      return NextResponse.json({ error: 'Failed to update offboarding task' }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('PATCH /api/offboarding/[id]/tasks error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { supabase, user, role, error } = await getAuthedOffboardingContext();
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isOffboardingAdmin(role)) {
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
    const assignment = await resolveAssignedTo(supabase, id, payload.ownerType);
    if (assignment.error) {
      return assignment.error;
    }

    const { data, error: insertError } = await supabase
      .from('offboarding_tasks')
      .insert({
        offboarding_id: id,
        title: payload.title,
        description: payload.description ?? null,
        category: payload.category,
        due_date: payload.dueDate ?? null,
        assigned_to: assignment.assignedTo,
      })
      .select('id, offboarding_id, title, description, category, is_completed, completed_at, completed_by, due_date, assigned_to, created_at, updated_at')
      .single();

    if (isMissingOffboardingTableError(insertError, 'offboarding_tasks')) {
      return NextResponse.json(
        { error: 'Offboarding checklist feature is not available in this environment' },
        { status: 503 }
      );
    }

    if (insertError) {
      return NextResponse.json({ error: 'Failed to create offboarding task' }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('POST /api/offboarding/[id]/tasks error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { supabase, user, role, error } = await getAuthedOffboardingContext();
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isOffboardingAdmin(role)) {
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
    const assignment = await resolveAssignedTo(supabase, id, payload.ownerType);
    if (assignment.error) {
      return assignment.error;
    }

    const { data, error: updateError } = await supabase
      .from('offboarding_tasks')
      .update({
        title: payload.title,
        description: payload.description ?? null,
        category: payload.category,
        due_date: payload.dueDate ?? null,
        assigned_to: assignment.assignedTo,
      })
      .eq('id', payload.taskId)
      .eq('offboarding_id', id)
      .is('deleted_at', null)
      .select('id, offboarding_id, title, description, category, is_completed, completed_at, completed_by, due_date, assigned_to, created_at, updated_at')
      .maybeSingle();

    if (isMissingOffboardingTableError(updateError, 'offboarding_tasks')) {
      return NextResponse.json(
        { error: 'Offboarding checklist feature is not available in this environment' },
        { status: 503 }
      );
    }

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update offboarding task' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('PUT /api/offboarding/[id]/tasks error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { supabase, user, role, error } = await getAuthedOffboardingContext();
    if (error || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!isOffboardingAdmin(role)) {
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

    const { data, error: deleteError } = await supabase
      .from('offboarding_tasks')
      .delete()
      .eq('id', parsed.data.taskId)
      .eq('offboarding_id', id)
      .select('id')
      .maybeSingle();

    if (isMissingOffboardingTableError(deleteError, 'offboarding_tasks')) {
      return NextResponse.json(
        { error: 'Offboarding checklist feature is not available in this environment' },
        { status: 503 }
      );
    }

    if (deleteError) {
      return NextResponse.json({ error: 'Failed to delete offboarding task' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('DELETE /api/offboarding/[id]/tasks error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}