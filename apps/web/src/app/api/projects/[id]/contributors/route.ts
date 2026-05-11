import { type NextRequest, NextResponse } from 'next/server';
import { logActivity } from '@/lib/audit';
import { contributorAddSchema } from '@/lib/schemas/project.schema';
import { getProjectAuthedContext, isProjectAdmin } from '../../_lib';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

async function ensureCanManageContributors(
  supabaseAdmin: ReturnType<
    typeof import('@/lib/supabase/server').createSupabaseAdminClient
  >,
  projectId: string,
  userId: string,
  role: string | null
): Promise<boolean> {
  if (isProjectAdmin(role)) return true;
  const { data } = await supabaseAdmin
    .from('projects')
    .select('lead_user_id, supervisor_id')
    .eq('id', projectId)
    .maybeSingle();
  if (!data) return false;
  return data.lead_user_id === userId || data.supervisor_id === userId;
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  const { id: projectId } = await params;
  const auth = await getProjectAuthedContext();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { supabaseAdmin, supabase, user, role } = auth.context;
  if (!(await ensureCanManageContributors(supabaseAdmin, projectId, user.id, role))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const parsed = contributorAddSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Validation failed', details: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { error } = await supabaseAdmin
    .from('project_contributors')
    .upsert(
      { project_id: projectId, user_id: parsed.data.userId, role: parsed.data.role },
      { onConflict: 'project_id,user_id' }
    );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  logActivity(supabase, {
    userId: user.id,
    action: 'project_contributor_added',
    tableName: 'project_contributors',
    recordId: projectId,
    metadata: { contributor: parsed.data.userId, role: parsed.data.role },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id: projectId } = await params;
  const auth = await getProjectAuthedContext();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { supabaseAdmin, supabase, user, role } = auth.context;
  if (!(await ensureCanManageContributors(supabaseAdmin, projectId, user.id, role))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const userIdToRemove = request.nextUrl.searchParams.get('userId');
  if (!userIdToRemove) {
    return NextResponse.json({ error: 'userId query param required' }, { status: 400 });
  }

  const { error } = await supabaseAdmin
    .from('project_contributors')
    .delete()
    .eq('project_id', projectId)
    .eq('user_id', userIdToRemove);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  logActivity(supabase, {
    userId: user.id,
    action: 'project_contributor_removed',
    tableName: 'project_contributors',
    recordId: projectId,
    metadata: { contributor: userIdToRemove },
  });

  return NextResponse.json({ ok: true });
}
