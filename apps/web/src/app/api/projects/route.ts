import { type NextRequest, NextResponse } from 'next/server';
import { logActivity } from '@/lib/audit';
import { projectCreateSchema } from '@/lib/schemas/project.schema';
import { getProjectAuthedContext, isProjectAdmin } from './_lib';

export const dynamic = 'force-dynamic';

/**
 * GET /api/projects
 * Query params: status, health, leadUserId, mineOnly=true, page, pageSize
 * Members see their own projects; admins see all.
 */
export async function GET(request: NextRequest) {
  const auth = await getProjectAuthedContext();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { supabaseAdmin, user, role } = auth.context;
  const params = request.nextUrl.searchParams;
  const status = params.get('status');
  const health = params.get('health');
  const leadUserId = params.get('leadUserId');
  const mineOnly = params.get('mineOnly') === 'true';
  const page = Math.max(1, Number.parseInt(params.get('page') ?? '1', 10) || 1);
  const pageSize = Math.min(100, Number.parseInt(params.get('pageSize') ?? '20', 10) || 20);

  let query = supabaseAdmin
    .from('projects')
    .select('*', { count: 'exact' })
    .is('deleted_at', null)
    .order('updated_at', { ascending: false });

  if (status) query = query.eq('status', status);
  if (health) query = query.eq('health', health);
  if (leadUserId) query = query.eq('lead_user_id', leadUserId);

  // Non-admins are limited to projects they participate in.
  if (!isProjectAdmin(role) || mineOnly) {
    const { data: contribRows } = await supabaseAdmin
      .from('project_contributors')
      .select('project_id')
      .eq('user_id', user.id);
    const contribIds = (contribRows ?? []).map((r: { project_id: string }) => r.project_id);

    const orFilters = [
      `lead_user_id.eq.${user.id}`,
      `supervisor_id.eq.${user.id}`,
      `created_by.eq.${user.id}`,
    ];
    if (contribIds.length > 0) {
      orFilters.push(`id.in.(${contribIds.join(',')})`);
    }
    query = query.or(orFilters.join(','));
  }

  const from = (page - 1) * pageSize;
  query = query.range(from, from + pageSize - 1);

  const { data, error, count } = await query;
  if (error) {
    console.error('GET /api/projects failed:', error);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }

  const projects = data ?? [];
  const projectIds = projects.map((project: { id: string }) => project.id);

  const earnedPointsByProject = new Map<string, number>();
  if (projectIds.length > 0) {
    const { data: pointEvents, error: pointsError } = await supabaseAdmin
      .from('points_events')
      .select('source_project_id, points')
      .in('source_project_id', projectIds);

    if (pointsError) {
      console.error('GET /api/projects points lookup failed:', pointsError);
      return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
    }

    for (const event of pointEvents ?? []) {
      if (!event.source_project_id) {
        continue;
      }

      earnedPointsByProject.set(
        event.source_project_id,
        (earnedPointsByProject.get(event.source_project_id) ?? 0) + (event.points ?? 0)
      );
    }
  }

  return NextResponse.json({
    data: projects.map((project) => ({
      ...project,
      earned_points: earnedPointsByProject.get(project.id) ?? 0,
    })),
    pagination: { page, pageSize, total: count ?? 0 },
  });
}

/**
 * POST /api/projects
 * Creates a new project. Caller becomes the lead by default if not specified.
 * Auto-adds lead as a contributor.
 */
export async function POST(request: NextRequest) {
  const auth = await getProjectAuthedContext();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { supabaseAdmin, supabase, user } = auth.context;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = projectCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const input = parsed.data;
  const progressPct = input.progressPct ?? (input.isCompletedAlready ? 100 : 0);

  const { data: created, error } = await supabaseAdmin
    .from('projects')
    .insert({
      name: input.name,
      description: input.description ?? null,
      lead_user_id: input.leadUserId,
      supervisor_id: input.supervisorId ?? null,
      start_date: input.startDate,
      target_end_date: input.targetEndDate,
      status: progressPct >= 100 ? 'completed' : input.status,
      progress_pct: progressPct,
      created_by: user.id,
    })
    .select('*')
    .single();

  if (error || !created) {
    console.error('POST /api/projects failed:', error);
    return NextResponse.json({ error: error?.message ?? 'Failed to create project' }, { status: 500 });
  }

  // Auto-add lead as a contributor (idempotent due to PK)
  await supabaseAdmin
    .from('project_contributors')
    .upsert(
      { project_id: created.id, user_id: input.leadUserId, role: 'lead' },
      { onConflict: 'project_id,user_id' }
    );

  logActivity(supabase, {
    userId: user.id,
    action: 'project_created',
    tableName: 'projects',
    recordId: created.id,
    metadata: { name: input.name },
  });

  return NextResponse.json({ data: created }, { status: 201 });
}
