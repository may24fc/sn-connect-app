'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';

interface EmployeeListResponse {
  data: Array<{
    id: string;
    department: string | null;
  }>;
}

type MarketingReportsAccessReason =
  | 'unauthenticated'
  | 'non-employee'
  | 'non-marketing'
  | null;

function isMarketingDepartment(department: string | null | undefined): boolean {
  return typeof department === 'string' && department.trim().toLowerCase().includes('marketing');
}

export function useMarketingReportsAccess(): {
  user: ReturnType<typeof useAuth>['user'];
  employeeDepartment: string | null;
  isLoading: boolean;
  canAccess: boolean;
  reason: MarketingReportsAccessReason;
} {
  const { user, isLoading: isAuthLoading } = useAuth();
  const shouldFetchEmployee = user?.role === 'employee' || user?.role === 'associate';

  const employeeQuery = useQuery({
    queryKey: ['marketing-reports-access', user?.id],
    enabled: shouldFetchEmployee,
    queryFn: async (): Promise<EmployeeListResponse> => {
      const response = await fetch(`/api/employees?userId=${user?.id}&page=1&pageSize=1`);

      if (!response.ok) {
        throw new Error('Failed to load employee department');
      }

      return response.json();
    },
  });

  const employeeDepartment = employeeQuery.data?.data[0]?.department ?? null;

  if (isAuthLoading) {
    return {
      user,
      employeeDepartment,
      isLoading: true,
      canAccess: false,
      reason: null,
    };
  }

  if (!user) {
    return {
      user,
      employeeDepartment,
      isLoading: false,
      canAccess: false,
      reason: 'unauthenticated',
    };
  }

  if (user.role === 'admin' || user.role === 'super_admin') {
    return {
      user,
      employeeDepartment,
      isLoading: false,
      canAccess: true,
      reason: null,
    };
  }

  if (user.role !== 'employee' && user.role !== 'associate') {
    return {
      user,
      employeeDepartment,
      isLoading: false,
      canAccess: false,
      reason: 'non-employee',
    };
  }

  if (employeeQuery.isLoading) {
    return {
      user,
      employeeDepartment,
      isLoading: true,
      canAccess: false,
      reason: null,
    };
  }

  const canAccess = isMarketingDepartment(employeeDepartment);

  return {
    user,
    employeeDepartment,
    isLoading: false,
    canAccess,
    reason: canAccess ? null : 'non-marketing',
  };
}