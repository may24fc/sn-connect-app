'use client';

import {
  Button,
  Input,
  InsightsSummary,
  MetricKPICard,
  MetricKPICardGrid,
  ReportList,
  type ReportStatus,
  type ReportSubmission,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@hr-portal/ui';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import * as React from 'react';

// Mock data - replace with actual API calls
const MOCK_REPORTS: Array<ReportSubmission> = [
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
      summary: 'Successfully launched Facebook ad campaign targeting Q1 goals.',
      accomplishments: ['Generated 245 leads', 'Increased brand awareness by 40%'],
      challenges: ['Budget constraints for Google Ads'],
      nextWeekPlans: ['Optimize ad targeting', "Prepare Valentine's campaign"],
      metrics: [
        {
          id: 'm1',
          type: 'expenditure',
          name: 'Facebook Ads',
          value: 15000,
          unit: 'PHP',
          category: 'Marketing',
        },
        {
          id: 'm2',
          type: 'result',
          name: 'Revenue Generated',
          value: 85000,
          unit: 'PHP',
          category: 'Sales',
        },
      ],
    },
    filePaths: ['receipts/facebook_invoice.pdf'],
    status: 'submitted',
    submittedAt: '2026-02-09T15:45:00.000Z',
    reviewedBy: null,
    reviewedAt: null,
    createdAt: '2026-02-03T10:00:00.000Z',
    updatedAt: '2026-02-09T15:45:00.000Z',
  },
  {
    id: '2' as any,
    reportTypeId: 'rt-1' as any,
    reportTypeName: 'Marketing Spend Report',
    submitterId: 'user-1',
    submitterName: 'John Doe',
    submitterDepartment: 'Marketing',
    periodStart: '2026-02-10T00:00:00.000Z',
    periodEnd: '2026-02-16T23:59:59.999Z',
    content: {
      summary: "Working on Valentine's campaign preparation.",
      accomplishments: ['Created campaign materials'],
      challenges: [],
      nextWeekPlans: ['Launch campaign'],
      metrics: [
        {
          id: 'm3',
          type: 'expenditure',
          name: 'Design Services',
          value: 8000,
          unit: 'PHP',
          category: 'Marketing',
        },
      ],
    },
    filePaths: [],
    status: 'draft',
    submittedAt: null,
    reviewedBy: null,
    reviewedAt: null,
    createdAt: '2026-02-10T09:00:00.000Z',
    updatedAt: '2026-02-11T14:30:00.000Z',
  },
];

export default function ReportsPage(): React.ReactNode {
  const router = useRouter();
  const [reports, setReports] = React.useState<Array<ReportSubmission>>(MOCK_REPORTS);
  const [searchQuery, setSearchQuery] = React.useState('');
  const [statusFilter, setStatusFilter] = React.useState<string>('all');

  // Calculate summary stats
  const totalReports = reports.length;
  const submittedThisMonth = reports.filter((r) => {
    if (!r.submittedAt) return false;
    const submittedDate = new Date(r.submittedAt);
    const now = new Date();
    return (
      submittedDate.getMonth() === now.getMonth() &&
      submittedDate.getFullYear() === now.getFullYear()
    );
  }).length;
  const pendingDrafts = reports.filter((r) => r.status === 'draft').length;

  // Filter reports
  const filteredReports = React.useMemo(() => {
    return reports.filter((report) => {
      const matchesSearch = report.reportTypeName.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = statusFilter === 'all' || report.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [reports, searchQuery, statusFilter]);

  const handleViewReport = (report: ReportSubmission): void => {
    router.push(`/reports/${report.id}`);
  };

  const handleEditReport = (report: ReportSubmission): void => {
    router.push(`/reports/${report.id}`);
  };

  const handleSubmitReport = (report: ReportSubmission): void => {
    // Update local state for demo
    setReports((prev) =>
      prev.map((r) =>
        r.id === report.id
          ? { ...r, status: 'submitted' as ReportStatus, submittedAt: new Date().toISOString() }
          : r
      )
    );
  };

  const handleNewReport = (): void => {
    router.push('/reports/new');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-headline">My Weekly Reports</h1>
          <p className="text-muted-foreground">Track and submit your weekly activity reports</p>
        </div>
        <Button onClick={handleNewReport}>
          <Plus className="h-4 w-4 mr-2" />
          New Report
        </Button>
      </div>

      {/* KPI Cards */}
      <MetricKPICardGrid>
        <MetricKPICard
          label="Total Reports"
          value={totalReports}
          change={{
            absolute: `+${submittedThisMonth}`,
            percent: submittedThisMonth > 0 ? (submittedThisMonth / totalReports) * 100 : 0,
            trend: submittedThisMonth > 0 ? 'up' : 'stable',
          }}
          color="blue"
        />
        <MetricKPICard
          label="This Month"
          value={submittedThisMonth}
          change={{
            absolute: `${submittedThisMonth}`,
            trend: 'up',
          }}
          color="green"
        />
        <MetricKPICard
          label="Pending Drafts"
          value={pendingDrafts}
          change={{
            absolute: `${pendingDrafts}`,
            trend: pendingDrafts > 0 ? 'down' : 'stable',
          }}
          color={pendingDrafts > 0 ? 'orange' : 'green'}
        />
        <MetricKPICard
          label="Completion Rate"
          value={`${Math.round((submittedThisMonth / (totalReports || 1)) * 100)}%`}
          change={{
            absolute: '+15%',
            trend: 'up',
          }}
          color="green"
        />
      </MetricKPICardGrid>

      {/* Insights Summary */}
      <InsightsSummary
        title="Your Reporting Performance"
        summary="You've maintained strong reporting consistency this month with all submissions on time. Keep up the excellent work!"
        keyFindings={[
          {
            metric: 'Submission Streak',
            insight: '100% on-time submissions for the past 4 weeks',
            highlight: true,
          },
          {
            metric: 'Engagement',
            insight: 'Average report detail level is above team average',
          },
          {
            metric: 'Trends',
            insight: 'Your marketing spend ROI has improved by 23% over the last month',
          },
        ]}
        recommendations={[
          'Consider adding more visual data to your reports using charts',
          'Continue documenting challenges for better team transparency',
        ]}
      />

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="flex-1">
          <Input
            placeholder="Search reports..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="draft">Draft</SelectItem>
            <SelectItem value="submitted">Submitted</SelectItem>
            <SelectItem value="reviewed">Reviewed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Reports List */}
      <ReportList
        reports={filteredReports}
        onView={handleViewReport}
        onEdit={handleEditReport}
        onSubmit={handleSubmitReport}
        emptyMessage="No reports found. Click 'New Report' to create your first report."
      />
    </div>
  );
}
