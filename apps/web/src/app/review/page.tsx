'use client';

import { useAuth } from '@/contexts/AuthContext';
import {
  AlertCircle,
  CheckCircle2,
  Clock3,
  Lightbulb,
  LogOut,
  MessageSquareText,
  Plus,
  ShieldCheck,
  Target,
} from 'lucide-react';
import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@hr-portal/ui';

type ReviewSession = { engagementId: string; expiresAt: string; purpose: string };
type DemoItem = {
  id: string;
  kind: 'objective' | 'task';
  title: string;
  description: string | null;
  status: 'not_started' | 'in_progress' | 'complete';
  progress: number;
  created_by: string | null;
};

const statusLabel = {
  not_started: 'Not started',
  in_progress: 'In progress',
  complete: 'Complete',
} as const;

export default function ReviewHubPage() {
  const { user, isLoading: authLoading, logout } = useAuth();
  const [session, setSession] = useState<ReviewSession | null>(null);
  const [items, setItems] = useState<Array<DemoItem>>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newKind, setNewKind] = useState<'objective' | 'task'>('task');
  const [feedback, setFeedback] = useState({
    category: 'idea',
    severity: 'medium',
    suggestion: '',
  });
  const [feedbackState, setFeedbackState] = useState<'idle' | 'saving' | 'saved'>('idle');

  const loadReview = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [sessionResponse, itemsResponse] = await Promise.all([
        fetch('/api/review/session', { cache: 'no-store' }),
        fetch('/api/review/items', { cache: 'no-store' }),
      ]);
      if (!(sessionResponse.ok && itemsResponse.ok))
        throw new Error('Your review session is unavailable or has expired.');
      const [sessionBody, itemsBody] = await Promise.all([
        sessionResponse.json(),
        itemsResponse.json(),
      ]);
      setSession(sessionBody.data);
      setItems(itemsBody.data);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load the Review Hub.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadReview();
  }, [loadReview]);

  const remaining = useMemo(() => {
    if (!session) return '';
    const hours = Math.max(
      0,
      Math.ceil((new Date(session.expiresAt).getTime() - Date.now()) / 3_600_000)
    );
    return hours > 48 ? `${Math.ceil(hours / 24)} days remaining` : `${hours} hours remaining`;
  }, [session]);

  async function updateItem(item: DemoItem, status: DemoItem['status']) {
    setPendingId(item.id);
    setError(null);
    const progress =
      status === 'complete' ? 100 : status === 'in_progress' ? Math.max(item.progress, 50) : 0;
    try {
      const response = await fetch(`/api/review/items/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, progress }),
      });
      if (!response.ok) throw new Error('The update could not be saved.');
      const body = await response.json();
      setItems((current) => current.map((entry) => (entry.id === item.id ? body.data : entry)));
    } catch (updateError) {
      setError(
        updateError instanceof Error ? updateError.message : 'The update could not be saved.'
      );
    } finally {
      setPendingId(null);
    }
  }

  async function createItem(event: FormEvent) {
    event.preventDefault();
    if (newTitle.trim().length < 2) return;
    setPendingId('new');
    setError(null);
    try {
      const response = await fetch('/api/review/items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: newKind,
          title: newTitle.trim(),
          description: 'Created during this review session.',
        }),
      });
      if (!response.ok) throw new Error('The demo item could not be created.');
      const body = await response.json();
      setItems((current) => [...current, body.data]);
      setNewTitle('');
    } catch (createError) {
      setError(
        createError instanceof Error ? createError.message : 'The demo item could not be created.'
      );
    } finally {
      setPendingId(null);
    }
  }

  async function submitFeedback(event: FormEvent) {
    event.preventDefault();
    setFeedbackState('saving');
    setError(null);
    try {
      const response = await fetch('/api/review/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...feedback, route: '/review' }),
      });
      if (!response.ok) throw new Error('Your feedback could not be submitted.');
      setFeedback({ category: 'idea', severity: 'medium', suggestion: '' });
      setFeedbackState('saved');
    } catch (feedbackError) {
      setFeedbackState('idle');
      setError(
        feedbackError instanceof Error
          ? feedbackError.message
          : 'Your feedback could not be submitted.'
      );
    }
  }

  if (authLoading || loading) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 text-slate-600">
        <p>Preparing your safe review workspace…</p>
      </main>
    );
  }

  if (error && !session) {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-50 p-6">
        <section className="w-full max-w-lg rounded-2xl border border-rose-200 bg-white p-8 text-center shadow-sm">
          <AlertCircle className="mx-auto mb-4 h-10 w-10 text-rose-600" aria-hidden="true" />
          <h1 className="text-2xl font-semibold text-slate-950">Review access unavailable</h1>
          <p className="mt-2 text-slate-600">{error}</p>
          <button
            type="button"
            className="mt-6 rounded-lg bg-slate-900 px-4 py-2 text-white"
            onClick={() => void logout()}
          >
            Return to sign in
          </button>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen overflow-y-auto bg-slate-50 text-slate-950">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-teal-900 font-bold text-white">
              SN
            </div>
            <div>
              <p className="font-semibold">Control Hub Review</p>
              <p className="text-sm text-slate-500">Synthetic demo workspace</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => void logout()}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-6xl space-y-6 px-5 py-8">
        <section className="rounded-2xl bg-teal-950 p-6 text-white shadow-sm sm:p-8">
          <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
            <div>
              <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm">
                <ShieldCheck className="h-4 w-4" /> No production or employee data
              </div>
              <h1 className="text-3xl font-semibold tracking-tight">
                Welcome, {user?.name || 'reviewer'}
              </h1>
              <p className="mt-2 max-w-2xl text-teal-100">
                Explore these fictional workflows, try safe changes, and tell us what would make the
                experience clearer.
              </p>
            </div>
            <div className="rounded-xl bg-white/10 px-4 py-3">
              <p className="flex items-center gap-2 text-sm font-medium">
                <Clock3 className="h-4 w-4" /> {remaining}
              </p>
              <p className="mt-1 text-xs text-teal-100">
                Expires {session ? new Date(session.expiresAt).toLocaleString() : ''}
              </p>
            </div>
          </div>
        </section>

        {error ? (
          <div
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800"
          >
            {error}
          </div>
        ) : null}

        <section
          aria-labelledby="demo-heading"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
        >
          <div className="mb-5">
            <p className="text-sm font-medium text-teal-700">Safe sandbox</p>
            <h2 id="demo-heading" className="text-2xl font-semibold">
              Objectives and tasks
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Updates are saved only to this resettable demo environment.
            </p>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {items.map((item) => (
              <article key={item.id} className="rounded-xl border border-slate-200 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex gap-3">
                    {item.kind === 'objective' ? (
                      <Target className="mt-0.5 h-5 w-5 text-teal-700" />
                    ) : (
                      <CheckCircle2 className="mt-0.5 h-5 w-5 text-indigo-600" />
                    )}
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {item.kind}
                      </p>
                      <h3 className="font-semibold">{item.title}</h3>
                    </div>
                  </div>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-700">
                    {statusLabel[item.status]}
                  </span>
                </div>
                <p className="mt-3 text-sm text-slate-600">{item.description}</p>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100">
                  <div
                    className="h-full rounded-full bg-teal-600 transition-all"
                    style={{ width: `${item.progress}%` }}
                  />
                </div>
                <label className="mt-4 block text-sm font-medium" htmlFor={`status-${item.id}`}>
                  Try changing its status
                </label>
                <Select value={item.status} disabled={pendingId === item.id} onValueChange={(value) => void updateItem(item, value as DemoItem['status'])}>
                  <SelectTrigger id={`status-${item.id}`} className="mt-1 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="not_started">Not started</SelectItem>
                    <SelectItem value="in_progress">In progress</SelectItem>
                    <SelectItem value="complete">Complete</SelectItem>
                  </SelectContent>
                </Select>
              </article>
            ))}
          </div>
          <form
            onSubmit={createItem}
            className="mt-5 flex flex-col gap-3 rounded-xl bg-slate-50 p-4 sm:flex-row sm:items-end"
          >
            <label className="flex-1 text-sm font-medium">
              Add a fictional item
              <input
                value={newTitle}
                onChange={(event) => setNewTitle(event.target.value)}
                maxLength={180}
                placeholder="e.g. Clarify the weekly check-in"
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2"
              />
            </label>
            <label className="text-sm font-medium">
              Type
              <Select value={newKind} onValueChange={(value) => setNewKind(value as 'objective' | 'task')}>
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="task">Task</SelectItem>
                  <SelectItem value="objective">Objective</SelectItem>
                </SelectContent>
              </Select>
            </label>
            <button
              type="submit"
              disabled={pendingId === 'new' || newTitle.trim().length < 2}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-800 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
            >
              <Plus className="h-4 w-4" /> Add
            </button>
          </form>
        </section>

        <section
          aria-labelledby="feedback-heading"
          className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
        >
          <div className="flex gap-3">
            <MessageSquareText className="mt-1 h-6 w-6 text-teal-700" />
            <div>
              <h2 id="feedback-heading" className="text-2xl font-semibold">
                Share an improvement
              </h2>
              <p className="mt-1 text-sm text-slate-600">
                Be specific about what you expected and what felt unclear. Do not include personal
                or confidential information.
              </p>
            </div>
          </div>
          <form onSubmit={submitFeedback} className="mt-5 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-medium">
              Category
              <Select value={feedback.category} onValueChange={(value) => setFeedback((current) => ({ ...current, category: value }))}>
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="idea">Idea</SelectItem>
                  <SelectItem value="usability">Usability</SelectItem>
                  <SelectItem value="workflow">Workflow</SelectItem>
                  <SelectItem value="accessibility">Accessibility</SelectItem>
                  <SelectItem value="content">Content</SelectItem>
                  <SelectItem value="bug">Bug</SelectItem>
                </SelectContent>
              </Select>
            </label>
            <label className="text-sm font-medium">
              Impact
              <Select value={feedback.severity} onValueChange={(value) => setFeedback((current) => ({ ...current, severity: value }))}>
                <SelectTrigger className="mt-1 w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Blocking</SelectItem>
                </SelectContent>
              </Select>
            </label>
            <label className="text-sm font-medium sm:col-span-2">
              Suggestion
              <textarea
                value={feedback.suggestion}
                onChange={(event) => {
                  setFeedbackState('idle');
                  setFeedback((current) => ({ ...current, suggestion: event.target.value }));
                }}
                minLength={10}
                maxLength={4000}
                rows={5}
                placeholder="I expected… I noticed… I suggest…"
                className="mt-1 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2"
              />
            </label>
            <div className="flex items-center justify-between gap-4 sm:col-span-2">
              <p aria-live="polite" className="text-sm text-emerald-700">
                {feedbackState === 'saved' ? 'Thank you — your feedback was saved.' : ''}
              </p>
              <button
                type="submit"
                disabled={feedbackState === 'saving' || feedback.suggestion.trim().length < 10}
                className="inline-flex items-center gap-2 rounded-lg bg-teal-800 px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
              >
                <Lightbulb className="h-4 w-4" />{' '}
                {feedbackState === 'saving' ? 'Submitting…' : 'Submit feedback'}
              </button>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
