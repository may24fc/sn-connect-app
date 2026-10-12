import { FinancePaymentWorkspace } from '@/components/finance/FinancePaymentWorkspace';
import { useApproveInvoice, useInvoices } from '@/hooks/useInvoices';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/useInvoices', () => ({ useInvoices: vi.fn(), useApproveInvoice: vi.fn() }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

describe('Finance staff payment amount privacy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useInvoices).mockReturnValue({
      data: {
        data: [
          {
            id: '1',
            invoice_number: 'SN-001',
            status: 'approved',
            net_amount: 100,
            source_currency: 'AUD',
            period_start: '2026-06-01',
            period_end: '2026-06-30',
            employees: { first_name: 'Pat', last_name: 'Lee' },
          },
        ],
        pagination: { page: 1, pageSize: 25, total: 1, totalPages: 1 },
      },
      isLoading: false,
      error: null,
    } as never);
    vi.mocked(useApproveInvoice).mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    } as never);
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({
          data: {
            ready: [
              {
                id: '1',
                invoice_number: 'SN-001',
                net_amount: 100,
                source_currency: 'AUD',
                target_currency: 'AUD',
                eligible: false,
              },
            ],
            batches: [],
            canResolveExceptions: false,
            unresolvedExceptions: [],
          },
        }),
      }))
    );
  });

  it('masks invoice and Wise queue values with the same control', async () => {
    render(<FinancePaymentWorkspace queueKey="1" />);
    await waitFor(() => expect(screen.getByText('100.00')).toBeInTheDocument());
    expect(screen.getByText('$100.00')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Hide amounts' }));
    expect(screen.queryByText('100.00')).not.toBeInTheDocument();
    expect(screen.queryByText('$100.00')).not.toBeInTheDocument();
    expect(screen.getAllByText('••••')).toHaveLength(2);
    vi.unstubAllGlobals();
  });
});
