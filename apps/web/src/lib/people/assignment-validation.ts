import type { createSupabaseAdminClient } from '@/lib/supabase/server';

type AssignmentCheck = { ok: true } | { ok: false; status: number; error: string };

/**
 * Validates that `personUserId` can be recorded as someone's manager or supervisor:
 * an existing, non-deleted, non-terminated account that is not the subject themselves.
 */
export async function validatePersonAssignment(
  adminClient: ReturnType<typeof createSupabaseAdminClient>,
  personUserId: string,
  { label, subjectUserId }: { label: 'Manager' | 'Supervisor'; subjectUserId?: string | null }
): Promise<AssignmentCheck> {
  if (subjectUserId && personUserId === subjectUserId) {
    return { ok: false, status: 400, error: `${label} cannot be the same person` };
  }

  const { data, error } = await adminClient
    .from('users')
    .select('id, status')
    .eq('id', personUserId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) {
    return { ok: false, status: 500, error: `Failed to validate ${label.toLowerCase()}` };
  }

  if (!data || data.status === 'terminated') {
    return { ok: false, status: 400, error: `${label} must be an active user` };
  }

  return { ok: true };
}
