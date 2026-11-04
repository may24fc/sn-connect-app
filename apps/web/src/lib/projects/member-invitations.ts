import type { createSupabaseAdminClient } from '@/lib/supabase/server';
import { z } from 'zod';

type AdminClient = ReturnType<typeof createSupabaseAdminClient>;

const createdInvitationsSchema = z.array(
  z.object({ id: z.string().uuid(), userId: z.string().uuid() })
);

export type InvitationRequest = {
  userId: string;
  role: 'lead' | 'contributor';
  makePrimary?: boolean;
  expectedPrimaryId?: string;
};

export async function createProjectMemberInvitations(
  client: AdminClient,
  projectId: string,
  actorId: string,
  invitations: Array<InvitationRequest>
): Promise<
  | { ok: true; invitations: z.infer<typeof createdInvitationsSchema> }
  | { ok: false; status: number; error: string }
> {
  const { data, error } = await client.rpc('create_project_member_invitations', {
    p_project_id: projectId,
    p_invited_by: actorId,
    p_invitations: invitations,
  });
  if (error) {
    if (error.code === '23505') {
      return { ok: false, status: 409, error: 'This person already has this role or a pending invitation' };
    }
    if (error.code === '23514') {
      return { ok: false, status: 400, error: 'Project invitees must be active accounts' };
    }
    if (error.code === '42501') {
      return { ok: false, status: 403, error: 'You cannot invite people to this project' };
    }
    if (error.code === 'P0002') return { ok: false, status: 404, error: 'Project not found' };
    if (error.code === '40001') {
      return { ok: false, status: 409, error: 'The primary project lead changed. Reload and try again.' };
    }
    console.error('Failed to create project invitations:', error.code);
    return { ok: false, status: 500, error: 'Failed to send project invitation' };
  }
  const parsed = createdInvitationsSchema.safeParse(data);
  if (!parsed.success) {
    console.error('Project invitation creation returned an invalid response');
    return { ok: false, status: 500, error: 'Failed to send project invitation' };
  }
  return { ok: true, invitations: parsed.data };
}

export const invitationRpcResultSchema = z.object({
  ok: z.boolean().optional(),
  error: z.string().optional(),
  status: z.string().optional(),
  projectId: z.string().uuid().optional(),
  primaryChanged: z.boolean().optional(),
  makePrimary: z.boolean().optional(),
  data: z.object({ id: z.string().uuid(), lead_user_id: z.string().uuid().optional() })
    .passthrough().optional(),
});

export function projectInvitationError(code: string): { status: number; error: string } {
  switch (code) {
    case 'not_found':
    case 'project_unavailable':
      return { status: 404, error: 'This invitation or project is no longer available' };
    case 'forbidden':
      return { status: 403, error: 'You cannot perform this action' };
    case 'not_pending':
      return { status: 409, error: 'This invitation is no longer pending' };
    case 'pending_invitation':
      return { status: 409, error: 'This person already has a pending invitation' };
    case 'inactive':
      return { status: 400, error: 'Project members must be active accounts' };
    case 'primary_lead':
      return { status: 400, error: 'The primary project lead cannot be removed or demoted' };
    case 'invalid_action':
      return { status: 400, error: 'Invalid invitation response' };
    case 'invite_lead_first':
      return {
        status: 403,
        error: 'Invite this person as a project lead and wait for acceptance before appointing them as supervisor',
      };
    default:
      console.error('Unexpected project invitation result:', code);
      return { status: 500, error: 'Could not complete the project invitation' };
  }
}
