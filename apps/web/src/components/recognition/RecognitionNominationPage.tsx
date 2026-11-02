'use client';

import {
  PageTitle,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@hr-portal/ui';
import { useEffect, useState } from 'react';

interface Nominee {
  userId: string;
  name: string;
  position?: string | null;
}
interface Nomination {
  id: string;
  nominee_user_id: string;
  category: string;
  result_summary: string;
  status: string;
  created_at: string;
}
interface Data {
  nominees: Nominee[];
  nominations: Nomination[];
  categories: Record<string, string>;
}

export function RecognitionNominationPage() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    nomineeUserId: '',
    category: 'impact_delivery',
    resultSummary: '',
    workPeriodStart: '',
    workPeriodEnd: '',
    evidenceUrl: '',
  });
  const load = async () => {
    const response = await fetch('/api/recognition');
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error ?? 'Failed to load recognition');
    setData(payload);
  };
  useEffect(() => {
    load().catch((caught) => setError(caught.message));
  }, []);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError('');
    try {
      const response = await fetch('/api/recognition', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Failed to submit nomination');
      setForm({
        nomineeUserId: '',
        category: 'impact_delivery',
        resultSummary: '',
        workPeriodStart: '',
        workPeriodEnd: '',
        evidenceUrl: '',
      });
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Failed to submit nomination');
    } finally {
      setSaving(false);
    }
  };
  const nameFor = (id: string) =>
    data?.nominees.find((person) => person.userId === id)?.name ?? 'Team member';
  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 sm:p-6">
      <header>
        <PageTitle>Community Recognition</PageTitle>
        <p className="mt-1 text-sm text-muted-foreground">
          Nominate a colleague for a specific, evidence-based contribution. HR reviews every
          nomination before anything is published.
        </p>
      </header>
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950/30 dark:text-red-200"
        >
          {error}
        </div>
      )}
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(280px,.8fr)]">
        <form onSubmit={submit} className="space-y-4 rounded-xl border bg-card p-5 shadow-sm">
          <div>
            <h2 className="font-semibold">Nominate a colleague</h2>
            <p className="text-sm text-muted-foreground">
              Self-nominations are not allowed. Include the result, not private client or employee
              information.
            </p>
          </div>
          <div className="text-sm font-medium">
            <label htmlFor="recognition-nominee">Colleague</label>
            <Select
              required
              value={form.nomineeUserId}
              onValueChange={(value) => setForm({ ...form, nomineeUserId: value })}
            >
              <SelectTrigger id="recognition-nominee" className="mt-1">
                <SelectValue placeholder="Select a colleague" />
              </SelectTrigger>
              <SelectContent>
                {data?.nominees.map((person) => (
                  <SelectItem key={person.userId} value={person.userId}>
                    {person.name}
                    {person.position ? ` — ${person.position}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="text-sm font-medium">
            <label htmlFor="recognition-category">Category</label>
            <Select
              value={form.category}
              onValueChange={(value) => setForm({ ...form, category: value })}
            >
              <SelectTrigger id="recognition-category" className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(data?.categories ?? {}).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium">
              From
              <input
                required
                type="date"
                value={form.workPeriodStart}
                onChange={(event) => setForm({ ...form, workPeriodStart: event.target.value })}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2"
              />
            </label>
            <label className="block text-sm font-medium">
              To
              <input
                required
                type="date"
                value={form.workPeriodEnd}
                onChange={(event) => setForm({ ...form, workPeriodEnd: event.target.value })}
                className="mt-1 w-full rounded-md border bg-background px-3 py-2"
              />
            </label>
          </div>
          <label className="block text-sm font-medium">
            Concrete result
            <textarea
              required
              minLength={10}
              maxLength={1000}
              rows={5}
              value={form.resultSummary}
              onChange={(event) => setForm({ ...form, resultSummary: event.target.value })}
              placeholder="What did they do, and what changed because of it?"
              className="mt-1 w-full rounded-md border bg-background px-3 py-2"
            />
          </label>
          <label className="block text-sm font-medium">
            Evidence link <span className="font-normal text-muted-foreground">(optional)</span>
            <input
              type="url"
              value={form.evidenceUrl}
              onChange={(event) => setForm({ ...form, evidenceUrl: event.target.value })}
              placeholder="https://…"
              className="mt-1 w-full rounded-md border bg-background px-3 py-2"
            />
          </label>
          <button
            type="submit"
            disabled={saving}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground disabled:opacity-60"
          >
            {saving ? 'Submitting…' : 'Submit nomination'}
          </button>
        </form>
        <section className="rounded-xl border bg-card p-5 shadow-sm">
          <h2 className="font-semibold">My recent nominations</h2>
          <div className="mt-4 space-y-3">
            {data?.nominations.length ? (
              data.nominations.map((item) => (
                <article key={item.id} className="rounded-lg border p-3">
                  <div className="flex items-start justify-between gap-2">
                    <strong className="text-sm">{nameFor(item.nominee_user_id)}</strong>
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize">
                      {item.status}
                    </span>
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{item.result_summary}</p>
                </article>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No nominations submitted yet.</p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
