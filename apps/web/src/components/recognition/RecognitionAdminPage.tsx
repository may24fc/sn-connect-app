'use client';

import { PageTitle, tableHeadTextClassName, tableHeaderClassName } from '@hr-portal/ui';
import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

type PeriodType = 'weekly' | 'monthly';
type WorkspaceView = PeriodType | 'history';
type Selection = {
  recipientUserId: string;
  category: string | null;
  publicReason: string;
  evidenceRefs: Array<string>;
};
type Period = {
  id: string;
  period_type: PeriodType;
  period_start: string;
  period_end: string;
  status: string;
  public_intro: string | null;
  reviewed_at?: string | null;
  published_at?: string | null;
  telegram_message_id?: number | null;
  last_error?: string | null;
};
type Evidence = {
  id: string;
  source: string;
  userId: string;
  category: string;
  summary: string;
  occurredAt?: string | null;
  evidenceUrl?: string | null;
  person: { name: string } | null;
  recentlyRecognized: boolean;
  nominationStatus?: string;
};
interface Workspace {
  period: Period;
  selections: Array<{
    recipient_user_id: string;
    category: string | null;
    public_reason: string;
    evidence_refs: Array<string>;
  }>;
  categories: Record<string, string>;
  evidence: Array<Evidence>;
  people: Array<{ userId: string; name: string; position?: string | null }>;
  periods: Array<Period>;
}

const categoryOrder = ['impact_delivery', 'accountability_timeliness', 'collaboration_initiative'];

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-AU', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${value.slice(0, 10)}T00:00:00Z`));
}

function formatDateTime(value?: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Asia/Manila',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function statusTone(status: string) {
  if (status === 'published') return 'border-emerald-300 bg-emerald-50 text-emerald-800';
  if (status === 'approved') return 'border-blue-300 bg-blue-50 text-blue-800';
  if (status === 'rejected' || status === 'failed') return 'border-red-300 bg-red-50 text-red-800';
  return 'border-border bg-card text-foreground';
}

// biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Coordinates the server-confirmed workflow and its mutually exclusive views.
export function RecognitionAdminPage() {
  const [workspace, setWorkspace] = useState<Workspace | null>(null);
  const [view, setView] = useState<WorkspaceView>('weekly');
  const [selections, setSelections] = useState<Array<Selection>>([]);
  const [intro, setIntro] = useState('');
  const [busy, setBusy] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [dirty, setDirty] = useState(false);
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [evidenceFilter, setEvidenceFilter] = useState('all');

  const load = useCallback(async (periodId?: string) => {
    setLoading(true);
    setError('');
    try {
      const query = periodId ? `?periodId=${encodeURIComponent(periodId)}` : '';
      const response = await fetch(`/api/admin/recognition${query}`);
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
      setDirty(false);
      return payload as Workspace;
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Failed to load recognition workspace');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load().then((payload) => payload && setView(payload.period.period_type));
  }, [load]);

  const personMap = useMemo(
    () => new Map(workspace?.people.map((person) => [person.userId, person]) ?? []),
    [workspace]
  );
  const selectedEvidenceIds = useMemo(
    () => new Set(selections.flatMap((selection) => selection.evidenceRefs)),
    [selections]
  );
  const sources = useMemo(
    () => Array.from(new Set(workspace?.evidence.map((item) => item.source) ?? [])).sort(),
    [workspace]
  );
  const filteredEvidence = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    return (workspace?.evidence ?? []).filter((item) => {
      const matchesSearch =
        !normalizedSearch ||
        item.person?.name.toLowerCase().includes(normalizedSearch) ||
        item.summary.toLowerCase().includes(normalizedSearch);
      const matchesSource = sourceFilter === 'all' || item.source === sourceFilter;
      const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
      const isSelected = selectedEvidenceIds.has(item.id);
      const matchesStatus =
        evidenceFilter === 'all' ||
        (evidenceFilter === 'pending' && item.nominationStatus === 'pending') ||
        (evidenceFilter === 'selected' && isSelected) ||
        (evidenceFilter === 'available' && !isSelected && item.nominationStatus !== 'pending');
      return matchesSearch && matchesSource && matchesCategory && matchesStatus;
    });
  }, [workspace, search, sourceFilter, categoryFilter, evidenceFilter, selectedEvidenceIds]);

  const activePeriods = useMemo(
    () =>
      view === 'history'
        ? []
        : (workspace?.periods.filter((period) => period.period_type === view) ?? []),
    [workspace, view]
  );
  const displayedPeriodMatchesView = view !== 'history' && workspace?.period.period_type === view;
  const pendingNominations =
    workspace?.evidence.filter((item) => item.nominationStatus === 'pending').length ?? 0;
  const locked =
    workspace?.period.status === 'approved' || workspace?.period.status === 'published';
  const published = workspace?.period.status === 'published';

  const openPeriod = async (periodId: string, periodType: PeriodType) => {
    if (dirty && !window.confirm('Discard unsaved recognition draft changes?')) return;
    setView(periodType);
    setNotice('');
    await load(periodId);
  };

  const changeView = async (nextView: WorkspaceView) => {
    if (nextView === view) return;
    if (dirty && !window.confirm('Discard unsaved recognition draft changes?')) return;
    setNotice('');
    setView(nextView);
    if (nextView === 'history' || !workspace) return;
    const latest = workspace.periods.find((period) => period.period_type === nextView);
    if (latest) await load(latest.id);
  };

  const addEvidence = (item: Evidence) => {
    if (!workspace || locked || item.nominationStatus === 'pending') return;
    if (workspace.period.period_type === 'monthly') {
      const existing = selections.find((selection) => selection.category === item.category);
      if (existing && existing.recipientUserId !== item.userId) {
        const categoryName = workspace.categories[item.category] ?? item.category;
        if (!window.confirm(`Replace the current ${categoryName} recipient?`)) return;
      }
      setSelections((current) => [
        ...current.filter((selection) => selection.category !== item.category),
        {
          recipientUserId: item.userId,
          category: item.category,
          publicReason:
            existing?.recipientUserId === item.userId ? existing.publicReason : item.summary,
          evidenceRefs:
            existing?.recipientUserId === item.userId
              ? Array.from(new Set([...existing.evidenceRefs, item.id]))
              : [item.id],
        },
      ]);
    } else {
      setSelections((current) => {
        const existing = current.find((selection) => selection.recipientUserId === item.userId);
        if (!existing)
          return [
            ...current,
            {
              recipientUserId: item.userId,
              category: null,
              publicReason: item.summary,
              evidenceRefs: [item.id],
            },
          ];
        return current.map((selection) =>
          selection.recipientUserId === item.userId
            ? {
                ...selection,
                evidenceRefs: Array.from(new Set([...selection.evidenceRefs, item.id])),
              }
            : selection
        );
      });
    }
    setDirty(true);
  };

  // biome-ignore lint/complexity/noExcessiveCognitiveComplexity: Keeps the three auditable server-confirmed transitions in one request path.
  const save = async (action: 'save' | 'approve' | 'reject') => {
    if (!workspace) return;
    if (action === 'reject' && !window.confirm('Reject this recognition period draft?')) return;
    setBusy(action);
    setError('');
    setNotice('');
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
      await load(workspace.period.id);
      setNotice(
        action === 'approve'
          ? 'Draft approved. It is now locked and ready for publication.'
          : action === 'reject'
            ? 'Draft rejected.'
            : workspace.period.status === 'approved'
              ? 'Draft reopened for editing.'
              : 'Draft saved.'
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Update failed');
    } finally {
      setBusy('');
    }
  };

  const publish = async () => {
    if (!workspace) return;
    if (!window.confirm('Publish this approved recognition to Community Highlights now?')) return;
    setBusy('publish');
    setError('');
    setNotice('');
    try {
      const response = await fetch('/api/admin/recognition/publish', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ periodId: workspace.period.id }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error);
      await load(workspace.period.id);
      setNotice('Recognition published to Community Highlights.');
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Publication failed');
    } finally {
      setBusy('');
    }
  };

  const reviewNomination = async (id: string, status: 'approved' | 'rejected') => {
    if (status === 'rejected' && !window.confirm('Reject this nomination evidence?')) return;
    setBusy(id);
    setError('');
    setNotice('');
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
      await load(workspace?.period.id);
      setNotice(`Nomination ${status}.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Nomination review failed');
    } finally {
      setBusy('');
    }
  };

  const preview = useMemo(() => {
    if (!workspace) return '';
    const heading =
      workspace.period.period_type === 'monthly'
        ? '🏆 Monthly Community Awards'
        : '🌟 Weekly Community Wins';
    const lines = [
      heading,
      `${workspace.period.period_start} to ${workspace.period.period_end}`,
      '',
      intro,
      '',
    ];
    for (const selection of selections) {
      const category = selection.category
        ? `${workspace.categories[selection.category] ?? selection.category} — `
        : '';
      lines.push(
        `${category}${personMap.get(selection.recipientUserId)?.name ?? 'Team member'}`,
        selection.publicReason,
        ''
      );
    }
    return lines.join('\n').trim();
  }, [workspace, intro, selections, personMap]);

  if (!workspace)
    return (
      <div className="p-6 text-sm text-muted-foreground">
        {error || 'Loading recognition workspace…'}
      </div>
    );

  const monthlyMissing = categoryOrder.filter(
    (category) => !selections.some((selection) => selection.category === category)
  ).length;

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <PageTitle>Recognition Review</PageTitle>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Review positive evidence, prepare public wording, and control what reaches Community
            Highlights.
          </p>
        </div>
        {displayedPeriodMatchesView && (
          <span
            className={`rounded-full border px-3 py-1 text-sm font-medium capitalize ${statusTone(workspace.period.status)}`}
          >
            {workspace.period.status}
          </span>
        )}
      </header>

      <nav className="flex overflow-x-auto border-b" aria-label="Recognition views">
        {(['weekly', 'monthly', 'history'] as Array<WorkspaceView>).map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => changeView(item)}
            className={`whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium capitalize ${
              view === item
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {item === 'weekly' ? 'Weekly Wins' : item === 'monthly' ? 'Monthly Awards' : 'History'}
            {item === 'monthly' && monthlyMissing > 0 && workspace.period.period_type === 'monthly'
              ? ` · ${monthlyMissing} missing`
              : ''}
          </button>
        ))}
      </nav>

      {error && (
        <div
          role="alert"
          className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800 dark:bg-red-950/30 dark:text-red-200"
        >
          {error}
        </div>
      )}
      {notice && (
        <output className="rounded-lg border border-emerald-300 bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200">
          {notice}
        </output>
      )}

      {view === 'history' ? (
        <HistoryTable periods={workspace.periods} onOpen={openPeriod} />
      ) : !displayedPeriodMatchesView ? (
        <section className="rounded-xl border border-dashed p-8 text-center">
          <h2 className="font-semibold">
            No {view === 'monthly' ? 'monthly awards' : 'weekly wins'} period yet
          </h2>
          <p className="mx-auto mt-2 max-w-xl text-sm text-muted-foreground">
            {view === 'monthly'
              ? 'Monthly Awards open on the first Monday after a calendar month closes. The latest period will appear here automatically.'
              : 'The next weekly review period will appear after its Monday generation.'}
          </p>
        </section>
      ) : (
        <>
          <PeriodSummary
            workspace={workspace}
            activePeriods={activePeriods}
            view={view}
            selections={selections}
            pendingNominations={pendingNominations}
            published={published}
            onOpen={openPeriod}
          />
          {workspace.period.last_error && (
            <div className="rounded-lg border border-red-300 bg-red-50 p-3 text-sm text-red-800">
              Last publication error: {workspace.period.last_error}
            </div>
          )}
          <div
            className={`grid gap-6 xl:grid-cols-[minmax(0,1fr)_420px] ${loading ? 'opacity-70' : ''}`}
          >
            <EvidencePool
              workspace={workspace}
              evidence={filteredEvidence}
              selections={selections}
              selectedEvidenceIds={selectedEvidenceIds}
              sources={sources}
              search={search}
              sourceFilter={sourceFilter}
              categoryFilter={categoryFilter}
              evidenceFilter={evidenceFilter}
              busy={busy}
              locked={locked}
              onSearch={setSearch}
              onSourceFilter={setSourceFilter}
              onCategoryFilter={setCategoryFilter}
              onEvidenceFilter={setEvidenceFilter}
              onAdd={addEvidence}
              onReviewNomination={reviewNomination}
            />
            <DraftPanel
              workspace={workspace}
              selections={selections}
              intro={intro}
              preview={preview}
              personMap={personMap}
              busy={busy}
              dirty={dirty}
              locked={locked}
              onIntro={(value) => {
                setIntro(value);
                setDirty(true);
              }}
              onSelections={(value) => {
                setSelections(value);
                setDirty(true);
              }}
              onSave={save}
              onPublish={publish}
            />
          </div>
        </>
      )}
    </div>
  );
}

