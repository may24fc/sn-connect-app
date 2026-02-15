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
import {
  Badge,
  Button,
  type DailyReport,
  type DailyReportId,
  DailyReportSummary,
  EODReportForm,
  type EODReportFormData,
  type InternId,
  type InternshipPeriodId,
  Progress,
  getDaysRemaining,
} from '@hr-portal/ui';
import {
  Building2,
  Calendar,
  ChevronRight,
  Clock,
  FileText,
  GraduationCap,
  Target,
  TrendingUp,
  User,
} from 'lucide-react';
import Link from 'next/link';
import { type ReactNode, useState } from 'react';

// Mock data
const mockInternProfile = {
  id: 'intern-1' as InternId,
  name: 'John Doe',
  email: 'john.doe@university.edu',
  school: 'State University',
  program: 'Computer Science',
  department: 'Engineering',
  supervisor: 'Sarah Johnson',
  startDate: '2024-01-15',
  endDate: '2024-04-15',
  requiredHours: 480,
  completedHours: 245,
};

const mockRecentReports: Array<DailyReport> = [
  {
    id: 'report-1' as DailyReportId,
    internId: 'intern-1' as InternId,
    internshipPeriodId: 'period-1' as InternshipPeriodId,
    date: '2024-02-15',
    tasksCompleted:
      'Worked on implementing the dashboard UI components. Fixed several bugs in the navigation system.',
    hoursLogged: 8,
    learnings: 'Learned about React Server Components and how to optimize performance.',
    challenges: 'Had some issues with TypeScript types but resolved with help from mentor.',
    supervisorFeedback: 'Great progress on the dashboard. Keep up the good work!',
    status: 'reviewed',
    submittedAt: '2024-02-15T17:00:00Z',
    reviewedAt: '2024-02-16T09:00:00Z',
    createdAt: '2024-02-15T17:00:00Z',
    updatedAt: '2024-02-16T09:00:00Z',
  },
  {
    id: 'report-2' as DailyReportId,
    internId: 'intern-1' as InternId,
    internshipPeriodId: 'period-1' as InternshipPeriodId,
    date: '2024-02-14',
    tasksCompleted: 'Completed the employee profile page. Added validation for form inputs.',
    hoursLogged: 7.5,
    learnings: 'Learned about form validation patterns and error handling.',
    status: 'submitted',
    submittedAt: '2024-02-14T17:30:00Z',
    createdAt: '2024-02-14T17:30:00Z',
    updatedAt: '2024-02-14T17:30:00Z',
  },
  {
    id: 'report-3' as DailyReportId,
    internId: 'intern-1' as InternId,
    internshipPeriodId: 'period-1' as InternshipPeriodId,
    date: '2024-02-13',
    tasksCompleted: 'Started working on the performance module. Set up the basic structure.',
    hoursLogged: 8,
    learnings: 'Learned about performance management workflows.',
    status: 'reviewed',
    submittedAt: '2024-02-13T17:00:00Z',
    reviewedAt: '2024-02-14T10:00:00Z',
    createdAt: '2024-02-13T17:00:00Z',
    updatedAt: '2024-02-14T10:00:00Z',
  },
];

