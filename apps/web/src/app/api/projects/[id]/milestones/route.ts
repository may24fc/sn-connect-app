import { type NextRequest, NextResponse } from 'next/server';
import { logActivity } from '@/lib/audit';
import { milestoneCreateSchema } from '@/lib/schemas/project.schema';
import { getProjectAuthedContext, userCanAccessProject } from '../../_lib';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

function validateMilestoneWindow(periodStart: string, periodEnd: string, dueDate: string): string | null {
  if (periodEnd < periodStart) {
    return 'End date must be on or after the start date';
  }

  if (dueDate > periodEnd) {
    return 'Due date cannot be beyond the end date';
  }

  return null;
}

/**
 * GET /api/projects/{id}/milestones
 * Returns all milestones for a project (months + nested weeks).
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id: projectId } = await params;
  const auth = await getProjectAuthedContext();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { supabaseAdmin, user, role } = auth.context;
  if (!(await userCanAccessProject(supabaseAdmin, projectId, user.id, role))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from('project_milestones')
    .select('*')
    .eq('project_id', projectId)
    .is('deleted_at', null)
    .order('period_start', { ascending: true })
    .order('position', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ data: data ?? [] });
}

/**
 * POST /api/projects/{id}/milestones
 * Creates a milestone (monthly or weekly w/ parent).
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id: projectId } = await params;
  const auth = await getProjectAuthedContext();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { supabaseAdmin, supabase, user, role } = auth.context;
  if (!(await userCanAccessProject(supabaseAdmin, projectId, user.id, role))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = milestoneCreateSchema.safeParse({ ...(body as object), projectId });
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const input = parsed.data;

  const windowError = validateMilestoneWindow(input.periodStart, input.periodEnd, input.dueDate);
  if (windowError) {
    return NextResponse.json({ error: windowError }, { status: 400 });
  }

  const { data: created, error } = await supabaseAdmin
    .from('project_milestones')
    .insert({
      project_id: projectId,
      parent_milestone_id: input.parentMilestoneId ?? null,
      period_type: input.periodType,
      title: input.title,
      description: input.description ?? null,
      period_start: input.periodStart,
      period_end: input.periodEnd,
      due_date: input.dueDate,
      position: input.position ?? 0,
    })
    .select('*')
    .single();

  if (error || !created) {
    return NextResponse.json({ error: error?.message ?? 'Failed' }, { status: 500 });
  }

  logActivity(supabase, {
    userId: user.id,
    action: 'milestone_created',
    tableName: 'project_milestones',
    recordId: created.id,
    metadata: { projectId, periodType: input.periodType },
  });

  return NextResponse.json({ data: created }, { status: 201 });
}
