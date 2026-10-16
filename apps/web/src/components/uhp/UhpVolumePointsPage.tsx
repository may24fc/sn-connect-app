'use client';

import { usePeriodRequestGuard } from '@/hooks/usePeriodRequestGuard';
import {
  calendarMonthKey,
  calendarQuarterKeyFromMonth,
  calendarQuarterMonthRange,
  calendarQuarterOptions,
} from '@/lib/metrics-period';
import { UHP_VP_CATEGORY_LABELS } from '@/lib/uhp';
import {
  Button,
  Card,
  CardContent,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  useToast,
} from '@hr-portal/ui';
import { Loader2, Pencil, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { UhpAccessManagerButton } from './UhpAccessManagerDialog';
import { UhpWorkspaceHeader } from './UhpWorkspaceHeader';

type CategorySummary = {
  category: string;
  actualVp: number;
  targetVp: number;
  forecastVp: number;
  targetPercent: number;
  forecastPercent: number;
};
type Summary = {
  reportingMonth: string;
  categories: Array<CategorySummary>;
  totalActualVp: number;
  totalTargetVp: number;
  totalForecastVp: number;
};
type Entry = {
  id: string;
  member_name: string;
  category: string;
  order_date: string;
  order_id: string | null;
  volume_points: number;
  amount: number | null;
  currency: string | null;
};
type PeriodMode = 'month' | 'quarter';

function updateSummaryEntries(
  summary: Summary | null,
  previous: Entry | null,
  next: Entry | null
): Summary | null {
  if (!summary) return summary;
  const previousVp = previous ? Number(previous.volume_points) : 0;
  const nextVp = next ? Number(next.volume_points) : 0;
  return {
    ...summary,
    totalActualVp: summary.totalActualVp - previousVp + nextVp,
    categories: summary.categories.map((item) => {
      let actualVp = item.actualVp;
      if (previous?.category === item.category) actualVp -= previousVp;
      if (next?.category === item.category) actualVp += nextVp;
      return {
        ...item,
        actualVp,
        targetPercent: item.targetVp ? Math.round((actualVp / item.targetVp) * 1000) / 10 : 0,
        forecastPercent: item.forecastVp ? Math.round((actualVp / item.forecastVp) * 1000) / 10 : 0,
      };
    }),
  };
}

export function UhpVolumePointsPage({ isAdmin = false }: { isAdmin?: boolean }) {
  const { addToast } = useToast();
  const currentMonth = useMemo(() => calendarMonthKey(new Date(), 'viewer'), []);
  const [periodMode, setPeriodMode] = useState<PeriodMode>('month');
  const [month, setMonth] = useState(currentMonth);
  const [quarter, setQuarter] = useState(() => calendarQuarterKeyFromMonth(currentMonth));
  const periodRange =
    periodMode === 'month'
      ? { fromMonth: month, toMonth: month }
      : calendarQuarterMonthRange(quarter);
  const periodKey = `${periodMode}:${periodRange.fromMonth}:${periodRange.toMonth}`;
  const quarterOptions = useMemo(() => calendarQuarterOptions(currentMonth), [currentMonth]);
  const { begin: beginPeriodRequest, isCurrent: isCurrentPeriodRequest } =
    usePeriodRequestGuard(periodKey);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [entries, setEntries] = useState<Array<Entry>>([]);
  const [loadedPeriod, setLoadedPeriod] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [showTargets, setShowTargets] = useState(false);
  const [targetDrafts, setTargetDrafts] = useState<
    Record<string, { targetVp: number; forecastVp: number }>
  >({});
  const load = useCallback(async () => {
    const requestId = beginPeriodRequest();
    setLoading(true);
    setLoadError(false);
    const query = new URLSearchParams({
      fromMonth: periodRange.fromMonth,
      toMonth: periodRange.toMonth,
    });
    try {
      const [summaryResponse, entriesResponse] = await Promise.all([
        fetch(`/api/uhp/volume-points/summary?${query}`),
        fetch(`/api/uhp/volume-points/entries?${query}`),
      ]);
      const summaryPayload = await summaryResponse.json();
      const entriesPayload = await entriesResponse.json();
      if (!(summaryResponse.ok && entriesResponse.ok))
        throw new Error(
          summaryPayload.error ?? entriesPayload.error ?? 'Failed to load volume points'
        );
      if (!isCurrentPeriodRequest(periodKey, requestId)) return;
      setSummary(summaryPayload.data);
      setEntries(entriesPayload.data);
      setLoadedPeriod(periodKey);
    } catch (error) {
      if (!isCurrentPeriodRequest(periodKey, requestId)) return;
      setLoadError(true);
      addToast({
        variant: 'error',
        title: 'Could not load volume points',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      if (isCurrentPeriodRequest(periodKey, requestId)) setLoading(false);
    }
  }, [
    addToast,
    beginPeriodRequest,
    isCurrentPeriodRequest,
    periodKey,
    periodRange.fromMonth,
    periodRange.toMonth,
  ]);
  useEffect(() => {
    void load();
  }, [load]);

  async function addEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formElement = event.currentTarget;
    const form = new FormData(formElement);
    const category = String(form.get('category'));
    const memberName = String(form.get('memberName'));
    const orderDate = String(form.get('orderDate'));
    const orderId = String(form.get('orderId') || '') || null;
    const volumePoints = Number(form.get('volumePoints'));
    const amount = form.get('amount') ? Number(form.get('amount')) : null;
    const optimisticEntry: Entry = {
      id: editingEntry?.id ?? `optimistic-vp-${crypto.randomUUID()}`,
      member_name: memberName,
      category,
      order_date: orderDate,
      order_id: orderId,
      volume_points: volumePoints,
      amount,
      currency: amount === null ? null : 'PHP',
    };
    const previousEntries = entries;
    const previousSummary = summary;
    setSaving(true);
    setEntries((current) =>
      editingEntry
        ? current.map((entry) => (entry.id === editingEntry.id ? optimisticEntry : entry))
        : [optimisticEntry, ...current]
    );
    setSummary((current) => updateSummaryEntries(current, editingEntry, optimisticEntry));
    try {
      const response = await fetch(
        editingEntry
          ? `/api/uhp/volume-points/entries/${editingEntry.id}`
          : '/api/uhp/volume-points/entries',
        {
          method: editingEntry ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            reportingMonth: `${orderDate.slice(0, 7)}-01`,
            category,
            memberName,
            orderDate,
            orderId: orderId || undefined,
            volumePoints,
            amount: amount ?? undefined,
            currency: amount === null ? undefined : 'PHP',
          }),
        }
      );
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Failed to add entry');
      setShowForm(false);
      setEditingEntry(null);
      formElement.reset();
      await load();
      addToast({
        variant: 'success',
        title: editingEntry ? 'Volume-point entry updated' : 'Volume points added',
      });
    } catch (error) {
      setEntries(previousEntries);
      setSummary(previousSummary);
      addToast({
        variant: 'error',
        title: 'Could not add volume points',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    } finally {
      setSaving(false);
    }
  }

  async function deleteEntry(entry: Entry) {
    const previousEntries = entries;
    const previousSummary = summary;
    setEntries((current) => current.filter((item) => item.id !== entry.id));
    setSummary((current) => updateSummaryEntries(current, entry, null));
    try {
      const response = await fetch(`/api/uhp/volume-points/entries/${entry.id}`, {
        method: 'DELETE',
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Failed to delete entry');
      addToast({ variant: 'success', title: 'Volume-point entry removed' });
      await load();
    } catch (error) {
      setEntries(previousEntries);
      setSummary(previousSummary);
      addToast({
        variant: 'error',
        title: 'Could not remove entry',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    }
  }

  function openTargets() {
    setTargetDrafts(
      Object.fromEntries(
        (summary?.categories ?? []).map((row) => [
          row.category,
          { targetVp: row.targetVp, forecastVp: row.forecastVp },
        ])
      )
    );
    setShowTargets(true);
  }

  async function saveTargets() {
    if (!summary) return;
    const previous = summary;
    setSummary({
      ...summary,
      totalTargetVp: Object.values(targetDrafts).reduce((sum, row) => sum + row.targetVp, 0),
      totalForecastVp: Object.values(targetDrafts).reduce((sum, row) => sum + row.forecastVp, 0),
      categories: summary.categories.map((row) => ({
        ...row,
        ...(targetDrafts[row.category] ?? {}),
      })),
    });
    try {
      const response = await fetch('/api/uhp/volume-points/targets', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportingMonth: `${month}-01`,
          targets: Object.entries(targetDrafts).map(([category, values]) => ({
            category,
            ...values,
          })),
        }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error ?? 'Failed to save targets');
      setShowTargets(false);
      await load();
      addToast({ variant: 'success', title: 'Targets and forecasts saved' });
    } catch (error) {
      setSummary(previous);
      addToast({
        variant: 'error',
        title: 'Could not save targets',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    }
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 lg:p-8">
      <UhpWorkspaceHeader
        title="Volume Points Tracker"
        description="Monthly, quarterly, and overall UHP volume points, migrated from the manual workbook. The daily Telegram digest is sent at 12:00 PM PHT even when nothing changed."
        actions={
          <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
            {isAdmin && <UhpAccessManagerButton module="volume_points" label="Volume Points" />}
            <Button
              className="sm:min-w-32"
              onClick={() => {
                setEditingEntry(null);
                setShowForm((value) => !value);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add entry
            </Button>
          </div>
        }
      />
      <Card>
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="vp-period-mode">View by</Label>
              <Select
                value={periodMode}
                onValueChange={(value) => {
                  const nextMode = value as PeriodMode;
                  setPeriodMode(nextMode);
                  setShowTargets(false);
                }}
              >
                <SelectTrigger id="vp-period-mode" className="w-full sm:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="month">Month</SelectItem>
                  <SelectItem value="quarter">Quarter</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vp-period">Period</Label>
              {periodMode === 'month' ? (
                <Input
                  id="vp-period"
                  type="month"
                  value={month}
                  onChange={(event) => {
                    if (event.target.value) setMonth(event.target.value);
                  }}
                  className="w-full sm:w-48"
                />
              ) : (
                <Select value={quarter} onValueChange={setQuarter}>
                  <SelectTrigger id="vp-period" className="w-full sm:w-56">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {quarterOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
          {periodMode === 'month' ? (
            <Button variant="outline" onClick={openTargets} className="w-full sm:w-auto">
              Set monthly targets
            </Button>
          ) : (
            <p className="text-sm text-muted-foreground">
              Quarterly targets and forecasts are the totals of their three months.
            </p>
          )}
        </CardContent>
      </Card>
      {showForm && (
        <Card>
          <CardContent className="p-5">
            <form
              key={editingEntry?.id ?? 'new'}
              className="grid gap-4 md:grid-cols-3"
              onSubmit={addEntry}
            >
              <div className="space-y-1">
                <Label htmlFor="vp-member">Member</Label>
                <Input
                  id="vp-member"
                  name="memberName"
                  maxLength={300}
                  defaultValue={editingEntry?.member_name}
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="vp-category">Category</Label>
                <Select name="category" defaultValue={editingEntry?.category ?? 'personal'}>
                  <SelectTrigger id="vp-category" className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(UHP_VP_CATEGORY_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label htmlFor="vp-date">Order date</Label>
                <Input
                  id="vp-date"
                  name="orderDate"
                  type="date"
                  min={`${periodRange.fromMonth}-01`}
                  max={`${periodRange.toMonth}-${new Date(Number(periodRange.toMonth.slice(0, 4)), Number(periodRange.toMonth.slice(5)), 0).getDate()}`}
                  defaultValue={
                    editingEntry?.order_date ??
                    (currentMonth >= periodRange.fromMonth && currentMonth <= periodRange.toMonth
                      ? new Date().toISOString().slice(0, 10)
                      : `${periodRange.fromMonth}-01`)
                  }
                  required
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="vp-order">Order ID</Label>
                <Input
                  id="vp-order"
                  name="orderId"
                  maxLength={300}
                  defaultValue={editingEntry?.order_id ?? ''}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="vp-points">Volume points</Label>
                <Input
                  id="vp-points"
                  name="volumePoints"
                  type="number"
                  min="0"
                  step="0.01"
                  required
                  defaultValue={editingEntry?.volume_points}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="vp-amount">Amount (PHP)</Label>
                <Input
                  id="vp-amount"
                  name="amount"
                  type="number"
                  min="0"
                  step="0.01"
                  defaultValue={editingEntry?.amount ?? ''}
                />
              </div>
              <div className="flex gap-2 md:col-span-3">
                <Button type="submit" disabled={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  {editingEntry ? 'Update' : 'Save'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setEditingEntry(null);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
      {showTargets && (
        <Card>
          <CardContent className="space-y-4 p-5">
            <div>
              <h2 className="font-semibold">Monthly targets and forecasts</h2>
              <p className="text-sm text-muted-foreground">
                Set the goals used by the dashboard and daily Telegram digest.
              </p>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {summary?.categories.map((row) => (
                <div key={row.category} className="grid grid-cols-2 gap-2 rounded-md border p-3">
                  <p className="col-span-2 text-sm font-medium">
                    {UHP_VP_CATEGORY_LABELS[row.category as keyof typeof UHP_VP_CATEGORY_LABELS]}
                  </p>
                  <div>
                    <Label>Target VP</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={targetDrafts[row.category]?.targetVp ?? 0}
                      onChange={(event) =>
                        setTargetDrafts((current) => ({
                          ...current,
                          [row.category]: {
                            ...(current[row.category] ?? { forecastVp: 0 }),
                            targetVp: Number(event.target.value),
                          },
                        }))
                      }
                    />
                  </div>
                  <div>
                    <Label>Forecast VP</Label>
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={targetDrafts[row.category]?.forecastVp ?? 0}
                      onChange={(event) =>
                        setTargetDrafts((current) => ({
                          ...current,
                          [row.category]: {
                            ...(current[row.category] ?? { targetVp: 0 }),
                            forecastVp: Number(event.target.value),
                          },
                        }))
                      }
                    />
                  </div>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <Button onClick={() => void saveTargets()}>Save targets</Button>
              <Button variant="outline" onClick={() => setShowTargets(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      {loading || (loadedPeriod !== periodKey && !loadError) ? (
        <div className="py-16 text-center text-muted-foreground">
          <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
          Loading volume points...
        </div>
      ) : loadError && loadedPeriod !== periodKey ? (
        <div className="py-16 text-center text-muted-foreground">
          Could not load volume points for this period.
          <Button variant="outline" className="ml-3" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <Card>
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground">Actual VP</p>
                <p className="mt-1 text-3xl font-semibold">
                  {summary?.totalActualVp.toLocaleString() ?? 0}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground">Target VP</p>
                <p className="mt-1 text-3xl font-semibold">
                  {summary?.totalTargetVp.toLocaleString() ?? 0}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-sm text-muted-foreground">Forecast VP</p>
                <p className="mt-1 text-3xl font-semibold">
                  {summary?.totalForecastVp.toLocaleString() ?? 0}
                </p>
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardContent className="p-0">
              <div className="flex items-center justify-between border-b p-4 font-medium">
                <span>Category progress</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => void load()}
                  aria-label="Refresh volume points"
                >
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Category</TableHead>
                    <TableHead>Actual</TableHead>
                    <TableHead>Target</TableHead>
                    <TableHead>Target %</TableHead>
                    <TableHead>Forecast</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary?.categories.map((row) => (
                    <TableRow key={row.category}>
                      <TableCell className="font-medium">
                        {
                          UHP_VP_CATEGORY_LABELS[
                            row.category as keyof typeof UHP_VP_CATEGORY_LABELS
                          ]
                        }
                      </TableCell>
                      <TableCell>{row.actualVp.toLocaleString()}</TableCell>
                      <TableCell>{row.targetVp.toLocaleString()}</TableCell>
                      <TableCell>{row.targetPercent}%</TableCell>
                      <TableCell>{row.forecastVp.toLocaleString()}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-0">
              <div className="border-b p-4 font-medium">Entries ({entries.length})</div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Member</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>VP</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.length ? (
                    entries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>{entry.order_date}</TableCell>
                        <TableCell className="font-medium">{entry.member_name}</TableCell>
                        <TableCell>
                          {
                            UHP_VP_CATEGORY_LABELS[
                              entry.category as keyof typeof UHP_VP_CATEGORY_LABELS
                            ]
                          }
                        </TableCell>
                        <TableCell>{entry.order_id ?? '—'}</TableCell>
                        <TableCell>{Number(entry.volume_points).toLocaleString()}</TableCell>
                        <TableCell>
                          {entry.amount == null
                            ? '—'
                            : `${entry.currency ?? ''} ${Number(entry.amount).toLocaleString()}`}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingEntry(entry);
                                setShowForm(true);
                              }}
                              aria-label={`Edit ${entry.member_name}`}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => void deleteEntry(entry)}
                              aria-label={`Delete ${entry.member_name}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={7} className="p-8 text-center text-muted-foreground">
                        No entries for this period.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
