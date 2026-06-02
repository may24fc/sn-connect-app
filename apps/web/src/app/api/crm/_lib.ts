import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';

export interface CrmAuthedContext {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  supabaseAdmin: ReturnType<typeof createSupabaseAdminClient>;
  user: { id: string; app_metadata?: Record<string, unknown> };
  role: string | null;
}

async function resolveUserRole(
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  user: { id: string; app_metadata?: Record<string, unknown> }
): Promise<string | null> {
  const metadataRole =
    typeof user.app_metadata?.db_role === 'string' ? user.app_metadata.db_role : null;

  if (metadataRole) {
    return metadataRole;
  }

  const { data, error } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    throw new Error('Failed to resolve user role');
  }

  return data?.role ?? null;
}

export function canAccessCrm(role: string | null): boolean {
  return role === 'admin' || role === 'super_admin';
}

export async function getCrmAuthedContext(): Promise<
  { ok: true; context: CrmAuthedContext } | { ok: false; status: number; error: string }
> {
  try {
    const supabase = await createSupabaseServerClient();
    const supabaseAdmin = createSupabaseAdminClient();
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) {
      return { ok: false, status: 401, error: 'Unauthorized' };
    }

    const role = await resolveUserRole(supabase, user);

    if (!canAccessCrm(role)) {
      return { ok: false, status: 403, error: 'Forbidden' };
    }

    return {
      ok: true,
      context: {
        supabase,
        supabaseAdmin,
        user,
        role,
      },
    };
  } catch (error) {
    console.error('Failed to initialize CRM auth context:', error);
    return { ok: false, status: 500, error: 'Failed to initialize request context' };
  }
}
