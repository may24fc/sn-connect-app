import { type NextRequest, NextResponse } from 'next/server';
import { logActivity } from '@/lib/audit';
import { getProjectAuthedContext, userCanApproveMilestone } from '../../../_lib';

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/projects/milestones/{id}/approve
 * Supervisor or admin approves a submitted milestone. Phase 3 will hook a trigger here
 * to award points; for Phase 1 we only set status + audit.
 */
export async function POST(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const auth = await getProjectAuthedContext();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { supabaseAdmin, supabase, user, role } = auth.context;

  const can = await userCanApproveMilestone(supabaseAdmin, id, user.id, role);
  if (!can.ok) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const { data: existing } = await supabaseAdmin
    .from('project_milestones')
    .select('status')
    .eq('id', id)
    .maybeSingle();

  if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (existing.status === 'approved') {
    return NextResponse.json({ error: 'Already approved' }, { status: 409 });
  }
  if (existing.status !== 'submitted') {
    return NextResponse.json(
      { error: 'Milestone must be submitted before approval' },
      { status: 400 }
    );
  }

  const { data, error } = await supabaseAdmin
    .from('project_milestones')
    .update({
      status: 'approved',
      approved_at: new Date().toISOString(),
      approved_by: user.id,
    })
    .eq('id', id)
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  logActivity(supabase, {
    userId: user.id,
    action: 'milestone_approved',
    tableName: 'project_milestones',
    recordId: id,
    metadata: { projectId: can.projectId },
  });

  return NextResponse.json({ data });
}
