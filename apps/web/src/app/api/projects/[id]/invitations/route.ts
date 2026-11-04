import { getProjectAuthedContext } from '@/app/api/projects/_lib';
import { logActivity } from '@/lib/audit';
import { loadDirectoryPeople } from '@/lib/people/directory-people';
import { invitationRpcResultSchema, projectInvitationError } from '@/lib/projects/member-invitations';
import { canManageProject } from '@/lib/work-management/permissions';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id: projectId } = await params;
  const auth = await getProjectAuthedContext();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { supabaseAdmin, user, role } = auth.context;
  if (!(await canManageProject(supabaseAdmin, projectId, user.id, role))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const { data: invitations, error } = await supabaseAdmin
    .from('project_member_invitations')
    .select('id, invitee_id, role, make_primary, created_at')
    .eq('project_id', projectId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('Failed to load pending project invitations:', error.code);
    return NextResponse.json({ error: 'Failed to load pending invitations' }, { status: 500 });
  }
  const people = await loadDirectoryPeople(supabaseAdmin, (invitations ?? []).map((row) => row.invitee_id));
  return NextResponse.json({
    data: (invitations ?? []).map((invitation) => ({
      ...invitation,
      invitee_name: people.get(invitation.invitee_id)?.name ?? 'Unnamed account',
    })),
  });
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id: projectId } = await params;
  const auth = await getProjectAuthedContext();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { supabaseAdmin, supabase, user, role } = auth.context;
  if (!(await canManageProject(supabaseAdmin, projectId, user.id, role))) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const parsed = z.string().uuid().safeParse(request.nextUrl.searchParams.get('invitationId'));
  if (!parsed.success) return NextResponse.json({ error: 'Invalid invitation' }, { status: 400 });
  const { data, error } = await supabaseAdmin.rpc('cancel_project_member_invitation', {
    p_project_id: projectId,
    p_invitation_id: parsed.data,
    p_actor: user.id,
  });
  if (error) {
    console.error('Failed to cancel project invitation:', error.code);
    return NextResponse.json({ error: 'Failed to cancel invitation' }, { status: 500 });
  }
  const result = invitationRpcResultSchema.safeParse(data);
  if (!result.success || (!result.data.ok && !result.data.error)) {
    console.error('Project invitation cancellation returned an invalid result');
    return NextResponse.json({ error: 'Failed to cancel invitation' }, { status: 500 });
  }
  if (result.data.error) {
    const failure = projectInvitationError(result.data.error);
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
  logActivity(supabase, {
    userId: user.id,
    action: 'project_invitation_cancelled',
    tableName: 'project_member_invitations',
    recordId: parsed.data,
    metadata: { projectId },
  });
  return NextResponse.json({ ok: true });
}
