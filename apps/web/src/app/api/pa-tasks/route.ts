import { logActivity } from '@/lib/audit';
import {
  paTaskCreateSchema,
  paTaskFiltersSchema,
} from '@/lib/schemas/pa-task.schema';
import { NextRequest, NextResponse } from 'next/server';
import {
  getPaTaskAuthedContext,
  getPaTaskWriteErrorMessage,
  validatePaTaskAssignee,
} from './_lib';

interface EmployeeNameRow {
  user_id: string;
  first_name: string;
  last_name: string;
}

function parseQueryFilters(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const parsed = paTaskFiltersSchema.safeParse({
    search: searchParams.get('search') ?? undefined,
    statusId: searchParams.get('statusId') ?? undefined,
    priorityId: searchParams.get('priorityId') ?? undefined,
    categoryId: searchParams.get('categoryId') ?? undefined,
    assigneeId: searchParams.get('assigneeId') ?? undefined,
    dueDateFrom: searchParams.get('dueDateFrom') ?? undefined,
    dueDateTo: searchParams.get('dueDateTo') ?? undefined,
    dateGivenFrom: searchParams.get('dateGivenFrom') ?? undefined,
    dateGivenTo: searchParams.get('dateGivenTo') ?? undefined,
    page: searchParams.get('page') ?? undefined,
    pageSize: searchParams.get('pageSize') ?? undefined,
    sortBy: searchParams.get('sortBy') ?? undefined,
    sortOrder: searchParams.get('sortOrder') ?? undefined,
  });

  return parsed;
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getPaTaskAuthedContext();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { supabaseAdmin, canAccess } = auth.context;
    if (!canAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const parsedFilters = parseQueryFilters(request);
    if (!parsedFilters.success) {
      return NextResponse.json(
        { error: 'Invalid query parameters', details: parsedFilters.error.flatten() },
        { status: 400 }
      );
    }

    const filters = parsedFilters.data;
    let query = supabaseAdmin
      .from('pa_tasks')
      .select(
        `
        *,
        status:pa_task_statuses!pa_tasks_status_id_fkey(id,label,color,is_terminal),
        priority:pa_task_priorities!pa_tasks_priority_id_fkey(id,label,color),
        category:pa_task_categories!pa_tasks_category_id_fkey(id,label,color),
        attachments:pa_task_attachments!pa_task_id(id,title,attachment_type,url,storage_path,mime_type,created_at,deleted_at)
      `,
        { count: 'exact' }
      )
      .is('deleted_at', null)
      .order(filters.sortBy, { ascending: filters.sortOrder === 'asc' });

    if (filters.search) {
      query = query.or(`title.ilike.%${filters.search}%,description.ilike.%${filters.search}%`);
    }
    if (filters.statusId) {
      query = query.eq('status_id', filters.statusId);
    }
    if (filters.priorityId) {
      query = query.eq('priority_id', filters.priorityId);
    }
    if (filters.categoryId) {
      query = query.eq('category_id', filters.categoryId);
    }
    if (filters.assigneeId) {
      query = query.eq('assigned_to', filters.assigneeId);
    }
    if (filters.dueDateFrom) {
      query = query.gte('due_date', filters.dueDateFrom);
    }
    if (filters.dueDateTo) {
      query = query.lte('due_date', filters.dueDateTo);
    }
    if (filters.dateGivenFrom) {
      query = query.gte('date_given', filters.dateGivenFrom);
    }
    if (filters.dateGivenTo) {
      query = query.lte('date_given', filters.dateGivenTo);
    }

    const from = (filters.page - 1) * filters.pageSize;
    const to = from + filters.pageSize - 1;
    query = query.range(from, to);

    const { data: rows, error, count } = await query;
    if (error) {
      console.error('Error fetching PA tasks:', error);
      return NextResponse.json({ error: 'Failed to fetch PA tasks' }, { status: 500 });
    }

    const taskRows = rows ?? [];
    const userIds = Array.from(
      new Set(
        taskRows
          .flatMap((row) => [row.assigned_to, row.created_by])
          .filter((value): value is string => Boolean(value))
      )
    );

    const namesByUserId = new Map<string, string>();
    if (userIds.length > 0) {
      const { data: employees } = await supabaseAdmin
        .from('employees')
        .select('user_id, first_name, last_name')
        .in('user_id', userIds)
        .is('deleted_at', null);

      ((employees ?? []) as EmployeeNameRow[]).forEach((employee) => {
        namesByUserId.set(employee.user_id, `${employee.first_name} ${employee.last_name}`);
      });
    }

    const data = taskRows.map((row) => ({
      ...row,
      assignee_name: row.assigned_to ? namesByUserId.get(row.assigned_to) ?? null : null,
      creator_name: namesByUserId.get(row.created_by) ?? null,
    }));

    return NextResponse.json({
      data,
      pagination: {
        page: filters.page,
        pageSize: filters.pageSize,
        total: count ?? 0,
        totalPages: Math.ceil((count ?? 0) / filters.pageSize),
      },
    });
  } catch (error) {
    console.error('Unexpected error in GET /api/pa-tasks:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getPaTaskAuthedContext();
    if (!auth.ok) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const { supabaseAdmin, user, canAccess } = auth.context;
    if (!canAccess) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const parsed = paTaskCreateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid request body', details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    if (parsed.data.assignedTo) {
      const assigneeValidation = await validatePaTaskAssignee(supabaseAdmin, parsed.data.assignedTo);
      if (!assigneeValidation.ok) {
        return NextResponse.json({ error: assigneeValidation.error }, { status: assigneeValidation.status });
      }
    }

    const { data, error } = await supabaseAdmin
      .from('pa_tasks')
      .insert({
        title: parsed.data.title,
        description: parsed.data.description ?? null,
        status_id: parsed.data.statusId,
        priority_id: parsed.data.priorityId,
        category_id: parsed.data.categoryId ?? null,
        assigned_to: parsed.data.assignedTo ?? null,
        due_date: parsed.data.dueDate ?? null,
        date_given: parsed.data.dateGiven ?? undefined,
        blocker_reason: parsed.data.blockerReason ?? null,
        waiting_on: parsed.data.waitingOn ?? null,
        notes: parsed.data.notes ?? null,
        created_by: user.id,
      })
      .select('*')
      .single();

    if (error || !data) {
      console.error('Error creating PA task:', error);
      return NextResponse.json({ error: getPaTaskWriteErrorMessage(error) }, { status: 500 });
    }

    logActivity(supabaseAdmin, {
      userId: user.id,
      action: 'create_pa_task',
      tableName: 'pa_tasks',
      recordId: data.id,
      metadata: { title: data.title, assignedTo: data.assigned_to },
    });

    return NextResponse.json({ data }, { status: 201 });
  } catch (error) {
    console.error('Unexpected error in POST /api/pa-tasks:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
