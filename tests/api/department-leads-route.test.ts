import { DELETE, POST } from '@/app/api/departments/leads/route';
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  role: 'super_admin',
  authenticated: true,
  candidate: { user_id: '22222222-2222-4222-8222-222222222222', status: 'active' } as Record<
    string,
    unknown
  > | null,
  candidateError: null as { message: string } | null,
  department: { id: '11111111-1111-4111-8111-111111111111' } as Record<string, unknown> | null,
  existing: null as { id: string } | null,
  insert: vi.fn(),
  update: vi.fn(),
  leadFilter: vi.fn(),
}));

vi.mock('@/lib/audit', () => ({ logActivity: vi.fn() }));
vi.mock('@/lib/notifications/create-notification', () => ({ createNotification: vi.fn() }));
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(async () => ({
    auth: {
      getUser: async () => ({ data: { user: state.authenticated ? { id: 'actor' } : null } }),
    },
  })),
  createSupabaseAdminClient: vi.fn(() => ({
    from: (table: string) => {
      let writing = false;
      const builder = {
        select: vi.fn(() => builder),
        eq: vi.fn((column: string, value: unknown) => {
          if (table === 'department_leads') state.leadFilter(column, value);
          return builder;
        }),
        is: vi.fn((column: string, value: unknown) => {
          if (table === 'department_leads') state.leadFilter(column, value);
          return builder;
        }),
        insert: vi.fn((input: unknown) => {
          state.insert(input);
          writing = true;
          return builder;
        }),
        update: vi.fn((input: unknown) => {
          state.update(input);
          writing = true;
          return builder;
        }),
        maybeSingle: async () => {
          switch (table) {
            case 'users':
              return { data: { role: state.role }, error: null };
            case 'employee_directory':
              return { data: state.candidate, error: state.candidateError };
            case 'departments':
              return { data: state.department, error: null };
            case 'department_leads':
              return { data: writing ? { id: 'appointment' } : state.existing, error: null };
            default:
              throw new Error(`Unexpected table: ${table}`);
          }
        },
        single: async () => ({ data: { id: 'appointment' }, error: null }),
      };
      return builder;
    },
  })),
}));

const departmentId = '11111111-1111-4111-8111-111111111111';
const userId = '22222222-2222-4222-8222-222222222222';
function request(method = 'POST', department = departmentId) {
  return new NextRequest('http://localhost/api/departments/leads', {
    method,
    body: JSON.stringify({ departmentId: department, userId }),
  });
}

describe('department lead appointments', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    state.role = 'super_admin';
    state.authenticated = true;
    state.candidate = { user_id: userId, status: 'active' };
    state.candidateError = null;
    state.department = { id: departmentId };
    state.existing = null;
  });

  it.each(['employee', 'associate', 'admin', 'super_admin'])(
    'appoints a directory %s outside their home department to multiple departments',
    async (role) => {
      state.candidate = {
        user_id: userId,
        status: 'active',
        role,
        department_id: 'home-department',
      };
      expect((await POST(request())).status).toBe(201);
      expect((await POST(request('POST', '33333333-3333-4333-8333-333333333333'))).status).toBe(
        201
      );
      expect(state.insert).toHaveBeenNthCalledWith(1, {
        department_id: departmentId,
        user_id: userId,
        appointed_by: 'actor',
      });
      expect(state.insert).toHaveBeenNthCalledWith(2, {
        department_id: '33333333-3333-4333-8333-333333333333',
        user_id: userId,
        appointed_by: 'actor',
      });
      expect(state.update).not.toHaveBeenCalled();
    }
  );

  it.each(['employee', 'associate', 'admin'])('denies appointments by %s', async (role) => {
    state.role = role;
    expect((await POST(request())).status).toBe(403);
    expect(state.insert).not.toHaveBeenCalled();
  });

  it('requires authentication and valid IDs', async () => {
    state.authenticated = false;
    expect((await POST(request())).status).toBe(401);
    state.authenticated = true;
    expect((await POST(request('POST', 'invalid'))).status).toBe(400);
    expect(state.insert).not.toHaveBeenCalled();
  });

  it.each([null, { user_id: userId, status: 'terminated' }])(
    'rejects unavailable or terminated directory accounts: %j',
    async (candidate) => {
      state.candidate = candidate;
      expect((await POST(request())).status).toBe(400);
      expect(state.insert).not.toHaveBeenCalled();
    }
  );

  it('reports directory validation failures', async () => {
    state.candidateError = { message: 'Unavailable' };
    expect((await POST(request())).status).toBe(500);
    expect(state.insert).not.toHaveBeenCalled();
  });

  it('rejects missing or deleted departments', async () => {
    state.department = null;
    expect((await POST(request())).status).toBe(404);
    expect(state.insert).not.toHaveBeenCalled();
  });

  it('does not duplicate an existing active appointment', async () => {
    state.existing = { id: 'existing' };
    expect((await POST(request())).status).toBe(200);
    expect(state.insert).not.toHaveBeenCalled();
  });

  it('revokes only the specified department appointment', async () => {
    expect((await DELETE(request('DELETE'))).status).toBe(200);
    expect(state.leadFilter).toHaveBeenCalledWith('department_id', departmentId);
    expect(state.leadFilter).toHaveBeenCalledWith('user_id', userId);
    expect(state.leadFilter).toHaveBeenCalledWith('revoked_at', null);
    expect(state.update).toHaveBeenCalledWith({
      revoked_at: expect.any(String),
      revoked_by: 'actor',
    });
  });
});
