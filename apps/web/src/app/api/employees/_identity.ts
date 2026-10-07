import { resolveDepartmentName } from '@/lib/people/directory-people';

/**
 * Embed for `users` that also pulls the department linked through `users.department_id`.
 * Pass the embedded row to {@link withResolvedIdentity}.
 */
export const LINKED_DEPARTMENT_EMBED = 'linked_department:departments(name, deleted_at)';

function firstRecord(value: unknown): Record<string, unknown> | null {
  const record = Array.isArray(value) ? value[0] : value;
  return record && typeof record === 'object' ? (record as Record<string, unknown>) : null;
}

/**
 * Adds the department and account role people actually have. `employees.department` is legacy text
 * that may hold a placeholder ('Unassigned') or a division; the linked `departments` row is authoritative.
 */
export function withResolvedIdentity<T extends { department: string | null; users?: unknown }>(
  employee: T
): T & { department_name: string | null; account_role: string | null } {
  const account = firstRecord(employee.users);
  const linkedDepartment = firstRecord(account?.linked_department);
  const linkedDepartmentName =
    linkedDepartment && !linkedDepartment.deleted_at && typeof linkedDepartment.name === 'string'
      ? linkedDepartment.name
      : null;

  return {
    ...employee,
    department_name: resolveDepartmentName(linkedDepartmentName, employee.department),
    account_role: typeof account?.role === 'string' ? account.role : null,
  };
}
