import { type NextRequest, NextResponse } from 'next/server';
import { logActivity } from '@/lib/audit';
import { checklistItemCreateSchema } from '@/lib/schemas/project.schema';
import { getProjectAuthedContext, userCanAccessProject } from '../../../_lib';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/projects/milestones/{id}/checklist
 * POST /api/projects/milestones/{id}/checklist  → create one item
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id: milestoneId } = await params;
  const auth = await getProjectAuthedContext();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { supabaseAdmin, user, role } = auth.context;
  const { data: milestone } = await supabaseAdmin
    .from('project_milestones')
    .select('project_id')
    .eq('id', milestoneId)
    .maybeSingle();

  if (!milestone) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!(await userCanAccessProject(supabaseAdmin, milestone.project_id, user.id, role))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { data, error } = await supabaseAdmin
    .from('project_checklist_items')
    .select('*')
    .eq('milestone_id', milestoneId)
    .order('position', { ascending: true })
    .order('created_at', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ data: data ?? [] });
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id: milestoneId } = await params;
  const auth = await getProjectAuthedContext();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { supabaseAdmin, supabase, user, role } = auth.context;

  const { data: milestone } = await supabaseAdmin
    .from('project_milestones')
    .select('project_id, status')
    .eq('id', milestoneId)
    .maybeSingle();

  if (!milestone) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (!(await userCanAccessProject(supabaseAdmin, milestone.project_id, user.id, role))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = checklistItemCreateSchema.safeParse({ ...(body as object), milestoneId });
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const input = parsed.data;

  const { data, error } = await supabaseAdmin
    .from('project_checklist_items')
    .insert({
      milestone_id: milestoneId,
      title: input.title,
      description: input.description ?? null,
      position: input.position ?? 0,
    })
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  logActivity(supabase, {
    userId: user.id,
    action: 'checklist_item_created',
    tableName: 'project_checklist_items',
    recordId: data!.id,
    metadata: { milestoneId },
  });

  return NextResponse.json({ data }, { status: 201 });
}
