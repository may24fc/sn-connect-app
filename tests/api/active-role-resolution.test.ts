import { beforeEach, describe, expect, it, vi } from 'vitest';

const getUser = vi.fn();
const from = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(async () => ({ auth: { getUser }, from })),
  createSupabaseAdminClient: vi.fn(() => ({ from: vi.fn() })),
}));

import { getTaskAuthedContext } from '@/app/api/tasks/_lib';
import { getAuthedSupabase as getJobAuthedSupabase } from '@/app/api/jobs/_lib';

function mockActiveRole(role: string | null) {
  const query = {
    select: vi.fn(),
    eq: vi.fn(),
    is: vi.fn(),
    maybeSingle: vi.fn(async () => ({ data: role ? { role } : null, error: null })),
  };
  query.select.mockReturnValue(query);
  query.eq.mockReturnValue(query);
  query.is.mockReturnValue(query);
  from.mockReturnValue(query);
  return query;
}

describe('domain role resolution', () => {
  beforeEach(() => {
    getUser.mockReset();
    from.mockReset();
    getUser.mockResolvedValue({
      data: { user: { id: 'user-1', app_metadata: { db_role: 'super_admin' } } },
      error: null,
    });
  });

  it('rejects a deleted task caller even when metadata grants super admin', async () => {
    const query = mockActiveRole(null);

    expect(await getTaskAuthedContext()).toEqual({ ok: false, status: 401, error: 'Unauthorized' });
    expect(query.is).toHaveBeenCalledWith('deleted_at', null);
  });

  it('uses the current database role for a task caller', async () => {
    const query = mockActiveRole('admin');

    const result = await getTaskAuthedContext();

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.context.role).toBe('admin');
    expect(query.is).toHaveBeenCalledWith('deleted_at', null);
  });

  it('rejects a deleted ATS caller before checking grants', async () => {
    const query = mockActiveRole(null);

    const result = await getJobAuthedSupabase();

    expect(result.error).toBe('Unauthorized');
    expect(result.user).toBeNull();
    expect(query.is).toHaveBeenCalledWith('deleted_at', null);
    expect(from).toHaveBeenCalledTimes(1);
  });
});
