/**
 * Example Usage of Database Types
 * This file demonstrates how to use the database types with Supabase
 *
 * IMPORTANT: This is for reference only. Do not import this file in production.
 */

import { createClient } from '@supabase/supabase-js';
import { UserRole, brandEmployeeId, brandUserId } from './database.types';
import type {
  Database,
  DocumentType,
  Employee,
  EmployeeInsert,
  EmployeeUpdate,
  EmploymentType,
  User,
  WorkArrangement,
} from './database.types';

// ============================================
// Initialize Supabase Client
// ============================================

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient<Database>(supabaseUrl, supabaseAnonKey);

// ============================================
// Type-Safe Query Examples
// ============================================

/**
 * Example 1: Get current user's employee data
 */
async function getCurrentEmployeeData(userId: string) {
  const { data, error } = await supabase
    .from('employees')
    .select(`
      *,
      user:users(*)
    `)
    .eq('user_id', userId)
    .is('deleted_at', null)
    .single();

  if (error) {
    throw new Error(`Failed to fetch employee: ${error.message}`);
  }

  // TypeScript knows the shape of the data
  const employee = data as Employee & { user: User };

  return {
    id: brandEmployeeId(employee.id),
    fullName: `${employee.first_name} ${employee.last_name}`,
    position: employee.position,
    department: employee.department,
    role: employee.user.role,
  };
}

/**
 * Example 2: Create a new employee (HR only)
 */
async function createEmployee(employeeData: {
  userId: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  employeeNumber: string;
  dateHired: string;
  position: string;
  department: string;
  employmentType: EmploymentType;
  workArrangement: WorkArrangement;
  immediateHead?: string;
}) {
  const newEmployee: EmployeeInsert = {
    user_id: brandUserId(employeeData.userId),
    employee_number: employeeData.employeeNumber,
    first_name: employeeData.firstName,
    middle_name: employeeData.middleName || null,
    last_name: employeeData.lastName,
    date_hired: employeeData.dateHired,
    employment_type: employeeData.employmentType,
    work_arrangement: employeeData.workArrangement,
    position: employeeData.position,
    department: employeeData.department,
    immediate_head: employeeData.immediateHead ? brandUserId(employeeData.immediateHead) : null,
    birthday: null,
    probation_end_date: null,
    payroll_account_name: null,
    payroll_account_number: null,
    phone: null,
    emergency_contact_name: null,
    emergency_contact_number: null,
    personal_email: null,
    company_email: null,
    address: null,
    city: null,
    province: null,
    postal_code: null,
    created_by: null,
    deleted_at: null,
  };

  const { data, error } = await supabase.from('employees').insert(newEmployee).select().single();

  if (error) {
    throw new Error(`Failed to create employee: ${error.message}`);
  }

  return data as Employee;
}

/**
 * Example 3: Update employee information
 */
