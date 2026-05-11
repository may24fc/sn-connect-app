import { type NextRequest, NextResponse } from 'next/server';
import { logActivity } from '@/lib/audit';
import { milestoneUpdateSchema } from '@/lib/schemas/project.schema';
import { getProjectAuthedContext, userCanAccessProject } from '../../_lib';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

async function getMilestoneProject(
  supabaseAdmin: ReturnType<typeof import('@/lib/supabase/server').createSupabaseAdminClient>,
  milestoneId: string
): Promise<string | null> {
  const { data } = await supabaseAdmin
    .from('project_milestones')
    .select('project_id')
    .eq('id', milestoneId)
    .maybeSingle();
  return (data?.project_id as string | undefined) ?? null;
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const auth = await getProjectAuthedContext();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { supabaseAdmin, supabase, user, role } = auth.context;
  const projectId = await getMilestoneProject(supabaseAdmin, id);
  if (!projectId) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!(await userCanAccessProject(supabaseAdmin, projectId, user.id, role))) {
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
  const projectId = await getMilestoneProject(supabaseAdmin, id);
  if (!projectId) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!(await userCanAccessProject(supabaseAdmin, projectId, user.id, role))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { error } = await supabaseAdmin
    .from('project_milestones')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  logActivity(supabase, {
    userId: user.id,
    action: 'milestone_deleted',
    tableName: 'project_milestones',
    recordId: id,
  });

  return NextResponse.json({ ok: true });
}
