'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';

interface EmployeeListResponse {
  data: Array<{
    id: string;
    department: string | null;
    users?: {
      department_id: string | null;
    } | null;
  }>;
}

interface EmployeePerformanceDetailResponse {
  employee?: {
    department: string | null;
  };
}

function isAccountingDepartment(department: string | null | undefined): boolean {
  if (typeof department !== 'string') {
    return false;
  }

  const normalizedDepartment = department.trim().toLowerCase();
  return normalizedDepartment.includes('accounting') || normalizedDepartment === 'finance';
}

export function useExpensesAccess(): {
  canAccess: boolean;
  isLoading: boolean;
  department: string | null;
} {
  const { user, isLoading: isAuthLoading } = useAuth();

  const shouldFetchEmployee = user?.role === 'employee' || user?.role === 'intern';

  const employeeQuery = useQuery({
    queryKey: ['expenses-access', user?.id],
    enabled: shouldFetchEmployee,
    queryFn: async (): Promise<EmployeePerformanceDetailResponse> => {
      const response = await fetch(`/api/employees?userId=${user?.id}&page=1&pageSize=1`);

      if (!response.ok) {
        throw new Error('Failed to load employee department');
      }

      const employeeList = (await response.json()) as EmployeeListResponse;
      const employee = employeeList.data[0];

      if (!employee) {
        return { employee: { department: null } };
      }

      const detailResponse = await fetch(`/api/performance/individual/${employee.id}`);

      if (detailResponse.ok) {
        return detailResponse.json() as Promise<EmployeePerformanceDetailResponse>;
      }

      return {
        employee: {
          department: employee.department,
        },
      };
    },
  });

  const department = employeeQuery.data?.employee?.department ?? null;

  if (isAuthLoading || employeeQuery.isLoading) {
    return {
      canAccess: false,
      isLoading: true,
      department,
    };
  }

  if (!user) {
    return {
      canAccess: false,
      isLoading: false,
      department,
    };
  }

  if (user.role === 'admin' || user.role === 'super_admin') {
    return {
      canAccess: true,
      isLoading: false,
      department,
    };
  }

  return {
    canAccess: isAccountingDepartment(department),
    isLoading: false,
    department,
  };
}
