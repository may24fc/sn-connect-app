'use client';

import { RevenueForecastAccessManagerButton } from '@/components/admin/RevenueForecastAccessManagerDialog';
import {
  useDeleteRevenueForecastEntry,
  useRevenueForecastEntries,
  useUpdateRevenueForecastEntry,
  useUpsertRevenueForecastEntry,
} from '@/hooks/useRevenueForecastEntries';
import {
  useCreateRevenueForecastGoal,
  useDeleteRevenueForecastGoal,
  useRevenueForecastGoals,
} from '@/hooks/useRevenueForecastGoals';
import { formatCurrency } from '@/lib/fx/rates';
import {
  type ForecastScenarioKey,
  REVENUE_MONTHS,
  buildGoalProgressRows,
  computeRevenueForecast,
} from '@/lib/revenue-forecast';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Progress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  useToast,
} from '@hr-portal/ui';
import { BarChart3, ChevronDown, ChevronUp, Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { type ReactNode, useMemo, useState } from 'react';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

interface RevenueForecastPageContentProps {
  canManage: boolean;
}

const scenarioOptions: Array<{ key: ForecastScenarioKey; label: string; subLabel: string }> = [
  { key: 'conservative', label: 'Conservative', subLabel: 'Low-risk projection' },
  { key: 'average', label: 'Average', subLabel: 'Historical average growth' },
  { key: 'underlying', label: 'Real underlying', subLabel: 'Excludes record spikes' },
];

export function RevenueForecastPageContent({
  canManage,
}: RevenueForecastPageContentProps): ReactNode {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth() + 1;
  const { addToast } = useToast();

  const [targetYear, setTargetYear] = useState(currentYear);
  const [scenario, setScenario] = useState<ForecastScenarioKey>('conservative');
  const [showBreakdown, setShowBreakdown] = useState(true);

  const [formYear, setFormYear] = useState(targetYear);
  const [formMonth, setFormMonth] = useState(new Date().getMonth() + 1);
  const [formAmount, setFormAmount] = useState('0');
  const [formNotes, setFormNotes] = useState('');
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);

  const [goalAmount, setGoalAmount] = useState('2000000');
  const [goalLabel, setGoalLabel] = useState('');

  const entriesQuery = useRevenueForecastEntries(undefined, true);
  const goalsQuery = useRevenueForecastGoals(targetYear, true);
  const upsertEntry = useUpsertRevenueForecastEntry();
  const updateEntry = useUpdateRevenueForecastEntry();
  const deleteEntry = useDeleteRevenueForecastEntry();
  const createGoal = useCreateRevenueForecastGoal();
  const deleteGoal = useDeleteRevenueForecastGoal();

  const entries = entriesQuery.data ?? [];
  const goals = goalsQuery.data ?? [];

  const forecast = useMemo(
    () => computeRevenueForecast(entries, targetYear, scenario),
    [entries, targetYear, scenario]
  );

  const goalRows = useMemo(
    () => buildGoalProgressRows(goals, targetYear, forecast.projectedTotalAud),
    [goals, targetYear, forecast.projectedTotalAud]
  );

  const targetYearEntries = useMemo(
    () => entries.filter((entry) => entry.year === targetYear).sort((a, b) => a.month - b.month),
    [entries, targetYear]
  );

  const chartData = forecast.rows.map((row) => ({
    month: row.monthLabel,
    previousYearActual: row.previousYearActual,
    targetYearActual: row.targetYearActual,
    targetYearProjected: row.targetYearProjected,
  }));

  const earnedPeriodEndMonth = useMemo(() => {
    if (targetYear < currentYear) {
      return 12;
    }
    if (targetYear > currentYear) {
      return 0;
    }
    return currentMonth;
  }, [currentMonth, currentYear, targetYear]);

  const earnedRangeLabel = useMemo(() => {
    if (earnedPeriodEndMonth <= 0) {
      return 'Earned (no elapsed months)';
    }
    return `Earned Jan-${REVENUE_MONTHS[earnedPeriodEndMonth - 1]}`;
  }, [earnedPeriodEndMonth]);

  const projectionRangeLabel = useMemo(() => {
    if (earnedPeriodEndMonth >= 12) {
      return null;
    }
    const startMonth = earnedPeriodEndMonth + 1;
    return `${REVENUE_MONTHS[startMonth - 1]}-Dec projected from historical growth scenarios.`;
  }, [earnedPeriodEndMonth]);

  const isBusy =
    entriesQuery.isLoading ||
    goalsQuery.isLoading ||
    upsertEntry.isPending ||
    updateEntry.isPending ||
    deleteEntry.isPending ||
    createGoal.isPending ||
    deleteGoal.isPending;

  async function handleSaveEntry(): Promise<void> {
    const parsedAmount = Number(formAmount);

    if (!Number.isFinite(parsedAmount) || parsedAmount < 0) {
      addToast({
        variant: 'error',
        title: 'Invalid revenue amount',
        description: 'Please enter a valid non-negative number.',
      });
      return;
    }

    try {
      if (editingEntryId) {
        await updateEntry.mutateAsync({
          id: editingEntryId,
          actualRevenueAud: parsedAmount,
          notes: formNotes.trim() || null,
        });

        addToast({
          variant: 'success',
          title: 'Revenue entry updated',
          description: `${REVENUE_MONTHS[formMonth - 1]} ${formYear} updated successfully.`,
        });

        setEditingEntryId(null);
      } else {
        await upsertEntry.mutateAsync({
          year: formYear,
          month: formMonth,
          actualRevenueAud: parsedAmount,
          notes: formNotes.trim() || null,
        });

        addToast({
          variant: 'success',
          title: 'Monthly revenue saved',
          description: `${REVENUE_MONTHS[formMonth - 1]} ${formYear} updated successfully.`,
        });
      }

      setFormAmount('0');
      setFormNotes('');
    } catch (error) {
      addToast({
        variant: 'error',
        title: editingEntryId ? 'Failed to update revenue entry' : 'Failed to save monthly revenue',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    }
  }

  function handleStartEdit(entry: {
    id: string;
    year: number;
    month: number;
    actualRevenueAud: number;
    notes: string | null;
  }): void {
    setEditingEntryId(entry.id);
    setFormYear(entry.year);
    setFormMonth(entry.month);
    setFormAmount(String(entry.actualRevenueAud));
    setFormNotes(entry.notes ?? '');
  }

  function handleCancelEdit(): void {
    setEditingEntryId(null);
    setFormAmount('0');
    setFormNotes('');
  }

  async function handleDeleteEntry(id: string): Promise<void> {
    try {
      await deleteEntry.mutateAsync(id);
      addToast({ variant: 'default', title: 'Revenue entry deleted' });
    } catch (error) {
      addToast({
        variant: 'error',
        title: 'Failed to delete entry',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    }
  }

  async function handleCreateGoal(): Promise<void> {
    const amount = Number(goalAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      addToast({
        variant: 'error',
        title: 'Invalid goal amount',
        description: 'Please enter a positive goal amount.',
      });
      return;
    }

    try {
      await createGoal.mutateAsync({
        year: targetYear,
        goalAmountAud: amount,
        label: goalLabel.trim() || null,
      });

      setGoalAmount('');
      setGoalLabel('');
      addToast({ variant: 'success', title: 'Revenue goal added' });
    } catch (error) {
      addToast({
        variant: 'error',
        title: 'Failed to add goal',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    }
  }

  async function handleDeleteGoal(id: string): Promise<void> {
    try {
      await deleteGoal.mutateAsync(id);
      addToast({ variant: 'default', title: 'Revenue goal deleted' });
    } catch (error) {
      addToast({
        variant: 'error',
        title: 'Failed to delete goal',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-emerald-500">
            SFO · Seafood Outlet · Revenue Forecast
          </p>
          <h1 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            {targetYear} Projection
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            {earnedPeriodEndMonth > 0
              ? `Jan-${REVENUE_MONTHS[Math.max(earnedPeriodEndMonth - 1, 0)]} actuals locked in.`
              : 'No months elapsed yet in this forecast year.'}{' '}
            {projectionRangeLabel ?? ''}
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="space-y-1">
            <Label htmlFor="forecast-year">Target year</Label>
            <Input
              id="forecast-year"
              type="number"
              value={targetYear}
              onChange={(event) => {
                const nextYear = Number(event.target.value);
                if (Number.isFinite(nextYear) && nextYear >= 2000 && nextYear <= 2100) {
                  setTargetYear(nextYear);
                  setFormYear(nextYear);
                }
              }}
              className="w-28"
            />
          </div>
          {canManage ? <RevenueForecastAccessManagerButton /> : null}
        </div>
      </div>

      <Tabs defaultValue="forecast" className="space-y-6">
        <TabsList>
          <TabsTrigger value="forecast">Revenue Forecast</TabsTrigger>
          <TabsTrigger value="log">Log Monthly Revenue</TabsTrigger>
        </TabsList>

        <TabsContent value="forecast" className="space-y-6">
          <div className="space-y-2">
            {forecast.records.slice(0, 2).map((record) => (
              <div
                key={`${record.month}-${record.tag}`}
                className={`rounded-lg border px-4 py-3 text-sm ${
                  record.tag === 'all-time'
                    ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'
                    : 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
                }`}
              >
                <span className="font-semibold">★ {record.title}</span> - {record.description}
              </div>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            {scenarioOptions.map((option) => (
              <Button
                key={option.key}
                type="button"
                variant={scenario === option.key ? 'default' : 'outline'}
                onClick={() => setScenario(option.key)}
                className="h-auto justify-start py-3"
              >
                <div className="text-left">
                  <div className="text-sm font-semibold">
                    {option.label} · {forecast.scenarioRates[option.key].toFixed(1)}%
                  </div>
                  <div className="text-xs opacity-80">{option.subLabel}</div>
                </div>
              </Button>
            ))}
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Projected Total {targetYear}</CardDescription>
                <CardTitle className="text-3xl text-emerald-500">
                  {formatCurrency(forecast.projectedTotalAud, 'AUD')}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>{earnedRangeLabel}</CardDescription>
                <CardTitle className="text-3xl text-blue-500">
                  {formatCurrency(forecast.earnedJanToDateAud, 'AUD')}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Still to Earn</CardDescription>
                <CardTitle className="text-3xl text-emerald-500">
                  {formatCurrency(forecast.remainingProjectedAud, 'AUD')}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Growth Rate Applied</CardDescription>
                <CardTitle className="text-3xl text-emerald-500">
                  {forecast.appliedGrowthPercent.toFixed(1)}%
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Revenue goals</CardTitle>
              <CardDescription>Track projected total against annual targets.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              {goalRows.length === 0 ? (
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  No goals configured for {targetYear}.
                </p>
              ) : (
                goalRows.map((goal) => (
                  <div key={goal.id} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-zinc-600 dark:text-zinc-300">{goal.label}</span>
                      <span className="font-semibold text-emerald-500">
                        {goal.progressPercent.toFixed(1)}%
                      </span>
                    </div>
                    <Progress value={goal.progressPercent} className="h-2" />
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Monthly revenue — actual vs projected
              </CardTitle>
              <CardDescription>
                Blue = {forecast.previousYear} actual, green = {targetYear} actual, amber ={' '}
                {targetYear} projected.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={340}>
                <BarChart data={chartData} margin={{ top: 16, right: 12, left: 8, bottom: 0 }}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-zinc-200 dark:stroke-zinc-800"
                  />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                  <YAxis
                    tickFormatter={(value: number) => `${Math.round(value / 1000)}K`}
                    tick={{ fontSize: 12 }}
                  />
                  <Tooltip formatter={(value: number) => formatCurrency(value, 'AUD')} />
                  <Legend />
                  <Bar
                    dataKey="previousYearActual"
                    name={`${forecast.previousYear} actual`}
                    fill="#3b82f6"
                    radius={[3, 3, 0, 0]}
                  />
                  <Bar
                    dataKey="targetYearActual"
                    name={`${targetYear} actual`}
                    fill="#10b981"
                    radius={[3, 3, 0, 0]}
                  />
                  <Bar
                    dataKey="targetYearProjected"
                    name={`${targetYear} projected`}
                    fill="#f59e0b"
                    radius={[3, 3, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Monthly breakdown</CardTitle>
                <CardDescription>
                  {forecast.previousYear} actual vs {targetYear} actual/projected
                </CardDescription>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowBreakdown((value) => !value)}
              >
                {showBreakdown ? (
                  <>
                    Hide monthly breakdown <ChevronUp className="ml-1 h-4 w-4" />
                  </>
                ) : (
                  <>
                    Show monthly breakdown <ChevronDown className="ml-1 h-4 w-4" />
                  </>
                )}
              </Button>
            </CardHeader>
            {showBreakdown ? (
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Month</TableHead>
                      <TableHead>{forecast.previousYear} Actual</TableHead>
                      <TableHead>{targetYear}</TableHead>
                      <TableHead>Growth</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {forecast.rows.map((row) => (
                      <TableRow key={row.month}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            <span>{row.monthLabel}</span>
                            <Badge variant={row.isActual ? 'default' : 'outline'}>
                              {row.isActual ? 'ACTUAL' : 'PROJ'}
                            </Badge>
                            {row.recordTag === 'all-time' ? (
                              <Badge className="bg-emerald-600">ALL-TIME RECORD</Badge>
                            ) : null}
                            {row.recordTag === 'monthly' ? (
                              <Badge className="bg-amber-600">MONTHLY RECORD</Badge>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          {row.previousYearActual !== null
                            ? formatCurrency(row.previousYearActual, 'AUD')
                            : '—'}
                        </TableCell>
                        <TableCell>
                          {row.targetYearValue !== null
                            ? formatCurrency(row.targetYearValue, 'AUD')
                            : '—'}
                        </TableCell>
                        <TableCell
                          className={
                            row.growthPercent !== null && row.growthPercent >= 0
                              ? 'text-emerald-500'
                              : ''
                          }
                        >
                          {row.growthPercent !== null
                            ? `${row.growthPercent > 0 ? '+' : ''}${row.growthPercent.toFixed(1)}%`
                            : '—'}
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow>
                      <TableCell className="font-semibold">TOTAL</TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(
                          forecast.rows.reduce(
                            (sum, row) => sum + (row.previousYearActual ?? 0),
                            0
                          ),
                          'AUD'
                        )}
                      </TableCell>
                      <TableCell className="font-semibold text-emerald-500">
                        {formatCurrency(forecast.projectedTotalAud, 'AUD')}
                      </TableCell>
                      <TableCell className="font-semibold text-emerald-500">
                        {forecast.sameMonthComparisonPercent !== null
                          ? `${forecast.sameMonthComparisonPercent > 0 ? '+' : ''}${forecast.sameMonthComparisonPercent.toFixed(1)}%`
                          : '—'}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            ) : null}
          </Card>
        </TabsContent>

        <TabsContent value="log" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Log monthly revenue</CardTitle>
              <CardDescription>Upsert actual revenue by year and month in AUD.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-3 md:grid-cols-4">
                <div className="space-y-1">
                  <Label htmlFor="log-year">Year</Label>
                  <Input
                    id="log-year"
                    type="number"
                    value={formYear}
                    onChange={(event) => setFormYear(Number(event.target.value))}
                    disabled={editingEntryId !== null}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="log-month">Month (1-12)</Label>
                  <Input
                    id="log-month"
                    type="number"
                    min={1}
                    max={12}
                    value={formMonth}
                    onChange={(event) => setFormMonth(Number(event.target.value))}
                    disabled={editingEntryId !== null}
                  />
                </div>
                <div className="space-y-1 md:col-span-2">
                  <Label htmlFor="log-amount">Actual revenue (AUD)</Label>
                  <Input
                    id="log-amount"
                    type="number"
                    step="0.01"
                    value={formAmount}
                    onChange={(event) => setFormAmount(event.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="log-notes">Notes (optional)</Label>
                <Textarea
                  id="log-notes"
                  value={formNotes}
                  onChange={(event) => setFormNotes(event.target.value)}
                  placeholder="Optional context for this month (campaign spike, seasonality, etc.)"
                  rows={3}
                />
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={() => void handleSaveEntry()}
                  disabled={upsertEntry.isPending || updateEntry.isPending}
                >
                  {upsertEntry.isPending || updateEntry.isPending ? (
                    <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                  ) : editingEntryId ? (
                    <Pencil className="mr-1.5 h-4 w-4" />
                  ) : (
                    <Plus className="mr-1.5 h-4 w-4" />
                  )}
                  {editingEntryId ? 'Update entry' : 'Save monthly revenue'}
                </Button>
                {editingEntryId ? (
                  <Button type="button" variant="outline" onClick={handleCancelEdit}>
                    Cancel edit
                  </Button>
                ) : null}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setTargetYear(formYear);
                    setScenario('conservative');
                  }}
                >
                  Use this year in forecast tab
                </Button>
              </div>
            </CardContent>
          </Card>

          {canManage ? (
            <Card>
              <CardHeader>
                <CardTitle>Revenue goals ({targetYear})</CardTitle>
                <CardDescription>
                  Add one or more annual goals shown in the forecast tab progress bars.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 md:grid-cols-3">
                  <Input
                    type="number"
                    step="0.01"
                    value={goalAmount}
                    onChange={(event) => setGoalAmount(event.target.value)}
                    placeholder="Goal amount (AUD)"
                  />
                  <Input
                    value={goalLabel}
                    onChange={(event) => setGoalLabel(event.target.value)}
                    placeholder="Label (optional)"
                  />
                  <Button
                    type="button"
                    onClick={() => void handleCreateGoal()}
                    disabled={createGoal.isPending}
                  >
                    {createGoal.isPending ? (
                      <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    ) : (
                      <Plus className="mr-1.5 h-4 w-4" />
                    )}
                    Add goal
                  </Button>
                </div>

                {goalRows.length > 0 ? (
                  <div className="space-y-2">
                    {goalRows.map((goal) => (
                      <div
                        key={goal.id}
                        className="flex items-center justify-between rounded border border-border px-3 py-2"
                      >
                        <div>
                          <div className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
                            {goal.label}
                          </div>
                          <div className="text-xs text-zinc-500 dark:text-zinc-400">
                            {formatCurrency(goal.goalAmountAud, 'AUD')}
                          </div>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => void handleDeleteGoal(goal.id)}
                        >
                          <Trash2 className="mr-1.5 h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>{targetYear} entries</CardTitle>
              <CardDescription>Current stored entries for the selected year.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead>Updated</TableHead>
                    {canManage ? <TableHead className="text-right">Actions</TableHead> : null}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {targetYearEntries.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={canManage ? 5 : 4}
                        className="py-8 text-center text-sm text-zinc-500 dark:text-zinc-400"
                      >
                        No entries stored for {targetYear}.
                      </TableCell>
                    </TableRow>
                  ) : (
                    targetYearEntries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell>{REVENUE_MONTHS[entry.month - 1]}</TableCell>
                        <TableCell className="font-medium">
                          {formatCurrency(entry.actualRevenueAud, 'AUD')}
                        </TableCell>
                        <TableCell className="text-zinc-500 dark:text-zinc-400">
                          {entry.notes ?? '—'}
                        </TableCell>
                        <TableCell className="text-zinc-500 dark:text-zinc-400">
                          {new Date(entry.updatedAt).toLocaleDateString('en-AU')}
                        </TableCell>
                        {canManage ? (
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => handleStartEdit(entry)}
                                disabled={deleteEntry.isPending || updateEntry.isPending}
                              >
                                <Pencil className="mr-1.5 h-4 w-4" />
                                Edit
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => void handleDeleteEntry(entry.id)}
                                disabled={deleteEntry.isPending || updateEntry.isPending}
                              >
                                <Trash2 className="mr-1.5 h-4 w-4" />
                                Delete
                              </Button>
                            </div>
                          </TableCell>
                        ) : null}
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {isBusy ? (
        <div className="fixed bottom-4 right-4 rounded-full bg-zinc-900 px-4 py-2 text-xs font-medium text-white shadow-lg dark:bg-zinc-100 dark:text-zinc-900">
          Working...
        </div>
      ) : null}
    </div>
  );
}
