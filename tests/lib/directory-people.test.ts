import { attachTaskPeople } from '@/app/api/tasks/_lib';
import { getDisplayName, getEmployeeProfilesByUserId } from '@/app/api/tickets/_lib';
import { withResolvedIdentity } from '@/app/api/employees/_identity';
import {
  getPersonDisplayName,
  loadDirectoryPeople,
  normalizeDepartmentName,
  resolveDepartmentName,
  toDirectoryPerson,
} from '@/lib/people/directory-people';
import { describe, expect, it, vi } from 'vitest';

function createDirectoryClient(rows: Array<Record<string, unknown>>) {
  const inFilter = vi.fn(async () => ({ data: rows, error: null }));
  const select = vi.fn(() => ({ in: inFilter }));
  const from = vi.fn(() => ({ select }));
  return { client: { from } as never, from, inFilter };
}

const ANA = {
  user_id: 'user-ana',
  full_name: 'Ana Reyes',
  role: 'associate',
  department_name: 'Marketing',
  position: 'Content Associate',
  email: 'ana@example.com',
  avatar_url: 'https://cdn.example/ana.png',
};

describe('toDirectoryPerson', () => {
  it('treats the blank full_name the view builds for missing employee rows as no name', () => {
    expect(
      toDirectoryPerson({ ...ANA, full_name: ' ', department_name: '', position: null })
    ).toMatchObject({ name: null, department: null, position: null });
  });

  it('skips rows without a user id', () => {
    expect(toDirectoryPerson({ ...ANA, user_id: null })).toBeNull();
  });

  it('treats the stored "Unassigned" placeholder as no department', () => {
    expect(toDirectoryPerson({ ...ANA, department_name: 'Unassigned' })?.department).toBeNull();
  });
});

describe('department and name helpers', () => {
  it('drops blank and placeholder department text', () => {
    expect(normalizeDepartmentName(' Marketing ')).toBe('Marketing');
    expect(normalizeDepartmentName('Unassigned')).toBeNull();
    expect(normalizeDepartmentName('Assigned Department')).toBeNull();
    expect(normalizeDepartmentName('  ')).toBeNull();
  });

  it('prefers the linked department and never reports a division or placeholder', () => {
    expect(resolveDepartmentName('Engineering', 'Marketing')).toBe('Engineering');
    expect(resolveDepartmentName(null, 'Marketing')).toBe('Marketing');
    expect(resolveDepartmentName('SFO', 'Unassigned')).toBeNull();
    expect(resolveDepartmentName(null, 'UHP')).toBeNull();
  });

  it('falls back from a blank name to the account email', () => {
    expect(getPersonDisplayName(' Ana Reyes ', 'ana@example.com')).toBe('Ana Reyes');
    expect(getPersonDisplayName(' ', 'admin@example.com')).toBe('admin@example.com');
    expect(getPersonDisplayName(null, null)).toBe('Unnamed account');
  });
});

describe('withResolvedIdentity', () => {
  it('uses the department linked through users.department_id and the real account role', () => {
    expect(
      withResolvedIdentity({
        department: 'Unassigned',
        users: { role: 'associate', linked_department: { name: 'Design', deleted_at: null } },
      })
    ).toMatchObject({ department_name: 'Design', account_role: 'associate' });
  });

  it('ignores a deleted linked department and placeholder legacy text', () => {
    expect(
      withResolvedIdentity({
        department: 'Unassigned',
        users: [{ role: 'employee', linked_department: { name: 'Old', deleted_at: '2026-01-01' } }],
      })
    ).toMatchObject({ department_name: null, account_role: 'employee' });
  });
});

describe('ticket participant names', () => {
  it('uses the account email instead of a role label when there is no employee record', async () => {
    const employeesIn = vi.fn(() => ({ is: async () => ({ data: [], error: null }) }));
    const directoryIn = vi.fn(async () => ({
      data: [{ ...ANA, user_id: 'user-admin', full_name: ' ', email: 'admin@example.com' }],
      error: null,
    }));
    const from = vi.fn((table: string) => ({
      select: () => ({ in: table === 'employees' ? employeesIn : directoryIn }),
    }));

    const profiles = await getEmployeeProfilesByUserId({ from } as never, ['user-admin']);

    expect(getDisplayName(profiles.get('user-admin'))).toBe('admin@example.com');
    expect(getDisplayName(undefined)).toBe('Unknown user');
  });
});

describe('loadDirectoryPeople', () => {
  it('does not query when there are no user ids', async () => {
    const { client, from } = createDirectoryClient([]);
    const people = await loadDirectoryPeople(client, [null, undefined]);
    expect(people.size).toBe(0);
    expect(from).not.toHaveBeenCalled();
  });

  it('deduplicates ids and maps rows by user id', async () => {
    const { client, inFilter } = createDirectoryClient([ANA]);
    const people = await loadDirectoryPeople(client, ['user-ana', 'user-ana', null]);
    expect(inFilter).toHaveBeenCalledWith('user_id', ['user-ana']);
    expect(people.get('user-ana')).toMatchObject({
      name: 'Ana Reyes',
      department: 'Marketing',
      avatarUrl: 'https://cdn.example/ana.png',
    });
  });
});

describe('attachTaskPeople', () => {
  it('returns real assignee and assigner identity instead of placeholders', async () => {
    const { client } = createDirectoryClient([ANA]);
    const [task] = await attachTaskPeople(client, [
      { id: 'task-1', assigned_to: 'user-ana', assigned_by: 'user-missing' },
    ]);

    expect(task?.assignee).toEqual({
      id: 'user-ana',
      name: 'Ana Reyes',
      role: 'associate',
      department: 'Marketing',
      position: 'Content Associate',
      avatar_url: 'https://cdn.example/ana.png',
    });
    expect(task?.assignee_name).toBe('Ana Reyes');
    // A user without a directory row keeps their id, but every display field stays null.
    expect(task?.assigner).toEqual({
      id: 'user-missing',
      name: null,
      role: null,
      department: null,
      position: null,
      avatar_url: null,
    });
  });

  it('leaves unassigned tasks without an assignee', async () => {
    const { client } = createDirectoryClient([]);
    const [task] = await attachTaskPeople(client, [
      { id: 'task-2', assigned_to: null, assigned_by: 'user-ana' },
    ]);
    expect(task?.assignee).toBeNull();
    expect(task?.assignee_name).toBeNull();
  });
});
