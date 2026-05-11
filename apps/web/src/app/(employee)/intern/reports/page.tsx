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
  EmptyState,
  useToast,
} from '@hr-portal/ui';
import {
  CheckCircle2,
  FileEdit,
  FileText,
  Loader2,
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
  project_entries?: DailyReport['projectEntries'];
  blockers?: DailyReport['blockers'];
  next_steps?: DailyReport['nextSteps'];
  attachments?: DailyReport['attachments'];
  supervisor_notes: string | null;
  is_approved: boolean;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at?: string;
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
    ...(log.project_entries ? { projectEntries: log.project_entries } : {}),
    ...(log.blockers ? { blockers: log.blockers } : {}),
    ...(log.next_steps ? { nextSteps: log.next_steps } : {}),
    ...(log.attachments ? { attachments: log.attachments } : {}),
    ...(log.supervisor_notes ? { supervisorFeedback: log.supervisor_notes } : {}),
    status,
    submittedAt: log.created_at,
    ...(log.approved_at ? { reviewedAt: log.approved_at } : {}),
    createdAt: log.created_at,
    updatedAt: log.updated_at ?? log.created_at,
  };
}

export default function InternReportsPage(): ReactNode {
  const router = useRouter();
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [editingLogId, setEditingLogId] = useState<string | null>(null);
  const { addToast, updateToast } = useToast();

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

  const runEodToastAction = useCallback(
    async <T,>(
      action: () => Promise<T>,
      options: {
        loadingTitle: string;
        loadingDescription?: string;
        successTitle: string;
        successDescription?: string;
        errorTitle: string;
      },
      rethrowOnError = false,
    ): Promise<T | undefined> => {
      const toastId = addToast({
        title: options.loadingTitle,
        ...(options.loadingDescription
          ? { description: options.loadingDescription }
          : {}),
        duration: 0,
      });

      try {
        const result = await action();
        updateToast(toastId, {
          title: options.successTitle,
          ...(options.successDescription
            ? { description: options.successDescription }
            : {}),
          variant: 'success',
          duration: 3000,
        });
        return result;
      } catch (error) {
        updateToast(toastId, {
          title: options.errorTitle,
          ...(error instanceof Error && error.message
            ? { description: error.message }
            : {}),
          variant: 'error',
          duration: 5000,
        });

        if (rethrowOnError) {
          throw error;
        }

        return undefined;
      }
    },
    [addToast, updateToast],
  );

  // ── Handlers ──
  const handleCreateOrSubmit = useCallback(
    async (data: EODReportFormData & { status: 'draft' | 'submitted' }) => {
      if (!internshipId) return;
      await runEodToastAction(
        () =>
          createLog.mutateAsync({
            internshipId,
            logDate: data.date,
            hoursWorked: data.hoursLogged,
            projectEntries: data.projectEntries,
            ...(data.blockers ? { blockers: data.blockers } : {}),
            ...(data.nextSteps ? { nextSteps: data.nextSteps } : {}),
            ...(data.attachments ? { attachments: data.attachments } : {}),
            ...(data.existingAttachments
              ? { retainedAttachments: data.existingAttachments }
              : {}),
            status: data.status,
          }),
        {
          loadingTitle:
            data.status === 'draft' ? 'Saving EOD draft...' : 'Submitting EOD report...',
          loadingDescription:
            data.status === 'draft'
              ? 'Your work is being saved so you can continue later.'
              : 'Your end-of-day report is being submitted.',
          successTitle:
            data.status === 'draft' ? 'EOD draft saved' : 'EOD report submitted',
          successDescription:
            data.status === 'draft'
              ? 'You can return later to finish or submit it.'
              : `${data.hoursLogged} hours logged for ${new Date(data.date).toLocaleDateString()}.`,
          errorTitle:
            data.status === 'draft'
              ? 'Unable to save EOD draft'
              : 'Unable to submit EOD report',
        },
        true,
      );
      setViewMode('list');
    },
    [internshipId, createLog, runEodToastAction],
  );

  const handleUpdateDraft = useCallback(
    async (data: EODReportFormData & { status: 'draft' | 'submitted' }) => {
      if (!internshipId || !editingLogId) return;
      await runEodToastAction(
        () =>
          updateDraftLog.mutateAsync({
            internshipId,
            logId: editingLogId,
            logDate: data.date,
            hoursWorked: data.hoursLogged,
            projectEntries: data.projectEntries,
            ...(data.blockers ? { blockers: data.blockers } : {}),
            ...(data.nextSteps ? { nextSteps: data.nextSteps } : {}),
            ...(data.attachments ? { attachments: data.attachments } : {}),
            ...(data.existingAttachments
              ? { retainedAttachments: data.existingAttachments }
              : {}),
            status: data.status,
          }),
        {
          loadingTitle:
            data.status === 'draft' ? 'Updating EOD draft...' : 'Submitting EOD report...',
          loadingDescription:
            data.status === 'draft'
              ? 'Saving your latest draft changes.'
              : 'Finalizing and submitting your draft report.',
          successTitle:
            data.status === 'draft' ? 'EOD draft updated' : 'Draft submitted as EOD',
          successDescription:
            data.status === 'draft'
              ? 'Your changes were saved.'
              : `${data.hoursLogged} hours logged for ${new Date(data.date).toLocaleDateString()}.`,
          errorTitle:
            data.status === 'draft'
              ? 'Unable to update EOD draft'
              : 'Unable to submit EOD draft',
        },
        true,
      );
      setEditingLogId(null);
      setViewMode('list');
    },
    [internshipId, editingLogId, updateDraftLog, runEodToastAction],
  );

  const handleQuickSubmitDraft = useCallback(
    async (logId: string) => {
      if (!internshipId) return;
      await runEodToastAction(
        () =>
          updateDraftLog.mutateAsync({
            internshipId,
            logId,
            status: 'submitted',
          }),
        {
          loadingTitle: 'Submitting EOD draft...',
          loadingDescription: 'Sending your saved draft as an end-of-day report.',
          successTitle: 'Draft submitted as EOD',
          successDescription: 'Your report is now marked as submitted.',
          errorTitle: 'Unable to submit EOD draft',
        },
      );
    },
    [internshipId, updateDraftLog, runEodToastAction],
  );

  // ── Render ──
  if (isLoading) {
    return (
      <div className="h-full">
        <EmptyState
          icon={<Loader2 className="h-5 w-5 animate-spin" />}
          title="Loading your reports"
          description="Fetching your internship report history and draft entries."
        />
      </div>
    );
  }

  if (hasNoInternship) {
    return (
      <div className="space-y-6">
        <PageHeader />
        <Card>
          <CardContent className="p-8">
            <EmptyState
              icon={FileText}
              title="Reports unlock after internship assignment"
              description="An administrator still needs to assign your internship details before you can submit or save EOD reports. Once your assignment is active, your reporting history and draft tools will appear here."
              action={{ label: 'View profile', onClick: () => router.push('/intern/profile') }}
            />
          </CardContent>
        </Card>
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
          onSubmitError={(message) =>
            addToast({
              title: 'EOD action needs attention',
              description: message,
              variant: 'error',
            })
          }
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
          onSubmitError={(message) =>
            addToast({
              title: 'EOD action needs attention',
              description: message,
              variant: 'error',
            })
          }
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
            ...(editingLog.project_entries && editingLog.project_entries.length > 0
              ? { projectEntries: editingLog.project_entries }
              : {}),
            ...(editingLog.blockers ? { blockers: editingLog.blockers } : {}),
            ...(editingLog.next_steps ? { nextSteps: editingLog.next_steps } : {}),
            ...(editingLog.attachments
              ? { existingAttachments: editingLog.attachments }
              : {}),
            ...(editingLog.tasks_completed !== '(draft)'
              ? { tasksCompleted: editingLog.tasks_completed }
              : {}),
            ...(editingLog.challenges ? { challenges: editingLog.challenges } : {}),
            ...(editingLog.learnings ? { focusTomorrow: editingLog.learnings } : {}),
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
                    {log.project_entries?.[0]
                      ? `${log.project_entries[0].projectFocus}: ${log.project_entries[0].actionTaken}`
                      : log.tasks_completed === '(draft)'
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
            <CardContent className="p-8">
              <EmptyState
                icon={FileText}
                title="No reports submitted yet"
                description="Create your first EOD report to start tracking your internship progress."
                action={{ label: 'New EOD report', onClick: () => setViewMode('new') }}
                size="sm"
              />
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
