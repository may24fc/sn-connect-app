'use client';

import { monthlySelfEvaluationDepartmentRoleOptions } from '@/lib/schemas/performance.schema';
import { EvaluationSummaryView } from './EvaluationSummaryView';
import {
  quarterlyTemperatureCheckDetailSections,
  type QuarterlyTemperatureCheckAdminListEntry,
  type QuarterlyTemperatureCheckDetailField,
  type QuarterlyTemperatureCheckRecord,
} from './quarterlyTemperatureCheckDetailConfig';
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

type AdminListResponse = {
  data?: QuarterlyTemperatureCheckAdminListEntry[];
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

function getCurrentQuarterKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const quarter = Math.floor(date.getMonth() / 3) + 1;
  return `${year}-Q${quarter}`;
}

function formatQuarterKey(quarterKey: string): string {
  const [year, quarter] = quarterKey.split('-Q');
  return `Q${quarter} ${year}`;
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

function getQuarterOptions(count: number = 8, date: Date = new Date()): string[] {
  const results: string[] = [];
  let currentYear = date.getFullYear();
  let currentQuarter = Math.floor(date.getMonth() / 3) + 1;

  for (let index = 0; index < count; index += 1) {
    results.push(`${currentYear}-Q${currentQuarter}`);
    currentQuarter -= 1;
    if (currentQuarter === 0) {
      currentQuarter = 4;
      currentYear -= 1;
    }
  }

  return results;
}

function renderDetailField(
  field: QuarterlyTemperatureCheckDetailField,
  record: QuarterlyTemperatureCheckRecord
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

export function QuarterlyTemperatureCheckAdminReview() {
  const { addToast } = useToast();
  const [quarterKey, setQuarterKey] = useState(getCurrentQuarterKey());
  const [departmentRole, setDepartmentRole] = useState('all');
  const [search, setSearch] = useState('');
  const [records, setRecords] = useState<QuarterlyTemperatureCheckAdminListEntry[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function loadRecords() {
      setLoading(true);
      try {
        const params = new URLSearchParams({ scope: 'admin', quarterKey });
        if (departmentRole !== 'all') {
          params.set('departmentRole', departmentRole);
        }
        if (search.trim()) {
          params.set('search', search.trim());
        }

        const response = await fetch(`/api/performance/quarterly-temperature-checks?${params.toString()}`, {
          credentials: 'include',
        });
        const payload = (await response.json()) as AdminListResponse;
        if (!response.ok || !payload.data) {
          throw new Error(payload.error || 'Failed to load quarterly temperature checks');
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
          title: 'Unable to load quarterly temperature checks',
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
  }, [addToast, departmentRole, quarterKey, search]);

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
    evaluationKind: 'quarterly',
    periodKey: quarterKey,
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
          <CardTitle>Quarterly Temperature Check Review</CardTitle>
          <CardDescription>
            Review quarter-level team health responses by quarter, person, and department or role.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-4 justify-between items-end">
          <div className="flex flex-wrap gap-4 md:flex-nowrap">
            <div className="space-y-2">
              <Label>Quarter</Label>
              <Select value={quarterKey} onValueChange={setQuarterKey}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a quarter" />
                </SelectTrigger>
                <SelectContent>
                  {getQuarterOptions().map((option) => (
                    <SelectItem key={option} value={option}>
                      {formatQuarterKey(option)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
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
            <div className="space-y-2">
              <Label htmlFor="quarterly-review-search">Search</Label>
              <Input
                id="quarterly-review-search"
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

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Responses</CardTitle>
            <CardDescription>
              {records.length} teammate{records.length === 1 ? '' : 's'} listed • {submittedCount} submitted for {formatQuarterKey(quarterKey)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {records.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                No quarterly temperature checks were found for the current filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Person</TableHead>
                      <TableHead>Department / Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Energy</TableHead>
                      <TableHead>Experience</TableHead>
                      <TableHead>Submitted</TableHead>
                      <TableHead>Last edit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((record) => (
                      <TableRow
                        key={record.id}
                        className={record.id === selectedId ? 'bg-muted/50' : undefined}
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
                          {record.energy_workload_score !== null ? `${record.energy_workload_score} / 10` : '—'}
                        </TableCell>
                        <TableCell>
                          {record.overall_experience_score !== null ? `${record.overall_experience_score} / 5` : '—'}
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

        <Card>
          <CardHeader>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>
                  {summaryState.isViewingSummary
                    ? 'Quarterly Temperature Check Summary'
                    : selectedEntry?.full_name || 'Select a teammate'}
                </CardTitle>
                <CardDescription>
                  {summaryState.isViewingSummary
                    ? `Executive summary for ${formatQuarterKey(quarterKey)}.`
                    : selectedEntry
                    ? `${selectedEntry.department_role} • ${formatQuarterKey(quarterKey)}`
                    : 'Choose a person from the list to review their quarterly temperature check status.'}
                </CardDescription>
                {!summaryState.isViewingSummary && selectedEntry ? (
                  <div className="mt-2 flex flex-wrap gap-2">
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
                {!summaryState.isViewingSummary && selectedRecord ? (
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="secondary" className="px-3 py-1 text-base font-semibold tracking-tight">
                      Energy {selectedRecord.energy_workload_score} / 10
                    </Badge>
                    <Badge variant="secondary" className="px-3 py-1 text-base font-semibold tracking-tight">
                      Experience {selectedRecord.overall_experience_score} / 5
                    </Badge>
                  </div>
                ) : null}
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {summaryState.isViewingSummary && summaryState.summary ? (
              <EvaluationSummaryView
                title="Quarterly Temperature Check"
                periodLabel={formatQuarterKey(quarterKey)}
                summaryMarkdown={summaryState.summary.summaryMarkdown}
                totalSubmissionsAnalyzed={summaryState.summary.totalSubmissionsAnalyzed}
                generatedAt={summaryState.summary.generatedAt}
                isStale={summaryState.summary.isStale}
              />
            ) : !selectedRecord ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                {selectedEntry
                  ? `${selectedEntry.full_name} has not submitted a quarterly temperature check for ${formatQuarterKey(quarterKey)} yet.`
                  : 'No teammate selected.'}
              </div>
            ) : (
              quarterlyTemperatureCheckDetailSections.map((section) => (
                <section key={section.title} className="space-y-3">
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                      {section.title}
                    </h3>
                    <p className="text-sm text-muted-foreground">{section.description}</p>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    {section.fields.map((field) => renderDetailField(field, selectedRecord))}
                  </div>
                </section>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
