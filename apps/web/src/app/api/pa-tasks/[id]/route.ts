import { logActivity } from '@/lib/audit';
import { paTaskUpdateSchema } from '@/lib/schemas/pa-task.schema';
import { NextRequest, NextResponse } from 'next/server';
import {
  getPaTaskAuthedContext,
  getPaTaskWriteErrorMessage,
  validatePaTaskAssignee,
} from '../_lib';

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getPaTaskAuthedContext();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { supabaseAdmin, canAccess } = auth.context;
    if (!canAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const { data: task, error } = await supabaseAdmin
      .from('pa_tasks')
      .select(
        `
        *,
        status:pa_task_statuses!pa_tasks_status_id_fkey(id,label,color,is_terminal),
        priority:pa_task_priorities!pa_tasks_priority_id_fkey(id,label,color),
        category:pa_task_categories!pa_tasks_category_id_fkey(id,label,color)
      `
      )
      .eq('id', id)
      .is('deleted_at', null)
      .single();

    if (error || !task) {
      return NextResponse.json({ error: 'PA task not found' }, { status: 404 });
    }

    const { data: attachments, error: attachmentError } = await supabaseAdmin
      .from('pa_task_attachments')
      .select('*')
      .eq('pa_task_id', id)
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (attachmentError) {
      console.error('Error loading PA task attachments:', attachmentError);
      return NextResponse.json({ error: 'Failed to load task attachments' }, { status: 500 });
    }

    return NextResponse.json({
      data: {
        ...task,
        attachments: attachments ?? [],
      },
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/pa-tasks/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getPaTaskAuthedContext();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { supabaseAdmin, user, canAccess } = auth.context;
    if (!canAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const parsed = paTaskUpdateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    if (parsed.data.assignedTo) {
      const assigneeValidation = await validatePaTaskAssignee(supabaseAdmin, parsed.data.assignedTo);
      if (!assigneeValidation.ok) {
        return NextResponse.json(
          { error: assigneeValidation.error },
          { status: assigneeValidation.status }
        );
      }
    }

    const updates: Record<string, string | null> = {};
    if (parsed.data.title !== undefined) updates.title = parsed.data.title;
    if (parsed.data.description !== undefined) updates.description = parsed.data.description ?? null;
    if (parsed.data.statusId !== undefined) updates.status_id = parsed.data.statusId;
    if (parsed.data.priorityId !== undefined) updates.priority_id = parsed.data.priorityId;
    if (parsed.data.categoryId !== undefined) updates.category_id = parsed.data.categoryId ?? null;
    if (parsed.data.assignedTo !== undefined) updates.assigned_to = parsed.data.assignedTo ?? null;
    if (parsed.data.dueDate !== undefined) updates.due_date = parsed.data.dueDate ?? null;
    if (parsed.data.dateGiven !== undefined && parsed.data.dateGiven !== null) {
      updates.date_given = parsed.data.dateGiven;
    }
    if (parsed.data.blockerReason !== undefined) updates.blocker_reason = parsed.data.blockerReason ?? null;
    if (parsed.data.waitingOn !== undefined) updates.waiting_on = parsed.data.waitingOn ?? null;
    if (parsed.data.notes !== undefined) updates.notes = parsed.data.notes ?? null;

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    const { data, error } = await supabaseAdmin
      .from('pa_tasks')
      .update(updates)
      .eq('id', id)
      .is('deleted_at', null)
      .select('*')
      .single();

    if (error || !data) {
      console.error('Error updating PA task:', error);
      return NextResponse.json({ error: getPaTaskWriteErrorMessage(error) }, { status: 500 });
    }

    logActivity(supabaseAdmin, {
      userId: user.id,
      action: 'update_pa_task',
      tableName: 'pa_tasks',
      recordId: id,
      metadata: { title: data.title },
    });

    return NextResponse.json({ data });
  } catch (error) {
    console.error('Unexpected error in PATCH /api/pa-tasks/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await getPaTaskAuthedContext();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { supabaseAdmin, user, canAccess, role } = auth.context;
    if (!canAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { id } = await params;
    const { data: existing } = await supabaseAdmin
      .from('pa_tasks')
      .select('id, created_by')
      .eq('id', id)
      .is('deleted_at', null)
      .maybeSingle();

    if (!existing) {
      return NextResponse.json({ error: 'PA task not found' }, { status: 404 });
    }

    const isAdmin = role === 'admin' || role === 'super_admin';
    if (existing.created_by !== user.id && !isAdmin) {
      return NextResponse.json(
        { error: 'Only the creator or an admin can delete this task' },
        { status: 403 }
      );
    }

    const deletedAt = new Date().toISOString();
    const { data: updated, error } = await supabaseAdmin
      .from('pa_tasks')
      .update({ deleted_at: deletedAt, updated_at: deletedAt })
      .eq('id', id)
      .is('deleted_at', null)
      .select('id')
      .single();

    if (error || !updated) {
      console.error('Error deleting PA task:', error);
      return NextResponse.json({ error: getPaTaskWriteErrorMessage(error) }, { status: 500 });
    }

    logActivity(supabaseAdmin, {
      userId: user.id,
      action: 'delete_pa_task',
      tableName: 'pa_tasks',
      recordId: id,
    });

    return NextResponse.json({ data: { id } });
  } catch (error) {
    console.error('Unexpected error in DELETE /api/pa-tasks/[id]:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
