'use client';

import { useState } from 'react';

export function FinanceExpenseExport({ filters }: { filters: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function download() {
    setBusy(true);
    setError('');
    try {
      const response = await fetch(`/api/finance/expenses/export?${filters}`, {
        cache: 'no-store',
      });
      if (!response.ok) {
        const payload: { error?: string } = await response.json();
        setError(payload.error ?? 'Could not export expenses');
        return;
      }
      const url = URL.createObjectURL(await response.blob());
      const link = document.createElement('a');
      link.href = url;
      link.download = `finance-expenses-${new URLSearchParams(filters).get('month') || 'all'}.csv`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setError('Could not download expense export. Try again.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={busy}
        onClick={() => void download()}
        className="rounded-lg border bg-card px-3 py-2 text-sm font-semibold disabled:opacity-50"
      >
        {busy ? 'Exporting…' : 'Export CSV'}
      </button>
      {error ? (
        <span role="alert" className="text-xs text-red-700">
          {error}
        </span>
      ) : null}
    </span>
  );
}
