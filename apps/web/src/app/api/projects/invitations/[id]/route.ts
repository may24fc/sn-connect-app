import { getProjectAuthedContext } from '@/app/api/projects/_lib';
import { logActivity } from '@/lib/audit';
import { invitationRpcResultSchema, projectInvitationError } from '@/lib/projects/member-invitations';
import { type NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

export const dynamic = 'force-dynamic';

const responseSchema = z.object({ action: z.enum(['accept', 'decline']) });

export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!z.string().uuid().safeParse(id).success) {
    return NextResponse.json({ error: 'Invalid invitation' }, { status: 400 });
  }
  const auth = await getProjectAuthedContext();
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const parsed = responseSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: 'Invalid invitation response' }, { status: 400 });

  const { supabaseAdmin, supabase, user } = auth.context;
  const { data, error } = await supabaseAdmin.rpc('respond_project_member_invitation', {
    p_invitation_id: id,
    p_invitee_id: user.id,
    p_action: parsed.data.action,
  });
  if (error) {
    console.error('Failed to respond to project invitation:', error.code);
    return NextResponse.json({ error: 'Failed to respond to invitation' }, { status: 500 });
  }
  const result = invitationRpcResultSchema.safeParse(data);
  if (!result.success || (!result.data.ok && !result.data.error)) {
    console.error('Project invitation response returned an invalid result');
    return NextResponse.json({ error: 'Failed to respond to invitation' }, { status: 500 });
  }
  if (result.data.error) {
    const failure = projectInvitationError(result.data.error);
    return NextResponse.json({ error: failure.error }, { status: failure.status });
  }
  if (!result.data.projectId || !result.data.status) {
    console.error('Project invitation response was incomplete');
    return NextResponse.json({ error: 'Failed to respond to invitation' }, { status: 500 });
  }
  logActivity(supabase, {
    userId: user.id,
    action: parsed.data.action === 'accept' ? 'project_invitation_accepted' : 'project_invitation_declined',
    tableName: 'project_member_invitations',
    recordId: id,
    metadata: { projectId: result.data.projectId, primaryChanged: result.data.primaryChanged },
  });
  return NextResponse.json(result.data);
}
