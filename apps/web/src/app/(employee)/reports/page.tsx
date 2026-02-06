'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Filter } from 'lucide-react';
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  ReportSummaryCards,
  ReportList,
  type ReportSubmission,
  type ReportStatus,
} from '@hr-portal/ui';

// Mock data - replace with actual API calls
const MOCK_REPORTS: ReportSubmission[] = [
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
      nextWeekPlans: ['Optimize ad targeting', 'Prepare Valentine\'s campaign'],
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
      summary: 'Working on Valentine\'s campaign preparation.',
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
  const [reports, setReports] = React.useState<ReportSubmission[]>(MOCK_REPORTS);
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
      const matchesSearch = report.reportTypeName
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
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
    // TODO: Implement submit API call
    console.log('Submitting report:', report.id);
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
          <h1 className="text-3xl font-bold">My Weekly Reports</h1>
          <p className="text-muted-foreground">
            Track and submit your weekly activity reports
          </p>
        </div>
        <Button onClick={handleNewReport}>
          <Plus className="h-4 w-4 mr-2" />
          New Report
        </Button>
      </div>

      {/* Summary Cards */}
      <ReportSummaryCards
        totalReports={totalReports}
        submittedThisMonth={submittedThisMonth}
        pendingDrafts={pendingDrafts}
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
