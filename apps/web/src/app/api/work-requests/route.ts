import { getProjectAuthedContext } from '@/app/api/projects/_lib';
import { logActivity } from '@/lib/audit';
import { loadDirectoryPeople } from '@/lib/people/directory-people';
import { crossDepartmentWorkRequestCreateSchema } from '@/lib/schemas/work-request.schema';
import { getWorkManagementScope } from '@/lib/work-management/permissions';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const rpcResultSchema = z.object({
  ok: z.boolean().optional(),
  error: z.string().optional(),
  data: z.record(z.unknown()).optional(),
});

const errorResponses: Record<string, { status: number; message: string }> = {
  inactive: { status: 403, message: 'Your account cannot create work requests' },
  invalid_department: { status: 400, message: 'Select an active target department' },
  same_department: {
    status: 400,
    message: 'Create a normal task for work within your own department',
  },
  no_approver: {
    status: 409,
    message: 'That department has no active lead available to review this request',
  },
  project_forbidden: { status: 403, message: 'You do not have access to that project' },
  invalid_milestone: {
    status: 400,
    message: 'The selected milestone does not belong to that project',
  },
  invalid_suggestion: {
    status: 400,
    message: 'The suggested person is not an active member of that department',
  },
};

interface RequestRow {
  id: string;
  requester_id: string;
  source_department_id: string | null;
  target_department_id: string;
  project_id: string | null;
  milestone_id: string | null;
  suggested_assignee_id: string | null;
  assigned_to: string | null;
  reviewed_by: string | null;
  created_task_id: string | null;
  title: string;
  description: string | null;
  priority: string;
  due_date: string | null;
  status: string;
  decision_note: string | null;
  created_at: string;
  updated_at: string;
  decided_at: string | null;
}

export async function GET(request: NextRequest) {
  const auth = await getProjectAuthedContext();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { supabaseAdmin, user, role } = auth.context;
  const view = request.nextUrl.searchParams.get('view') === 'review' ? 'review' : 'mine';
  const scope = await getWorkManagementScope(supabaseAdmin, user.id, role);
  if (view === 'review' && !(scope.isGlobal || scope.ledDepartmentIds.length > 0)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let query = supabaseAdmin
    .from('cross_department_work_requests')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);
  if (view === 'mine') {
    query = query.eq('requester_id', user.id);
  } else if (!scope.isGlobal) {
    query = query.in('target_department_id', scope.ledDepartmentIds);
  }
  const { data, error } = await query;
  if (error) {
    console.error('GET /api/work-requests failed:', error.code);
    return NextResponse.json({ error: 'Failed to load department requests' }, { status: 500 });
  }

  const rows = (data ?? []) as Array<RequestRow>;
  const departmentIds = [
    ...new Set(
      rows.flatMap((row) => [row.source_department_id, row.target_department_id]).filter(Boolean)
    ),
  ] as Array<string>;
  const projectIds = [...new Set(rows.flatMap((row) => (row.project_id ? [row.project_id] : [])))];
  const personIds = [
    ...new Set(
      rows
        .flatMap((row) => [
          row.requester_id,
          row.suggested_assignee_id,
          row.assigned_to,
          row.reviewed_by,
        ])
        .filter(Boolean)
    ),
  ] as Array<string>;

  const [departmentsResult, projectsResult, people] = await Promise.all([
    departmentIds.length
      ? supabaseAdmin.from('departments').select('id, name').in('id', departmentIds)
      : Promise.resolve({ data: [], error: null }),
    projectIds.length
      ? supabaseAdmin.from('projects').select('id, name').in('id', projectIds)
      : Promise.resolve({ data: [], error: null }),
    loadDirectoryPeople(supabaseAdmin, personIds),
  ]);
  if (departmentsResult.error || projectsResult.error) {
    return NextResponse.json({ error: 'Failed to resolve department requests' }, { status: 500 });
  }
  const departmentNames = new Map(
    (departmentsResult.data ?? []).map((entry) => [entry.id, entry.name])
  );
  const projectNames = new Map((projectsResult.data ?? []).map((entry) => [entry.id, entry.name]));

  const targetDepartmentIds =
    view === 'review' ? [...new Set(rows.map((row) => row.target_department_id))] : [];
  const { data: candidates, error: candidatesError } = targetDepartmentIds.length
    ? await supabaseAdmin
        .from('users')
        .select('id, department_id')
        .in('department_id', targetDepartmentIds)
        .in('role', ['employee', 'associate'])
        .is('deleted_at', null)
        .neq('status', 'terminated')
    : { data: [], error: null };
  if (candidatesError) {
    return NextResponse.json({ error: 'Failed to load department members' }, { status: 500 });
  }
  const candidatePeople = await loadDirectoryPeople(
    supabaseAdmin,
    (candidates ?? []).map((candidate) => candidate.id)
  );

  return NextResponse.json({
    data: rows.map((row) => ({
      ...row,
      requester_name: people.get(row.requester_id)?.name ?? 'Unknown requester',
      source_department_name: row.source_department_id
        ? (departmentNames.get(row.source_department_id) ?? 'Unknown department')
        : null,
      target_department_name: departmentNames.get(row.target_department_id) ?? 'Unknown department',
      project_name: row.project_id ? (projectNames.get(row.project_id) ?? 'Unknown project') : null,
      suggested_assignee_name: row.suggested_assignee_id
        ? (people.get(row.suggested_assignee_id)?.name ?? null)
        : null,
      assigned_to_name: row.assigned_to ? (people.get(row.assigned_to)?.name ?? null) : null,
      reviewer_name: row.reviewed_by ? (people.get(row.reviewed_by)?.name ?? null) : null,
    })),
    assigneeOptions: (candidates ?? []).map((candidate) => ({
      id: candidate.id,
      departmentId: candidate.department_id,
      name: candidatePeople.get(candidate.id)?.name ?? 'Unknown member',
      avatarUrl: candidatePeople.get(candidate.id)?.avatarUrl ?? null,
    })),
    canReview: scope.isGlobal || scope.ledDepartmentIds.length > 0,
    pendingCount: rows.filter((row) => row.status === 'pending').length,
  });
}

export async function POST(request: NextRequest) {
  const auth = await getProjectAuthedContext();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { supabaseAdmin, supabase, user } = auth.context;
  const parsed = crossDepartmentWorkRequestCreateSchema.safeParse(
    await request.json().catch(() => null)
  );
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Check the department request fields', details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const { data, error } = await supabaseAdmin.rpc('create_cross_department_work_request', {
    p_actor: user.id,
    p_input: parsed.data,
  });
  if (error) {
    console.error('POST /api/work-requests failed:', error.code);
    return NextResponse.json({ error: 'Failed to create department request' }, { status: 500 });
  }
  const result = rpcResultSchema.safeParse(data);
  if (!result.success) {
    return NextResponse.json({ error: 'Invalid department request response' }, { status: 500 });
  }
  if (result.data.error) {
    const response = errorResponses[result.data.error] ?? {
      status: 400,
      message: 'Could not create this department request',
    };
    return NextResponse.json({ error: response.message }, { status: response.status });
  }
  logActivity(supabase, {
    userId: user.id,
    action: 'cross_department_request_created',
    tableName: 'cross_department_work_requests',
    recordId: String(result.data.data?.id ?? ''),
    metadata: { targetDepartmentId: parsed.data.targetDepartmentId },
  });
  return NextResponse.json({ data: result.data.data }, { status: 201 });
}
