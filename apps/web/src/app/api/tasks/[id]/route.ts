import { taskUpdateSchema } from '@/lib/schemas/task.schema';
import { type NextRequest, NextResponse } from 'next/server';
import {
  TASK_ASSIGNER_ROLE,
  getTaskAuthedContext,
  getTaskWriteErrorMessage,
  validateTaskAssignee,
} from '../_lib';

interface EmployeeNameRow {
  user_id: string;
  first_name: string;
  last_name: string;
}

/**
 * GET /api/tasks/[id]
 * Get task details
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = await getTaskAuthedContext();

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { supabase } = auth.context;

    const { data: task, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error || !task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const userIds = [task.assigned_to, task.assigned_by].filter(Boolean) as Array<string>;

    let assigneeName: string | null = null;
    let assignerName: string | null = null;

    if (userIds.length > 0) {
      const { data: employees } = await supabase
        .from('employees')
        .select('user_id, first_name, last_name')
        .in('user_id', userIds)
        .is('deleted_at', null);

      const namesByUserId = new Map<string, string>();
      ((employees || []) as Array<EmployeeNameRow>).forEach((employee) => {
        namesByUserId.set(employee.user_id, `${employee.first_name} ${employee.last_name}`);
      });

      assigneeName = task.assigned_to ? namesByUserId.get(task.assigned_to) || null : null;
      assignerName = namesByUserId.get(task.assigned_by) || null;
    }

    return NextResponse.json({
      data: {
        ...task,
        assignee_name: assigneeName,
        assigner_name: assignerName,
      },
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/tasks/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * PATCH /api/tasks/[id]
 * Update task
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = await getTaskAuthedContext();

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { supabase, user, role } = auth.context;

    const body = await request.json();
    const parsed = taskUpdateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const updates: Record<string, string | null> = {};

    if (parsed.data.title !== undefined) updates.title = parsed.data.title;
    if (parsed.data.description !== undefined) {
      updates.description = parsed.data.description || null;
    }
    if (parsed.data.assignedTo !== undefined) {
      if (role !== TASK_ASSIGNER_ROLE) {
        return NextResponse.json(
          { error: 'Only super-admin can re-assign tasks' },
          { status: 403 }
        );
      }

      if (parsed.data.assignedTo) {
        const assigneeValidation = await validateTaskAssignee(supabase, parsed.data.assignedTo);
        if (!assigneeValidation.ok) {
          return NextResponse.json(
            { error: assigneeValidation.error },
            { status: assigneeValidation.status }
          );
        }
      }

      updates.assigned_to = parsed.data.assignedTo || null;
      updates.assigned_by = user.id;
    }
    if (parsed.data.priority !== undefined) updates.priority = parsed.data.priority;
    if (parsed.data.status !== undefined) updates.status = parsed.data.status;
    if (parsed.data.dueDate !== undefined) {
      updates.due_date = parsed.data.dueDate || null;
    }

    if (parsed.data.status === 'completed') {
      updates.completed_at = new Date().toISOString();
    } else if (parsed.data.status) {
      updates.completed_at = null;
    }

    const { data, error } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', id)
      .is('deleted_at', null)
      .select('*')
      .single();

    if (error || !data) {
      console.error('Error updating task:', error);
      return NextResponse.json({ error: getTaskWriteErrorMessage(error) }, { status: 500 });
    }

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error in PATCH /api/tasks/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * DELETE /api/tasks/[id]
 * Soft delete task
 */
export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const auth = await getTaskAuthedContext();

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { supabase } = auth.context;

    const { error } = await supabase
      .from('tasks')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .is('deleted_at', null);

    if (error) {
      console.error('Error deleting task:', error);
      return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/tasks/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
