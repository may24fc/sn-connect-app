import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';

const ADMIN_ROLES = ['admin', 'super_admin', 'hr', 'cos', 'ceo'] as const;

export interface EventAuthedContext {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  supabaseAdmin: ReturnType<typeof createSupabaseAdminClient>;
  user: { id: string; app_metadata?: Record<string, unknown> };
  role: string | null;
}

export async function getEventAuthedContext(): Promise<
  { ok: true; context: EventAuthedContext } | { ok: false; status: number; error: string }
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
    role = roleData?.role ?? null;
  }

  return { ok: true, context: { supabase, supabaseAdmin, user, role } };
}

export function isAdminRole(role: string | null): boolean {
  return role !== null && (ADMIN_ROLES as readonly string[]).includes(role);
}

export const EVENT_CATEGORIES = ['holiday', 'meeting', 'deadline', 'company', 'team', 'training'] as const;
export type EventCategory = (typeof EVENT_CATEGORIES)[number];
