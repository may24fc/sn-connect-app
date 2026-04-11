import type { createSupabaseAdminClient } from '@/lib/supabase/server';

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>;

interface LookupRecord {
  id: string;
  name: string;
  deleted_at: string | null;
}

async function resolveLookupById(
  supabaseAdmin: SupabaseAdminClient,
  table: 'departments' | 'divisions',
  id: string,
  label: 'Department' | 'Division'
): Promise<{ id: string; name: string }> {
  const { data, error } = await supabaseAdmin
    .from(table)
    .select('id, name, deleted_at')
    .eq('id', id)
    .maybeSingle<LookupRecord>();

  if (error) {
    throw new Error(`Failed to resolve ${label.toLowerCase()}: ${error.message}`);
  }

  if (!data || data.deleted_at) {
    throw new Error(`${label} is invalid or no longer available`);
  }

  return { id: data.id, name: data.name };
}

export function resolveDepartmentById(
  supabaseAdmin: SupabaseAdminClient,
  departmentId: string
): Promise<{ id: string; name: string }> {
  return resolveLookupById(supabaseAdmin, 'departments', departmentId, 'Department');
}

export function resolveDivisionById(
  supabaseAdmin: SupabaseAdminClient,
  divisionId: string
): Promise<{ id: string; name: string }> {
  return resolveLookupById(supabaseAdmin, 'divisions', divisionId, 'Division');
}