function HistoryTable({
  periods,
  onOpen,
}: {
  periods: Array<Period>;
  onOpen: (id: string, type: PeriodType) => void;
}) {
  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-semibold">Recognition history</h2>
        <p className="text-sm text-muted-foreground">
          Open any period to review its recipients, evidence, approval, and publication state.
        </p>
      </div>
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full text-left text-sm">
          <thead className={`${tableHeaderClassName} ${tableHeadTextClassName}`}>
            <tr>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Period</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Published</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {periods.map((period) => (
              <tr key={period.id} className="border-t">
                <td className="px-4 py-3 capitalize">{period.period_type}</td>
                <td className="px-4 py-3">
                  {formatDate(period.period_start)} – {formatDate(period.period_end)}
                </td>
                <td className="px-4 py-3 capitalize">{period.status}</td>
                <td className="px-4 py-3">{formatDateTime(period.published_at) ?? '—'}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    type="button"
                    onClick={() => onOpen(period.id, period.period_type)}
                    className="rounded-md border px-3 py-1.5 font-medium hover:bg-muted"
                  >
                    Open
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function PeriodSummary({
  workspace,
  activePeriods,
  view,
  selections,
  pendingNominations,
  published,
  onOpen,
}: {
  workspace: Workspace;
  activePeriods: Array<Period>;
  view: PeriodType;
  selections: Array<Selection>;
  pendingNominations: number;
  published: boolean;
  onOpen: (id: string, type: PeriodType) => void;
}) {
  return (
    <section className="grid gap-3 rounded-xl border bg-card p-4 sm:grid-cols-2 xl:grid-cols-5">
      <div className="sm:col-span-2 xl:col-span-1">
        <label htmlFor="recognition-period" className="text-xs font-medium text-muted-foreground">
          Review period
        </label>
        <select
          id="recognition-period"
          value={workspace.period.id}
          onChange={(event) => onOpen(event.target.value, view)}
          className="mt-1 h-10 w-full rounded-md border bg-background px-3 text-sm"
        >
          {activePeriods.map((period) => (
            <option key={period.id} value={period.id}>
              {formatDate(period.period_start)} – {formatDate(period.period_end)}
            </option>
          ))}
        </select>
      </div>
      <SummaryValue label="Evidence" value={workspace.evidence.length} />
      <SummaryValue label="Pending nominations" value={pendingNominations} />
      <SummaryValue label="Selected recipients" value={selections.length} />
      <div>
        <p className="text-xs font-medium text-muted-foreground">Publication</p>
        <p className="mt-1 text-sm font-medium">
          {published ? formatDateTime(workspace.period.published_at) : 'Monday · 4:30 PM Manila'}
        </p>
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1 border-t pt-3 text-xs text-muted-foreground sm:col-span-2 xl:col-span-5">
        <span>
          Evidence window: {formatDate(workspace.period.period_start)} –{' '}
          {formatDate(workspace.period.period_end)}
        </span>
        {workspace.period.reviewed_at && (
          <span>Reviewed: {formatDateTime(workspace.period.reviewed_at)}</span>
        )}
        {workspace.period.telegram_message_id && (
          <span>Telegram message ID: {workspace.period.telegram_message_id}</span>
        )}
      </div>
    </section>
  );
}

function SummaryValue({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-semibold">{value}</p>
    </div>
  );
}

function EvidencePool({
  workspace,
  evidence,
  selections,
  selectedEvidenceIds,
  sources,
  search,
  sourceFilter,
  categoryFilter,
  evidenceFilter,
  busy,
  locked,
  onSearch,
  onSourceFilter,
  onCategoryFilter,
  onEvidenceFilter,
  onAdd,
  onReviewNomination,
}: {
  workspace: Workspace;
  evidence: Array<Evidence>;
  selections: Array<Selection>;
  selectedEvidenceIds: Set<string>;
  sources: Array<string>;
  search: string;
  sourceFilter: string;
  categoryFilter: string;
  evidenceFilter: string;
  busy: string;
  locked: boolean;
  onSearch: (value: string) => void;
  onSourceFilter: (value: string) => void;
  onCategoryFilter: (value: string) => void;
  onEvidenceFilter: (value: string) => void;
  onAdd: (item: Evidence) => void;
  onReviewNomination: (id: string, status: 'approved' | 'rejected') => void;
}) {
  return (
    <section className="min-w-0 space-y-3">
      <div>
        <h2 className="font-semibold">Evidence pool</h2>
        <p className="text-sm text-muted-foreground">
          Positive evidence only. HR remains responsible for context, complexity, and fairness.
        </p>
      </div>
      <div className="rounded-xl border bg-muted/20">
        <div className="grid gap-2 border-b bg-card p-3 sm:grid-cols-2 xl:grid-cols-4">
          <input
            type="search"
            value={search}
            onChange={(event) => onSearch(event.target.value)}
            placeholder="Search employee or evidence"
            aria-label="Search evidence"
            className="h-10 w-full rounded-md border bg-background px-3 text-sm sm:col-span-2 xl:col-span-1"
          />
          <FilterSelect label="Evidence source" value={sourceFilter} onChange={onSourceFilter}>
            <option value="all">All sources</option>
            {sources.map((source) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect
            label="Evidence category"
            value={categoryFilter}
            onChange={onCategoryFilter}
          >
            <option value="all">All categories</option>
            {categoryOrder.map((category) => (
              <option key={category} value={category}>
                {workspace.categories[category]}
              </option>
            ))}
          </FilterSelect>
          <FilterSelect label="Evidence status" value={evidenceFilter} onChange={onEvidenceFilter}>
            <option value="all">All evidence</option>
            <option value="available">Available</option>
            <option value="selected">Added to draft</option>
            <option value="pending">Pending nominations</option>
          </FilterSelect>
        </div>
        <div className="border-b px-3 py-2 text-xs text-muted-foreground">
          Showing {evidence.length} of {workspace.evidence.length} evidence items
        </div>
        <div
          data-testid="evidence-scroll-region"
          className="space-y-3 p-3 xl:max-h-[calc(100vh-23rem)] xl:overflow-y-auto"
        >
          {evidence.length ? (
            evidence.map((item) => {
              const isSelected = selectedEvidenceIds.has(item.id);
              const categorySelection = selections.find(
                (selection) => selection.category === item.category
              );
              const willReplace =
                workspace.period.period_type === 'monthly' &&
                categorySelection &&
                categorySelection.recipientUserId !== item.userId;
              return (
                <article key={item.id} className="rounded-xl border bg-card p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <strong>{item.person?.name ?? 'Unknown team member'}</strong>
                    <Pill>{item.source}</Pill>
                    <Pill>{workspace.categories[item.category] ?? item.category}</Pill>
                    {item.nominationStatus && <Pill>{item.nominationStatus}</Pill>}
                    {item.recentlyRecognized && (
                      <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-900">
                        Recently recognized
                      </span>
                    )}
                    {isSelected && (
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-900">
                        Added to draft
                      </span>
                    )}
                  </div>
                  <p className="mt-2 text-sm text-muted-foreground">{item.summary}</p>
                  <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                    {item.occurredAt && <span>{formatDate(item.occurredAt)}</span>}
                    {item.evidenceUrl && (
                      <a
                        href={item.evidenceUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="font-medium text-primary underline-offset-4 hover:underline"
                      >
                        Open supporting evidence
                      </a>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.source === 'Nomination' && item.nominationStatus === 'pending' && (
                      <>
                        <button
                          type="button"
                          disabled={!!busy || locked}
                          onClick={() => onReviewNomination(item.id, 'approved')}
                          className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
                        >
                          Approve evidence
                        </button>
                        <button
                          type="button"
                          disabled={!!busy || locked}
                          onClick={() => onReviewNomination(item.id, 'rejected')}
                          className="rounded-md border border-red-300 px-3 py-1.5 text-sm text-red-700 disabled:opacity-50"
                        >
                          Reject evidence
                        </button>
                      </>
                    )}
                    <button
                      type="button"
                      disabled={locked || isSelected || item.nominationStatus === 'pending'}
                      onClick={() => onAdd(item)}
                      className="rounded-md border px-3 py-1.5 text-sm hover:bg-muted disabled:opacity-50"
                    >
                      {isSelected
                        ? 'Added to draft'
                        : willReplace
                          ? 'Replace category recipient'
                          : 'Add to draft'}
                    </button>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="rounded-xl border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
              No evidence matches these filters.
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  children: ReactNode;
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-10 rounded-md border bg-background px-3 text-sm"
    >
      {children}
    </select>
  );
}

function Pill({ children }: { children: ReactNode }) {
  return <span className="rounded-full bg-muted px-2 py-0.5 text-xs capitalize">{children}</span>;
}

function DraftPanel({
  workspace,
  selections,
  intro,
  preview,
  personMap,
  busy,
  dirty,
  locked,
  onIntro,
  onSelections,
  onSave,
  onPublish,
}: {
  workspace: Workspace;
  selections: Array<Selection>;
  intro: string;
  preview: string;
  personMap: Map<string, { userId: string; name: string; position?: string | null }>;
  busy: string;
  dirty: boolean;
  locked: boolean;
  onIntro: (value: string) => void;
  onSelections: (value: Array<Selection>) => void;
  onSave: (action: 'save' | 'approve' | 'reject') => void;
  onPublish: () => void;
}) {
  const rows =
    workspace.period.period_type === 'monthly'
      ? categoryOrder.map((category) => ({
          category,
          selection: selections.find((item) => item.category === category) ?? null,
        }))
      : selections.map((selection) => ({ category: null, selection }));
  return (
    <aside className="h-fit space-y-4 rounded-xl border bg-card p-5 shadow-sm xl:sticky xl:top-20">
      <div>
        <h2 className="font-semibold">Public draft</h2>
        <p className="text-sm text-muted-foreground">
          Only the approved copy below will be sent to Telegram.
        </p>
      </div>
      {workspace.period.status === 'approved' && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-900">
          This approved draft is locked. Reopen it before making changes.
        </div>
      )}
      <label className="block text-sm font-medium">
        Introduction
        <textarea
          disabled={locked}
          rows={3}
          value={intro}
          onChange={(event) => onIntro(event.target.value)}
          className="mt-1 w-full rounded-md border bg-background px-3 py-2 disabled:opacity-60"
        />
      </label>
      <div className="space-y-3">
        {rows.map(({ category, selection }, rowIndex) => {
          if (!selection && category)
            return (
              <div key={category} className="rounded-lg border border-dashed p-3">
                <p className="text-sm font-medium">{workspace.categories[category]}</p>
                <p className="mt-1 text-sm text-muted-foreground">No recipient selected.</p>
              </div>
            );
          if (!selection) return null;
          const selectionIndex = selections.indexOf(selection);
          return (
            <div
              key={`${selection.category}-${selection.recipientUserId}-${rowIndex}`}
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
                  <p className="mt-1 text-xs text-muted-foreground">
                    {selection.evidenceRefs.length} evidence item
                    {selection.evidenceRefs.length === 1 ? '' : 's'}
                  </p>
                </div>
                {!locked && (
                  <button
                    type="button"
                    onClick={() =>
                      onSelections(
                        selections.filter((_, itemIndex) => itemIndex !== selectionIndex)
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
                  onSelections(
                    selections.map((item, itemIndex) =>
                      itemIndex === selectionIndex
                        ? { ...item, publicReason: event.target.value }
                        : item
                    )
                  )
                }
                className="mt-2 w-full rounded-md border bg-background px-2 py-2 text-sm disabled:opacity-60"
              />
            </div>
          );
        })}
        {!selections.length && workspace.period.period_type === 'weekly' && (
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            Choose evidence to build the draft. Weekly wins have no fixed recipient count.
          </p>
        )}
      </div>
      <details className="rounded-lg border">
        <summary className="cursor-pointer px-3 py-2 text-sm font-medium">
          Preview Telegram message
        </summary>
        <pre className="max-h-72 overflow-auto whitespace-pre-wrap border-t bg-muted/30 p-3 font-sans text-xs">
          {preview || 'The Telegram preview will appear as recipients are selected.'}
        </pre>
      </details>
      <div className="flex flex-wrap gap-2 border-t pt-4">
        {!locked && (
          <>
            <button
              type="button"
              disabled={!!busy || !dirty}
              onClick={() => onSave('save')}
              className="rounded-md border px-3 py-2 text-sm disabled:opacity-50"
            >
              Save draft
            </button>
            <button
              type="button"
              disabled={!!busy}
              onClick={() => onSave('approve')}
              className="rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-50"
            >
              Approve
            </button>
            <button
              type="button"
              disabled={!!busy}
              onClick={() => onSave('reject')}
              className="rounded-md border border-red-300 px-3 py-2 text-sm text-red-700 disabled:opacity-50"
            >
              Reject
            </button>
          </>
        )}
        {workspace.period.status === 'approved' && (
          <>
            <button
              type="button"
              disabled={!!busy}
              onClick={() => onSave('save')}
              className="rounded-md border px-3 py-2 text-sm disabled:opacity-50"
            >
              Reopen draft
            </button>
            <button
              type="button"
              disabled={!!busy}
              onClick={onPublish}
              className="rounded-md bg-emerald-700 px-3 py-2 text-sm text-white disabled:opacity-50"
            >
              Publish to Community Highlights
            </button>
          </>
        )}
      </div>
    </aside>
  );
}