export default function InternDashboardPage(): ReactNode {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const daysRemaining = getDaysRemaining(mockInternProfile.endDate);
  const todayReport = mockRecentReports.find(
    (r) => r.date === new Date().toISOString().split('T')[0]
  );

  const progressPercentage = Math.round(
    (mockInternProfile.completedHours / mockInternProfile.requiredHours) * 100
  );

  const handleSubmitReport = async (_data: EODReportFormData): Promise<void> => {
    setIsSubmitting(true);
    // TODO: Implement API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsSubmitting(false);
    setShowForm(false);
  };

  return (
    <div className="h-full space-y-6">
      {/* Page Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
            Intern Dashboard
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Track your internship progress and submit daily reports.
          </p>
        </div>
        {!(todayReport || showForm) && (
          <Button onClick={() => setShowForm(true)}>
            <FileText className="mr-2 h-4 w-4" strokeWidth={1.5} />
            Submit EOD Report
          </Button>
        )}
      </div>

      {/* Profile Card */}
      <div
        className="bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800 rounded-lg p-4"
        style={{ boxShadow: '0 1px 2px 0 rgb(0 0 0 / 0.03)' }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <GraduationCap className="h-5 w-5 text-zinc-400 flex-shrink-0" strokeWidth={1.5} />
            <div>
              <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
                {mockInternProfile.name}
              </h2>
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                {mockInternProfile.program} - {mockInternProfile.school}
              </p>
              <div className="flex items-center gap-4 mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                <span className="flex items-center gap-1">
                  <Building2 className="h-3 w-3" strokeWidth={1.5} />
                  {mockInternProfile.department}
                </span>
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" strokeWidth={1.5} />
                  {mockInternProfile.supervisor}
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
      <StatCardGrid columns={4}>
        <StatCard
          label="Hours Logged"
          value={mockInternProfile.completedHours}
          trend={{ direction: 'up', value: `${progressPercentage}% complete` }}
          icon={<Clock className="h-4 w-4" strokeWidth={1.5} />}
        />
        <StatCard
          label="Required Hours"
          value={mockInternProfile.requiredHours}
          trend={{ direction: 'stable', value: 'Target' }}
          icon={<Target className="h-4 w-4" strokeWidth={1.5} />}
        />
        <StatCard
          label="Reports Submitted"
          value={mockRecentReports.length}
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
                  <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Completed
                  </p>
                  <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
                    {mockInternProfile.completedHours} hrs
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-zinc-50 dark:bg-zinc-800/50">
                  <p className="text-xs font-medium uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                    Remaining
                  </p>
                  <p className="text-lg font-bold text-zinc-900 dark:text-zinc-100 tabular-nums">
                    {mockInternProfile.requiredHours - mockInternProfile.completedHours} hrs
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
                    <FileText className="h-4 w-4 text-zinc-400 flex-shrink-0" strokeWidth={1.5} />
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
              ) : showForm ? null : (
                <div className="flex items-center justify-between p-4 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center gap-3">
                    <Clock className="h-4 w-4 text-amber-500 flex-shrink-0" strokeWidth={1.5} />
                    <div>
                      <p className="font-medium text-zinc-900 dark:text-zinc-100">
                        No Report Today
                      </p>
                      <p className="text-sm text-zinc-500 dark:text-zinc-400">
                        Don't forget to submit your EOD report
                      </p>
                    </div>
                  </div>
                  <Button size="sm" onClick={() => setShowForm(true)}>
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
                    {new Date(mockInternProfile.startDate).toLocaleDateString()}
                  </span>
                  <div className="flex-1 h-2 bg-zinc-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full"
                      style={{
                        width: `${Math.min(
                          ((new Date().getTime() -
                            new Date(mockInternProfile.startDate).getTime()) /
                            (new Date(mockInternProfile.endDate).getTime() -
                              new Date(mockInternProfile.startDate).getTime())) *
                            100,
                          100
                        )}%`,
                      }}
                    />
                  </div>
                  <span className="text-zinc-600 dark:text-zinc-300 tabular-nums">
                    {new Date(mockInternProfile.endDate).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          </BentoCardContent>
        </BentoCard>
      </BentoGrid>

      {/* EOD Report Form */}
      {showForm && !todayReport && (
        <EODReportForm onSubmit={handleSubmitReport} isSubmitting={isSubmitting} />
      )}

      {/* Recent Reports Card */}
      <BentoCard colSpan={4}>
        <BentoCardHeader>
          <BentoCardTitle icon={<FileText className="h-4 w-4" strokeWidth={1.5} />}>
            Recent Reports
          </BentoCardTitle>
          <Link href="/intern/reports">
            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
              View All
              <ChevronRight className="ml-1 h-4 w-4" strokeWidth={1.5} />
            </Button>
          </Link>
        </BentoCardHeader>
        <BentoCardContent>
          <div className="space-y-2">
            {mockRecentReports.slice(0, 5).map((report) => (
              <DailyReportSummary key={report.id} report={report} />
            ))}
          </div>
        </BentoCardContent>
      </BentoCard>
    </div>
  );
}
