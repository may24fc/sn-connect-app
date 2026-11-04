import { getProjectAuthedContext } from '@/app/api/projects/_lib';
import { loadDirectoryPeople } from '@/lib/people/directory-people';
import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const auth = await getProjectAuthedContext();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const { supabaseAdmin, user } = auth.context;

  const { data: invitations, error } = await supabaseAdmin
    .from('project_member_invitations')
    .select('id, project_id, invited_by, role, make_primary, created_at')
    .eq('invitee_id', user.id)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });
  if (error) {
    console.error('Failed to load project invitations:', error.code);
    return NextResponse.json({ error: 'Failed to load project invitations' }, { status: 500 });
  }
  if (!invitations?.length) return NextResponse.json({ data: [] });

  const projectIds = [...new Set(invitations.map((invitation) => invitation.project_id))];
  const [projectResult, people] = await Promise.all([
    supabaseAdmin
      .from('projects')
      .select('id, name, description')
      .in('id', projectIds)
      .is('deleted_at', null),
    loadDirectoryPeople(supabaseAdmin, invitations.map((invitation) => invitation.invited_by)),
  ]);
  if (projectResult.error) {
    console.error('Failed to load invitation projects:', projectResult.error.code);
    return NextResponse.json({ error: 'Failed to load project invitations' }, { status: 500 });
  }
  const projects = new Map((projectResult.data ?? []).map((project) => [project.id, project]));
  return NextResponse.json({
    data: invitations.flatMap((invitation) => {
      const project = projects.get(invitation.project_id);
      if (!project) return [];
      return [{
        id: invitation.id,
        project_id: invitation.project_id,
        project_name: project.name,
        project_description: project.description,
        inviter_name: people.get(invitation.invited_by)?.name ?? 'A project manager',
        role: invitation.role,
        make_primary: invitation.make_primary,
        created_at: invitation.created_at,
      }];
    }),
  });
}
