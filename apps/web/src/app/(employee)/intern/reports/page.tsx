'use client';

import { useState, type ReactNode } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  Calendar,
  Filter,
  FileText,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  DailyReportList,
  type DailyReport,
  type InternId,
  type DailyReportId,
  type InternshipPeriodId,
  type ReportStatus,
} from '@hr-portal/ui';

// Mock data
const mockReports: DailyReport[] = [
  {
    id: 'report-1' as DailyReportId,
    internId: 'intern-1' as InternId,
    internshipPeriodId: 'period-1' as InternshipPeriodId,
    date: '2024-02-15',
    tasksCompleted: 'Worked on implementing the dashboard UI components. Fixed several bugs in the navigation system. Participated in code review session.',
    hoursLogged: 8,
    learnings: 'Learned about React Server Components and how to optimize performance. Also understood the importance of code reviews.',
    challenges: 'Had some issues with TypeScript types but resolved with help from mentor.',
    supervisorFeedback: 'Great progress on the dashboard. Keep up the good work! Your attention to detail in the code review was impressive.',
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
    tasksCompleted: 'Completed the employee profile page. Added validation for form inputs. Started documentation for the component library.',
    hoursLogged: 7.5,
    learnings: 'Learned about form validation patterns and error handling. Understood the importance of documentation.',
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
    tasksCompleted: 'Started working on the performance module. Set up the basic structure. Created type definitions for performance data.',
    hoursLogged: 8,
    learnings: 'Learned about performance management workflows and how TypeScript helps maintain code quality.',
    status: 'reviewed',
    submittedAt: '2024-02-13T17:00:00Z',
    reviewedAt: '2024-02-14T10:00:00Z',
    createdAt: '2024-02-13T17:00:00Z',
    updatedAt: '2024-02-14T10:00:00Z',
  },
  {
    id: 'report-4' as DailyReportId,
    internId: 'intern-1' as InternId,
    internshipPeriodId: 'period-1' as InternshipPeriodId,
    date: '2024-02-12',
    tasksCompleted: 'Fixed responsive design issues. Improved accessibility features. Added ARIA labels to interactive elements.',
    hoursLogged: 8,
    learnings: 'Learned about web accessibility standards and best practices for responsive design.',
    challenges: 'Some edge cases in responsive behavior were tricky to handle.',
    supervisorFeedback: 'Excellent work on accessibility. This is often overlooked but very important.',
    status: 'reviewed',
    submittedAt: '2024-02-12T17:00:00Z',
    reviewedAt: '2024-02-13T09:00:00Z',
    createdAt: '2024-02-12T17:00:00Z',
    updatedAt: '2024-02-13T09:00:00Z',
  },
  {
    id: 'report-5' as DailyReportId,
    internId: 'intern-1' as InternId,
    internshipPeriodId: 'period-1' as InternshipPeriodId,
    date: '2024-02-09',
    tasksCompleted: 'Implemented the announcement feature. Created notification components. Integrated with the sidebar navigation.',
    hoursLogged: 8,
    learnings: 'Learned about notification patterns and state management approaches.',
    status: 'reviewed',
    submittedAt: '2024-02-09T17:00:00Z',
    reviewedAt: '2024-02-12T09:00:00Z',
    createdAt: '2024-02-09T17:00:00Z',
    updatedAt: '2024-02-12T09:00:00Z',
  },
];

export default function InternReportsPage(): ReactNode {
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const filteredReports = mockReports.filter((report) => {
    const matchesStatus = statusFilter === 'all' || report.status === statusFilter;
    const matchesDateFrom = !dateFrom || new Date(report.date) >= new Date(dateFrom);
    const matchesDateTo = !dateTo || new Date(report.date) <= new Date(dateTo);
    return matchesStatus && matchesDateFrom && matchesDateTo;
  });

  const stats = {
    total: mockReports.length,
    submitted: mockReports.filter((r) => r.status === 'submitted').length,
    reviewed: mockReports.filter((r) => r.status === 'reviewed').length,
    totalHours: mockReports.reduce((sum, r) => sum + r.hoursLogged, 0),
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/intern/dashboard">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Reports</h1>
          <p className="text-muted-foreground">
            View all your daily report submissions
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Reports</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
                <Calendar className="h-5 w-5 text-warning" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Pending Review</p>
                <p className="text-2xl font-bold">{stats.submitted}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                <FileText className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Reviewed</p>
                <p className="text-2xl font-bold">{stats.reviewed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-secondary/20">
                <Calendar className="h-5 w-5 text-secondary-foreground" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Hours</p>
                <p className="text-2xl font-bold">{stats.totalHours}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="submitted">Pending Review</SelectItem>
                <SelectItem value="reviewed">Reviewed</SelectItem>
                <SelectItem value="needs_revision">Needs Revision</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2">
              <Input
                type="date"
                placeholder="From"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full sm:w-auto"
              />
              <span className="text-muted-foreground">to</span>
              <Input
                type="date"
                placeholder="To"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full sm:w-auto"
              />
            </div>
            {(statusFilter !== 'all' || dateFrom || dateTo) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStatusFilter('all');
                  setDateFrom('');
                  setDateTo('');
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Reports List */}
      <DailyReportList
        reports={filteredReports}
        emptyMessage={
          statusFilter !== 'all' || dateFrom || dateTo
            ? 'No reports match the selected filters'
            : 'No reports submitted yet'
        }
      />
    </div>
  );
}