async function updateEmployeeContact(
  employeeId: string,
  updates: {
    phone?: string;
    personalEmail?: string;
    address?: string;
    city?: string;
    province?: string;
    postalCode?: string;
  }
) {
  const updateData: EmployeeUpdate = {
    ...(updates.phone !== undefined ? { phone: updates.phone } : {}),
    ...(updates.personalEmail !== undefined ? { personal_email: updates.personalEmail } : {}),
    ...(updates.address !== undefined ? { address: updates.address } : {}),
    ...(updates.city !== undefined ? { city: updates.city } : {}),
    ...(updates.province !== undefined ? { province: updates.province } : {}),
    ...(updates.postalCode !== undefined ? { postal_code: updates.postalCode } : {}),
  };

  const { data, error } = await supabase
    .from('employees')
    .update(updateData)
    .eq('id', employeeId)
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to update employee: ${error.message}`);
  }

  return data as Employee;
}

/**
 * Example 4: Get employees by department
 */
async function getEmployeesByDepartment(departmentName: string) {
  const { data, error } = await supabase.rpc('get_employees_by_department', {
    dept_name: departmentName,
  });

  if (error) {
    throw new Error(`Failed to fetch employees: ${error.message}`);
  }

  return data;
}

/**
 * Example 5: Check user permissions
 */
async function checkUserPermissions(userId: string) {
  const { data: role, error } = await supabase.rpc('get_user_role', {
    user_id: brandUserId(userId),
  });

  if (error) {
    throw new Error(`Failed to fetch user role: ${error.message}`);
  }

  const isHR = role === UserRole.HR;
  const isCOS = role === UserRole.COS;
  const isCEO = role === UserRole.CEO;
  const isAdmin = role === UserRole.Admin;

  return {
    role,
    canViewAllEmployees: isHR || isCOS || isCEO || isAdmin,
    canEditEmployees: isHR || isAdmin,
    canViewConfidentialDocs: isHR || isCOS || isAdmin,
    canAccessAuditLogs: isHR || isAdmin,
  };
}

/**
 * Example 6: Get manager's direct reports
 */
async function getDirectReports(managerId: string) {
  const { data, error } = await supabase.rpc('get_direct_reports', {
    manager_user_id: brandUserId(managerId),
  });

  if (error) {
    throw new Error(`Failed to fetch direct reports: ${error.message}`);
  }

  return data;
}

/**
 * Example 7: Upload and link document
 */
async function uploadEmployeeDocument(
  employeeId: string,
  file: File,
  documentType: DocumentType,
  isConfidential: boolean,
  uploaderId: string
) {
  // 1. Upload file to Supabase Storage
  const filePath = `documents/${employeeId}/${Date.now()}_${file.name}`;

  const { error: uploadError } = await supabase.storage
    .from('employee-documents')
    .upload(filePath, file);

  if (uploadError) {
    throw new Error(`Failed to upload file: ${uploadError.message}`);
  }

  // 2. Create document record
  const { data, error } = await supabase
    .from('documents')
    .insert({
      employee_id: brandEmployeeId(employeeId),
      document_type: documentType,
      file_path: filePath,
      file_name: file.name,
      file_size: file.size,
      mime_type: file.type,
      is_confidential: isConfidential,
      uploaded_by: brandUserId(uploaderId),
      notes: null,
      created_by: null,
      deleted_at: null,
    })
    .select()
    .single();

  if (error) {
    throw new Error(`Failed to create document record: ${error.message}`);
  }

  return data;
}

/**
 * Example 8: Soft delete employee
 */
async function softDeleteEmployee(employeeId: string) {
  const { error } = await supabase.rpc('soft_delete', {
    table_name: 'employees',
    record_id: employeeId,
  });

  if (error) {
    throw new Error(`Failed to delete employee: ${error.message}`);
  }

  return { success: true };
}

/**
 * Example 9: Check if employee is on probation
 */
async function checkProbationStatus(employeeId: string) {
  const { data, error } = await supabase.rpc('is_on_probation', {
    employee_id: brandEmployeeId(employeeId),
  });

  if (error) {
    throw new Error(`Failed to check probation status: ${error.message}`);
  }

  return data;
}

/**
 * Example 10: Calculate employee tenure
 */
async function getEmployeeTenure(employeeId: string) {
  const { data: tenureDays, error } = await supabase.rpc('calculate_tenure_days', {
    employee_id: brandEmployeeId(employeeId),
  });

  if (error) {
    throw new Error(`Failed to calculate tenure: ${error.message}`);
  }

  const years = Math.floor(tenureDays / 365.25);
  const months = Math.floor((tenureDays % 365.25) / 30.44);

  return {
    days: tenureDays,
    years,
    months,
    formatted: `${years} year${years !== 1 ? 's' : ''}, ${months} month${months !== 1 ? 's' : ''}`,
  };
}

/**
 * Example 11: Search employees
 */
async function searchEmployees(searchTerm: string) {
  const { data, error } = await supabase
    .from('employees')
    .select(
      `
      id,
      employee_number,
      first_name,
      middle_name,
      last_name,
      position,
      department,
      user:users(role, status)
    `
    )
    .or(
      `first_name.ilike.%${searchTerm}%,last_name.ilike.%${searchTerm}%,employee_number.ilike.%${searchTerm}%`
    )
    .is('deleted_at', null)
    .order('last_name', { ascending: true })
    .limit(20);

  if (error) {
    throw new Error(`Failed to search employees: ${error.message}`);
  }

  return data.map((emp) => ({
    id: brandEmployeeId(emp.id),
    employeeNumber: emp.employee_number,
    fullName: `${emp.first_name} ${emp.middle_name || ''} ${emp.last_name}`.trim(),
    position: emp.position,
    department: emp.department,
  }));
}

/**
 * Example 12: Get audit logs for employee
 */
async function getEmployeeAuditLogs(employeeId: string, limit = 50) {
  const { data, error } = await supabase
    .from('audit_logs')
    .select('*')
    .eq('table_name', 'employees')
    .eq('record_id', employeeId)
    .order('performed_at', { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(`Failed to fetch audit logs: ${error.message}`);
  }

  return data;
}

// ============================================
// React Hook Examples (for Next.js)
// ============================================

/**
 * Example React Hook: useEmployee
 */
/*
import { useEffect, useState } from 'react';

export function useEmployee(employeeId: string | null) {
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!employeeId) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    async function fetchEmployee() {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('employees')
          .select('*')
          .eq('id', employeeId)
          .is('deleted_at', null)
          .single();

        if (error) throw error;

        if (isMounted) {
          setEmployee(data as Employee);
          setError(null);
        }
      } catch (err) {
        if (isMounted) {
          setError(err as Error);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchEmployee();

    return () => {
      isMounted = false;
    };
  }, [employeeId]);

  return { employee, loading, error };
}
*/

/**
 * Example React Hook: useCurrentUser
 */
/*
import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';

export function useCurrentUser() {
  const session = useSession();
  const [user, setUser] = useState<User | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!session.data?.user?.id) {
      setLoading(false);
      return;
    }

    let isMounted = true;

    async function fetchUserData() {
      try {
        setLoading(true);

        // Fetch user
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', session.data.user.id)
          .is('deleted_at', null)
          .single();

        if (userError) throw userError;

        // Fetch employee
        const { data: employeeData, error: employeeError } = await supabase
          .from('employees')
          .select('*')
          .eq('user_id', session.data.user.id)
          .is('deleted_at', null)
          .single();

        if (employeeError && employeeError.code !== 'PGRST116') {
          throw employeeError;
        }

        if (isMounted) {
          setUser(userData as User);
          setEmployee(employeeData as Employee | null);
        }
      } catch (err) {
        console.error('Failed to fetch user data:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    fetchUserData();

    return () => {
      isMounted = false;
    };
  }, [session.data?.user?.id]);

  return {
    user,
    employee,
    loading,
    isHR: user?.role === UserRole.HR,
    isCOS: user?.role === UserRole.COS,
    isCEO: user?.role === UserRole.CEO,
    isAdmin: user?.role === UserRole.Admin,
  };
}
*/

// ============================================
// Export example functions
// ============================================

export {
  getCurrentEmployeeData,
  createEmployee,
  updateEmployeeContact,
  getEmployeesByDepartment,
  checkUserPermissions,
  getDirectReports,
  uploadEmployeeDocument,
  softDeleteEmployee,
  checkProbationStatus,
  getEmployeeTenure,
  searchEmployees,
  getEmployeeAuditLogs,
};
