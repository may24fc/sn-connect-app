import type { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';

type DirectoryClient =
  | ReturnType<typeof createSupabaseAdminClient>
  | Awaited<ReturnType<typeof createSupabaseServerClient>>;

/** Display identity for one user, as resolved by the `employee_directory` view. */
export interface DirectoryPerson {
  userId: string;
  name: string | null;
  role: string | null;
  department: string | null;
  position: string | null;
  email: string | null;
  avatarUrl: string | null;
}

interface DirectoryPersonRow {
  user_id: string | null;
  full_name: string | null;
  role: string | null;
  department_name: string | null;
  position: string | null;
  email: string | null;
  avatar_url: string | null;
}

export const DIRECTORY_PERSON_COLUMNS =
  'user_id, full_name, role, department_name, position, email, avatar_url';

/**
 * `employees.department` is NOT NULL, so "no department" is stored as this placeholder.
 * Readers must treat it (and the legacy 'Assigned Department') as missing, never as a department.
 */
export const UNASSIGNED_DEPARTMENT = 'Unassigned';
const PLACEHOLDER_DEPARTMENT_NAMES = new Set([UNASSIGNED_DEPARTMENT, 'Assigned Department']);

function textOrNull(value: string | null | undefined): string | null {
  const trimmed = typeof value === 'string' ? value.trim() : '';
  return trimmed === '' ? null : trimmed;
}

/** A real department name, or null for blank and placeholder text. */
export function normalizeDepartmentName(value: string | null | undefined): string | null {
  const department = textOrNull(value);
  return department && !PLACEHOLDER_DEPARTMENT_NAMES.has(department) ? department : null;
}

// Mirrors employee_directory: these legacy "departments" are divisions, not departments.
const DIVISION_NAMES = new Set([
  'SFO',
  'UHP',
  'Property Development',
  'SN International Group',
  'Property Investment',
  'Others',
]);

/**
 * Department shown for a person, resolved like `employee_directory.department_name`:
 * the `departments` row linked from `users.department_id`, then the legacy `employees.department` text.
 */
export function resolveDepartmentName(
  linkedDepartmentName: string | null | undefined,
  legacyDepartment: string | null | undefined
): string | null {
  for (const candidate of [linkedDepartmentName, legacyDepartment]) {
    const department = normalizeDepartmentName(candidate);
    if (department && !DIVISION_NAMES.has(department)) {
      return department;
    }
  }

  return null;
}

/** Trimmed display name; the directory view yields " " for accounts without an employee record. */
export function normalizePersonName(value: string | null | undefined): string | null {
  return textOrNull(value);
}

/** Name to show for a person: their name, else their account email, never a blank string. */
export function getPersonDisplayName(
  name: string | null | undefined,
  email: string | null | undefined
): string {
  return textOrNull(name) ?? textOrNull(email) ?? 'Unnamed account';
}

export function toDirectoryPerson(row: DirectoryPersonRow): DirectoryPerson | null {
  if (!row.user_id) {
    return null;
  }

  return {
    userId: row.user_id,
    // The view builds full_name as "first || ' ' || last", so a missing employee row yields " ".
    name: textOrNull(row.full_name),
    role: textOrNull(row.role),
    department: normalizeDepartmentName(row.department_name),
    position: textOrNull(row.position),
    email: textOrNull(row.email),
    avatarUrl: textOrNull(row.avatar_url),
  };
}

/**
 * Loads name, role, department, position, email and photo for a set of users.
 * Users without a directory row are absent from the map; callers decide how to label them.
 */
export async function loadDirectoryPeople(
  client: DirectoryClient,
  userIds: ReadonlyArray<string | null | undefined>
): Promise<Map<string, DirectoryPerson>> {
  const ids = Array.from(new Set(userIds.filter((id): id is string => Boolean(id))));
  const people = new Map<string, DirectoryPerson>();

  if (ids.length === 0) {
    return people;
  }

  const { data, error } = await client
    .from('employee_directory')
    .select(DIRECTORY_PERSON_COLUMNS)
    .in('user_id', ids);

  if (error) {
    console.error('Failed to load directory people:', error.message);
    return people;
  }

  for (const row of (data ?? []) as Array<DirectoryPersonRow>) {
    const person = toDirectoryPerson(row);
    if (person) {
      people.set(person.userId, person);
    }
  }

  return people;
}
