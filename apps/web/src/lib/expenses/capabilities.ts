import type { createSupabaseAdminClient } from '@/lib/supabase/server';

export type ExpenseCapabilities = {
  role: string | null;
  isLeadership: boolean;
  isAccounting: boolean;
  isMarketing: boolean;
  /** Every authenticated staff member can log a manual spend request. */
  canLogRequest: boolean;
  /** Only leadership and Accounting may upload receipts / log direct payments. */
  canLogPayment: boolean;
  /** Only Accounting/Admin/Super Admin may reconcile requests against payments. */
  canMatch: boolean;
  /** Admin/Super Admin/Accounting see the full desk; Marketing sees a department-scoped desk. */
  canViewDeskGlobal: boolean;
  canViewDeskDepartment: boolean;
  departmentId: string | null;
};

/**
 * Resolves the current user's expense-domain capabilities from their role and
 * department membership (Accounting / Marketing). Centralizes the permission
 * contract so API routes and UI pages never diverge.
 */
export async function resolveExpenseCapabilities(
  adminClient: ReturnType<typeof createSupabaseAdminClient>,
  userId: string
): Promise<ExpenseCapabilities> {
  const { data: userData, error: userError } = await adminClient
    .from('users')
    .select('role, department_id, department:departments(name, description)')
    .eq('id', userId)
    .is('deleted_at', null)
    .maybeSingle();

  if (userError) {
    throw new Error('Unable to resolve user profile for expense permissions');
  }

  const role = userData?.role ?? null;
  const departmentId = (userData as { department_id?: string | null } | null)?.department_id ?? null;
  const department =
    (userData as { department?: { name?: string | null; description?: string | null } | null } | null)
      ?.department ?? null;
  const canonicalDepartmentName = department?.name?.trim().toLowerCase() ?? null;
  const canonicalDepartmentDescription = department?.description?.trim().toLowerCase() ?? null;
  const isLeadership = role === 'admin' || role === 'super_admin';

  let isAccounting = false;
  let isMarketing = false;

  if (!isLeadership) {
    // Use canonical users.department_id + departments metadata whenever available.
    // Fallback to legacy RPC checks only if canonical department assignment is missing.
    if (canonicalDepartmentName) {
      isAccounting =
        canonicalDepartmentName.includes('accounting') ||
        (canonicalDepartmentName === 'finance' &&
          typeof canonicalDepartmentDescription === 'string' &&
          canonicalDepartmentDescription.includes('accounting'));

      isMarketing = canonicalDepartmentName.includes('marketing');
    } else {
      const [{ data: accountingMember, error: accountingError }, { data: marketingMember, error: marketingError }] =
        await Promise.all([
          adminClient.rpc('user_is_accounting_member', { target_user_id: userId }),
          adminClient.rpc('user_is_marketing_member', { target_user_id: userId }),
        ]);

      isAccounting = !accountingError && Boolean(accountingMember);
      isMarketing = !marketingError && Boolean(marketingMember);
    }
  }

  return {
    role,
    isLeadership,
    isAccounting,
    isMarketing,
    canLogRequest: Boolean(role),
    canLogPayment: isLeadership || isAccounting,
    canMatch: isLeadership || isAccounting,
    canViewDeskGlobal: isLeadership || isAccounting,
    canViewDeskDepartment: isMarketing,
    departmentId,
  };
}
