import { FinancePropertiesPanel } from '@/components/finance/FinancePropertiesPanel';
import type { PropertyRegister } from '@/lib/finance/properties';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));

const property = {
  id: '123e4567-e89b-42d3-a456-426614174000',
  name: 'Test property',
  property_type: 'Residential',
  tenant_name: 'Test tenant',
  occupancy: 'occupied' as const,
  weekly_rent_aud: 300,
  due_day: 10,
  created_by: 'u',
  created_at: '',
};
const payment = {
  id: '223e4567-e89b-42d3-a456-426614174000',
  property_id: property.id,
  period_month: '2026-06-01',
  received_on: '2026-06-09',
  amount_aud: 100,
  reference: null,
  voided_at: null,
  void_reason: null,
  created_by: 'u',
  created_at: '',
};
const job = {
  id: '323e4567-e89b-42d3-a456-426614174000',
  property_id: property.id,
  job_date: '2026-06-08',
  description: 'Test repair',
  contractor: null,
  cost_aud: 80,
  invoice_reference: null,
  status: 'scheduled' as const,
  created_by: 'u',
  created_at: '',
};
const register: PropertyRegister = {
  properties: [property],
  payments: [payment],
  maintenance: [job],
  statusEvents: [],
};
const json = (data: unknown) =>
  new Response(JSON.stringify({ data }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

describe('Finance Properties corrections', () => {
  afterEach(() => vi.unstubAllGlobals());

  // Radix menus open from the keyboard in jsdom; pointer events are not fully emulated.
  async function openRowMenu(name: RegExp) {
    fireEvent.keyDown(await screen.findByRole('button', { name }), { key: 'Enter' });
    await screen.findByRole('menu');
  }

  it('updates totals only after the server confirms a payment void, retaining its audit reason', async () => {
    const corrected = {
      ...register,
      payments: [{ ...payment, voided_at: '2026-06-12T00:00:00Z', void_reason: 'Duplicate entry' }],
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json(register))
      .mockResolvedValueOnce(json({ id: payment.id, kind: 'rent_void' }))
      .mockResolvedValueOnce(json(corrected));
    vi.stubGlobal('fetch', fetchMock);
    render(<FinancePropertiesPanel month="2026-06" />);
    await screen.findByRole('button', { name: /Actions for rent received/ });
    expect(screen.getByRole('region', { name: 'Property highlights' })).toHaveTextContent(
      '$100.00'
    );
    await openRowMenu(/Actions for rent received/);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Void mistaken entry' }));
    fireEvent.change(screen.getByRole('textbox', { name: /Reason for correction/ }), {
      target: { value: 'Duplicate entry' },
    });
    expect(screen.getByRole('region', { name: 'Property highlights' })).toHaveTextContent(
      '$100.00'
    );
    fireEvent.click(screen.getByRole('button', { name: 'Confirm correction' }));
    await waitFor(() =>
      expect(screen.getByText(/Voided \d{1,2} Jun\w* 2026: Duplicate entry/)).toBeInTheDocument()
    );
    expect(screen.getByRole('region', { name: 'Property highlights' })).not.toHaveTextContent(
      '$100.00'
    );
    expect(fetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/finance/properties/corrections',
      expect.objectContaining({ method: 'PATCH' })
    );
  });

  it('shows recorded maintenance status changes and their history', async () => {
    const updated: PropertyRegister = {
      ...register,
      maintenance: [{ ...job, status: 'paid' }],
      statusEvents: [
        {
          id: 'event',
          maintenance_id: job.id,
          previous_status: 'scheduled',
          next_status: 'paid',
          changed_at: '2026-06-12T00:00:00Z',
          changed_by: 'u',
        },
      ],
    };
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(json(register))
      .mockResolvedValueOnce(json({ id: job.id, kind: 'maintenance_status' }))
      .mockResolvedValueOnce(json(updated));
    vi.stubGlobal('fetch', fetchMock);
    render(<FinancePropertiesPanel month="2026-06" />);
    fireEvent.click(await screen.findByRole('tab', { name: 'Maintenance' }));
    await openRowMenu(/Actions for /);
    fireEvent.click(screen.getByRole('menuitem', { name: 'Update status' }));
    const statusSelect = document.querySelector<HTMLSelectElement>('select[name="status"]');
    if (!statusSelect) throw new Error('Status select not rendered');
    fireEvent.change(statusSelect, { target: { value: 'paid' } });
    fireEvent.click(screen.getByRole('button', { name: 'Confirm correction' }));
    await waitFor(() => expect(screen.getByText('Status history')).toBeInTheDocument());
    expect(screen.getByText(/scheduled → paid/)).toBeInTheDocument();
  });
});
