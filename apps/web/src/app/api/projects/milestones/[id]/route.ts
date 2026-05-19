import { type NextRequest, NextResponse } from 'next/server';
import { logActivity } from '@/lib/audit';
import { milestoneUpdateSchema } from '@/lib/schemas/project.schema';
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

async function getMilestoneRecord(
  supabaseAdmin: ReturnType<typeof import('@/lib/supabase/server').createSupabaseAdminClient>,
  milestoneId: string
): Promise<{
  projectId: string;
  periodStart: string;
  periodEnd: string;
  dueDate: string;
} | null> {
  const { data } = await supabaseAdmin
    .from('project_milestones')
    .select('project_id, period_start, period_end, due_date')
    .eq('id', milestoneId)
    .maybeSingle();

  const row = data as {
    project_id?: string;
    period_start?: string;
    period_end?: string;
    due_date?: string;
  } | null;

  if (!row?.project_id || !row.period_start || !row.period_end || !row.due_date) {
    return null;
  }

  return {
    projectId: row.project_id,
    periodStart: row.period_start,
    periodEnd: row.period_end,
    dueDate: row.due_date,
  };
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const auth = await getProjectAuthedContext();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { supabaseAdmin, supabase, user, role } = auth.context;
  const milestone = await getMilestoneRecord(supabaseAdmin, id);
  if (!milestone) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!(await userCanAccessProject(supabaseAdmin, milestone.projectId, user.id, role))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = milestoneUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const input = parsed.data;

  const update: Record<string, unknown> = {};
  if (input.title !== undefined) update.title = input.title;
  if (input.description !== undefined) update.description = input.description;
  if (input.periodStart !== undefined) update.period_start = input.periodStart;
  if (input.periodEnd !== undefined) update.period_end = input.periodEnd;
  if (input.dueDate !== undefined) update.due_date = input.dueDate;
  if (input.position !== undefined) update.position = input.position;

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const nextPeriodStart = input.periodStart ?? milestone.periodStart;
  const nextPeriodEnd = input.periodEnd ?? milestone.periodEnd;
  const nextDueDate = input.dueDate ?? milestone.dueDate;
  const windowError = validateMilestoneWindow(nextPeriodStart, nextPeriodEnd, nextDueDate);
  if (windowError) {
    return NextResponse.json({ error: windowError }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('project_milestones')
    .update(update)
    .eq('id', id)
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  logActivity(supabase, {
    userId: user.id,
    action: 'milestone_updated',
    tableName: 'project_milestones',
    recordId: id,
    metadata: { fields: Object.keys(update) },
  });

  return NextResponse.json({ data });
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const auth = await getProjectAuthedContext();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { supabaseAdmin, supabase, user, role } = auth.context;
  const milestone = await getMilestoneRecord(supabaseAdmin, id);
  if (!milestone) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!(await userCanAccessProject(supabaseAdmin, milestone.projectId, user.id, role))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data: descendants, error: descendantsError } = await supabaseAdmin
    .from('project_milestones')
    .select('id')
    .or(`id.eq.${id},parent_milestone_id.eq.${id}`)
    .is('deleted_at', null);

  if (descendantsError) {
    return NextResponse.json({ error: descendantsError.message }, { status: 500 });
  }

  const milestoneIds = (descendants ?? []).map((row) => row.id).filter(Boolean);
  if (milestoneIds.length === 0) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const { error: checklistError } = await supabaseAdmin
    .from('project_checklist_items')
    .delete()
    .in('milestone_id', milestoneIds);

  if (checklistError) {
    return NextResponse.json({ error: checklistError.message }, { status: 500 });
  }

  const { error } = await supabaseAdmin
    .from('project_milestones')
    .update({ deleted_at: new Date().toISOString() })
    .in('id', milestoneIds);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  logActivity(supabase, {
    userId: user.id,
    action: 'milestone_deleted',
    tableName: 'project_milestones',
    recordId: id,
    metadata: { deletedMilestoneIds: milestoneIds },
  });

  return NextResponse.json({ ok: true });
}
