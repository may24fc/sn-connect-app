import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const getUser = vi.fn();
const adminFrom = vi.fn();
const serverFrom = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(async () => ({ auth: { getUser }, from: serverFrom })),
  createSupabaseAdminClient: vi.fn(() => ({ from: adminFrom })),
}));

import { GET as getEmployees } from '@/app/api/employees/route';
import { GET as getDirectory } from '@/app/api/directory/route';
import { GET as getReports } from '@/app/api/reports/route';
import { GET as getMetadata } from '@/app/api/users/[id]/metadata/route';

describe('inline API authorization uses the active database role', () => {
  const roleQuery = {
    select: vi.fn(),
    eq: vi.fn(),
    is: vi.fn(),
    maybeSingle: vi.fn(),
  };

  beforeEach(() => {
    getUser.mockReset();
    adminFrom.mockReset();
    serverFrom.mockReset();
    for (const method of ['select', 'eq', 'is'] as const) {
      roleQuery[method].mockReset().mockReturnValue(roleQuery);
    }
    roleQuery.maybeSingle.mockReset().mockResolvedValue({ data: null, error: null });
    adminFrom.mockReturnValue(roleQuery);
    getUser.mockResolvedValue({
      data: { user: { id: 'user-1', app_metadata: { db_role: 'super_admin' } } },
      error: null,
    });
  });

  for (const [name, handler, url] of [
    ['employees', getEmployees, 'http://localhost/api/employees'],
    ['directory', getDirectory, 'http://localhost/api/directory'],
    ['reports', getReports, 'http://localhost/api/reports'],
  ] as const) {
    it(`denies a deleted ${name} caller with a stale super_admin claim`, async () => {
      const response = await handler(new NextRequest(url));
      expect(response.status).toBe(401);
      expect(roleQuery.is).toHaveBeenCalledWith('deleted_at', null);
      expect(serverFrom).not.toHaveBeenCalled();
      expect(adminFrom).toHaveBeenCalledWith('users');
    });
  }

  it('denies a deleted user from their own metadata route', async () => {
    const response = await getMetadata(new NextRequest('http://localhost/api/users/user-1/metadata'), {
      params: Promise.resolve({ id: 'user-1' }),
    });
    expect(response.status).toBe(401);
    expect(roleQuery.is).toHaveBeenCalledWith('deleted_at', null);
    expect(serverFrom).not.toHaveBeenCalled();
  });

  it('does not grant directory access from a stale super_admin claim after demotion', async () => {
    roleQuery.maybeSingle.mockResolvedValue({ data: { role: 'employee' }, error: null });
    const response = await getDirectory(new NextRequest('http://localhost/api/directory'));
    expect(response.status).toBe(403);
    expect(roleQuery.is).toHaveBeenCalledWith('deleted_at', null);
    expect(serverFrom).not.toHaveBeenCalled();
  });
});
