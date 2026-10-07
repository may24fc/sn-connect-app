import { timingSafeEqual } from 'node:crypto';
import { getNormalizedMetadataRole, normalizeDbRoleClaim } from '@/lib/auth/role';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import {
  UHP_ATTACHMENT_MAX_FILE_SIZE,
  UHP_MODULE_VALUES,
  type UhpModule,
  type UhpOutreachActivityRow,
  isUhpAttachmentMimeType,
} from '@/lib/uhp';

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

const OUTREACH_PAGE_SIZE = 1000;

function isOutreachClientState(
  value: unknown
): value is NonNullable<UhpOutreachActivityRow['client']> {
  return (
    typeof value === 'object' &&
    value !== null &&
    'interest_state' in value &&
    typeof value.interest_state === 'string' &&
    'replied' in value &&
    typeof value.replied === 'boolean'
  );
}

/**
 * Activities for the outreach metrics and digest, plus timestamped manual reply toggles.
 * Rows belonging to deleted or review-flagged clients are left out. Both queries are paged
 * because PostgREST caps a single response at 1000 rows.
 */
export async function fetchUhpOutreachRows(
  admin: UhpAuthedContext['admin'],
  from: string,
  to: string
): Promise<{ ok: true; rows: Array<UhpOutreachActivityRow> } | { ok: false }> {
  const rows: Array<UhpOutreachActivityRow> = [];
  for (let offset = 0; ; offset += OUTREACH_PAGE_SIZE) {
    const { data, error } = await admin
      .from('uhp_client_activities')
      .select(
        'client_id, direction, reply_received, prospect_outcome, appointment_type, client:uhp_clients!inner(interest_state, replied, deleted_at, migration_review_required)'
      )
      .is('deleted_at', null)
      .eq('migration_review_required', false)
      .is('client.deleted_at', null)
      .eq('client.migration_review_required', false)
      .gte('occurred_at', from)
      .lte('occurred_at', to)
      .order('id')
      .range(offset, offset + OUTREACH_PAGE_SIZE - 1);
    if (error) {
      console.error('Failed to load UHP outreach activity:', error);
      return { ok: false };
    }
    const page = data ?? [];
    for (const { client, ...activity } of page) {
      // Many-to-one embeds come back as an object; the untyped client infers an array.
      const current: unknown = Array.isArray(client) ? client[0] : client;
      rows.push({ ...activity, client: isOutreachClientState(current) ? current : null });
    }
    if (page.length < OUTREACH_PAGE_SIZE) break;
  }

  for (let offset = 0; ; offset += OUTREACH_PAGE_SIZE) {
    const { data, error } = await admin
      .from('uhp_clients')
      .select('id, interest_state, replied')
      .eq('replied', true)
      .is('deleted_at', null)
      .eq('migration_review_required', false)
      .gte('replied_at', from)
      .lte('replied_at', to)
      .order('id')
      .range(offset, offset + OUTREACH_PAGE_SIZE - 1);
    if (error) {
      console.error('Failed to load timestamped UHP replies:', error);
      return { ok: false };
    }
    const page = data ?? [];
    for (const client of page) {
      rows.push({
        client_id: client.id,
        direction: null,
        reply_received: true,
        prospect_outcome: null,
        appointment_type: null,
        client: { interest_state: client.interest_state, replied: client.replied },
      });
    }
    if (page.length < OUTREACH_PAGE_SIZE) return { ok: true, rows };
  }
}

export function readUhpScreenshot(
  formData: FormData
): { ok: true; file: File } | { ok: false; error: string } {
  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) return { ok: false, error: 'No image provided' };
  if (!isUhpAttachmentMimeType(file.type)) {
    return { ok: false, error: 'Unsupported file type. Allowed: PNG, JPG, WEBP' };
  }
  if (file.size > UHP_ATTACHMENT_MAX_FILE_SIZE) {
    return { ok: false, error: 'Image exceeds the 10 MB limit' };
  }
  return { ok: true, file };
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
