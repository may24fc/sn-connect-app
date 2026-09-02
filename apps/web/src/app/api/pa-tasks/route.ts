import { logActivity } from '@/lib/audit';
import {
  paTaskCreateSchema,
  paTaskFiltersSchema,
} from '@/lib/schemas/pa-task.schema';
import { type NextRequest, NextResponse } from 'next/server';
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

interface TaskAttachmentRow {
  id: string;
  pa_task_id: string;
  title: string;
  attachment_type: 'file' | 'link';
  url: string | null;
  storage_path: string | null;
  mime_type: string | null;
  created_at: string;
}

interface StatusScopeRow {
  id: string;
}

function parseQueryFilters(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const parsed = paTaskFiltersSchema.safeParse({
    search: searchParams.get('search') ?? undefined,
    statusId: searchParams.get('statusId') ?? undefined,
    statusScope: searchParams.get('statusScope') ?? undefined,
    priorityId: searchParams.get('priorityId') ?? undefined,
    categoryId: searchParams.get('categoryId') ?? undefined,
    assigneeId: searchParams.get('assigneeId') ?? undefined,
    dueStatus: searchParams.get('dueStatus') ?? undefined,
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
    const { data: terminalStatusRows, error: terminalStatusError } = await supabaseAdmin
      .from('pa_task_statuses')
      .select('id')
      .eq('is_terminal', true)
      .is('deleted_at', null);

    if (terminalStatusError) {
      console.error('Error loading terminal PA task statuses:', terminalStatusError);
      return NextResponse.json({ error: 'Failed to fetch PA tasks' }, { status: 500 });
    }

    const terminalStatusIds = (terminalStatusRows ?? []).map((row) => (row as StatusScopeRow).id);
    let query = supabaseAdmin
      .from('pa_tasks')
      .select(
        `
      *,
      status:pa_task_statuses!pa_tasks_status_id_fkey(id,label,color,is_terminal),
      priority:pa_task_priorities!pa_tasks_priority_id_fkey(id,label,color),
      category:pa_task_categories!pa_tasks_category_id_fkey(id,label,color)
    `,
        { count: 'exact' }
      )
    .is('deleted_at', null);

    if (filters.statusScope === 'active' && terminalStatusIds.length > 0) {
      query = query.not('status_id', 'in', `(${terminalStatusIds.join(',')})`);
    }

    if (filters.statusScope === 'archive') {
      if (terminalStatusIds.length === 0) {
        return NextResponse.json({
          data: [],
          pagination: {
            page: filters.page,
            pageSize: filters.pageSize,
            total: 0,
            totalPages: 0,
          },
        });
      }
      query = query.in('status_id', terminalStatusIds);
    }

    if (filters.sortBy === 'due_date') {
    query = query.order(filters.sortBy, {
      ascending: filters.sortOrder === 'asc',
      nullsFirst: false,
    });
    } else {
    query = query.order(filters.sortBy, { ascending: filters.sortOrder === 'asc' });
    }
    // Stabilize pagination: avoid duplicate/missing rows across pages when primary sort ties.
    query = query.order('id', { ascending: true });

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
    const hasDueStatusFilter = Boolean(filters.dueStatus);
    if (!hasDueStatusFilter) {
      query = query.range(from, to);
    }

    const { data: rows, error, count } = await query;
    if (error) {
      console.error('Error fetching PA tasks:', error);
      return NextResponse.json({ error: 'Failed to fetch PA tasks' }, { status: 500 });
    }

    const taskRows = (rows ?? []).filter((row) => {
      if (!filters.dueStatus) {
        return true;
      }

      const statusLabel = row.status?.label?.toLowerCase();
      if (statusLabel === 'overdue') {
        return filters.dueStatus === 'overdue';
      }

      if (row.status?.is_terminal) {
        return filters.dueStatus === 'completed';
      }

      if (!row.due_date) {
        return filters.dueStatus === 'no_due_date';
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const dueDate = new Date(row.due_date);
      dueDate.setHours(0, 0, 0, 0);

      return filters.dueStatus === (dueDate < today ? 'overdue' : 'on_time');
    });

    const paginatedTaskRows = hasDueStatusFilter ? taskRows.slice(from, to + 1) : taskRows;

    const userIds = Array.from(
      new Set(
        paginatedTaskRows
          .flatMap((row) => [row.assigned_to, row.created_by])
          .filter((value): value is string => Boolean(value))
      )
    );

    const namesByUserId = new Map<string, string>();
    const attachmentsByTaskId = new Map<string, Array<TaskAttachmentRow>>();

    const taskIds = paginatedTaskRows
      .map((row) => row.id)
      .filter((value): value is string => typeof value === 'string' && value.length > 0);

    if (taskIds.length > 0) {
      const { data: attachments, error: attachmentsError } = await supabaseAdmin
        .from('pa_task_attachments')
        .select('id, pa_task_id, title, attachment_type, url, storage_path, mime_type, created_at')
        .in('pa_task_id', taskIds)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (attachmentsError) {
        console.error('Failed to fetch PA task attachments:', attachmentsError);
        return NextResponse.json({ error: 'Failed to fetch PA tasks' }, { status: 500 });
      }

      for (const attachment of (attachments ?? []) as Array<TaskAttachmentRow>) {
        const existing = attachmentsByTaskId.get(attachment.pa_task_id) ?? [];
        existing.push(attachment);
        attachmentsByTaskId.set(attachment.pa_task_id, existing);
      }
    }

    if (userIds.length > 0) {
      const { data: employees } = await supabaseAdmin
        .from('employees')
        .select('user_id, first_name, last_name')
        .in('user_id', userIds)
        .is('deleted_at', null);

      for (const employee of (employees ?? []) as Array<EmployeeNameRow>) {
        namesByUserId.set(employee.user_id, `${employee.first_name} ${employee.last_name}`);
      }
    }

    const data = paginatedTaskRows.map((row) => ({
      ...row,
      attachments: attachmentsByTaskId.get(row.id) ?? [],
      assignee_name: row.assigned_to ? namesByUserId.get(row.assigned_to) ?? null : null,
      creator_name: namesByUserId.get(row.created_by) ?? null,
    }));

    const filteredTotal = hasDueStatusFilter ? taskRows.length : (count ?? 0);

    return NextResponse.json({
      data,
      pagination: {
        page: filters.page,
        pageSize: filters.pageSize,
        total: filteredTotal,
        totalPages: Math.ceil(filteredTotal / filters.pageSize),
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
