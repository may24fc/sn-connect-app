import { PersonSearchSelect } from '@/components/people/PersonSearchSelect';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchMock = vi.fn();
global.fetch = fetchMock as unknown as typeof fetch;

function directoryResponse(entries: Array<{ user_id: string; full_name: string }>) {
  return {
    ok: true,
    json: async () => ({
      data: entries.map((entry) => ({
        ...entry,
        avatar_url: null,
        position: null,
        department_name: null,
        role: 'employee',
      })),
      pagination: { page: 1, pageSize: 25, total: entries.length, totalPages: 1 },
    }),
  };
}

function renderWithClient(ui: ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, gcTime: 0 } } });
  return render(<QueryClientProvider client={client}>{ui}</QueryClientProvider>);
}

describe('PersonSearchSelect', () => {
  beforeEach(() => {
    fetchMock.mockReset();
  });

  it('shows the saved person resolved by id', async () => {
    fetchMock.mockResolvedValue(directoryResponse([{ user_id: 'mgr-1', full_name: 'Ana Reyes' }]));

    renderWithClient(<PersonSearchSelect id="manager" value="mgr-1" onChange={vi.fn()} />);

    expect(await screen.findByText('Ana Reyes')).toBeTruthy();
    expect(String(fetchMock.mock.calls[0]?.[0])).toContain('user_ids=mgr-1');
  });

  it('does not query until opened when nothing is selected, then reports the chosen user', async () => {
    const onChange = vi.fn();
    fetchMock.mockResolvedValue(
      directoryResponse([
        { user_id: 'self', full_name: 'Self Person' },
        { user_id: 'mgr-2', full_name: 'Ben Cruz' },
      ])
    );

    renderWithClient(
      <PersonSearchSelect id="manager" value={null} onChange={onChange} excludeUserIds={['self']} />
    );

    expect(screen.getByText('Not assigned')).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: 'Choose' }));
    fireEvent.click(await screen.findByText('Ben Cruz'));

    expect(onChange).toHaveBeenCalledWith('mgr-2');
    // The person being edited is never offered as their own manager.
    await waitFor(() => expect(screen.queryByText('Self Person')).toBeNull());
  });
});
