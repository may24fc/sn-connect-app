import { timingSafeEqual } from 'node:crypto';
import { getNormalizedMetadataRole, normalizeDbRoleClaim } from '@/lib/auth/role';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { UHP_MODULE_VALUES, type UhpModule } from '@/lib/uhp';

export interface UhpAuthedContext {
  supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>;
  admin: ReturnType<typeof createSupabaseAdminClient>;
  userId: string;
  role: string | null;
  grantedModules: UhpModule[];
}

export function isUhpAdmin(role: string | null): boolean {
  return role === 'admin' || role === 'super_admin';
}

export function hasUhpModuleAccess(context: UhpAuthedContext, module: UhpModule): boolean {
  return isUhpAdmin(context.role) || context.grantedModules.includes(module);
}

export async function getUhpAuthedContext(): Promise<
  { ok: true; context: UhpAuthedContext } | { ok: false; status: number; error: string }
> {
  try {
    const supabase = await createSupabaseServerClient();
    const admin = createSupabaseAdminClient();
    const { data: authData, error } = await supabase.auth.getUser();
    if (error || !authData.user) return { ok: false, status: 401, error: 'Unauthorized' };

    let role = getNormalizedMetadataRole(authData.user.app_metadata);
    if (!role) {
      const { data } = await supabase
        .from('users')
        .select('role')
        .eq('id', authData.user.id)
        .is('deleted_at', null)
        .maybeSingle();
      role = normalizeDbRoleClaim(data?.role ?? null);
    }

    let grantedModules: UhpModule[] = [];
    if (!isUhpAdmin(role)) {
      const { data, error: grantError } = await supabase
        .from('uhp_access_grants')
        .select('module')
        .eq('user_id', authData.user.id)
        .is('deleted_at', null);
      if (grantError) return { ok: false, status: 500, error: 'Failed to resolve UHP access' };
      grantedModules = ((data ?? []) as Array<{ module: string }>)
        .map((row: { module: string }) => row.module)
        .filter((module: string): module is UhpModule =>
          UHP_MODULE_VALUES.includes(module as UhpModule)
        );
    }

    return {
      ok: true,
      context: { supabase, admin, userId: authData.user.id, role, grantedModules },
    };
  } catch (error) {
    console.error('Failed to initialize UHP request context:', error);
    return { ok: false, status: 500, error: 'Failed to initialize request context' };
  }
}

export async function requireUhpModule(module: UhpModule) {
  const auth = await getUhpAuthedContext();
  if (!auth.ok) return auth;
  if (!hasUhpModuleAccess(auth.context, module)) {
    return { ok: false as const, status: 403, error: 'Forbidden' };
  }
  return auth;
}

export function isValidN8nCallback(request: Request): boolean {
  const configured = process.env.N8N_CALLBACK_SECRET?.trim();
  const provided = request.headers.get('x-control-hub-n8n-secret');
  if (!(configured && provided)) return false;
  const configuredBytes = Buffer.from(configured);
  const providedBytes = Buffer.from(provided);
  return (
    configuredBytes.length === providedBytes.length &&
    timingSafeEqual(configuredBytes, providedBytes)
  );
}
