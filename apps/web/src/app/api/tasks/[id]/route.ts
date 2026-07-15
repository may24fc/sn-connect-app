import { logActivity } from '@/lib/audit';
import {
  createNotification,
  getUserDisplayName,
} from '@/lib/notifications/create-notification';
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

    const updates: Record<string, string | string[] | null> = {};

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
    if (parsed.data.category !== undefined) updates.category = parsed.data.category || null;
    if (parsed.data.tags !== undefined) updates.tags = parsed.data.tags;
    if (parsed.data.dueDate !== undefined) {
      updates.due_date = parsed.data.dueDate || null;
    }

    if (parsed.data.status === 'completed') {
      updates.completed_at = new Date().toISOString();
    } else if (parsed.data.status) {
      updates.completed_at = null;
    }

    // Fetch existing task data before update for comparison
    const { data: existingTask } = await supabase
      .from('tasks')
      .select('title, status, assigned_to, assigned_by')
      .eq('id', id)
      .is('deleted_at', null)
      .single();

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

    // Send notifications based on what changed
    const updaterName = await getUserDisplayName(user.id);
    const taskTitle = data.title;

    // If task was re-assigned to a new person, notify the new assignee
    if (
      parsed.data.assignedTo &&
      parsed.data.assignedTo !== existingTask?.assigned_to
    ) {
      createNotification({
        userId: parsed.data.assignedTo,
        type: 'task_assigned',
        title: 'Task Assigned to You',
        message: `${updaterName} assigned you a task: "${taskTitle}"`,
        link: `/tasks`,
        metadata: { taskId: id, assignedBy: user.id },
      });
    }

    // If status changed, notify relevant parties
    if (parsed.data.status && parsed.data.status !== existingTask?.status) {
      const statusLabels: Record<string, string> = {
        pending: 'Pending',
        in_progress: 'In Progress',
        completed: 'Completed',
        cancelled: 'Cancelled',
      };
      const statusLabel = statusLabels[parsed.data.status] ?? parsed.data.status;

      // If an employee/associate updated the status, notify the assigner (admin)
      if (role !== TASK_ASSIGNER_ROLE && data.assigned_by) {
        createNotification({
          userId: data.assigned_by,
          type: parsed.data.status === 'completed' ? 'system' : 'system',
          title: parsed.data.status === 'completed'
            ? 'Task Completed'
            : 'Task Status Updated',
          message: `${updaterName} updated "${taskTitle}" to ${statusLabel}`,
          link: `/super-admin/tasks/${id}`,
          metadata: { taskId: id, newStatus: parsed.data.status },
        });
      }

      // If admin updated the status, notify the assignee
      if (role === TASK_ASSIGNER_ROLE && data.assigned_to && data.assigned_to !== user.id) {
        createNotification({
          userId: data.assigned_to,
          type: 'system',
          title: 'Task Status Updated',
          message: `${updaterName} updated "${taskTitle}" to ${statusLabel}`,
          link: `/tasks`,
          metadata: { taskId: id, newStatus: parsed.data.status },
        });
      }
    }

    logActivity(supabase, {
      userId: user.id,
      action: 'update_task',
      tableName: 'tasks',
      recordId: id,
      metadata: { title: data.title, status: data.status },
    });

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

    const { supabaseAdmin, user, role } = auth.context;

    const { data: existingTask, error: existingTaskError } = await supabaseAdmin
      .from('tasks')
      .select('id, assigned_by')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();

    if (existingTaskError) {
      console.error('Error loading task for deletion:', existingTaskError);
      return NextResponse.json({ error: 'Failed to delete task' }, { status: 500 });
    }

    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 });
    }

    const canDelete =
      existingTask.assigned_by === user.id || role === 'admin' || role === TASK_ASSIGNER_ROLE;

    if (!canDelete) {
      return NextResponse.json(
        { error: 'Only task assigners or admins can delete tasks' },
        { status: 403 }
      );
    }

    const { error } = await supabaseAdmin
      .from('tasks')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id)
      .is('deleted_at', null);

    if (error) {
      console.error('Error deleting task:', error);
      return NextResponse.json({ error: getTaskWriteErrorMessage(error) }, { status: 500 });
    }

    logActivity(supabaseAdmin, {
      userId: user.id,
      action: 'delete_task',
      tableName: 'tasks',
      recordId: id,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/tasks/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
