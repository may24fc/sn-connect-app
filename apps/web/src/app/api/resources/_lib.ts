import { createSupabaseServerClient } from '@/lib/supabase/server';

export const RESOURCE_ADMIN_ROLES = ['admin', 'hr', 'cos', 'ceo', 'super_admin'];

export function normalizeExcerpt(description: string | null | undefined, excerpt?: string | null) {
  const value = excerpt?.trim();
  if (value && value.length > 0) return value;
  return (description || '').trim().slice(0, 200);
}

export async function getAuthedSupabase() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { supabase, user: null, role: null, error: 'Unauthorized' as const };
  }

  // Primary: read role from app_metadata (embedded in JWT, no DB call needed)
  let role: string | null = null;
  if (typeof user.app_metadata?.db_role === 'string') {
    role = user.app_metadata.db_role;
  }

  // Fallback: query public.users table
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

    role = roleData?.role ?? null;
  }

  return { supabase, user, role, error: null };
}

export function isResourceAdmin(role: string | null) {
  return role ? RESOURCE_ADMIN_ROLES.includes(role) : false;
}

export function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

export function transformPayloadToSnakeCase(
  payload: Record<string, unknown>
): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(payload)) {
    result[camelToSnake(key)] = value;
  }
  return result;
}
