import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { getNormalizedMetadataRole, normalizeDbRoleClaim } from '@/lib/auth/role';

export const AI_ADMIN_ROLES = ['admin', 'super_admin', 'hr'];
export const AI_KNOWLEDGE_ACCESS_ROLES = ['admin', 'super_admin', 'hr', 'cos', 'ceo'] as const;
export type KnowledgeAccessLevel = 'all' | 'admin';

export async function getAuthedSupabase() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { supabase, user: null, role: null, error: 'Unauthorized' as const };
  }

  let role: string | null = getNormalizedMetadataRole(user.app_metadata);

  if (!role) {
    const { data: roleData, error: roleError } = await supabase
      .from('users')
      .select('role')
      .eq('id', user.id)
      .is('deleted_at', null)
      .maybeSingle();

    if (roleError) {
      return { supabase, user, role: null, error: 'Failed to resolve user role' as const };
    }

    role = normalizeDbRoleClaim(roleData?.role ?? null);
  }

  return { supabase, user, role, error: null };
}

export function isAiAdmin(role: string | null): boolean {
  return role ? AI_ADMIN_ROLES.includes(role) : false;
}

export function getAllowedKnowledgeAccessLevels(role: string | null): KnowledgeAccessLevel[] {
  return role && AI_KNOWLEDGE_ACCESS_ROLES.includes(role as (typeof AI_KNOWLEDGE_ACCESS_ROLES)[number])
    ? ['all', 'admin']
    : ['all'];
}

export function getAdminClient() {
  return createSupabaseAdminClient();
}
