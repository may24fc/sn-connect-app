import { type NextRequest, NextResponse } from 'next/server';
import { logActivity } from '@/lib/audit';
import { projectUpdateSchema } from '@/lib/schemas/project.schema';
import { getProjectAuthedContext, isProjectAdmin, userCanAccessProject } from '../_lib';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const auth = await getProjectAuthedContext();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { supabaseAdmin, user, role } = auth.context;
  const allowed = await userCanAccessProject(supabaseAdmin, id, user.id, role);
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data: project, error } = await supabaseAdmin
    .from('projects')
    .select('*')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: contributors } = await supabaseAdmin
    .from('project_contributors')
    .select('user_id, role, joined_at')
    .eq('project_id', id);

  const { data: pointEvents, error: pointsError } = await supabaseAdmin
    .from('points_events')
    .select('points')
    .eq('source_project_id', id);

  if (pointsError) {
    return NextResponse.json({ error: pointsError.message }, { status: 500 });
  }

  const earnedPoints = (pointEvents ?? []).reduce(
    (total: number, event: { points: number | null }) => total + (event.points ?? 0),
    0
  );

  return NextResponse.json({
    data: {
      ...project,
      earned_points: earnedPoints,
      contributors: contributors ?? [],
    },
  });
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const auth = await getProjectAuthedContext();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { supabaseAdmin, supabase, user, role } = auth.context;
  const allowed = await userCanAccessProject(supabaseAdmin, id, user.id, role);
  if (!allowed) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = projectUpdateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const input = parsed.data;
  const update: Record<string, unknown> = {};
  if (input.name !== undefined) update.name = input.name;
  if (input.description !== undefined) update.description = input.description;
  if (input.leadUserId !== undefined) update.lead_user_id = input.leadUserId;
  if (input.supervisorId !== undefined) update.supervisor_id = input.supervisorId;
  if (input.startDate !== undefined) update.start_date = input.startDate;
  if (input.targetEndDate !== undefined) update.target_end_date = input.targetEndDate;
  if (input.status !== undefined) update.status = input.status;
  if (input.pointsTotal !== undefined) update.points_total = input.pointsTotal;
  if (input.progressPct !== undefined) update.progress_pct = input.progressPct;

  if (typeof update.progress_pct === 'number' && update.progress_pct >= 100 && update.status === undefined) {
    update.status = 'completed';
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('projects')
    .update(update)
    .eq('id', id)
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  logActivity(supabase, {
    userId: user.id,
    action: 'project_updated',
    tableName: 'projects',
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

  // Only lead, supervisor, or admin may soft-delete.
  const { data: project } = await supabaseAdmin
    .from('projects')
    .select('lead_user_id, supervisor_id')
    .eq('id', id)
    .maybeSingle();

  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const isPrivileged =
    isProjectAdmin(role) ||
    project.lead_user_id === user.id ||
    project.supervisor_id === user.id;
  if (!isPrivileged) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { error } = await supabaseAdmin
    .from('projects')
    .update({ deleted_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  logActivity(supabase, {
    userId: user.id,
    action: 'project_deleted',
    tableName: 'projects',
    recordId: id,
  });

  return NextResponse.json({ ok: true });
}
