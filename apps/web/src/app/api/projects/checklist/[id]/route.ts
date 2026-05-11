import { type NextRequest, NextResponse } from 'next/server';
import { logActivity } from '@/lib/audit';
import { checklistItemUpdateSchema } from '@/lib/schemas/project.schema';
import { getProjectAuthedContext, userCanAccessProject } from '../../_lib';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

async function getItemContext(
  supabaseAdmin: ReturnType<typeof import('@/lib/supabase/server').createSupabaseAdminClient>,
  itemId: string
): Promise<{ projectId: string; milestoneStatus: string } | null> {
  const { data } = await supabaseAdmin
    .from('project_checklist_items')
    .select('milestone_id, project_milestones:project_milestones!inner(project_id, status)')
    .eq('id', itemId)
    .maybeSingle();
  if (!data) return null;
  const m = (data as unknown as {
    project_milestones?: { project_id?: string; status?: string };
  }).project_milestones;
  if (!m?.project_id || !m.status) return null;
  return { projectId: m.project_id, milestoneStatus: m.status };
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const auth = await getProjectAuthedContext();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { supabaseAdmin, supabase, user, role } = auth.context;
  const ctx = await getItemContext(supabaseAdmin, id);
  if (!ctx) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (ctx.milestoneStatus === 'approved') {
    return NextResponse.json({ error: 'Milestone is already approved' }, { status: 409 });
  }
  if (!(await userCanAccessProject(supabaseAdmin, ctx.projectId, user.id, role))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = checklistItemUpdateSchema.safeParse(body);
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
  if (input.position !== undefined) update.position = input.position;
  if (input.status !== undefined) {
    update.status = input.status;
    if (input.status === 'done') {
      update.completed_at = new Date().toISOString();
      update.completed_by = user.id;
    } else {
      update.completed_at = null;
      update.completed_by = null;
    }
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from('project_checklist_items')
    .update(update)
    .eq('id', id)
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  logActivity(supabase, {
    userId: user.id,
    action: 'checklist_item_updated',
    tableName: 'project_checklist_items',
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
  const ctx = await getItemContext(supabaseAdmin, id);
  if (!ctx) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!(await userCanAccessProject(supabaseAdmin, ctx.projectId, user.id, role))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { error } = await supabaseAdmin.from('project_checklist_items').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  logActivity(supabase, {
    userId: user.id,
    action: 'checklist_item_deleted',
    tableName: 'project_checklist_items',
    recordId: id,
  });

  return NextResponse.json({ ok: true });
}
