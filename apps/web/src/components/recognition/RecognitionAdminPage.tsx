'use client';

import { PageTitle, tableHeadTextClassName, tableHeaderClassName } from '@hr-portal/ui';
import { useEffect, useMemo, useState } from 'react';

type Selection = {
  recipientUserId: string;
  category: string | null;
  publicReason: string;
  evidenceRefs: string[];
};
interface Workspace {
  period: {
    id: string;
    period_type: 'weekly' | 'monthly';
    period_start: string;
    period_end: string;
    status: string;
    public_intro: string | null;
  };
  selections: Array<{
    recipient_user_id: string;
    category: string | null;
    public_reason: string;
    evidence_refs: string[];
  }>;
  categories: Record<string, string>;
  evidence: Array<{
    id: string;
    source: string;
    userId: string;
    category: string;
    summary: string;
    person: { name: string } | null;
    recentlyRecognized: boolean;
    nominationStatus?: string;
  }>;
  people: Array<{ userId: string; name: string; position?: string | null }>;
  periods: Array<{
    id: string;
    period_type: string;
    period_start: string;
    period_end: string;
    status: string;
  }>;
}

export function RecognitionAdminPage() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [selections, setSelections] = useState<Selection[]>([]);
  const [intro, setIntro] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const load = async () => {
    const response = await fetch('/api/admin/recognition');
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error);
    setWorkspace(payload);
    setIntro(payload.period.public_intro ?? '');
    setSelections(
      payload.selections.map((item: Workspace['selections'][number]) => ({
        recipientUserId: item.recipient_user_id,
        category: item.category,
        publicReason: item.public_reason,
        evidenceRefs: item.evidence_refs ?? [],
      }))
    );
  };
  useEffect(() => {
    load().catch((caught) => setError(caught.message));
  }, []);
  const personMap = useMemo(
    () => new Map(workspace?.people.map((person) => [person.userId, person]) ?? []),
    [workspace]
  );
  const addEvidence = (item: Workspace['evidence'][number]) => {
    if (!workspace || workspace.period.status === 'published') return;
    if (workspace.period.period_type === 'monthly') {
      setSelections((current) => [
        ...current.filter((selection) => selection.category !== item.category),
        {
          recipientUserId: item.userId,
          category: item.category,
          publicReason: item.summary,
          evidenceRefs: [item.id],
        },
      ]);
    } else {
      setSelections((current) =>
        current.some((selection) => selection.recipientUserId === item.userId)
          ? current
          : [
              ...current,
              {
                recipientUserId: item.userId,
                category: null,
                publicReason: item.summary,
                evidenceRefs: [item.id],
              },
            ]
      );
    }
  };
  const save = async (action: 'save' | 'approve' | 'reject') => {
    if (!workspace) return;
    setBusy(action);
    setError('');
    try {
      const response = await fetch('/api/admin/recognition', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          periodId: workspace.period.id,
          action,
          publicIntro: intro,
          selections,
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Update failed');
    } finally {
      setBusy('');
    }
  };
  const publish = async () => {
    if (!workspace) return;
    setBusy('publish');
    setError('');
    try {
      const response = await fetch('/api/admin/recognition/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodId: workspace.period.id }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Publication failed');
    } finally {
      setBusy('');
    }
  };
  const reviewNomination = async (id: string, status: 'approved' | 'rejected') => {
    setBusy(id);
    setError('');
    try {
      const response = await fetch(
        `/api/admin/recognition/nominations/${id.slice('nomination:'.length)}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status }),
        }
      );
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Nomination review failed');
    } finally {
      setBusy('');
    }
  };
  if (!workspace)
    return (
      <div className="p-6 text-sm text-muted-foreground">
        {error || 'Loading recognition workspace…'}
      </div>
    );
  const locked = workspace.period.status === 'published';
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <PageTitle>Recognition Review</PageTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            {workspace.period.period_type === 'monthly'
              ? 'Monthly category awards'
              : 'Weekly Community Wins'}{' '}
            · {workspace.period.period_start} to {workspace.period.period_end}
          </p>
        </div>
        <span className="rounded-full border bg-card px-3 py-1 text-sm capitalize">
          {workspace.period.status}
        </span>
      </header>
      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950/30 dark:text-red-200"
        >
          {error}
        </div>
      )}
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="space-y-3">
          <div>
            <h2 className="font-semibold">Evidence pool</h2>
            <p className="text-sm text-muted-foreground">
              Positive evidence only. HR remains responsible for context, complexity, and fairness.
            </p>
          </div>
          {workspace.evidence.length ? (
            workspace.evidence.map((item) => (
              <article key={item.id} className="rounded-xl border bg-card p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <strong>{item.person?.name ?? 'Unknown team member'}</strong>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{item.source}</span>
                  {item.nominationStatus && (
                    <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize">
                      {item.nominationStatus}
                    </span>
                  )}
                  {item.recentlyRecognized && (
                    <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-900">
                      Recently recognized
                    </span>
                  )}
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{item.summary}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.source === 'Nomination' && item.nominationStatus === 'pending' && (
                    <>
                      <button
                        type="button"
                        disabled={!!busy}
                        onClick={() => reviewNomination(item.id, 'approved')}
                        className="rounded-md border px-3 py-1.5 text-sm"
                      >
                        Approve evidence
                      </button>
                      <button
                        type="button"
                        disabled={!!busy}
                        onClick={() => reviewNomination(item.id, 'rejected')}
                        className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700"
                      >
                        Reject evidence
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    disabled={locked || item.nominationStatus === 'pending'}
                    onClick={() => addEvidence(item)}
                    className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
                  >
                    Add to draft
                  </button>
                </div>
              </article>
            ))
          ) : (
            <div className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">
              No automatic evidence or nominations matched this period.
            </div>
          )}
        </section>
        <aside className="h-fit space-y-4 rounded-xl border bg-card p-5 shadow-sm xl:sticky xl:top-20">
          <div>
            <h2 className="font-semibold">Public draft</h2>
            <p className="text-sm text-muted-foreground">
              Only this edited copy will be sent to Telegram.
            </p>
          </div>
          <label className="block text-sm font-medium">
            Introduction
            <textarea
              disabled={locked}
              rows={3}
              value={intro}
              onChange={(event) => setIntro(event.target.value)}
              className="mt-1 w-full rounded-md border bg-background px-3 py-2 disabled:opacity-60"
            />
          </label>
          <div className="space-y-3">
            {selections.map((selection, index) => (
              <div
                key={`${selection.category}-${selection.recipientUserId}-${index}`}
                className="rounded-lg border p-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <strong className="text-sm">
                      {personMap.get(selection.recipientUserId)?.name ?? 'Team member'}
                    </strong>
                    {selection.category && (
                      <p className="text-xs text-muted-foreground">
                        {workspace.categories[selection.category]}
                      </p>
                    )}
                  </div>
                  {!locked && (
                    <button
                      type="button"
                      onClick={() =>
                        setSelections((current) =>
                          current.filter((_, itemIndex) => itemIndex !== index)
                        )
                      }
                      className="text-xs text-red-600"
                    >
                      Remove
                    </button>
                  )}
                </div>
                <textarea
                  disabled={locked}
                  rows={4}
                  value={selection.publicReason}
                  onChange={(event) =>
                    setSelections((current) =>
                      current.map((item, itemIndex) =>
                        itemIndex === index ? { ...item, publicReason: event.target.value } : item
                      )
                    )
                  }
                  className="mt-2 w-full rounded-md border bg-background px-2 py-2 text-sm disabled:opacity-60"
                />
              </div>
            ))}
            {!selections.length && (
              <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                Choose evidence to build the draft.
              </p>
            )}
          </div>
          {!locked && (
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                disabled={!!busy}
                onClick={() => save('save')}
                className="rounded-md border px-3 py-2 text-sm"
              >
                Save draft
              </button>
              <button
                type="button"
                disabled={!!busy}
                onClick={() => save('approve')}
                className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground"
              >
                Approve
              </button>
              <button
                type="button"
                disabled={!!busy}
                onClick={() => save('reject')}
                className="rounded-md border border-red-300 px-3 py-2 text-sm text-red-700"
              >
                Reject
              </button>
              {workspace.period.status === 'approved' && (
                <button
                  type="button"
                  disabled={!!busy}
                  onClick={publish}
                  className="rounded-md bg-emerald-700 px-3 py-2 text-sm text-white"
                >
                  Publish now
                </button>
              )}
            </div>
          )}
        </aside>
      </div>
      <section>
        <h2 className="font-semibold">Recent periods</h2>
        <div className="mt-3 overflow-x-auto rounded-xl border">
          <table className="w-full text-left text-sm">
            <thead className={`${tableHeaderClassName} ${tableHeadTextClassName}`}>
              <tr>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Period</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {workspace.periods.map((period) => (
                <tr key={period.id} className="border-t">
                  <td className="px-4 py-3 capitalize">{period.period_type}</td>
                  <td className="px-4 py-3">
                    {period.period_start} – {period.period_end}
                  </td>
                  <td className="px-4 py-3 capitalize">{period.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
