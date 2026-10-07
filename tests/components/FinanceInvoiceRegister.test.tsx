import { FinanceInvoiceRegister } from '@/components/finance/FinanceInvoiceRegister';
import { useApproveInvoice, useInvoices } from '@/hooks/useInvoices';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/useInvoices', () => ({ useInvoices: vi.fn(), useApproveInvoice: vi.fn() }));
const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh }) }));

describe('Finance invoice register', () => {
  const mutateAsync = vi.fn(async () => ({}));
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useInvoices).mockReturnValue({
      data: {
        data: [
          {
            id: 'invoice-1',
            invoice_number: 'SN-001',
            status: 'submitted',
            net_amount: 100,
            source_currency: 'PHP',
            period_start: '2026-06-01',
            period_end: '2026-06-15',
            employees: { first_name: 'Pat', last_name: 'Lee' },
          },
        ],
        pagination: { page: 1, pageSize: 25, total: 1, totalPages: 1 },
      },
      isLoading: false,
      error: null,
    } as never);
    vi.mocked(useApproveInvoice).mockReturnValue({ mutateAsync, isPending: false } as never);
  });

  it('keeps approval server-confirmed and refreshes status counts after the mutation', async () => {
    render(<FinanceInvoiceRegister />);
    expect(screen.getByText('SN-001')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Review' }));
    expect(mutateAsync).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Approve invoice' }));
    await waitFor(() =>
      expect(mutateAsync).toHaveBeenCalledWith({
        id: 'invoice-1',
        payload: { action: 'approved', notes: null },
      })
    );
    await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
  });

  it('requires a rejection reason and surfaces failed decisions', async () => {
    mutateAsync.mockRejectedValueOnce(new Error('Approval failed'));
    render(<FinanceInvoiceRegister />);
    fireEvent.click(screen.getByRole('button', { name: 'Review' }));
    fireEvent.click(screen.getByRole('button', { name: 'Reject invoice' }));
    expect(screen.getByRole('alert')).toHaveTextContent('Add a reason');
    expect(mutateAsync).not.toHaveBeenCalled();
    fireEvent.change(screen.getByRole('textbox', { name: 'Decision notes' }), {
      target: { value: 'Incorrect hours' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Reject invoice' }));
    await waitFor(() => expect(screen.getByRole('alert')).toHaveTextContent('Approval failed'));
    expect(refresh).not.toHaveBeenCalled();
  });
});
