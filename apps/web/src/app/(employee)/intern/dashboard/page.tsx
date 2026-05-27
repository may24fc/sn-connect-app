'use client';

import {
  BentoCard,
  BentoCardContent,
  BentoCardHeader,
  BentoCardTitle,
  BentoGrid,
  StatCard,
  StatCardGrid,
} from '@/components/data-display';
import { CompanyPulseWidget } from '@/components/CompanyPulseWidget';
import { EvaluationCadenceBanner } from '@/components/performance/EvaluationCadenceBanner';
import { useCreateInternDailyLog, useInternship, useInternships } from '@/hooks/useInternships';
import { useEmployeeDashboardAttentionItems } from '@/hooks/useEmployeeDashboardAttentionItems';
import { useEvaluationCadence } from '@/hooks/useEvaluationCadence';
import {
  Badge,
  Button,
  type DailyReport,
  type DailyReportId,
  DailyReportSummary,
  DashboardAttentionCarousel,
  EODReportForm,
  type EODReportFormData,
  type InternId,
  type InternshipPeriodId,
  Progress,
  SlidePanel,
  SlidePanelBody,
  SlidePanelContent,
  SlidePanelDescription,
  SlidePanelHeader,
  SlidePanelTitle,
  getDaysRemaining,
  useToast,
} from '@hr-portal/ui';
import {
  Building2,
  Calendar,
  ChevronRight,
  Clock,
  FileText,
  GraduationCap,
  Send,
  Target,
  TrendingUp,
  User,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type ReactNode, useMemo, useState } from 'react';

