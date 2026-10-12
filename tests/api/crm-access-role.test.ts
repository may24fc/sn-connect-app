import { beforeEach, describe, expect, it, vi } from 'vitest';

const getUser = vi.fn();
const from = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(async () => ({ auth: { getUser }, from })),
}));

import { GET } from '../../apps/web/src/app/api/crm/access/route';

describe('CRM access probe active role resolution', () => {
  beforeEach(() => {
    getUser.mockReset();
    from.mockReset();
  });

  it('uses the active database role when metadata says admin', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'user-1', app_metadata: { db_role: ' ADMIN ' } } }, error: null });
    const maybeSingle = vi.fn(async () => ({ data: { role: 'admin' }, error: null }));
    const query = { select: vi.fn(), eq: vi.fn(), is: vi.fn(), maybeSingle };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.is.mockReturnValue(query);
    from.mockReturnValue(query);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: { canAccess: true, grantedTrackers: [] } });
    expect(query.is).toHaveBeenCalledWith('deleted_at', null);
  });

  it('falls back to the active database role for an obsolete claim', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'user-1', app_metadata: { db_role: 'hr' } } }, error: null });
    const maybeSingle = vi.fn(async () => ({ data: { role: 'super_admin' }, error: null }));
    const query = { select: vi.fn(), eq: vi.fn(), is: vi.fn(), maybeSingle };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.is.mockReturnValue(query);
    from.mockReturnValue(query);

    const response = await GET();

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: { canAccess: true, grantedTrackers: [] } });
    expect(query.is).toHaveBeenCalledWith('deleted_at', null);
  });

  it('rejects a deleted account despite an admin metadata claim', async () => {
    getUser.mockResolvedValue({ data: { user: { id: 'user-1', app_metadata: { db_role: 'super_admin' } } }, error: null });
    const query = { select: vi.fn(), eq: vi.fn(), is: vi.fn(), maybeSingle: vi.fn(async () => ({ data: null, error: null })) };
    query.select.mockReturnValue(query);
    query.eq.mockReturnValue(query);
    query.is.mockReturnValue(query);
    from.mockReturnValue(query);

    const response = await GET();

    expect(response.status).toBe(401);
    expect(query.is).toHaveBeenCalledWith('deleted_at', null);
  });
});
