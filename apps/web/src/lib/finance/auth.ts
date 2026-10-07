import { resolveExpenseCapabilities } from '@/lib/expenses/capabilities';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';

export async function getFinanceContext() {
  const supabase = await createSupabaseServerClient();
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) return { ok: false as const, status: 401, error: 'Unauthorized' };
  const admin = createSupabaseAdminClient();
  const capabilities = await resolveExpenseCapabilities(admin, user.id);
  return { ok: true as const, user, admin, capabilities };
}

export function canReviewFinance(capabilities: { isLeadership: boolean; isAccounting: boolean }): boolean {
  return capabilities.isLeadership || capabilities.isAccounting;
}