export default function InternDashboardPage(): ReactNode {
  const [showForm, setShowForm] = useState(false);
  const internRouter = useRouter();

  const listQuery = useInternships({ page: 1, pageSize: 1, status: 'active' });
  const activeInternshipId = listQuery.data?.data?.[0]?.id || null;
  const detailQuery = useInternship(activeInternshipId, !!activeInternshipId);
  const createLogMutation = useCreateInternDailyLog();
  const { addToast, updateToast } = useToast();
  const { data: evaluationCadence } = useEvaluationCadence();

  // Attention items — onboarding reminders, pending tasks
  const { items: attentionItems, isLoading: isAttentionLoading } =
    useEmployeeDashboardAttentionItems();

  const profile = detailQuery.data?.data;
  const reports = profile?.recentReports || [];
  const uiReports: Array<DailyReport> = reports.map((report) => ({
    ...report,
    id: report.id as DailyReportId,
    internId: report.internId as InternId,
    internshipPeriodId: report.internshipPeriodId as InternshipPeriodId,
  }));
  const today = useMemo(() => new Date().toISOString().split('T')[0], []);
  const todayReport = uiReports.find((report) => report.date === today);

  const isLoading = listQuery.isLoading || detailQuery.isLoading;
  const loadError = listQuery.error || detailQuery.error;

  const daysRemaining = profile ? getDaysRemaining(profile.endDate) : 0;
  const progressPercentage = profile
    ? Math.round((profile.completedHours / Math.max(1, profile.requiredHours)) * 100)
    : 0;

  const handleSubmitReport = async (data: EODReportFormData): Promise<void> => {
    if (!activeInternshipId) {
      return;
    }

    const toastId = addToast({
      title: 'Submitting EOD report...',
      description: 'Your end-of-day report is being sent.',
      duration: 0,
    });

    const payload = {
      internshipId: activeInternshipId,
      logDate: data.date,
      hoursWorked: data.hoursLogged,
      projectEntries: data.projectEntries,
      ...(data.blockers ? { blockers: data.blockers } : {}),
      ...(data.nextSteps ? { nextSteps: data.nextSteps } : {}),
      ...(data.attachments ? { attachments: data.attachments } : {}),
      ...(data.existingAttachments
        ? { retainedAttachments: data.existingAttachments }
        : {}),
    };

    try {
      await createLogMutation.mutateAsync(payload);
      updateToast(toastId, {
        title: 'EOD report submitted',
        description: `${data.hoursLogged} hours logged for ${new Date(data.date).toLocaleDateString()}.`,
        variant: 'success',
        duration: 3000,
      });
      setShowForm(false);
    } catch (error) {
      updateToast(toastId, {
        title: 'Unable to submit EOD report',
        ...(error instanceof Error && error.message
          ? { description: error.message }
          : {}),
        variant: 'error',
        duration: 5000,
      });
      throw error;
    }
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-zinc-500 dark:text-zinc-400">
        Loading internship dashboard...
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-rose-600 dark:text-rose-400">
        Failed to load internship data.
      </div>
    );
  }

  if (!profile) {
    return <InternshipAssignmentPendingState />;
  }

  return (
    <div className="h-full space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
            Intern Dashboard
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-500 dark:text-zinc-400 mt-1">
            Track your internship progress and submit daily reports.
          </p>
        </div>
        {!todayReport && (
          <Button onClick={() => setShowForm(true)}>
            <FileText className="mr-2 h-4 w-4" strokeWidth={1.5} />
            Submit EOD Report
          </Button>
        )}
      </div>

      <EvaluationCadenceBanner banner={evaluationCadence?.banner ?? null} />

      {/* Needs Action Carousel */}
      <DashboardAttentionCarousel
        items={attentionItems}
        isLoading={isAttentionLoading}
        onNavigate={(path) => internRouter.push(path)}
      />

      {/* Profile Card */}
      <div
        className="bg-card dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4"
        style={{ boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.03)' }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {profile.name}
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {profile.program} - {profile.school}
              </p>
              <div className="flex items-center gap-4 mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                <span className="flex items-center gap-1">
                  <Building2 className="h-3 w-3" strokeWidth={1.5} />
                  {profile.department}
                </span>
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" strokeWidth={1.5} />
                  {profile.supervisor}
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="success">Active</Badge>
            <Badge variant="secondary">{daysRemaining} days remaining</Badge>
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div data-tour="stat-cards">
        <StatCardGrid columns={4}>
          <StatCard
            label="Hours Logged"
            value={profile.completedHours}
            trend={{ direction: 'up', value: `${progressPercentage}% complete` }}
            icon={<Clock className="h-4 w-4" strokeWidth={1.5} />}
          />
          <StatCard
            label="Required Hours"
            value={profile.requiredHours}
            trend={{ direction: 'stable', value: 'Target' }}
            icon={<Target className="h-4 w-4" strokeWidth={1.5} />}
          />
          <StatCard
            label="Reports Submitted"
            value={uiReports.length}
            trend={{ direction: 'up', value: 'This period' }}
            icon={<FileText className="h-4 w-4" strokeWidth={1.5} />}
          />
          <StatCard
            label="Days Remaining"
            value={daysRemaining}
            trend={{ direction: 'down', value: 'Until completion' }}
            icon={<Calendar className="h-4 w-4" strokeWidth={1.5} />}
          />
        </StatCardGrid>
      </div>

      {/* Main Bento Grid */}
      <BentoGrid columns={4}>
        {/* Hours Progress Card */}
        <BentoCard colSpan={2}>
          <BentoCardHeader>
            <BentoCardTitle icon={<TrendingUp className="h-4 w-4" strokeWidth={1.5} />}>
              Hours Progress
            </BentoCardTitle>
            <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 tabular-nums">
              {progressPercentage}%
            </span>
          </BentoCardHeader>
          <BentoCardContent>
            <div className="space-y-4">
              <Progress value={progressPercentage} className="h-3" />
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    Completed
                  </p>
                  <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
                    {profile.completedHours} hrs
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                  <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    Remaining
                  </p>
                  <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
                    {Math.max(0, profile.requiredHours - profile.completedHours)} hrs
                  </p>
                </div>
              </div>
            </div>
          </BentoCardContent>
        </BentoCard>

        {/* Today's Status Card */}
        <BentoCard colSpan={2}>
          <BentoCardHeader>
            <BentoCardTitle icon={<Calendar className="h-4 w-4" strokeWidth={1.5} />}>
              Today's Status
            </BentoCardTitle>
          </BentoCardHeader>
          <BentoCardContent>
            <div className="space-y-4">
              {todayReport ? (
                <div className="flex items-center justify-between p-4 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center gap-3">
                    <FileText
                      className="h-4 w-4 text-zinc-500 dark:text-zinc-400 flex-shrink-0"
                      strokeWidth={1.5}
                    />
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-zinc-100">
                        EOD Report Submitted
                      </p>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        {todayReport.hoursLogged} hours logged today
                      </p>
                    </div>
                  </div>
                  <Badge variant="success">Submitted</Badge>
                </div>
              ) : (
                <div className="flex items-center justify-between p-4 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-amber-500 flex-shrink-0" strokeWidth={1.5} />
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-zinc-100">
                        No Report Today
                      </p>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        Don&apos;t forget to submit your EOD report
                      </p>
                    </div>
                  </div>
                  <Button size="sm" onClick={() => setShowForm(true)}>
                    <Send className="h-4 w-4" strokeWidth={1.5} />
                    Submit Now
                  </Button>
                </div>
              )}

              {/* Internship Timeline */}
              <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center justify-between text-sm mb-2">
                  <span className="text-zinc-500 dark:text-zinc-400">Internship Period</span>
                </div>
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-zinc-600 dark:text-zinc-300 tabular-nums">
                    {new Date(profile.startDate).toLocaleDateString()}
                  </span>
                  <div className="flex-1 h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-slate-900 dark:bg-zinc-800 rounded-full"
                      style={{
                        width: `${Math.min(
                          ((new Date().getTime() - new Date(profile.startDate).getTime()) /
                            (new Date(profile.endDate).getTime() -
                              new Date(profile.startDate).getTime())) *
                            100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                  <span className="text-zinc-600 dark:text-zinc-300 tabular-nums">
                    {new Date(profile.endDate).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </BentoCardContent>
        </BentoCard>

        {/* Company Calendar Card */}
        <BentoCard colSpan={2}>
          <BentoCardHeader>
            <BentoCardTitle icon={<Calendar className="h-4 w-4" strokeWidth={1.5} />}>
              Company Calendar
            </BentoCardTitle>
            <Link href="/calendar">
              <Button variant="ghost" size="xs">
                View Calendar
                <ChevronRight className="ml-1 h-4 w-4" strokeWidth={1.5} />
              </Button>
            </Link>
          </BentoCardHeader>
          <BentoCardContent>
            <CompanyPulseWidget />
          </BentoCardContent>
        </BentoCard>
      </BentoGrid>

      {/* EOD Report — Slide Panel */}
      <SlidePanel open={showForm && !todayReport} onOpenChange={setShowForm}>
        <SlidePanelContent size="2xl">
          <SlidePanelHeader>
            <SlidePanelTitle className="flex items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                <FileText className="h-4 w-4 text-primary" strokeWidth={1.5} />
              </div>
              End of Day Report
            </SlidePanelTitle>
            <SlidePanelDescription>
              Submit your daily progress report for today.
            </SlidePanelDescription>
          </SlidePanelHeader>
          <SlidePanelBody className="p-0">
            <EODReportForm
              onSubmit={handleSubmitReport}
              isSubmitting={createLogMutation.isPending}
              className="border-0 shadow-none rounded-none"
            />
          </SlidePanelBody>
        </SlidePanelContent>
      </SlidePanel>

      {/* Recent Reports Card */}
      <BentoCard colSpan={4}>
        <BentoCardHeader>
          <BentoCardTitle icon={<FileText className="h-4 w-4" strokeWidth={1.5} />}>
            Recent Reports
          </BentoCardTitle>
          <Link href="/intern/reports">
            <Button variant="ghost" size="xs">
              View All
              <ChevronRight className="ml-1 h-4 w-4" strokeWidth={1.5} />
            </Button>
          </Link>
        </BentoCardHeader>
        <BentoCardContent>
          <div className="space-y-2">
            {uiReports.slice(0, 5).map((report) => (
              <DailyReportSummary key={report.id} report={report} />
            ))}
          </div>
        </BentoCardContent>
      </BentoCard>
    </div>
  );
}

function InternshipAssignmentPendingState(): ReactNode {
  return (
    <div className="h-full flex items-center justify-center">
      <div className="w-full max-w-xl rounded-xl border border-zinc-200 bg-card p-8 text-center shadow-sm dark:border-zinc-800">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 dark:bg-zinc-900/40">
          <GraduationCap className="h-7 w-7 text-slate-700 dark:text-zinc-400" strokeWidth={1.5} />
        </div>
        <div className="mb-3 flex items-center justify-center gap-2">
          <Badge variant="secondary">Awaiting Internship Assignment</Badge>
        </div>
        <h2 className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
          Your onboarding is complete
        </h2>
        <p className="mt-3 text-sm leading-6 text-zinc-600 dark:text-zinc-400">
          An administrator still needs to assign your internship details, including your department,
          internship dates, and required hours. Your dashboard and reporting tools will unlock once
          that assignment is in place.
        </p>
        <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
          <Link href="/intern/profile">
            <Button>View Profile</Button>
          </Link>
          <Link href="/onboarding/awaiting-approval">
            <Button variant="outline">View Onboarding Status</Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
