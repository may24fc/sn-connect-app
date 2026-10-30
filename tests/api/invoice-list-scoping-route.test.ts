import { GET } from '@/app/api/invoices/route';
import { getActiveUserRole } from '@/lib/auth/active-role';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';
import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/auth/active-role', () => ({ getActiveUserRole: vi.fn() }));
vi.mock('@/lib/audit', () => ({ logActivity: vi.fn() }));
vi.mock('@/lib/payroll/invoiceDocumentOcr', () => ({
  extractAmountFromInvoiceDocument: vi.fn(),
}));
vi.mock('@/lib/supabase/server', () => ({
  createSupabaseAdminClient: vi.fn(),
  createSupabaseServerClient: vi.fn(),
}));

const EMPTY_EMPLOYEE_SCOPE_ID = '00000000-0000-0000-0000-000000000000';

describe('GET /api/invoices self scoping', () => {
  beforeEach(() => vi.clearAllMocks());

  it('fails closed when a self-scoped admin has no employee owner', async () => {
    const invoiceEqCalls: Array<[string, unknown]> = [];
    const result = { data: [], error: null, count: 0 };
    let invoiceQueryNumber = 0;
    const admin = {
      from: vi.fn((table: string) => {
        if (table === 'employees') {
          const employeeBuilder: Record<string, unknown> = {};
          for (const method of ['select', 'eq', 'is']) {
            employeeBuilder[method] = vi.fn(() => employeeBuilder);
          }
          employeeBuilder.maybeSingle = vi.fn(async () => ({ data: null, error: null }));
          return employeeBuilder;
        }

        invoiceQueryNumber += 1;
        const currentQueryNumber = invoiceQueryNumber;
        const invoiceBuilder: Record<string, unknown> = {};
        for (const method of ['select', 'is', 'order', 'in']) {
          invoiceBuilder[method] = vi.fn(() => invoiceBuilder);
        }
        invoiceBuilder.eq = vi.fn((column: string, value: unknown) => {
          invoiceEqCalls.push([column, value]);
          return column !== 'employee_id' || currentQueryNumber === 1
            ? invoiceBuilder
            : Promise.resolve(result);
        });
        invoiceBuilder.range = vi.fn(async () => result);
        return invoiceBuilder;
      }),
    };
    const server = {
      auth: {
        getUser: vi.fn(async () => ({ data: { user: { id: 'user-1' } }, error: null })),
      },
    };

    vi.mocked(createSupabaseAdminClient).mockReturnValue(admin as never);
    vi.mocked(createSupabaseServerClient).mockResolvedValue(server as never);
    vi.mocked(getActiveUserRole).mockResolvedValue('super_admin');

    const response = await GET(
      new NextRequest('http://localhost/api/invoices?selfOnly=true&page=1&pageSize=10')
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toMatchObject({
      data: [],
      pagination: { total: 0 },
      stats: { submitted: 0, approved: 0, rejected: 0, paid: 0, pendingAmount: 0 },
    });
    expect(invoiceEqCalls).toContainEqual(['employee_id', EMPTY_EMPLOYEE_SCOPE_ID]);
  });
});
