'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';

interface ExpenseCapabilitiesResponse {
  data: {
    role: string | null;
    isLeadership: boolean;
    isAccounting: boolean;
    isMarketing: boolean;
    canLogRequest: boolean;
    canLogPayment: boolean;
    canMatch: boolean;
    canViewDeskGlobal: boolean;
    canViewDeskDepartment: boolean;
    departmentId: string | null;
  };
}

export interface ExpenseAccessCapabilities {
  /** Every authenticated staff member/associate can log a manual spend request. */
  canLogRequest: boolean;
  /** Only Admin/Super Admin/Accounting can log direct payments (receipt upload). */
  canLogPayment: boolean;
  /** Only Accounting/Admin/Super Admin can reconcile the matching queue. */
  canMatch: boolean;
  /** Admin/Super Admin/Accounting see the full desk; Marketing sees their department only. */
  canViewDeskGlobal: boolean;
  canViewDeskDepartment: boolean;
  isAccounting: boolean;
  isMarketing: boolean;
}

export function useExpensesAccess(): {
  /** @deprecated use the capability flags instead; kept for legacy call sites. */
  canAccess: boolean;
  isLoading: boolean;
  department: string | null;
  capabilities: ExpenseAccessCapabilities;
} {
  const { user, isLoading: isAuthLoading } = useAuth();
  const capabilitiesQuery = useQuery({
    queryKey: ['expenses-access', user?.id],
    enabled: Boolean(user),
    queryFn: async (): Promise<ExpenseCapabilitiesResponse['data']> => {
      const response = await fetch('/api/expenses/capabilities');

      if (!response.ok) {
        throw new Error('Failed to load expense capabilities');
      }

      const payload = (await response.json()) as ExpenseCapabilitiesResponse;
      return payload.data;
    },
  });

  const isLoading = isAuthLoading || capabilitiesQuery.isLoading;
  const department = capabilitiesQuery.data?.departmentId ?? null;

  const capabilities: ExpenseAccessCapabilities = {
    canLogRequest: Boolean(capabilitiesQuery.data?.canLogRequest),
    canLogPayment: Boolean(capabilitiesQuery.data?.canLogPayment),
    canMatch: Boolean(capabilitiesQuery.data?.canMatch),
    canViewDeskGlobal: Boolean(capabilitiesQuery.data?.canViewDeskGlobal),
    canViewDeskDepartment: Boolean(capabilitiesQuery.data?.canViewDeskDepartment),
    isAccounting: Boolean(capabilitiesQuery.data?.isAccounting),
    isMarketing: Boolean(capabilitiesQuery.data?.isMarketing),
  };

  if (isLoading) {
    return {
      canAccess: false,
      isLoading: true,
      department,
      capabilities,
    };
  }

  if (!user) {
    return {
      canAccess: false,
      isLoading: false,
      department,
      capabilities,
    };
  }

  return {
    canAccess:
      capabilities.canMatch || capabilities.canViewDeskGlobal || capabilities.canViewDeskDepartment,
    isLoading: false,
    department,
    capabilities,
  };
}

