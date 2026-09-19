import {
  downloadExpenseImportTemplate,
  downloadMonthlyExpenseReport,
  useImportExpenses,
} from '@/hooks/useExpenseImport';
import { expenseKeys } from '@/hooks/useExpenses';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

global.fetch = vi.fn();

function createWrapper(queryClient: QueryClient) {
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

function newQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0 },
      mutations: { retry: false },
    },
  });
}

function csvFile(): File {
  return new File(['vendor,amount'], 'expenses.csv', { type: 'text/csv' });
}

const PARTIAL_SUMMARY = {
  importedCount: 8,
  failedCount: 2,
  totalRows: 10,
  errors: [{ rowNumber: 3, message: 'Missing vendor' }],
};

describe('useImportExpenses', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('uploads the file as multipart form data', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({ data: { ...PARTIAL_SUMMARY, failedCount: 0, errors: [] } }),
    });

    const { result } = renderHook(() => useImportExpenses(), {
      wrapper: createWrapper(newQueryClient()),
    });

    await result.current.mutateAsync({ file: csvFile() });

    const [url, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect(url).toBe('/api/expenses/import');
    expect(init.method).toBe('POST');
    expect(init.body).toBeInstanceOf(FormData);
    expect((init.body as FormData).get('file')).toBeInstanceOf(File);
  });

  it('treats a 207 partial import as success and returns the row errors', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: false,
      status: 207,
      json: async () => ({ data: PARTIAL_SUMMARY }),
    });

    const { result } = renderHook(() => useImportExpenses(), {
      wrapper: createWrapper(newQueryClient()),
    });

    const summary = await result.current.mutateAsync({ file: csvFile() });

    expect(summary.importedCount).toBe(8);
    expect(summary.errors).toHaveLength(1);
  });

  it('throws on a real failure status', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce(
      new Response(JSON.stringify({ error: 'Unsupported file type. Use XLSX or CSV.' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      })
    );

    const { result } = renderHook(() => useImportExpenses(), {
      wrapper: createWrapper(newQueryClient()),
    });

    await expect(result.current.mutateAsync({ file: csvFile() })).rejects.toThrow(
      'Unsupported file type. Use XLSX or CSV.'
    );
  });

  it('invalidates the expense cache after importing', async () => {
    const queryClient = newQueryClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries');

    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({ data: PARTIAL_SUMMARY }),
    });

    const { result } = renderHook(() => useImportExpenses(), {
      wrapper: createWrapper(queryClient),
    });

    await result.current.mutateAsync({ file: csvFile() });

    expect(invalidate).toHaveBeenCalledWith({ queryKey: expenseKeys.all });
  });

  it('includes the employee id when one is supplied', async () => {
    (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({ data: PARTIAL_SUMMARY }),
    });

    const { result } = renderHook(() => useImportExpenses(), {
      wrapper: createWrapper(newQueryClient()),
    });

    await result.current.mutateAsync({ file: csvFile(), employeeId: 'emp-1' });

    const [, init] = (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0] as [
      string,
      RequestInit,
    ];
    expect((init.body as FormData).get('employeeId')).toBe('emp-1');
  });
});

describe('download helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('opens the template endpoint for the requested format', () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);

    downloadExpenseImportTemplate('csv');

    expect(open).toHaveBeenCalledWith(
      '/api/expenses/template?format=csv',
      '_blank',
      'noopener,noreferrer'
    );
  });

  it('opens the monthly report without a month for the current period', () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);

    downloadMonthlyExpenseReport('pdf');

    expect(open).toHaveBeenCalledWith(
      '/api/expenses/reports/monthly?format=pdf',
      '_blank',
      'noopener,noreferrer'
    );
  });

  it('includes the month when one is requested', () => {
    const open = vi.spyOn(window, 'open').mockReturnValue(null);

    downloadMonthlyExpenseReport('pdf', '2026-08');

    expect(open).toHaveBeenCalledWith(
      '/api/expenses/reports/monthly?format=pdf&month=2026-08',
      '_blank',
      'noopener,noreferrer'
    );
  });
});
