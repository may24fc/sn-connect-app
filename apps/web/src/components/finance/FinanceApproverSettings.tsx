'use client';

import { useEffect, useState } from 'react';

type Candidate = {
  id: string;
  role: string;
  employee?: { first_name?: string; last_name?: string } | null;
};
type ResponseData = {
  settings: { ceo_user_id: string | null; coo_user_id: string | null };
  candidates: Array<Candidate>;
};

export function FinanceApproverSettings() {
  const [data, setData] = useState<ResponseData | null>(null);
  const [ceo, setCeo] = useState('');
  const [coo, setCoo] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    void fetch('/api/finance/approvers')
      .then(async (response) => {
        if (!response.ok) throw new Error('Could not load interim owners');
        const payload = (await response.json()).data as ResponseData;
        setData(payload);
        setCeo(payload.settings.ceo_user_id ?? '');
        setCoo(payload.settings.coo_user_id ?? '');
      })
      .catch(() => setError('Could not load interim owners'));
  }, []);
  async function save() {
    setSaving(true);
    setError('');
    const response = await fetch('/api/finance/approvers', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ceoUserId: ceo, cooUserId: coo }),
    });
    setSaving(false);
    if (!response.ok) setError((await response.json()).error ?? 'Could not save approvers');
  }
  return (
    <section className="rounded-xl border bg-card p-4 text-sm">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="font-semibold">Interim review owners</h2>
        <span className="rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-900">
          Policy pending
        </span>
      </div>
      <p className="mb-3 text-muted-foreground">
        Finance still needs to confirm the amount-difference limits and the independent sign-off
        rule for Steven's personal expenses. These owners support the current review workflow until
        that policy is approved.
      </p>
      {error ? (
        <p role="alert" className="text-red-600">
          {error}
        </p>
      ) : null}
      {!data ? (
        <p className="text-muted-foreground">Loading interim owners…</p>
      ) : (
        <div className="flex flex-wrap items-end gap-3">
          <label>
            CEO reviewer
            <select
              className="ml-2 rounded border p-2"
              value={ceo}
              onChange={(event) => setCeo(event.target.value)}
            >
              <option value="">Select</option>
              {data.candidates.map((item) => (
                <option key={item.id} value={item.id}>
                  {[item.employee?.first_name, item.employee?.last_name]
                    .filter(Boolean)
                    .join(' ') || item.id}{' '}
                  · {item.role}
                </option>
              ))}
            </select>
          </label>
          <label>
            Independent reviewer
            <select
              className="ml-2 rounded border p-2"
              value={coo}
              onChange={(event) => setCoo(event.target.value)}
            >
              <option value="">Select</option>
              {data.candidates.map((item) => (
                <option key={item.id} value={item.id}>
                  {[item.employee?.first_name, item.employee?.last_name]
                    .filter(Boolean)
                    .join(' ') || item.id}{' '}
                  · {item.role}
                </option>
              ))}
            </select>
          </label>
          <button
            type="button"
            disabled={saving || !ceo || !coo || ceo === coo}
            onClick={() => void save()}
            className="rounded bg-teal-700 px-3 py-2 text-white disabled:opacity-50"
          >
            Save interim owners
          </button>
        </div>
      )}
    </section>
  );
}
