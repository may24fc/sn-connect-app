import { type NextRequest, NextResponse } from 'next/server';
import { logActivity } from '@/lib/audit';
import { getProjectAuthedContext, userCanAccessProject } from '../../../_lib';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/projects/milestones/{id}/submit
 * Completes a milestone directly once its checklist reaches 100%.
 */
export async function POST(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const auth = await getProjectAuthedContext();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { supabaseAdmin, supabase, user, role } = auth.context;

  const { data: milestone, error: fetchErr } = await supabaseAdmin
    .from('project_milestones')
    .select('id, project_id, status, progress_pct')
    .eq('id', id)
    .is('deleted_at', null)
    .maybeSingle();

  if (fetchErr) return NextResponse.json({ error: fetchErr.message }, { status: 500 });
  if (!milestone) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (!(await userCanAccessProject(supabaseAdmin, milestone.project_id, user.id, role))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  if (milestone.status === 'approved') {
    return NextResponse.json({ error: 'Already approved' }, { status: 409 });
  }

  if ((milestone.progress_pct ?? 0) < 100) {
    return NextResponse.json(
      { error: 'All checklist items must be completed before marking the milestone complete' },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from('project_milestones')
    .update({
      status: 'approved',
      submitted_at: milestone.status === 'submitted' ? undefined : new Date().toISOString(),
      submitted_by: milestone.status === 'submitted' ? undefined : user.id,
      approved_at: new Date().toISOString(),
      approved_by: user.id,
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  logActivity(supabase, {
    userId: user.id,
    action: 'milestone_completed',
    tableName: 'project_milestones',
    recordId: id,
    metadata: { projectId: milestone.project_id },
  });

  return NextResponse.json({ data });
}
