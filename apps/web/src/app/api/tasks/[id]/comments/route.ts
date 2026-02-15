import { createSupabaseServerClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

interface TaskCommentRow {
  id: string;
  task_id: string;
  user_id: string;
  content: string;
  created_at: string;
}

interface EmployeeNameRow {
  user_id: string;
  first_name: string;
  last_name: string;
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
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    let namesByUserId = new Map<string, string>();
    if (commenterIds.length > 0) {
      const { data: employees } = await supabase
        .from('employees')
        .select('user_id, first_name, last_name')
        .in('user_id', commenterIds)
        .is('deleted_at', null);

      namesByUserId = new Map(
        ((employees || []) as Array<EmployeeNameRow>).map((employee) => [
          employee.user_id,
          `${employee.first_name} ${employee.last_name}`,
        ])
      );
    }

    return NextResponse.json({
      data: commentRows.map((comment) => ({
        ...comment,
        commenter_name: namesByUserId.get(comment.user_id) || null,
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
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

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

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/tasks/[id]/comments:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
