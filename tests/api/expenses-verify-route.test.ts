import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(),
  createSupabaseAdminClient: vi.fn(),
}));

vi.mock('@/lib/notifications/create-notification', () => ({
  createNotification: vi.fn(),
  getUserDisplayName: vi.fn(async () => 'Accounting Reviewer'),
}));

vi.mock('@/lib/audit', () => ({
  logActivity: vi.fn(),
}));

import { POST } from '@/app/api/expenses/[id]/verify/route';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';

type MatchMockOptions = {
  actorRole: 'employee' | 'intern' | 'admin' | 'super_admin';
  isAccountingMember: boolean;
};

function buildAdminClient(options: MatchMockOptions) {
  const requestEntry = {
    id: '11111111-1111-1111-1111-111111111111',
    vendor_name: 'Sample Vendor',
    currency: 'USD',
    total_amount: 100,
    submitted_by: 'submitter-1',
    source_type: 'staff_request',
    match_status: 'unmatched',
    matched_entry_id: null,
    deleted_at: null,
  };

  const paymentEntry = {
    id: '22222222-2222-2222-2222-222222222222',
    vendor_name: 'Sample Vendor',
    currency: 'USD',
    total_amount: 100,
    submitted_by: 'payer-1',
    source_type: 'direct_payment',
    match_status: 'unmatched',
    matched_entry_id: null,
    deleted_at: null,
  };

  const rpc = vi.fn(async (fnName: string) => {
    if (fnName === 'user_is_accounting_member') {
      return { data: options.isAccountingMember, error: null };
    }
    if (fnName === 'user_is_marketing_member') {
      return { data: false, error: null };
    }
    return { data: null, error: null };
  });

  const from = vi.fn((table: string) => {
    if (table === 'users') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            is: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({
                data: {
                  role: options.actorRole,
                  department_id: 'dept-1',
                },
                error: null,
              })),
            })),
          })),
        })),
      };
    }

    if (table === 'expense_entries') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn((_column: string, value: string) => ({
            is: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({
                data:
                  value === '11111111-1111-1111-1111-111111111111'
                    ? requestEntry
                    : value === '22222222-2222-2222-2222-222222222222'
                      ? paymentEntry
                      : null,
                error: null,
              })),
            })),
          })),
        })),
        update: vi.fn(() => ({
          eq: vi.fn(async () => ({ error: null })),
        })),
      };
    }

    throw new Error(`Unexpected table ${table}`);
  });

  return {
    rpc,
    from,
  };
}

describe('/api/expenses/[id]/verify (matching queue) role checks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows accounting employee to reconcile a request against a payment', async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: {
        getUser: vi.fn(async () => ({
          data: { user: { id: 'actor-1' } },
          error: null,
        })),
      },
    } as never);

    vi.mocked(createSupabaseAdminClient).mockReturnValue(
      buildAdminClient({ actorRole: 'employee', isAccountingMember: true }) as never
    );

    const response = await POST(
      new Request('http://localhost/api/expenses/exp-1/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          counterpartEntryId: '22222222-2222-2222-2222-222222222222',
          matchStatus: 'matched',
        }),
      }) as never,
      { params: Promise.resolve({ id: '11111111-1111-1111-1111-111111111111' }) }
    );

    expect(response.status).toBe(200);
  });

  it('blocks non-accounting employee from reconciling matches', async () => {
    vi.mocked(createSupabaseServerClient).mockResolvedValue({
      auth: {
        getUser: vi.fn(async () => ({
          data: { user: { id: 'actor-1' } },
          error: null,
        })),
      },
    } as never);

    vi.mocked(createSupabaseAdminClient).mockReturnValue(
      buildAdminClient({ actorRole: 'employee', isAccountingMember: false }) as never
    );

    const response = await POST(
      new Request('http://localhost/api/expenses/exp-1/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          counterpartEntryId: '22222222-2222-2222-2222-222222222222',
          matchStatus: 'matched',
        }),
      }) as never,
      { params: Promise.resolve({ id: '11111111-1111-1111-1111-111111111111' }) }
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: 'Forbidden: Only Accounting staff or Admins can reconcile matches',
    });
  });
});

