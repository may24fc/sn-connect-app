import { validatePersonAssignment } from '@/lib/people/assignment-validation';
import { generateEmployeeNumber } from '@/lib/people/employee-number';
import { describe, expect, it, vi } from 'vitest';

function createUsersClient(row: { id: string; status: string | null } | null, error: unknown = null) {
  const maybeSingle = vi.fn(async () => ({ data: row, error }));
  const query = { select: vi.fn(() => query), eq: vi.fn(() => query), is: vi.fn(() => query), maybeSingle };
  const from = vi.fn(() => query);
  return { client: { from } as never, from };
}

describe('validatePersonAssignment', () => {
  it('rejects assigning someone as their own manager without querying', async () => {
    const { client, from } = createUsersClient(null);
    await expect(
      validatePersonAssignment(client, 'user-1', { label: 'Manager', subjectUserId: 'user-1' })
    ).resolves.toEqual({ ok: false, status: 400, error: 'Manager cannot be the same person' });
    expect(from).not.toHaveBeenCalled();
  });

  it('rejects missing and terminated accounts', async () => {
    await expect(
      validatePersonAssignment(createUsersClient(null).client, 'user-2', { label: 'Supervisor' })
    ).resolves.toMatchObject({ ok: false, status: 400 });
    await expect(
      validatePersonAssignment(
        createUsersClient({ id: 'user-2', status: 'terminated' }).client,
        'user-2',
        { label: 'Supervisor' }
      )
    ).resolves.toMatchObject({ ok: false, error: 'Supervisor must be an active user' });
  });

  it('accepts an active account', async () => {
    await expect(
      validatePersonAssignment(
        createUsersClient({ id: 'user-3', status: 'active' }).client,
        'user-3',
        { label: 'Manager', subjectUserId: 'user-1' }
      )
    ).resolves.toEqual({ ok: true });
  });

  it('reports lookup failures as server errors', async () => {
    await expect(
      validatePersonAssignment(createUsersClient(null, { message: 'boom' }).client, 'user-4', {
        label: 'Manager',
      })
    ).resolves.toMatchObject({ ok: false, status: 500 });
  });
});

describe('generateEmployeeNumber', () => {
  it('uses the UTC date and a four-digit suffix', () => {
    expect(generateEmployeeNumber(new Date('2026-10-07T23:30:00Z'))).toMatch(/^EMP-20261007-\d{4}$/);
  });
});
