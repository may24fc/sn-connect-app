import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';

export const PROJECT_ADMIN_ROLES: readonly string[] = [
  'admin',
  'hr',
  'cos',
  'ceo',
  'super_admin',
] as const;

export function isProjectAdmin(role: string | null | undefined): boolean {
  return !!role && PROJECT_ADMIN_ROLES.includes(role);
}

export interface ProjectAuthedContext {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  supabaseAdmin: ReturnType<typeof createSupabaseAdminClient>;
  user: { id: string; app_metadata?: Record<string, unknown> };
  role: string | null;
}

export async function getProjectAuthedContext(): Promise<
  { ok: true; context: ProjectAuthedContext } | { ok: false; status: number; error: string }
> {
  const supabase = await createSupabaseServerClient();
  const supabaseAdmin = createSupabaseAdminClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { ok: false, status: 401, error: 'Unauthorized' };
  }

  let role: string | null =
    typeof user.app_metadata?.db_role === 'string' ? user.app_metadata.db_role : null;

  if (!role) {
    const { data: roleData, error: roleError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .is('deleted_at', null)
      .maybeSingle();

    if (roleError) {
      return { ok: false, status: 500, error: 'Failed to resolve user role' };
    }

    role = (roleData?.role as string | null | undefined) ?? null;
  }

  return {
    ok: true,
    context: { supabase, supabaseAdmin, user, role },
  };
}

/**
 * Server-side membership check that bypasses RLS via admin client.
 * Returns true if the user is lead, supervisor, contributor, creator, or has an admin role.
 */
export async function userCanAccessProject(
  supabaseAdmin: ReturnType<typeof createSupabaseAdminClient>,
  projectId: string,
  userId: string,
  role: string | null | undefined
): Promise<boolean> {
  if (isProjectAdmin(role)) return true;

  const { data, error } = await supabaseAdmin
    .from('projects')
    .select('lead_user_id, supervisor_id, created_by')
    .eq('id', projectId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error || !data) return false;

  if (
    data.lead_user_id === userId ||
    data.supervisor_id === userId ||
    data.created_by === userId
  ) {
    return true;
  }

  const { data: contrib } = await supabaseAdmin
    .from('project_contributors')
    .select('user_id')
    .eq('project_id', projectId)
    .eq('user_id', userId)
    .maybeSingle();

  return !!contrib;
}

export async function userCanApproveMilestone(
  supabaseAdmin: ReturnType<typeof createSupabaseAdminClient>,
  milestoneId: string,
  userId: string,
  role: string | null | undefined
): Promise<{ ok: boolean; projectId?: string }> {
  if (isProjectAdmin(role)) {
    const { data } = await supabaseAdmin
      .from('project_milestones')
      .select('project_id')
      .eq('id', milestoneId)
      .maybeSingle();
    return { ok: true, projectId: data?.project_id };
  }

  const { data } = await supabaseAdmin
    .from('project_milestones')
    .select('project_id, projects:projects(supervisor_id)')
    .eq('id', milestoneId)
    .maybeSingle();

  // supabase typing for embedded join is loose; cast:
  const supervisorId = (data as unknown as { projects?: { supervisor_id?: string } } | null)
    ?.projects?.supervisor_id;
  return { ok: supervisorId === userId, projectId: data?.project_id };
}
