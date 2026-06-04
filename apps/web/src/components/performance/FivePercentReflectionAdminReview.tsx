'use client';

import { monthlySelfEvaluationDepartmentRoleOptions } from '@/lib/schemas/performance.schema';
import { EvaluationSummaryView } from './EvaluationSummaryView';
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
  useToast,
} from '@hr-portal/ui';
import { useEffect, useMemo, useState } from 'react';
import { useEvaluationSummary } from './useEvaluationSummary';
import { Sparkles } from 'lucide-react';
import {
  type FivePercentReflectionAdminListEntry,
  type FivePercentReflectionDetailField,
  type FivePercentReflectionRecord,
  fivePercentReflectionDetailSections,
  getFivePercentAverageRank,
} from './fivePercentReflectionDetailConfig';

type AdminListResponse = {
  data?: FivePercentReflectionAdminListEntry[];
  error?: string;
};

function initials(name: string): string {
  return name
    .split(' ')
    .map((segment) => segment[0] ?? '')
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function getCurrentMonthKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${year}-${month}`;
}

function formatMonthKey(monthKey: string): string {
  const [year, month] = monthKey.split('-').map(Number);
  return new Date(year || new Date().getFullYear(), (month || 1) - 1, 1).toLocaleDateString(
    'en-US',
    {
      month: 'long',
      year: 'numeric',
    }
  );
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

function renderDetailField(
  field: FivePercentReflectionDetailField,
  record: FivePercentReflectionRecord
) {
  const value = field.value(record);
  const valueClassName = field.emphasizeValue
    ? 'mt-2 text-3xl font-semibold tracking-tight text-foreground'
    : field.preserveWhitespace
      ? 'mt-1 whitespace-pre-wrap text-sm text-muted-foreground'
      : 'mt-1 text-sm text-muted-foreground';

  return (
    <div key={field.label} className={field.fullWidth ? 'md:col-span-2' : undefined}>
      <p className="text-sm font-medium text-foreground">{field.label}</p>
      <p className={valueClassName}>{value}</p>
    </div>
  );
}

export function FivePercentReflectionAdminReview() {
  const { addToast } = useToast();
  const [monthKey, setMonthKey] = useState(getCurrentMonthKey());
  const [departmentRole, setDepartmentRole] = useState('all');
  const [search, setSearch] = useState('');
  const [records, setRecords] = useState<FivePercentReflectionAdminListEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadRecords() {
      setLoading(true);
      try {
        const params = new URLSearchParams({ scope: 'admin', monthKey });
        if (departmentRole !== 'all') {
          params.set('departmentRole', departmentRole);
        }
        if (search.trim()) {
          params.set('search', search.trim());
        }

        const response = await fetch(
          `/api/performance/five-percent-reflections?${params.toString()}`,
          {
            credentials: 'include',
          }
        );
        const payload = (await response.json()) as AdminListResponse;
        if (!response.ok || !payload.data) {
          throw new Error(payload.error || 'Failed to load 5% reflections');
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
          title: 'Unable to load 5% reflections',
          description: error instanceof Error ? error.message : 'Please try again.',
          variant: 'error',
        });
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    loadRecords();

    return () => {
      active = false;
    };
  }, [addToast, departmentRole, monthKey, search]);

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
    evaluationKind: 'five_percent',
    periodKey: monthKey,
    onError: (title, description) => {
      addToast({
        title,
        description,
        variant: 'error',
      });
    },
  });

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
          <CardTitle>5% Reflection Review</CardTitle>
          <CardDescription>
            Review monthly 5% reflections across work, family, personal context, and the deeper
            decision-making topics each teammate wants to explore next.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-4 justify-between items-end">
          <div className="flex flex-wrap gap-4 md:flex-nowrap">
            <div className="space-y-2 md:w-56">
              <Label htmlFor="reflection-month">Month</Label>
              <Input
                id="reflection-month"
                type="month"
                value={monthKey}
                onChange={(event) => setMonthKey(event.target.value)}
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
              <Label htmlFor="reflection-search">Search</Label>
              <Input
                id="reflection-search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by full name"
              />
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
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
            {summaryState.hasSummary ? (
              <Button
                variant="outline"
                onClick={summaryState.regenerateSummary}
                disabled={summaryState.isGenerating}
              >
                {summaryState.isGenerating ? 'Regenerating...' : 'Regenerate Summary'}
              </Button>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Submissions</CardTitle>
            <CardDescription>
              {records.length} teammate{records.length === 1 ? '' : 's'} listed, {submittedCount}{' '}
              submitted for {formatMonthKey(monthKey)}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Teammate</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Avg Rank</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Last edit</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {records.map((record) => (
                  <TableRow
                    key={record.id}
                    className="cursor-pointer"
                    data-state={record.id === selectedId ? 'selected' : undefined}
                    onClick={() => setSelectedId(record.id)}
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-9 w-9">
                          <AvatarImage
                            src={record.avatar_url ?? undefined}
                            alt={record.full_name}
                          />
                          <AvatarFallback>{initials(record.full_name)}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-foreground">{record.full_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {record.submitted_at
                              ? new Date(record.submitted_at).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric',
                                })
                              : 'Not submitted'}
                          </p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{record.department_role}</TableCell>
                    <TableCell>
                      {record.average_rank ? `${record.average_rank} / 10` : '-'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={record.submission_status === 'submitted' ? 'success' : 'secondary'}
                      >
                        {record.submission_status === 'submitted' ? 'Submitted' : 'Pending'}
                      </Badge>
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
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>
                  {summaryState.isViewingSummary ? '5% Reflection Summary' : 'Reflection detail'}
                </CardTitle>
                <CardDescription>
                  {summaryState.isViewingSummary
                    ? `Executive summary for ${formatMonthKey(monthKey)}.`
                    : selectedEntry
                      ? `${selectedEntry.full_name} • ${selectedEntry.department_role} • ${formatMonthKey(monthKey)}`
                      : 'Choose a teammate to review their reflection.'}
                </CardDescription>
              </div>
            </div>
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
          </CardHeader>
          <CardContent className="space-y-6">
            {summaryState.isViewingSummary && summaryState.summary ? (
              <EvaluationSummaryView
                title="5% Reflection"
                periodLabel={formatMonthKey(monthKey)}
                summaryMarkdown={summaryState.summary.summaryMarkdown}
                totalSubmissionsAnalyzed={summaryState.summary.totalSubmissionsAnalyzed}
                generatedAt={summaryState.summary.generatedAt}
                isStale={summaryState.summary.isStale}
              />
            ) : !selectedEntry ? (
              <p className="text-sm text-muted-foreground">No reflection selected.</p>
            ) : !selectedRecord ? (
              <p className="text-sm text-muted-foreground">
                {selectedEntry.full_name} has not submitted a 5% reflection for{' '}
                {formatMonthKey(monthKey)} yet.
              </p>
            ) : (
              <>
                <div className="rounded-xl border border-border bg-muted/30 p-4">
                  <p className="text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
                    Average Rank
                  </p>
                  <p className="mt-2 text-3xl font-semibold tracking-tight text-foreground">
                    {getFivePercentAverageRank(selectedRecord)} / 10
                  </p>
                </div>

                {fivePercentReflectionDetailSections.map((section) => (
                  <Card key={section.title}>
                    <CardHeader>
                      <CardTitle className="text-base">{section.title}</CardTitle>
                      <CardDescription>{section.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-2">
                      {section.fields.map((field) => renderDetailField(field, selectedRecord))}
                    </CardContent>
                  </Card>
                ))}
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
