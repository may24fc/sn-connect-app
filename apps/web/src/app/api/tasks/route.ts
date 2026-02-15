import { taskCreateSchema } from '@/lib/schemas/task.schema';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { type NextRequest, NextResponse } from 'next/server';

interface TaskRow {
  id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  assigned_by: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  created_by: string | null;
  deleted_at: string | null;
}

interface EmployeeNameRow {
  user_id: string;
  first_name: string;
  last_name: string;
}

/**
 * GET /api/tasks
 * List tasks with filters and pagination
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const searchParams = request.nextUrl.searchParams;
    const search = searchParams.get('search') || '';
    const status = searchParams.get('status') || '';
    const priority = searchParams.get('priority') || '';
    const assigneeId = searchParams.get('assigneeId') || '';
    const page = Number.parseInt(searchParams.get('page') || '1', 10);
    const pageSize = Number.parseInt(searchParams.get('pageSize') || '10', 10);

    let query = supabase
      .from('tasks')
      .select('*', { count: 'exact' })
      .is('deleted_at', null)
      .order('created_at', { ascending: false });

    if (search) {
      query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (priority) {
      query = query.eq('priority', priority);
    }

    if (assigneeId) {
      query = query.eq('assigned_to', assigneeId);
    }

    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;
    query = query.range(from, to);

    const { data: tasks, error, count } = await query;

    if (error) {
      console.error('Error fetching tasks:', error);
      return NextResponse.json({ error: 'Failed to fetch tasks' }, { status: 500 });
    }

    const taskRows = (tasks || []) as Array<TaskRow>;

    const userIds = Array.from(
      new Set(
        taskRows
          .flatMap((task) => [task.assigned_to, task.assigned_by])
          .filter((value): value is string => Boolean(value))
      )
    );

    const namesByUserId = new Map<string, { first_name: string; last_name: string }>();

    if (userIds.length > 0) {
      const { data: employees } = await supabase
        .from('employees')
        .select('user_id, first_name, last_name')
        .in('user_id', userIds)
        .is('deleted_at', null);

      ((employees || []) as Array<EmployeeNameRow>).forEach((employee) => {
        namesByUserId.set(employee.user_id, {
          first_name: employee.first_name,
          last_name: employee.last_name,
        });
      });
    }

    const data = taskRows.map((task) => {
      const assigneeName = task.assigned_to ? namesByUserId.get(task.assigned_to) : undefined;
      const assignerName = namesByUserId.get(task.assigned_by);

      return {
        ...task,
        assignee_name: assigneeName ? `${assigneeName.first_name} ${assigneeName.last_name}` : null,
        assigner_name: assignerName ? `${assignerName.first_name} ${assignerName.last_name}` : null,
      };
    });

    return NextResponse.json({
      data,
      pagination: {
        page,
        pageSize,
        total: count || 0,
        totalPages: Math.ceil((count || 0) / pageSize),
      },
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/tasks:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/tasks
 * Create task
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createSupabaseServerClient();

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const parsed = taskCreateSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { data, error } = await supabase
      .from('tasks')
      .insert({
        title: parsed.data.title,
        description: parsed.data.description || null,
        assigned_to: parsed.data.assignedTo || null,
        assigned_by: user.id,
        priority: parsed.data.priority,
        status: parsed.data.status,
        due_date: parsed.data.dueDate || null,
        created_by: user.id,
      })
      .select('*')
      .single();

    if (error || !data) {
      console.error('Error creating task:', error);
      return NextResponse.json({ error: 'Failed to create task' }, { status: 500 });
    }

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/tasks:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
