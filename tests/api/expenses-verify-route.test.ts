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

type VerifyMockOptions = {
  actorRole: 'employee' | 'intern' | 'admin' | 'super_admin';
  isAccountingMember: boolean;
};

function buildAdminClient(options: VerifyMockOptions) {
  const expenseEntry = {
    id: 'exp-1',
    vendor_name: 'Sample Vendor',
    transaction_date: '2026-06-01',
    tax_amount: 10,
    total_amount: 100,
    currency: 'USD',
    submitted_by: 'submitter-1',
    processing_status: 'awaiting_intern_review',
  };

  const updatedEntry = {
    ...expenseEntry,
    verified_debit_account: 'Office Expense',
    verified_credit_account: 'Cash',
    processing_status: 'leadership_review_required',
  };

  const rpc = vi.fn(async () => ({
    data: options.isAccountingMember,
    error: null,
  }));

  const from = vi.fn((table: string) => {
    if (table === 'users') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            is: vi.fn(() => ({
              maybeSingle: vi.fn(async () => ({
                data: {
                  role: options.actorRole,
                  id: 'actor-1',
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
        select: vi.fn((columns?: string) => {
          if (columns === 'total_amount, transaction_date') {
            return {
              ilike: vi.fn(() => ({
                is: vi.fn(() => ({
                  in: vi.fn(() => ({
                    order: vi.fn(async () => ({
                      data: [],
                      error: null,
                    })),
                  })),
                })),
              })),
            };
          }

          return {
            eq: vi.fn(() => ({
              is: vi.fn(() => ({
                maybeSingle: vi.fn(async () => ({
                  data: expenseEntry,
                  error: null,
                })),
              })),
            })),
          };
        }),
        update: vi.fn(() => ({
          eq: vi.fn(() => ({
            select: vi.fn(() => ({
              single: vi.fn(async () => ({
                data: updatedEntry,
                error: null,
              })),
            })),
          })),
        })),
      };
    }

    if (table === 'departments') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            maybeSingle: vi.fn(async () => ({ data: null, error: null })),
          })),
        })),
      };
    }

    if (table === 'employees') {
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            is: vi.fn(async () => ({ data: [], error: null })),
            order: vi.fn(() => ({
              limit: vi.fn(async () => ({ data: [], error: null })),
            })),
          })),
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

describe('/api/expenses/[id]/verify role checks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('allows accounting employee to verify an expense', async () => {
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
          verifiedDebitAccount: 'Office Expense',
          verifiedCreditAccount: 'Cash',
        }),
      }) as never,
      { params: Promise.resolve({ id: 'exp-1' }) }
    );

    expect(response.status).toBe(200);
  });

  it('blocks non-accounting employee from verification', async () => {
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
          verifiedDebitAccount: 'Office Expense',
          verifiedCreditAccount: 'Cash',
        }),
      }) as never,
      { params: Promise.resolve({ id: 'exp-1' }) }
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({
      error: 'Forbidden: Only Accounting department can verify expenses',
    });
  });
});
