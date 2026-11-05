import type { createSupabaseAdminClient } from '@/lib/supabase/server';

export type SfoWorkspaceAccessLevel = 'read' | 'write';

/** Accounting owns the financial inputs used by SFO, so department members receive full access. */
export async function resolveAccountingSfoAccess(
  admin: ReturnType<typeof createSupabaseAdminClient>,
  userId: string
): Promise<SfoWorkspaceAccessLevel | null> {
  const { data, error } = await admin.rpc('user_is_accounting_member', {
    target_user_id: userId,
  });

  if (error) {
    console.error('Failed to resolve Accounting SFO access:', error);
    return null;
  }

  return data ? 'write' : null;
}
