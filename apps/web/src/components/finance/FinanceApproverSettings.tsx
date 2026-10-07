'use client';

import { useEffect, useState } from 'react';

type Candidate = { id: string; role: string; employee?: { first_name?: string; last_name?: string } | null };
type ResponseData = { settings: { ceo_user_id: string | null; coo_user_id: string | null }; candidates: Candidate[] };

export function FinanceApproverSettings() {
  const [data, setData] = useState<ResponseData | null>(null);
  const [ceo, setCeo] = useState('');
  const [coo, setCoo] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  useEffect(() => { void fetch('/api/finance/approvers').then(async (response) => { if (response.ok) { const payload = (await response.json()).data as ResponseData; setData(payload); setCeo(payload.settings.ceo_user_id ?? ''); setCoo(payload.settings.coo_user_id ?? ''); } }); }, []);
  async function save() {
    setSaving(true); setError('');
    const response = await fetch('/api/finance/approvers', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ceoUserId: ceo, cooUserId: coo }) });
    setSaving(false);
    if (!response.ok) setError((await response.json()).error ?? 'Could not save approvers');
  }
  if (!data) return null;
  return <section className="rounded-xl border bg-card p-4 text-sm"><h2 className="font-semibold">Variance sign-off owners</h2><p className="mb-3 text-muted-foreground">Differences over 10% or AUD 100 stay pending until these owners are set. Steven’s own expenses route to the COO.</p>{error ? <p role="alert" className="text-red-600">{error}</p> : null}<div className="flex flex-wrap items-end gap-3"><label>Steven / CEO<select className="ml-2 rounded border p-2" value={ceo} onChange={(event) => setCeo(event.target.value)}><option value="">Select</option>{data.candidates.map((item) => <option key={item.id} value={item.id}>{[item.employee?.first_name, item.employee?.last_name].filter(Boolean).join(' ') || item.id} · {item.role}</option>)}</select></label><label>COO<select className="ml-2 rounded border p-2" value={coo} onChange={(event) => setCoo(event.target.value)}><option value="">Select</option>{data.candidates.map((item) => <option key={item.id} value={item.id}>{[item.employee?.first_name, item.employee?.last_name].filter(Boolean).join(' ') || item.id} · {item.role}</option>)}</select></label><button disabled={saving || !ceo || !coo || ceo === coo} onClick={() => void save()} className="rounded bg-teal-700 px-3 py-2 text-white disabled:opacity-50">Save approvers</button></div></section>;
}
