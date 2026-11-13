import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/app/api/projects/_lib', () => ({ getProjectAuthedContext: vi.fn() }));
vi.mock('@/lib/audit', () => ({ logActivity: vi.fn() }));

import { getProjectAuthedContext } from '@/app/api/projects/_lib';
import { PATCH } from '@/app/api/work-requests/[id]/route';
import { POST } from '@/app/api/work-requests/route';

const ACTOR_ID = '11111111-1111-4111-8111-111111111111';
const REQUEST_ID = '22222222-2222-4222-8222-222222222222';
const DEPARTMENT_ID = '33333333-3333-4333-8333-333333333333';
const ASSIGNEE_ID = '44444444-4444-4444-8444-444444444444';

function authenticate(rpc: ReturnType<typeof vi.fn>) {
  vi.mocked(getProjectAuthedContext).mockResolvedValue({
    ok: true,
    context: {
      supabaseAdmin: { rpc },
      supabase: {},
      user: { id: ACTOR_ID },
      role: 'employee',
    },
  } as never);
}

describe('cross-department work request mutations', () => {
  beforeEach(() => vi.clearAllMocks());

  it('creates a pending request through the atomic database function', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: { ok: true, data: { id: REQUEST_ID, status: 'pending' } },
      error: null,
    });
    authenticate(rpc);
    const response = await POST(
      new NextRequest('http://localhost/api/work-requests', {
        method: 'POST',
        body: JSON.stringify({
          targetDepartmentId: DEPARTMENT_ID,
          title: 'Validate account access',
        }),
      })
    );

    expect(response.status).toBe(201);
    expect(rpc).toHaveBeenCalledWith('create_cross_department_work_request', {
      p_actor: ACTOR_ID,
      p_input: expect.objectContaining({ targetDepartmentId: DEPARTMENT_ID, priority: 'medium' }),
    });
  });

  it('approves and assigns using one server-confirmed decision', async () => {
    const rpc = vi.fn().mockResolvedValue({
      data: { ok: true, data: { id: REQUEST_ID, status: 'approved' } },
      error: null,
    });
    authenticate(rpc);
    const response = await PATCH(
      new NextRequest(`http://localhost/api/work-requests/${REQUEST_ID}`, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'approve', assigneeId: ASSIGNEE_ID }),
      }),
      { params: Promise.resolve({ id: REQUEST_ID }) }
    );

    expect(response.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith('respond_cross_department_work_request', {
      p_request_id: REQUEST_ID,
      p_actor: ACTOR_ID,
      p_action: 'approve',
      p_assignee: ASSIGNEE_ID,
      p_note: null,
    });
  });

  it('rejects malformed decisions before calling the database', async () => {
    const rpc = vi.fn();
    authenticate(rpc);
    const response = await PATCH(
      new NextRequest(`http://localhost/api/work-requests/${REQUEST_ID}`, {
        method: 'PATCH',
        body: JSON.stringify({ action: 'approve', assigneeId: 'not-a-uuid' }),
      }),
      { params: Promise.resolve({ id: REQUEST_ID }) }
    );
    expect(response.status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });
});
