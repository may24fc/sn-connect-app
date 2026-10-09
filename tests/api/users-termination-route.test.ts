import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
  createSupabaseAdminClient: vi.fn(),
}));
vi.mock('@/lib/audit', () => ({ logActivity: vi.fn() }));

import { DELETE, PATCH } from '../../apps/web/src/app/api/users/[id]/route';
import { logActivity } from '../../apps/web/src/lib/audit';
import {
  createSupabaseAdminClient,
  createSupabaseServerClient,
} from '../../apps/web/src/lib/supabase/server';

const TARGET_ID = '11111111-1111-4111-8111-111111111111';
const ADMIN_ID = '22222222-2222-4222-8222-222222222222';

type Update = { table: string; payload: Record<string, unknown> };

function setup(options: { targetStatus: string; employee?: Record<string, unknown> | null }) {
  const updates: Update[] = [];
  const rows: Record<string, Record<string, unknown> | null> = {
    users: { id: TARGET_ID, role: 'employee', status: options.targetStatus, deleted_at: null },
    employees:
      options.employee === undefined
        ? {
            id: 'emp-1',
            date_hired: '2025-01-01',
            date_terminated: '2026-09-01T12:00:00.000Z',
            termination_reason: 'Resigned',
          }
        : options.employee,
  };

  const admin = {
    from: vi.fn((table: string) => {
      const query = {
        select: vi.fn(() => query),
        update: vi.fn((payload: Record<string, unknown>) => {
          updates.push({ table, payload });
          return query;
        }),
        eq: vi.fn(() => query),
        is: vi.fn(() => query),
        maybeSingle: vi.fn(async () => ({ data: rows[table], error: null })),
        single: vi.fn(async () => ({ data: rows[table], error: null })),
        then: (onFulfilled?: (value: unknown) => unknown, onRejected?: (reason: unknown) => unknown) =>
          Promise.resolve({ data: null, error: null }).then(onFulfilled, onRejected),
      };
      return query;
    }),
  };

  const server = {
    auth: {
      getUser: vi.fn(async () => ({ data: { user: { id: ADMIN_ID } }, error: null })),
    },
    from: vi.fn(() => {
      const query = {
        select: vi.fn(() => query),
        eq: vi.fn(() => query),
        is: vi.fn(() => query),
        maybeSingle: vi.fn(async () => ({ data: { role: 'admin' }, error: null })),
      };
      return query;
    }),
  };

  vi.mocked(createSupabaseServerClient).mockResolvedValue(server as never);
  vi.mocked(createSupabaseAdminClient).mockReturnValue(admin as never);

  return { updates };
}

function patch(body: unknown) {
  return PATCH(
    new NextRequest(`http://localhost/api/users/${TARGET_ID}`, {
      method: 'PATCH',
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id: TARGET_ID }) }
  );
}

function terminate(body?: unknown) {
  return DELETE(
    new NextRequest(`http://localhost/api/users/${TARGET_ID}`, {
      method: 'DELETE',
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    }),
    { params: Promise.resolve({ id: TARGET_ID }) }
  );
}

describe('termination comment on /api/users/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('saves a comment without touching the termination date', async () => {
    const { updates } = setup({ targetStatus: 'terminated' });

    const response = await patch({ termination_reason: '  AWOL  ' });

    expect(response.status).toBe(200);
    expect(updates).toEqual([{ table: 'employees', payload: { termination_reason: 'AWOL' } }]);
    await expect(response.json()).resolves.toMatchObject({
      data: { termination_reason: 'AWOL', date_terminated: '2026-09-01T12:00:00.000Z' },
    });
  });

  it('saves date and comment together', async () => {
    const { updates } = setup({ targetStatus: 'terminated' });

    const response = await patch({ date_terminated: '2026-09-15', termination_reason: 'Resigned' });

    expect(response.status).toBe(200);
    expect(updates).toEqual([
      {
        table: 'employees',
        payload: { date_terminated: '2026-09-15T12:00:00.000Z', termination_reason: 'Resigned' },
      },
    ]);
  });

  it('clears the comment when it is blank or null', async () => {
    const { updates } = setup({ targetStatus: 'terminated' });

    await patch({ termination_reason: '   ' });
    await patch({ termination_reason: null });

    expect(updates.map((entry) => entry.payload)).toEqual([
      { termination_reason: null },
      { termination_reason: null },
    ]);
  });

  it('rejects an over-long comment and an empty edit', async () => {
    const { updates } = setup({ targetStatus: 'terminated' });

    expect((await patch({ termination_reason: 'x'.repeat(501) })).status).toBe(400);
    expect((await patch({})).status).toBe(400);
    expect(updates).toEqual([]);
  });

  it('only edits terminated accounts', async () => {
    const { updates } = setup({ targetStatus: 'active' });

    const response = await patch({ termination_reason: 'AWOL' });

    expect(response.status).toBe(409);
    expect(updates).toEqual([]);
  });

  it('never writes the comment text to the audit log', async () => {
    setup({ targetStatus: 'terminated' });

    await patch({ termination_reason: 'Medical leave, confidential detail' });

    expect(logActivity).toHaveBeenCalledTimes(1);
    const entry = vi.mocked(logActivity).mock.calls[0]?.[1];
    expect(entry?.action).toBe('update_termination_details');
    expect(entry?.metadata).toMatchObject({ reason_changed: true, date_changed: false });
    expect(JSON.stringify(entry)).not.toContain('confidential');
  });

  it('records the comment when terminating, and none when omitted', async () => {
    const withReason = setup({ targetStatus: 'active' });
    expect((await terminate({ termination_reason: ' Resigned ' })).status).toBe(200);
    const employeeUpdate = withReason.updates.find((entry) => entry.table === 'employees');
    expect(employeeUpdate?.payload).toMatchObject({ termination_reason: 'Resigned' });

    const without = setup({ targetStatus: 'active' });
    expect((await terminate()).status).toBe(200);
    const bareUpdate = without.updates.find((entry) => entry.table === 'employees');
    expect(bareUpdate?.payload).toMatchObject({ termination_reason: null });
  });

  it('rejects an invalid comment when terminating', async () => {
    const { updates } = setup({ targetStatus: 'active' });

    const response = await terminate({ termination_reason: 'x'.repeat(501) });

    expect(response.status).toBe(400);
    expect(updates).toEqual([]);
  });

  it('clears the comment with the date when a person is restored to active', async () => {
    const { updates } = setup({ targetStatus: 'terminated' });

    const response = await patch({ status: 'active' });

    expect(response.status).toBe(200);
    const employeeUpdate = updates.find((entry) => entry.table === 'employees');
    expect(employeeUpdate?.payload).toEqual({ date_terminated: null, termination_reason: null });
  });
});
