import type { createSupabaseAdminClient } from '@/lib/supabase/server';

type SupabaseAdminClient = ReturnType<typeof createSupabaseAdminClient>;

interface DepartmentRecord {
  id: string;
  name: string;
  deleted_at: string | null;
}

function normalizeDepartmentName(name: string): string {
  return name.trim().replace(/\s+/g, ' ');
}

async function findDepartmentByName(
  supabaseAdmin: SupabaseAdminClient,
  departmentName: string
): Promise<DepartmentRecord | null> {
  const { data, error } = await supabaseAdmin
    .from('departments')
    .select('id, name, deleted_at')
    .ilike('name', departmentName)
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to look up department: ${error.message}`);
  }

  return data;
}

async function restoreDepartment(
  supabaseAdmin: SupabaseAdminClient,
  department: DepartmentRecord
): Promise<{ id: string; name: string }> {
  if (!department.deleted_at) {
    return { id: department.id, name: department.name };
  }

  const { data, error } = await supabaseAdmin
    .from('departments')
    .update({
      deleted_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', department.id)
    .select('id, name')
    .single();

  if (error) {
    throw new Error(`Failed to restore department: ${error.message}`);
  }

  return data;
}

export async function resolveOrCreateDepartment(
  supabaseAdmin: SupabaseAdminClient,
  departmentName: string,
  actingUserId: string
): Promise<{ id: string; name: string }> {
  const normalizedDepartmentName = normalizeDepartmentName(departmentName);

  if (!normalizedDepartmentName) {
    throw new Error('Department is required');
  }

  const existingDepartment = await findDepartmentByName(supabaseAdmin, normalizedDepartmentName);

  if (existingDepartment) {
    return restoreDepartment(supabaseAdmin, existingDepartment);
  }

  const { data, error } = await supabaseAdmin
    .from('departments')
    .insert({
      name: normalizedDepartmentName,
      created_by: actingUserId,
    })
    .select('id, name')
    .single();

  if (!error) {
    return data;
  }

  if (error.code !== '23505') {
    throw new Error(`Failed to create department: ${error.message}`);
  }

  const departmentAfterConflict = await findDepartmentByName(supabaseAdmin, normalizedDepartmentName);

  if (!departmentAfterConflict) {
    throw new Error('Department already exists, but could not be reloaded');
  }

  return restoreDepartment(supabaseAdmin, departmentAfterConflict);
}