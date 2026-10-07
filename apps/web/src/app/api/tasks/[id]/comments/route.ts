import {
  createNotification,
  getUserDisplayName,
} from '@/lib/notifications/create-notification';
import { loadDirectoryPeople } from '@/lib/people/directory-people';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { canAccessTask, getTaskAuthedContext } from '../../_lib';

interface TaskCommentRow {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

const taskCommentSchema = z.object({
  content: z.string().min(1, 'Comment content is required').max(5000),
});

/**
 * GET /api/tasks/[id]/comments
 * List comments for a task
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = await getTaskAuthedContext();

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const access = await canAccessTask(auth.context, id);

    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const { supabase, supabaseAdmin } = auth.context;

    const { data: comments, error } = await supabase
      .from('task_comments')
      .select('*')
      .eq('task_id', id)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching task comments:', error);
      return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
    }

    const commentRows = (comments || []) as Array<TaskCommentRow>;
    const commenterIds = Array.from(new Set(commentRows.map((comment) => comment.user_id)));

    // Access to the task was verified above; the directory view itself is not readable by every participant.
    const people = await loadDirectoryPeople(supabaseAdmin, commenterIds);

    return NextResponse.json({
      data: commentRows.map((comment) => ({
        ...comment,
        commenter_name: people.get(comment.user_id)?.name ?? null,
        commenter_avatar_url: people.get(comment.user_id)?.avatarUrl ?? null,
      })),
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/tasks/[id]/comments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/tasks/[id]/comments
 * Create task comment
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const auth = await getTaskAuthedContext();

    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const access = await canAccessTask(auth.context, id);

    if (!access.ok) {
      return NextResponse.json({ error: access.error }, { status: access.status });
    }

    const { supabase, supabaseAdmin, user } = auth.context;
    const task = access.task;

    const body = await request.json();
    const parsed = taskCommentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('task_comments')
      .insert({
        task_id: id,
        user_id: user.id,
        content: parsed.data.content,
      })
      .select('*')
      .single();

    if (error || !data) {
      console.error('Error creating task comment:', error);
      return NextResponse.json({ error: 'Failed to create comment' }, { status: 500 });
    }

    // Notify task assignee and assigner about the new comment
    const commenterName = await getUserDisplayName(user.id);

    // Notify the assignee (employee/associate) with employee task link
    if (task.assigned_to && task.assigned_to !== user.id) {
      createNotification({
        userId: task.assigned_to,
        type: 'system',
        title: 'New Comment on Task',
        message: `${commenterName} commented on "${task.title}"`,
        link: `/tasks/${id}`,
        metadata: { taskId: id, commentId: data.id },
      });
    }

    // Notify the assigner (super_admin) with super-admin task link
    if (task.assigned_by && task.assigned_by !== user.id) {
      createNotification({
        userId: task.assigned_by,
        type: 'system',
        title: 'New Comment on Task',
        message: `${commenterName} commented on "${task.title}"`,
        link: `/super-admin/tasks/${id}`,
        metadata: { taskId: id, commentId: data.id },
      });
    }

    const commenter = (await loadDirectoryPeople(supabaseAdmin, [user.id])).get(user.id);

    return NextResponse.json(
      {
        data: {
          ...data,
          commenter_name: commenterName,
          commenter_avatar_url: commenter?.avatarUrl ?? null,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Unexpected error in POST /api/tasks/[id]/comments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
