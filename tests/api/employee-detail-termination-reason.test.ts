import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
  createSupabaseAdminClient: vi.fn(),
}));

import { GET } from '../../apps/web/src/app/api/employees/[id]/route';
import { createSupabaseServerClient } from '../../apps/web/src/lib/supabase/server';

const EMPLOYEE_ID = '33333333-3333-4333-8333-333333333333';
const OWNER_USER_ID = '44444444-4444-4444-8444-444444444444';

function mockViewer(viewer: { id: string; dbRole: string }) {
  const row = {
    id: EMPLOYEE_ID,
    user_id: OWNER_USER_ID,
    immediate_head: viewer.id,
    first_name: 'Zed',
    last_name: 'Tester',
    termination_reason: 'AWOL since Sep 28',
    users: { id: OWNER_USER_ID, role: 'employee' },
    manager: null,
  };
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    is: vi.fn(() => query),
    single: vi.fn(async () => ({ data: row, error: null })),
  };
  vi.mocked(createSupabaseServerClient).mockResolvedValue({
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: { id: viewer.id, app_metadata: { db_role: viewer.dbRole } } },
        error: null,
      })),
    },
    from: vi.fn(() => query),
  } as never);
}

function get() {
  return GET(new NextRequest(`http://localhost/api/employees/${EMPLOYEE_ID}`), {
    params: Promise.resolve({ id: EMPLOYEE_ID }),
  });
}

describe('GET /api/employees/[id] termination comment', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('hides the comment from the employee’s own manager', async () => {
    mockViewer({ id: '55555555-5555-4555-8555-555555555555', dbRole: 'employee' });

    const response = await get();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.data.termination_reason).toBeNull();
    expect(JSON.stringify(body)).not.toContain('AWOL');
  });

  it('hides the comment from the employee themselves', async () => {
    mockViewer({ id: OWNER_USER_ID, dbRole: 'employee' });

    const body = await (await get()).json();

    expect(body.data.termination_reason).toBeNull();
  });

  it.each(['admin', 'super_admin'])('shows the comment to a %s', async (dbRole) => {
    mockViewer({ id: '66666666-6666-4666-8666-666666666666', dbRole });

    const body = await (await get()).json();

    expect(body.data.termination_reason).toBe('AWOL since Sep 28');
  });
});
