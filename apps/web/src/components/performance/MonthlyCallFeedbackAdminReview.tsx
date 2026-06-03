'use client';

import { monthlySelfEvaluationDepartmentRoleOptions } from '@/lib/schemas/performance.schema';
import { EvaluationSummaryView } from './EvaluationSummaryView';
import {
  formatMonthlyCallEngagement,
  formatMonthlyCallOverallRating,
  monthlyCallFeedbackDetailSections,
  type MonthlyCallFeedbackAdminListEntry,
  type MonthlyCallFeedbackDetailField,
  type MonthlyCallFeedbackRecord,
} from './monthlyCallFeedbackDetailConfig';
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
  data?: MonthlyCallFeedbackAdminListEntry[];
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

function renderDetailField(field: MonthlyCallFeedbackDetailField, record: MonthlyCallFeedbackRecord) {
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

export function MonthlyCallFeedbackAdminReview() {
  const { addToast } = useToast();
  const [monthKey, setMonthKey] = useState(getCurrentMonthKey());
  const [departmentRole, setDepartmentRole] = useState('all');
  const [search, setSearch] = useState('');
  const [records, setRecords] = useState<MonthlyCallFeedbackAdminListEntry[]>([]);
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

        const response = await fetch(`/api/performance/monthly-call-feedback?${params.toString()}`, {
          credentials: 'include',
        });
        const payload = (await response.json()) as AdminListResponse;
        if (!response.ok || !payload.data) {
          throw new Error(payload.error || 'Failed to load monthly call feedback');
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
          title: 'Unable to load monthly call feedback',
          description: error instanceof Error ? error.message : 'Please try again.',
          variant: 'error',
        });
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadRecords();

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
    evaluationKind: 'monthly_call_feedback',
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
          <CardTitle>Monthly Call Feedback Review</CardTitle>
          <CardDescription>
            Review feedback on engagement, clarity, and future call improvements for each monthly session.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex gap-4 justify-between items-end">
          <div className="flex flex-wrap gap-4 md:flex-nowrap">
            <div className="space-y-2">
              <Label htmlFor="monthly-call-feedback-review-month">Month</Label>
              <Input
                id="monthly-call-feedback-review-month"
                type="month"
                value={monthKey}
                onChange={(event) => setMonthKey(event.target.value || getCurrentMonthKey())}
              />
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
              <Label htmlFor="monthly-call-feedback-review-search">Search</Label>
              <Input
                id="monthly-call-feedback-review-search"
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

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader>
            <CardTitle>Responses</CardTitle>
            <CardDescription>
              {records.length} teammate{records.length === 1 ? '' : 's'} listed • {submittedCount} submitted for {formatMonthKey(monthKey)}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {records.length === 0 ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                No monthly call feedback entries were found for the current filters.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Person</TableHead>
                      <TableHead>Department / Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Engagement</TableHead>
                      <TableHead>Overall Rating</TableHead>
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
                          {record.engagement_level !== null ? formatMonthlyCallEngagement(record.engagement_level) : '—'}
                        </TableCell>
                        <TableCell>
                          {record.overall_rating !== null ? formatMonthlyCallOverallRating(record.overall_rating) : '—'}
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
                    ? 'Monthly Call Feedback Summary'
                    : selectedEntry?.full_name || 'Select a teammate'}
                </CardTitle>
                <CardDescription>
                  {summaryState.isViewingSummary
                    ? `Executive summary for ${formatMonthKey(monthKey)}.`
                    : selectedEntry
                    ? `${selectedEntry.department_role} • ${formatMonthKey(monthKey)}`
                    : 'Choose a person from the list to review their monthly call feedback status.'}
                </CardDescription>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {!summaryState.isViewingSummary ? (
                  selectedEntry?.submission_status === 'submitted' ? (
                    <Badge variant="success">Submitted</Badge>
                  ) : (
                    <Badge variant="secondary">Pending</Badge>
                  )
                ) : null}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {summaryState.isViewingSummary && summaryState.summary ? (
              <EvaluationSummaryView
                title="Monthly Call Feedback"
                periodLabel={formatMonthKey(monthKey)}
                summaryMarkdown={summaryState.summary.summaryMarkdown}
                totalSubmissionsAnalyzed={summaryState.summary.totalSubmissionsAnalyzed}
                generatedAt={summaryState.summary.generatedAt}
                isStale={summaryState.summary.isStale}
                isRegenerating={summaryState.isGenerating}
                onRegenerate={summaryState.regenerateSummary}
              />
            ) : !selectedEntry ? (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                Select a teammate to inspect their response details.
              </div>
            ) : selectedRecord ? (
              <div className="space-y-6">
                {monthlyCallFeedbackDetailSections.map((section) => (
                  <section key={section.title} className="space-y-4 rounded-xl border border-border p-5">
                    <div>
                      <h3 className="text-base font-semibold text-foreground">{section.title}</h3>
                      <p className="text-sm text-muted-foreground">{section.description}</p>
                    </div>
                    <div className="grid gap-4 md:grid-cols-2">
                      {section.fields.map((field) => renderDetailField(field, selectedRecord))}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
                This teammate has not yet submitted monthly call feedback for {formatMonthKey(monthKey)}.
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}