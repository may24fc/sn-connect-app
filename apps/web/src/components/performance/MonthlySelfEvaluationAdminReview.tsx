'use client';

import { cn } from '@/lib/utils';
import { monthlySelfEvaluationDepartmentRoleOptions } from '@/lib/schemas/performance.schema';
import { EvaluationSummaryView } from './EvaluationSummaryView';
import {
  monthlySelfEvaluationDetailSections,
  type MonthlySelfEvaluationAdminListEntry,
  type MonthlySelfEvaluationDetailSection,
  type MonthlySelfEvaluationDetailField,
  type MonthlySelfEvaluationRecord,
} from './monthlySelfEvaluationDetailConfig';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
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
  useToast,
} from '@hr-portal/ui';
import { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useEvaluationSummary } from './useEvaluationSummary';
import { Sparkles } from 'lucide-react';

type AdminListResponse = {
  data?: MonthlySelfEvaluationAdminListEntry[];
  error?: string;
};

type DetailTabValue =
  | 'work-summary'
  | 'ownership-productivity'
  | 'leadership-operations-feedback';

const detailViewTabs: Array<{
  value: DetailTabValue;
  label: string;
  sectionTitles: string[];
}> = [
  {
    value: 'work-summary',
    label: 'Work Summary',
    sectionTitles: ['SECTION 1: ROLE & WORK SUMMARY', 'FINAL REFLECTION'],
  },
  {
    value: 'ownership-productivity',
    label: 'Ownership & Productivity',
    sectionTitles: ['SECTION 2: OWNERSHIP & PRODUCTIVITY'],
  },
  {
    value: 'leadership-operations-feedback',
    label: 'Leadership & Operations Feedback',
    sectionTitles: ['SECTION 3: LEADERSHIP & OPERATIONS FEEDBACK'],
  },
];

function getCurrentMonthKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function formatMonthKey(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(year || new Date().getFullYear(), (month || 1) - 1, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });
}

function getSectionsForTab(tab: DetailTabValue): MonthlySelfEvaluationDetailSection[] {
  const sectionTitles =
    detailViewTabs.find((detailTab) => detailTab.value === tab)?.sectionTitles ?? [];

  return monthlySelfEvaluationDetailSections.filter((section) => sectionTitles.includes(section.title));
}

