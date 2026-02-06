'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { BarChart3, GitCompare, Download } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  WeekDropdownSelector,
  SubmissionRateCard,
  ReportSubmissionList,
  MetricKPICard,
  MetricKPICardGrid,
  InsightsSummary,
  type WeekPeriod,
  type ReportSubmission,
  type SubmissionTracking,
  getCurrentWeekPeriod,
} from '@hr-portal/ui';

// Mock data - replace with actual API calls
const MOCK_TRACKING: SubmissionTracking = {
  totalStaff: 24,
  submitted: 18,
  pending: 6,
  submissionRate: 75,
  weekPeriod: getCurrentWeekPeriod(),
};

const MOCK_SUBMISSIONS: ReportSubmission[] = [
  {
    id: '1' as any,
    reportTypeId: 'rt-1' as any,
    reportTypeName: 'Marketing Spend Report',
    submitterId: 'user-1',
    submitterName: 'John Doe',
    submitterDepartment: 'Marketing',
    periodStart: '2026-02-03T00:00:00.000Z',
    periodEnd: '2026-02-09T23:59:59.999Z',
    content: {
      summary: 'Weekly marketing activities',
      accomplishments: [],
      challenges: [],
      nextWeekPlans: [],
      metrics: [],
    },
    filePaths: [],
    status: 'submitted',
    submittedAt: '2026-02-09T15:00:00.000Z',
    reviewedBy: null,
    reviewedAt: null,
    createdAt: '2026-02-03T10:00:00.000Z',
    updatedAt: '2026-02-09T15:00:00.000Z',
  },
  {
    id: '2' as any,
    reportTypeId: 'rt-1' as any,
    reportTypeName: 'Sales Report',
    submitterId: 'user-2',
    submitterName: 'Jane Smith',
    submitterDepartment: 'Sales',
    periodStart: '2026-02-03T00:00:00.000Z',
    periodEnd: '2026-02-09T23:59:59.999Z',
    content: {
      summary: 'Weekly sales activities',
      accomplishments: [],
      challenges: [],
      nextWeekPlans: [],
      metrics: [],
    },
    filePaths: [],
    status: 'submitted',
    submittedAt: '2026-02-09T14:30:00.000Z',
    reviewedBy: null,
    reviewedAt: null,
    createdAt: '2026-02-03T10:00:00.000Z',
    updatedAt: '2026-02-09T14:30:00.000Z',
  },
  {
    id: '3' as any,
    reportTypeId: 'rt-1' as any,
    reportTypeName: 'Operations Report',
    submitterId: 'user-3',
    submitterName: 'Bob Wilson',
    submitterDepartment: 'Operations',
    periodStart: '2026-02-03T00:00:00.000Z',
    periodEnd: '2026-02-09T23:59:59.999Z',
    content: {
      summary: 'Pending submission',
      accomplishments: [],
      challenges: [],
      nextWeekPlans: [],
      metrics: [],
    },
    filePaths: [],
    status: 'draft',
    submittedAt: null,
    reviewedBy: null,
    reviewedAt: null,
    createdAt: '2026-02-03T10:00:00.000Z',
    updatedAt: '2026-02-10T09:00:00.000Z',
  },
];

export default function AdminReportsPage(): React.ReactNode {
  const router = useRouter();
  const [selectedWeek, setSelectedWeek] = React.useState<WeekPeriod>(getCurrentWeekPeriod());
  const [tracking] = React.useState<SubmissionTracking>(MOCK_TRACKING);
  const [submissions] = React.useState<ReportSubmission[]>(MOCK_SUBMISSIONS);

  const handleViewSubmission = (submission: ReportSubmission): void => {
    // TODO: Navigate to detailed view
    console.log('View submission:', submission.id);
  };

  const handleSendReminder = (submitterId: string): void => {
    // TODO: Implement send reminder API call
    console.log('Send reminder to:', submitterId);
  };

  const handleNavigateToAnalytics = (): void => {
    router.push('/admin/reports/analytics');
  };

  const handleNavigateToCompare = (): void => {
    router.push('/admin/reports/compare');
  };

  const handleExport = (): void => {
    // TODO: Implement export functionality
    console.log('Exporting data for week:', selectedWeek.label);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-headline">Weekly Reports Tracking</h1>
          <p className="text-muted-foreground">
            Monitor staff report submissions and completion rates
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleNavigateToAnalytics}>
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </Button>
          <Button variant="outline" onClick={handleNavigateToCompare}>
            <GitCompare className="h-4 w-4 mr-2" />
            Compare
          </Button>
        </div>
      </div>

      {/* Week Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Select Week Period</CardTitle>
        </CardHeader>
        <CardContent>
          <WeekDropdownSelector
            selectedWeek={selectedWeek}
            onWeekChange={setSelectedWeek}
            weeksToShow={12}
          />
        </CardContent>
      </Card>

      {/* KPI Cards */}
      <MetricKPICardGrid>
        <MetricKPICard
          label="Total Staff"
          value={tracking.totalStaff}
          change={{
            absolute: '+2',
            percent: 9.1,
            trend: 'up',
          }}
          color="blue"
        />
        <MetricKPICard
          label="Submitted"
          value={tracking.submitted}
          change={{
            absolute: '+3',
            percent: 20,
            trend: 'up',
          }}
          color="green"
        />
        <MetricKPICard
          label="Pending"
          value={tracking.pending}
          change={{
            absolute: '-2',
            percent: -25,
            trend: 'down',
          }}
          color={tracking.pending > 8 ? 'red' : 'orange'}
        />
        <MetricKPICard
          label="Completion Rate"
          value={`${tracking.submissionRate}%`}
          change={{
            absolute: '+5%',
            percent: 7.1,
            trend: 'up',
          }}
          color={tracking.submissionRate >= 80 ? 'green' : tracking.submissionRate >= 60 ? 'orange' : 'red'}
        />
      </MetricKPICardGrid>

      {/* Insights Summary */}
      <InsightsSummary
        title="Team Reporting Insights"
        summary="Submission rates improved by 7% this week. Marketing and Sales teams showing strong engagement, while Operations needs follow-up."
        keyFindings={[
          {
            metric: 'Best Performers',
            insight: 'Marketing team achieved 100% submission rate for 3 consecutive weeks',
            highlight: true,
          },
          {
            metric: 'Needs Attention',
            insight: 'Operations team at 50% submission rate, down from 67% last week',
            highlight: true,
          },
          {
            metric: 'Overall Trend',
            insight: 'Team-wide submission rate trending upward with 75% average',
          },
        ]}
        recommendations={[
          'Send reminder to Operations team members who haven\'t submitted',
          'Consider recognizing Marketing team\'s consistency in next meeting',
          'Set up automated reminders for Friday afternoon to improve submission rates',
        ]}
      />

      {/* Submission Rate Card */}
      <SubmissionRateCard tracking={tracking} />

      {/* Submissions List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Submission Status</CardTitle>
            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ReportSubmissionList
            submissions={submissions}
            onView={handleViewSubmission}
            onSendReminder={handleSendReminder}
          />
        </CardContent>
      </Card>
    </div>
  );
}
