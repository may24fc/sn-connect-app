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

import { DELETE, PATCH } from '@/app/api/invoices/[id]/route';
import { logActivity } from '@/lib/audit';
import { getActiveUserRole } from '@/lib/auth/active-role';
import { createSupabaseAdminClient, createSupabaseServerClient } from '@/lib/supabase/server';

type InvoiceRow = {
  id: string;
  status: string;
  employees: { user_id: string };
};

function setup(invoice: InvoiceRow) {
  const updateIs = vi.fn(async () => ({ error: null }));
  const updateEq = vi.fn(() => ({ is: updateIs }));
  const update = vi.fn(() => ({ eq: updateEq }));
  const maybeSingle = vi.fn(async () => ({ data: invoice, error: null }));
  const selectIs = vi.fn(() => ({ maybeSingle }));
  const selectEq = vi.fn(() => ({ is: selectIs }));
  const select = vi.fn(() => ({ eq: selectEq }));
  const admin = { from: vi.fn(() => ({ select, update })) };
  const server = {
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: { id: 'user-1' } },
        error: null,
      })),
    },
  };

  vi.mocked(createSupabaseAdminClient).mockReturnValue(admin as never);
  vi.mocked(createSupabaseServerClient).mockResolvedValue(server as never);
  vi.mocked(getActiveUserRole).mockResolvedValue('employee');

  return { update };
}

describe('employee invoice mutations', () => {
  beforeEach(() => vi.clearAllMocks());

  it('soft-deletes an employee-owned draft invoice', async () => {
    const { update } = setup({
      id: 'invoice-1',
      status: 'draft',
      employees: { user_id: 'user-1' },
    });

    const response = await DELETE(undefined as never, {
      params: Promise.resolve({ id: 'invoice-1' }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ success: true });
    expect(update).toHaveBeenCalledWith({ deleted_at: expect.any(String) });
    expect(logActivity).toHaveBeenCalledWith(expect.anything(), {
      userId: 'user-1',
      action: 'delete_invoice',
      tableName: 'invoices',
      recordId: 'invoice-1',
    });
  });

  it('rejects deletion of a submitted invoice', async () => {
    const { update } = setup({
      id: 'invoice-1',
      status: 'submitted',
      employees: { user_id: 'user-1' },
    });

    const response = await DELETE(undefined as never, {
      params: Promise.resolve({ id: 'invoice-1' }),
    });

    expect(response.status).toBe(409);
    await expect(response.json()).resolves.toEqual({
      error: 'Only draft invoices can be deleted',
    });
    expect(update).not.toHaveBeenCalled();
  });

  it('rejects edits to another employee invoice', async () => {
    setup({
      id: 'invoice-1',
      status: 'draft',
      employees: { user_id: 'user-2' },
    });

    const response = await PATCH(
      new NextRequest('http://localhost/api/invoices/invoice-1', {
        method: 'PATCH',
        body: JSON.stringify({ notes: 'Updated notes' }),
        headers: { 'Content-Type': 'application/json' },
      }),
      { params: Promise.resolve({ id: 'invoice-1' }) }
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'Forbidden' });
  });
});