function formatSectionTitle(title: string): string {
  return title.replace(/^SECTION\s+\d+:\s*/i, '');
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function initials(name: string): string {
  return name
    .split(' ')
    .map((segment) => segment[0] ?? '')
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function isLowSignalAnswer(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) {
    return true;
  }

  const normalized = trimmed.toLowerCase().replace(/[.!?,]+$/g, '');
  const placeholderValues = new Set([
    'no',
    'none',
    'none provided',
    'n/a',
    'na',
    'nothing',
    'not applicable',
  ]);

  if (placeholderValues.has(normalized)) {
    return true;
  }

  const words = normalized.split(/\s+/).filter(Boolean);
  return (
    words.length <= 3 &&
    (normalized.startsWith('no ') ||
      normalized.startsWith('none') ||
      normalized.startsWith('nothing') ||
      normalized.startsWith('n/a') ||
      normalized.startsWith('na '))
  );
}

function getProductivityTone(score: number): {
  stroke: string;
  track: string;
  surface: string;
  text: string;
  badge: string;
  label: string;
} {
  if (score <= 4) {
    return {
      stroke: 'stroke-rose-500',
      track: 'stroke-rose-100 dark:stroke-rose-950/70',
      surface: 'border-rose-200/80 bg-rose-50/80 dark:border-rose-900/60 dark:bg-rose-950/20',
      text: 'text-rose-700 dark:text-rose-300',
      badge: 'bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300',
      label: 'Needs attention',
    };
  }

  if (score <= 7) {
    return {
      stroke: 'stroke-amber-500',
      track: 'stroke-amber-100 dark:stroke-amber-950/70',
      surface: 'border-amber-200/80 bg-amber-50/80 dark:border-amber-900/60 dark:bg-amber-950/20',
      text: 'text-amber-700 dark:text-amber-300',
      badge: 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300',
      label: 'Solid with room to improve',
    };
  }

  return {
    stroke: 'stroke-emerald-500',
    track: 'stroke-emerald-100 dark:stroke-emerald-950/70',
    surface: 'border-emerald-200/80 bg-emerald-50/80 dark:border-emerald-900/60 dark:bg-emerald-950/20',
    text: 'text-emerald-700 dark:text-emerald-300',
    badge: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300',
    label: 'Strong momentum',
  };
}

function renderProductivityMetric(score: number) {
  const clampedScore = Math.max(0, Math.min(score, 10));
  const tone = getProductivityTone(clampedScore);
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (clampedScore / 10) * circumference;

  return (
    <div
      className={cn(
        'flex items-center gap-4 rounded-2xl border px-4 py-3 shadow-sm shadow-black/5 w-2/3',
        tone.surface
      )}
    >
      <div className="relative h-20 w-20 shrink-0">
        <svg viewBox="0 0 64 64" className="h-20 w-20 -rotate-90">
          <circle cx="32" cy="32" r={radius} className={cn('fill-none stroke-[5]', tone.track)} />
          <circle
            cx="32"
            cy="32"
            r={radius}
            className={cn('fill-none stroke-[5] transition-all duration-300', tone.stroke)}
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          <span className="text-2xl font-semibold tracking-tight text-foreground">{clampedScore}</span>
          <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            / 10
          </span>
        </div>
      </div>
      <div className="min-w-0 space-y-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
          Productivity Score
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <p className={cn('text-sm font-semibold', tone.text)}>{tone.label}</p>
          
        </div>
        <p className="text-sm text-muted-foreground">
          Employee self-rating for the month. Use this as a quick triage signal before reviewing the written responses.
        </p>
      </div>
    </div>
  );
}

function renderDetailField(
  field: MonthlySelfEvaluationDetailField,
  record: MonthlySelfEvaluationRecord
) {
  const value = field.value(record);
  const valueClassName = cn(
    'text-sm leading-6 text-foreground/90',
    field.preserveWhitespace && 'whitespace-pre-wrap',
    isLowSignalAnswer(value) && 'text-foreground/55'
  );

  return (
    <div key={field.label} className="border-b border-border/70 py-4 last:border-b-0 first:pt-0 last:pb-0">
      <p className="text-sm font-medium leading-5 text-muted-foreground">
        {field.label}
      </p>
      <p className={cn('mt-2', valueClassName)}>{value}</p>
    </div>
  );
}

export function MonthlySelfEvaluationAdminReview() {
  const { addToast } = useToast();
  const [monthKey, setMonthKey] = useState(getCurrentMonthKey());
  const [departmentRole, setDepartmentRole] = useState('all');
  const [search, setSearch] = useState('');
  const [records, setRecords] = useState<MonthlySelfEvaluationAdminListEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<DetailTabValue>('work-summary');
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const deferredSearch = useDeferredValue(search);
  const hasLoadedOnceRef = useRef(false);
  const monthInputRef = useRef<HTMLInputElement | null>(null);
  const detailScrollRef = useRef<HTMLDivElement | null>(null);

  function openMonthPicker(): void {
    const input = monthInputRef.current;
    if (!input) {
      return;
    }

    input.focus();
    input.showPicker?.();
  }

  useEffect(() => {
    let active = true;

    async function loadRecords() {
      if (hasLoadedOnceRef.current) {
        setIsRefreshing(true);
      } else {
        setLoading(true);
      }

      try {
        const params = new URLSearchParams({ scope: 'admin', monthKey });
        if (departmentRole !== 'all') {
          params.set('departmentRole', departmentRole);
        }
        if (deferredSearch.trim()) {
          params.set('search', deferredSearch.trim());
        }

        const response = await fetch(`/api/performance/monthly-self-evaluations?${params.toString()}`, {
          credentials: 'include',
        });
        const payload = (await response.json()) as AdminListResponse;
        if (!response.ok || !payload.data) {
          throw new Error(payload.error || 'Failed to load monthly self-evaluations');
        }

        const nextRecords = payload.data;

        if (!active) return;
        setRecords(nextRecords);
        setSelectedId((current) => {
          if (current && nextRecords.some((record) => record.id === current)) {
            return current;
          }
          return nextRecords[0]?.id ?? null;
        });
      } catch (error) {
        if (!active) return;
        addToast({
          title: 'Unable to load monthly self-evaluations',
          description: error instanceof Error ? error.message : 'Please try again.',
          variant: 'error',
        });
      } finally {
        if (active) {
          setLoading(false);
          setIsRefreshing(false);
          hasLoadedOnceRef.current = true;
        }
      }
    }

    loadRecords();

    return () => {
      active = false;
    };
  }, [addToast, deferredSearch, departmentRole, monthKey]);

  const selectedEntry = useMemo(
    () => records.find((record) => record.id === selectedId) ?? null,
    [records, selectedId]
  );
  const selectedRecord = selectedEntry?.submission ?? null;
  const submittedCount = useMemo(
    () => records.filter((record) => record.submission_status === 'submitted').length,
    [records]
  );
  const summaryState = useEvaluationSummary({
    evaluationKind: 'monthly',
    periodKey: monthKey,
    onError: (title, description) => {
      addToast({
        title,
        description,
        variant: 'error',
      });
    },
  });

  useEffect(() => {
    if (!selectedEntry) {
      return;
    }

    detailScrollRef.current?.scrollTo({ top: 0, behavior: 'auto' });
  }, [activeTab, selectedEntry]);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Monthly Self-Evaluation Review</CardTitle>
          <CardDescription>
            Review responses by month, person, and department or role. The detail panel follows the same section order and question wording as the employee self-evaluation form.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-4 justify-between items-end">
          <div className="flex flex-wrap gap-4 md:flex-nowrap">
            <div className="space-y-2 md:w-56">
              <Label htmlFor="review-month">Month</Label>
              <Input
                ref={monthInputRef}
                id="review-month"
                type="month"
                value={monthKey}
                onChange={(event) => setMonthKey(event.target.value)}
                onClick={openMonthPicker}
                className="cursor-pointer"
              />
            </div>
            <div className="space-y-2 md:w-[22rem]">
              <Label>Department / Role</Label>
              <Select value={departmentRole} onValueChange={setDepartmentRole}>
                <SelectTrigger>
                  <SelectValue placeholder="All departments and roles" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All departments and roles</SelectItem>
                  {monthlySelfEvaluationDepartmentRoleOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 md:w-80">
              <Label htmlFor="review-search">Search</Label>
              <Input
                id="review-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by full name"
              />
            </div>
          </div>
          <Button
            onClick={summaryState.isViewingSummary ? summaryState.hideSummary : summaryState.handlePrimaryAction}
            disabled={
              summaryState.isGenerating || (!summaryState.hasSummary && submittedCount === 0)
            }
          >
            {summaryState.isViewingSummary ? (
              'Back to Details'
            ) : (
              <>
                <Sparkles className="h-4 w-4" />
                {summaryState.primaryActionLabel}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-3">
              <div>
                <CardTitle>Responses</CardTitle>
                <CardDescription>
                  {records.length} teammate{records.length === 1 ? '' : 's'} listed • {submittedCount} submitted for {formatMonthKey(monthKey)}
                </CardDescription>
              </div>
              {isRefreshing ? (
                <Badge variant="secondary" className="px-2.5 py-1 text-xs font-medium">
                  Updating
                </Badge>
              ) : null}
            </div>
          </CardHeader>
          <CardContent>
            {records.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                No monthly self-evaluations were found for the current filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Person</TableHead>
                      <TableHead>Department / Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Last edit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((record) => (
                      <TableRow
                        key={record.id}
                        className={cn(
                          'cursor-pointer transition-colors hover:bg-muted/30',
                          record.id === selectedId && 'bg-muted/50 hover:bg-muted/50'
                        )}
                        onClick={() => setSelectedId(record.id)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-8 w-8">
                              <AvatarImage src={record.avatar_url || undefined} alt={record.full_name} />
                              <AvatarFallback className="text-xs">{initials(record.full_name)}</AvatarFallback>
                            </Avatar>
                            <span className="font-medium">{record.full_name}</span>
                          </div>
                        </TableCell>
                        <TableCell>{record.department_role}</TableCell>
                        <TableCell>
                          <Badge variant={record.submission_status === 'submitted' ? 'success' : 'secondary'}>
                            {record.submission_status === 'submitted' ? 'Submitted' : 'Pending'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {record.productivity_score !== null ? `${record.productivity_score} / 10` : '—'}
                        </TableCell>
                        <TableCell>
                          {record.submitted_at
                            ? new Date(record.submitted_at).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric',
                              })
                            : '—'}
                        </TableCell>
                        <TableCell>
                          {record.submission_status !== 'submitted' ? (
                            '—'
                          ) : record.last_employee_edit_at ? (
                            <div className="space-y-1">
                              <Badge variant="secondary">Edited</Badge>
                              <p className="text-xs text-muted-foreground">
                                {formatDateTime(record.last_employee_edit_at)}
                              </p>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">Original</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as DetailTabValue)}
            className="flex h-full flex-col"
          >
          <CardHeader className="border-b border-border/80 bg-card/80 pb-4 backdrop-blur-sm">
            <div className="flex flex-col gap-3 mb-4 sm:flex-row sm:items-center sm:justify-between">
              <div className='flex flex-col gap-2'>
                <CardTitle>
                  {summaryState.isViewingSummary
                    ? 'Monthly Self-Evaluation Summary'
                    : selectedEntry?.full_name || 'Select a teammate'}
                </CardTitle>
                <CardDescription>
                  {summaryState.isViewingSummary
                    ? `Executive summary for ${formatMonthKey(monthKey)}.`
                    : selectedEntry
                    ? `${selectedEntry.department_role} • ${formatMonthKey(monthKey)}`
                    : 'Choose a person from the list to review their monthly self-evaluation status.'}
                </CardDescription>
                {!summaryState.isViewingSummary && selectedEntry ? (
                  <div className="flex flex-wrap gap-2">
                    <Badge
                      variant={selectedEntry.submission_status === 'submitted' ? 'success' : 'secondary'}
                    >
                      {selectedEntry.submission_status === 'submitted' ? 'Submitted' : 'Pending'}
                    </Badge>
                    {selectedEntry.submission_status === 'submitted' ? (
                      selectedEntry.last_employee_edit_at ? (
                        <Badge variant="secondary">
                          Edited {formatDateTime(selectedEntry.last_employee_edit_at)}
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Original submission</Badge>
                      )
                    ) : null}
                  </div>
                ) : null}
              </div>
              <div className="flex flex-col items-stretch gap-3 sm:items-end">
                {!summaryState.isViewingSummary && selectedRecord
                  ? renderProductivityMetric(selectedRecord.productivity_score)
                  : null}
              </div>
            </div>
            {selectedRecord && !summaryState.isViewingSummary ? (
              <TabsList className="mt-3 h-auto w-full justify-start gap-5 rounded-none bg-transparent p-0 text-muted-foreground">
                {detailViewTabs.map((tab) => (
                  <TabsTrigger
                    key={tab.value}
                    value={tab.value}
                    className="rounded-none border-b-2 border-transparent px-0 pb-3 pt-0 text-sm font-medium text-muted-foreground data-[state=active]:border-foreground data-[state=active]:bg-transparent data-[state=active]:text-foreground data-[state=active]:shadow-none"
                  >
                    {tab.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            ) : null}
          </CardHeader>
          <CardContent className="p-0">
            <div ref={detailScrollRef} className="max-h-[72vh] overflow-y-auto px-6 py-5">
            {summaryState.isViewingSummary && summaryState.summary ? (
              <EvaluationSummaryView
                title="Monthly Self-Evaluation"
                periodLabel={formatMonthKey(monthKey)}
                summaryMarkdown={summaryState.summary.summaryMarkdown}
                totalSubmissionsAnalyzed={summaryState.summary.totalSubmissionsAnalyzed}
                generatedAt={summaryState.summary.generatedAt}
                isStale={summaryState.summary.isStale}
                isRegenerating={summaryState.isGenerating}
                onRegenerate={summaryState.regenerateSummary}
              />
            ) : !selectedRecord ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                {selectedEntry
                  ? `${selectedEntry.full_name} has not submitted a monthly self-evaluation for ${formatMonthKey(monthKey)} yet.`
                  : 'No teammate selected.'}
              </div>
            ) : (
              detailViewTabs.map((tab) => (
                <TabsContent key={tab.value} value={tab.value} className="mt-0 space-y-6">
                  {getSectionsForTab(tab.value).map((section) => {
                    const visibleFields = section.fields.filter((field) => !field.emphasizeValue);

                    return (
                      <section key={section.title} className="space-y-3">
                        <div className="space-y-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-foreground/80">
                              {formatSectionTitle(section.title)}
                            </h3>
                            {section.title === 'FINAL REFLECTION' ? (
                              <Badge variant="secondary" className="px-2.5 py-1">
                                Forward look
                              </Badge>
                            ) : null}
                          </div>
                          <p className="text-sm text-muted-foreground">{section.description}</p>
                        </div>
                        <div className="rounded-2xl border border-border/80 bg-background/60 px-4 shadow-sm shadow-black/5 py-2">
                          {visibleFields.map((field) => renderDetailField(field, selectedRecord))}
                        </div>
                      </section>
                    );
                  })}
                </TabsContent>
              ))
            )}
            </div>
          </CardContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
}