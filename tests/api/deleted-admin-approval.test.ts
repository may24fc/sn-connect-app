import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

const getUser = vi.fn();
const from = vi.fn();

vi.mock('@/lib/supabase/server', () => ({
  createSupabaseServerClient: vi.fn(async () => ({ auth: { getUser }, from })),
  createSupabaseAdminClient: vi.fn(() => ({ from: vi.fn() })),
}));

import { POST as approveInvoice } from '@/app/api/invoices/[id]/approve/route';
import { POST as approveReport } from '@/app/api/reports/[id]/approve/route';

describe('soft-deleted admin approval boundary', () => {
  beforeEach(() => {
    getUser.mockReset();
    from.mockReset();
    getUser.mockResolvedValue({
      data: { user: { id: 'user-1', app_metadata: { db_role: 'super_admin' } } },
      error: null,
    });
  });

  for (const [name, handler] of [
    ['invoice', approveInvoice],
    ['report', approveReport],
  ] as const) {
    it(`rejects a deleted ${name} approver before any write`, async () => {
      const query = {
        select: vi.fn(),
        eq: vi.fn(),
        is: vi.fn(),
        single: vi.fn(async () => ({ data: null, error: { code: 'PGRST116' } })),
      };
      query.select.mockReturnValue(query);
      query.eq.mockReturnValue(query);
      query.is.mockReturnValue(query);
      from.mockReturnValue(query);

      const request = new Request('http://localhost/api/approve', {
        method: 'POST',
        body: JSON.stringify({ action: 'approved' }),
      }) as NextRequest;
      const response = await handler(request, { params: Promise.resolve({ id: 'record-1' }) });

      expect(response.status).toBe(404);
      expect(query.is).toHaveBeenCalledWith('deleted_at', null);
      expect(from).toHaveBeenCalledTimes(1);
      expect(from).toHaveBeenCalledWith('users');
    });
  }
});
