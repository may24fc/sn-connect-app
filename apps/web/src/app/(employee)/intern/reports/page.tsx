'use client';

import {
  useCreateInternDailyLog,
  useInternshipLogs,
  useInternships,
  useUpdateInternDraftLog,
} from '@/hooks/useInternships';
import { StatCard as SharedStatCard, StatCardGrid } from '@/components/data-display/StatCard';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  type DailyReport,
  type DailyReportId,
  DailyReportCard,
  EODReportForm,
  type EODReportFormData,
  type InternId,
  type InternshipPeriodId,
  SectionTooltip,
  HelpLink,
} from '@hr-portal/ui';
import {
  CheckCircle2,
  FileEdit,
  FileText,
  GraduationCap,
  Plus,
  Send,
} from 'lucide-react';
import Link from 'next/link';
import { type ReactNode, useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';

type ViewMode = 'list' | 'new' | 'edit';

interface DailyLogRow {
  id: string;
  internship_id: string;
  log_date: string;
  hours_worked: number;
  tasks_completed: string;
  learnings: string | null;
  challenges: string | null;
  supervisor_notes: string | null;
  is_approved: boolean;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  status?: string;
}

function logToReport(log: DailyLogRow, internshipId: string): DailyReport {
  const rawStatus = log.status ?? 'submitted';
  const status =
    rawStatus === 'draft'
      ? ('draft' as const)
      : log.is_approved
        ? ('reviewed' as const)
        : ('submitted' as const);

  return {
    id: log.id as DailyReportId,
    internId: '' as InternId,
    internshipPeriodId: internshipId as InternshipPeriodId,
    date: log.log_date,
    tasksCompleted: log.tasks_completed,
    hoursLogged: Number(log.hours_worked),
    learnings: log.learnings ?? '',
    ...(log.challenges ? { challenges: log.challenges } : {}),
    ...(log.supervisor_notes ? { supervisorFeedback: log.supervisor_notes } : {}),
    status,
    submittedAt: log.created_at,
    ...(log.approved_at ? { reviewedAt: log.approved_at } : {}),
    createdAt: log.created_at,
    updatedAt: log.created_at,
  };
}

export default function InternReportsPage(): ReactNode {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingLogId, setEditingLogId] = useState<string | null>(null);

  // ── Data fetching ──
  const listQuery = useInternships({ page: 1, pageSize: 1, status: 'active' });
  const activeInternshipId = listQuery.data?.data?.[0]?.id ?? null;
  const internshipId =
    listQuery.data?.data?.[0]?.internshipId ?? activeInternshipId;
  const logsQuery = useInternshipLogs(internshipId, !!internshipId);

  const createLog = useCreateInternDailyLog();
  const updateDraftLog = useUpdateInternDraftLog();

  const isLoading =
    listQuery.isLoading || (!!internshipId && logsQuery.isLoading);
  const hasNoInternship =
    !listQuery.isLoading && listQuery.data?.data?.length === 0;

  // Redirect if no active internship
  if (hasNoInternship) {
    router.push('/intern/setup');
    return null;
  }

  const logs = (logsQuery.data?.data ?? []) as DailyLogRow[];

  // biome-ignore lint/correctness/useExhaustiveDependencies: logs ref is stable from query
  const { drafts, submitted } = useMemo(() => {
    const d: DailyLogRow[] = [];
    const s: DailyLogRow[] = [];
    for (const log of logs) {
      if (log.status === 'draft') d.push(log);
      else s.push(log);
    }
    return { drafts: d, submitted: s };
  }, [logs]);

  // biome-ignore lint/correctness/useExhaustiveDependencies: logs ref is stable from query
  const editingLog = useMemo(
    () =>
      editingLogId ? logs.find((l) => l.id === editingLogId) ?? null : null,
    [editingLogId, logs],
  );

  // ── Handlers ──
  const handleCreateOrSubmit = useCallback(
    async (data: EODReportFormData & { status: 'draft' | 'submitted' }) => {
      if (!internshipId) return;
      await createLog.mutateAsync({
        internshipId,
        logDate: data.date,
        hoursWorked: data.hoursLogged,
        tasksCompleted: data.tasksCompleted,
        ...(data.challenges ? { challenges: data.challenges } : {}),
        status: data.status,
      });
      setViewMode('list');
    },
    [internshipId, createLog],
  );

  const handleUpdateDraft = useCallback(
    async (data: EODReportFormData & { status: 'draft' | 'submitted' }) => {
      if (!internshipId || !editingLogId) return;
      await updateDraftLog.mutateAsync({
        internshipId,
        logId: editingLogId,
        logDate: data.date,
        hoursWorked: data.hoursLogged,
        tasksCompleted: data.tasksCompleted,
        challenges: data.challenges ?? null,
        status: data.status,
      });
      setEditingLogId(null);
      setViewMode('list');
    },
    [internshipId, editingLogId, updateDraftLog],
  );

  const handleQuickSubmitDraft = useCallback(
    async (logId: string) => {
      if (!internshipId) return;
      await updateDraftLog.mutateAsync({
        internshipId,
        logId,
        status: 'submitted',
      });
    },
    [internshipId, updateDraftLog],
  );

  // ── Render ──
  if (isLoading) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4">
        <GraduationCap
          className="h-10 w-10 text-slate-700 dark:text-zinc-400 animate-pulse"
          strokeWidth={1.5}
        />
        <p className="text-sm text-zinc-500">Loading your reports…</p>
      </div>
    );
  }

  // Show form for new report
  if (viewMode === 'new') {
    return (
      <div className="space-y-6">
        <PageHeader />
        <EODReportForm
          onSubmit={handleCreateOrSubmit}
          isSubmitting={
            createLog.isPending && createLog.variables?.status !== 'draft'
          }
          isSavingDraft={
            createLog.isPending && createLog.variables?.status === 'draft'
          }
          onCancel={() => setViewMode('list')}
        />
      </div>
    );
  }

  // Show form for editing a draft
  if (viewMode === 'edit' && editingLog) {
    return (
      <div className="space-y-6">
        <PageHeader />
        <EODReportForm
          editMode
          onSubmit={handleUpdateDraft}
          isSubmitting={
            updateDraftLog.isPending &&
            updateDraftLog.variables?.status === 'submitted'
          }
          isSavingDraft={
            updateDraftLog.isPending &&
            updateDraftLog.variables?.status === 'draft'
          }
          defaultValues={{
            date: editingLog.log_date,
            hoursLogged: Number(editingLog.hours_worked),
            tasksCompleted:
              editingLog.tasks_completed === '(draft)'
                ? ''
                : editingLog.tasks_completed,
            ...(editingLog.challenges ? { challenges: editingLog.challenges } : {}),
          }}
          onCancel={() => {
            setEditingLogId(null);
            setViewMode('list');
          }}
        />
      </div>
    );
  }

  // ── List view ──
  return (
    <div className="space-y-6">
      {/* Header with CTA */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <PageHeader />
        <Button onClick={() => setViewMode('new')} className="shrink-0">
          <Plus className="mr-2 h-4 w-4" />
          New EOD Report
        </Button>
      </div>

      {/* Stats row */}
      <StatCardGrid columns={4}>
        <SharedStatCard
          label="Total Reports"
          value={logs.length}
          icon={<FileText className="h-4 w-4" strokeWidth={1.5} />}
        />
        <SharedStatCard
          label="Drafts"
          value={drafts.length}
          icon={<FileEdit className="h-4 w-4" strokeWidth={1.5} />}
        />
        <SharedStatCard
          label="Submitted"
          value={submitted.filter((l) => !l.is_approved).length}
          icon={<Send className="h-4 w-4" strokeWidth={1.5} />}
        />
        <SharedStatCard
          label="Reviewed"
          value={submitted.filter((l) => l.is_approved).length}
          icon={<CheckCircle2 className="h-4 w-4" strokeWidth={1.5} />}
        />
      </StatCardGrid>

      {/* Draft reports section */}
      {drafts.length > 0 && (
        <Card className="border-amber-200 dark:border-amber-900/50">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileEdit className="h-4 w-4 text-amber-500" />
              Draft Reports
            </CardTitle>
            <CardDescription>
              These reports are saved as drafts. Edit or submit them when ready.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {drafts.map((log) => (
              <div
                key={log.id}
                className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 rounded-lg border border-amber-100 dark:border-amber-900/30 bg-amber-50/50 dark:bg-amber-950/20"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium">
                      {new Date(log.log_date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                    <Badge variant="secondary" className="text-xs">
                      Draft
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {log.hours_worked} hrs
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground truncate">
                    {log.tasks_completed === '(draft)'
                      ? 'No tasks entered yet'
                      : log.tasks_completed}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingLogId(log.id);
                      setViewMode('edit');
                    }}
                  >
                    <FileEdit className="mr-1.5 h-3.5 w-3.5" />
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleQuickSubmitDraft(log.id)}
                    disabled={updateDraftLog.isPending}
                  >
                    <Send className="mr-1.5 h-3.5 w-3.5" />
                    Submit
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Submitted reports */}
      <div className="space-y-4">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          Submitted Reports
        </h2>
        {submitted.length > 0 ? (
          submitted.map((log) => (
            <DailyReportCard
              key={log.id}
              report={logToReport(log, internshipId!)}
            />
          ))
        ) : (
          <Card>
            <CardContent className="p-8 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>
                No reports submitted yet. Click &quot;New EOD Report&quot; to get
                started.
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}

function PageHeader(): ReactNode {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-zinc-50 dark:bg-zinc-900">
        <FileText
          className="h-5 w-5 text-slate-700 dark:text-zinc-400"
          strokeWidth={1.5}
        />
      </div>
      <div>
        <div className="flex items-center gap-1.5">
          <h1 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
            My Reports
          </h1>
          <SectionTooltip content="Submit end-of-day reports to track your internship progress. Save as draft to finish later." />
        </div>
        <p className="text-sm text-zinc-500 dark:text-zinc-400">
          Your end-of-day reports &mdash; drafts &amp; submissions
        </p>
        <HelpLink
          href="/help/reports"
          label="Reports FAQ"
          LinkComponent={Link}
        />
      </div>
    </div>
  );
}

// End of file
