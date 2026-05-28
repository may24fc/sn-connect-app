export const EMPLOYEE_EQUIVALENT_ROLES = ['employee', 'admin', 'super_admin'] as const;

export function isEmployeeEquivalentRole(role: string | null | undefined): boolean {
  return (
    typeof role === 'string' &&
    EMPLOYEE_EQUIVALENT_ROLES.includes(role as (typeof EMPLOYEE_EQUIVALENT_ROLES)[number])
  );
}

export function expandEmployeeEquivalentRoles(roles: string[]): string[] {
  const expanded = roles.flatMap((role) =>
    role === 'employee' ? [...EMPLOYEE_EQUIVALENT_ROLES] : [role]
  );

  return [...new Set(expanded)];
}

export function collapseEmployeeEquivalentRole(role: string): string {
  return isEmployeeEquivalentRole(role) ? 'employee' : role;
}