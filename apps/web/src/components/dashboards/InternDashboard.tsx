'use client';

import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  type DailyReport,
  DailyReportSummary,
  EODReportForm,
  type EODReportFormData,
  HoursProgressCard,
  type InternId,
  InternPersonalStats,
  type Task,
  TaskCard,
  getDaysRemaining,
} from '@hr-portal/ui';
import {
  Building2,
  Calendar,
  CheckSquare,
  ChevronRight,
  Clock,
  FileText,
  GraduationCap,
  User,
} from 'lucide-react';
import Link from 'next/link';
import { type ReactNode, useState } from 'react';

// TODO: Replace with actual data fetching
const today = new Date().toISOString().slice(0, 10);
const mockInternProfile = {
  id: '' as InternId,
  name: '—',
  email: '',
  school: '—',
  program: '—',
  department: '—',
  supervisor: '—',
  startDate: today,
  endDate: today,
  requiredHours: 0,
  completedHours: 0,
};

const mockRecentReports: Array<DailyReport> = [];

// TODO: Replace with actual data fetching
const mockTasks: Array<Task> = [];

export default function InternDashboard(): ReactNode {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const daysRemaining = getDaysRemaining(mockInternProfile.endDate);
  const todayReport = mockRecentReports.find(
    (r) => r.date === new Date().toISOString().split('T')[0]
  );

  const handleSubmitReport = async (_data: EODReportFormData): Promise<void> => {
    setIsSubmitting(true);
    // TODO: Implement API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setIsSubmitting(false);
    setShowForm(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Intern Dashboard</h1>
          <p className="text-muted-foreground">
            Track your internship progress and submit daily reports
          </p>
        </div>
        {!(todayReport || showForm) && (
          <Button onClick={() => setShowForm(true)}>
            <FileText className="mr-2 h-4 w-4" />
            Submit EOD Report
          </Button>
        )}
      </div>

      {/* Profile Card */}
      <Card className="bg-primary/5 border-primary/20">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10">
                <GraduationCap className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">{mockInternProfile.name}</h2>
                <p className="text-sm text-muted-foreground">
                  {mockInternProfile.program} - {mockInternProfile.school}
                </p>
                <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" />
                    {mockInternProfile.department}
                  </span>
                  <span className="flex items-center gap-1">
                    <User className="h-3 w-3" />
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
        </CardContent>
      </Card>

      {/* Stats */}
      <InternPersonalStats
        completedHours={mockInternProfile.completedHours}
        requiredHours={mockInternProfile.requiredHours}
        reportsSubmitted={mockRecentReports.length}
        daysRemaining={daysRemaining}
      />

      {/* Main Content Grid */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Hours Progress */}
        <HoursProgressCard
          completedHours={mockInternProfile.completedHours}
          requiredHours={mockInternProfile.requiredHours}
          startDate={mockInternProfile.startDate}
          endDate={mockInternProfile.endDate}
        />

        {/* Quick Actions / Today's Report Status */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Today's Status
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {todayReport ? (
              <div className="flex items-center justify-between p-4 rounded-lg bg-success/10 border border-success/20">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/10">
                    <FileText className="h-5 w-5 text-success" />
                  </div>
                  <div>
                    <p className="font-medium text-success">EOD Report Submitted</p>
                    <p className="text-sm text-muted-foreground">
                      {todayReport.hoursLogged} hours logged today
                    </p>
                  </div>
                </div>
                <Badge variant="success">Submitted</Badge>
              </div>
            ) : showForm ? null : (
              <div className="flex items-center justify-between p-4 rounded-lg bg-warning/10 border border-warning/20">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-warning/10">
                    <Clock className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <p className="font-medium text-warning">No Report Today</p>
                    <p className="text-sm text-muted-foreground">
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
            <div className="pt-4 border-t border-border">
              <div className="flex items-center justify-between text-sm mb-2">
                <span className="text-muted-foreground">Internship Period</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span>{new Date(mockInternProfile.startDate).toLocaleDateString()}</span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{
                      width: `${Math.min(
                        ((new Date().getTime() - new Date(mockInternProfile.startDate).getTime()) /
                          (new Date(mockInternProfile.endDate).getTime() -
                            new Date(mockInternProfile.startDate).getTime())) *
                          100,
                        100
                      )}%`,
                    }}
                  />
                </div>
                <span>{new Date(mockInternProfile.endDate).toLocaleDateString()}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* EOD Report Form */}
      {showForm && !todayReport && (
        <EODReportForm onSubmit={handleSubmitReport} isSubmitting={isSubmitting} />
      )}

      {/* Assigned Tasks */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CheckSquare className="h-5 w-5" />
              Assigned Tasks
            </CardTitle>
            <CardDescription>Tasks requiring your attention</CardDescription>
          </div>
          <Link href="/tasks">
            <Button variant="outline" size="sm">
              View All
              <ChevronRight className="ml-1 h-4 w-4" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {mockTasks.length > 0 ? (
            <div className="space-y-3">
              {mockTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  variant="compact"
                  onViewDetails={() => (window.location.href = `/tasks/${task.id}`)}
                  showAssignees={false}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <CheckSquare className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>No tasks assigned yet</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Reports */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Recent Reports</CardTitle>
              <CardDescription>Your latest daily report submissions</CardDescription>
            </div>
            <Link href="/reports">
              <Button variant="outline" size="sm">
                View All
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </Link>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {mockRecentReports.length > 0 ? (
            mockRecentReports.slice(0, 5).map((report) => (
              <DailyReportSummary key={report.id} report={report} />
            ))
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="h-5 w-5 mx-auto mb-3 opacity-50" />
              <p>No reports submitted yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
