'use client';

import { useExtendInternship } from '@/hooks/useIndividualPerformance';
import {
  useEndInternship,
  useHireInternAsEmployee,
  useInternship,
  useUpdateInternDailyLog,
  useUpdateInternship,
} from '@/hooks/useInternships';
import { exportToCsv, formatDateForCsv, formatPercentageForCsv } from '@/lib/csv';
import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  EmptyState,
  type DailyReport,
  type DailyReportId,
  DailyReportList,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  HoursProgressCard,
  Input,
  InternHoursProgressBar,
  type InternId,
  type InternshipPeriodId,
  InternshipStatusBadge,
  Label,
  Progress,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  calculateHoursProgress,
  getDaysRemaining,
} from '@hr-portal/ui';
import { useToast } from '@hr-portal/ui';
import {
  ArrowLeft,
  Award,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Edit2,
  GraduationCap,
  Mail,
  MessageSquare,
  MoreVertical,
  Phone,
  User,
} from 'lucide-react';
import { useProjects } from '@/hooks/useProjects';
import { ProgressRing, HealthPill } from '@hr-portal/ui';
import Link from 'next/link';
import { type ReactNode, use, useCallback, useState } from 'react';

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export default function InternDetailPage({
  params,
}: { params: Promise<{ id: string }> }): ReactNode {
  const { id } = use(params);
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<DailyReport | null>(null);
  const [feedback, setFeedback] = useState('');
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [extendDialogOpen, setExtendDialogOpen] = useState(false);
  const [newEndDate, setNewEndDate] = useState('');
  const [extendReason, setExtendReason] = useState('');

  const internshipQuery = useInternship(id);
  const updateLogMutation = useUpdateInternDailyLog();
  const updateInternshipMutation = useUpdateInternship();
  const endInternshipMutation = useEndInternship();
  const hireInternMutation = useHireInternAsEmployee();
  const extendMutation = useExtendInternship();
  const { addToast } = useToast();

  const associate = internshipQuery.data?.data;
  const reports = associate?.recentReports || [];
  const uiReports: Array<DailyReport> = reports.map((report) => ({
    ...report,
    id: report.id as DailyReportId,
    internId: report.internId as InternId,
    internshipPeriodId: report.internshipPeriodId as InternshipPeriodId,
  }));
  const weeklyHours = associate?.weeklyHours || [];

  const handleExportReport = useCallback((): void => {
    if (!associate) return;

    const profileData = [
      {
        field: 'Name',
        value: associate.name,
      },
      { field: 'Email', value: associate.email },
      { field: 'Phone', value: associate.phone || 'N/A' },
      { field: 'School', value: associate.school },
      { field: 'Program', value: associate.program },
      { field: 'Department', value: associate.department },
      { field: 'Supervisor', value: associate.supervisor },
      { field: 'Start Date', value: formatDateForCsv(associate.startDate) },
      { field: 'End Date', value: formatDateForCsv(associate.endDate) },
      { field: 'Required Hours', value: String(associate.requiredHours) },
      { field: 'Completed Hours', value: String(associate.completedHours) },
      {
        field: 'Progress',
        value: formatPercentageForCsv(
          calculateHoursProgress(associate.completedHours, associate.requiredHours)
        ),
      },
      { field: 'Status', value: associate.status },
    ];

    exportToCsv(profileData, {
      filename: `associate-${associate.name.replace(/\s+/g, '-').toLowerCase()}`,
      headers: ['Field', 'Value'],
      rowMapper: (item) => [item.field, item.value],
    });
  }, [associate]);

  if (internshipQuery.isLoading) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
        Loading associate profile...
      </div>
    );
  }

  if (internshipQuery.error || !associate) {
    return (
      <div className="h-full flex items-center justify-center text-sm text-destructive">
        Failed to load associate profile.
      </div>
    );
  }

  const daysRemaining = getDaysRemaining(associate.endDate);
  const progressPercentage = calculateHoursProgress(associate.completedHours, associate.requiredHours);
  const pendingReports = uiReports.filter((r) => r.status === 'submitted').length;

  const handleProvideFeedback = (report: DailyReport): void => {
    setSelectedReport(report);
    setFeedback('');
    setFeedbackDialogOpen(true);
  };

  const handleSubmitFeedback = async (): Promise<void> => {
    if (!(selectedReport && feedback.trim())) {
      return;
    }

    try {
      await updateLogMutation.mutateAsync({
        internshipId: id,
        logId: selectedReport.id,
        supervisorNotes: feedback.trim(),
        isApproved: true,
      });

      setFeedbackDialogOpen(false);
      setSelectedReport(null);
      setFeedback('');
      addToast({ title: 'Feedback submitted', variant: 'success' });
    } catch {
      addToast({ title: 'Failed to submit feedback', variant: 'error' });
    }
  };

  const handleExtendInternship = async (): Promise<void> => {
    if (!newEndDate.trim() || !extendReason.trim()) return;
    try {
      await extendMutation.mutateAsync({
        internshipId: id,
        newEndDate: newEndDate,
        reason: extendReason,
      });
      setExtendDialogOpen(false);
      setNewEndDate('');
      setExtendReason('');
      addToast({ title: 'Internship extended', variant: 'success' });
    } catch {
      addToast({ title: 'Failed to extend internship', variant: 'error' });
    }
  };

  const handleCompleteInternship = async (): Promise<void> => {
    try {
      await updateInternshipMutation.mutateAsync({
        internshipId: id,
        updates: { status: 'completed' },
      });
      setCompleteDialogOpen(false);
      addToast({ title: 'Internship marked as completed', variant: 'success' });
    } catch {
      addToast({ title: 'Failed to complete internship', variant: 'error' });
    }
  };

  const handleEndInternship = async (): Promise<void> => {
    try {
      await endInternshipMutation.mutateAsync({ internshipId: id });
      setReviewDialogOpen(false);
      addToast({ title: 'Internship ended', variant: 'success' });
    } catch {
      addToast({ title: 'Failed to end internship', variant: 'error' });
    }
  };

  const handleHireAsEmployee = async (): Promise<void> => {
    try {
      await hireInternMutation.mutateAsync({ internshipId: id });
      setReviewDialogOpen(false);
      addToast({
        title: 'Associate hired as employee',
        description: 'Role set to employee and employment type set to probationary.',
        variant: 'success',
      });
    } catch {
      addToast({ title: 'Failed to hire associate as employee', variant: 'error' });
    }
  };

  const isActiveIntern = associate.status === 'active';
  const canCompleteInternship = isActiveIntern && progressPercentage >= 100;
  const canHireAsEmployee = isActiveIntern || associate.status === 'completed';
  const isActionPending =
    extendMutation.isPending ||
    updateInternshipMutation.isPending ||
    endInternshipMutation.isPending ||
    hireInternMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/admin/interns">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Associate Profile</h1>
            <p className="text-muted-foreground">View and manage associate details</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setReviewDialogOpen(true)}>
            Review & Evaluate
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline">
                <MoreVertical className="mr-2 h-4 w-4" />
                Actions
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
                <Edit2 className="mr-2 h-4 w-4" />
                Edit Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportReport}>
                <Download className="mr-2 h-4 w-4" />
                Export Report
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Award className="mr-2 h-4 w-4" />
                Generate Certificate
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Profile Card */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col lg:flex-row lg:items-start gap-6">
            {/* Avatar and Basic Info */}
            <div className="flex items-start gap-4">
              <Avatar className="h-20 w-20">
                <AvatarFallback className="text-2xl">{getInitials(associate.name)}</AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-xl font-bold">{associate.name}</h2>
                  <InternshipStatusBadge status={associate.status} />
                </div>
                <p className="text-muted-foreground">{associate.program}</p>
                <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    {associate.email}
                  </span>
                  <span className="flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    {associate.phone || 'N/A'}
                  </span>
                </div>
              </div>
            </div>

            {/* Details Grid */}
            <div className="flex-1 grid gap-4 sm:grid-cols-2 lg:grid-cols-4 lg:ml-auto">
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <GraduationCap className="h-4 w-4" />
                  <span className="text-xs">School</span>
                </div>
                <p className="font-medium text-sm">{associate.school}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Building2 className="h-4 w-4" />
                  <span className="text-xs">Department</span>
                </div>
                <p className="font-medium text-sm">{associate.department}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <User className="h-4 w-4" />
                  <span className="text-xs">Supervisor</span>
                </div>
                <p className="font-medium text-sm">{associate.supervisor}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Calendar className="h-4 w-4" />
                  <span className="text-xs">Days Remaining</span>
                </div>
                <p className="font-medium text-sm">{daysRemaining} days</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="reports">
            Daily Reports
            {pendingReports > 0 && (
              <Badge variant="warning" className="ml-2">
                {pendingReports}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="projects">Projects</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Hours Progress Bar - V2-2.6 */}
          <InternHoursProgressBar
            completedHours={associate.completedHours}
            requiredHours={associate.requiredHours}
            startDate={associate.startDate}
            endDate={associate.endDate}
          />

          <div className="grid gap-6 lg:grid-cols-2">
            <HoursProgressCard
              completedHours={associate.completedHours}
              requiredHours={associate.requiredHours}
              startDate={associate.startDate}
              endDate={associate.endDate}
            />

            {/* Internship Period Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Internship Period
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Start Date</p>
                    <p className="font-medium">
                      {new Date(associate.startDate).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">End Date</p>
                    <p className="font-medium">
                      {new Date(associate.endDate).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                </div>

                {/* Timeline Progress */}
                <div className="pt-4 border-t border-border">
                  <div className="flex items-center justify-between text-sm mb-2">
                    <span className="text-muted-foreground">Duration Progress</span>
                  </div>
                  <div className="relative">
                    <div className="h-3 bg-muted rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary rounded-full"
                        style={{
                          width: `${Math.min(
                            ((new Date().getTime() - new Date(associate.startDate).getTime()) /
                              (new Date(associate.endDate).getTime() -
                                new Date(associate.startDate).getTime())) *
                              100,
                            100
                          )}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Notes Section */}
          <Card>
            <CardHeader>
              <CardTitle>HR Notes</CardTitle>
              <CardDescription>Internal notes about this associate</CardDescription>
            </CardHeader>
            <CardContent>
              <EmptyState
                icon={MessageSquare}
                title="No notes added yet"
                description="Internal HR notes for this associate will appear here once they are recorded."
                size="sm"
              />
            </CardContent>
            <CardFooter>
              <Button variant="outline" size="sm">
                <Edit2 className="mr-2 h-4 w-4" />
                Edit Notes
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>

        {/* Reports Tab */}
        <TabsContent value="reports" className="space-y-4">
          {pendingReports > 0 && (
            <Card className="border-warning/50 bg-warning/5">
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
                    <Clock className="h-5 w-5 text-warning" />
                  </div>
                  <div>
                    <p className="font-medium text-warning">
                      {pendingReports} Report{pendingReports > 1 ? 's' : ''} Pending Review
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Provide feedback to help the associate improve
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <DailyReportList reports={uiReports} />

          {/* Add feedback button for pending reports */}
          {uiReports
            .filter((r) => r.status === 'submitted')
            .map((report) => (
              <Card key={report.id} className="border-warning/50">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">
                        Report for {new Date(report.date).toLocaleDateString()}
                      </p>
                      <p className="text-sm text-muted-foreground">Awaiting supervisor feedback</p>
                    </div>
                    <Button onClick={() => handleProvideFeedback(report)}>
                      <MessageSquare className="mr-2 h-4 w-4" />
                      Provide Feedback
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Weekly Hours Summary</CardTitle>
              <CardDescription>Hours logged per week</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {weeklyHours.map((week) => (
                  <div key={week.week} className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium">{week.week}</span>
                      <span className="text-muted-foreground">
                        {week.hours} / {week.target} hrs
                      </span>
                    </div>
                    <Progress
                      value={(week.hours / week.target) * 100}
                      className="h-2"
                      indicatorClassName={week.hours >= week.target ? 'bg-success' : 'bg-warning'}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Projects Tab */}
        <TabsContent value="projects" className="space-y-4">
          {associate?.userId ? (
            <InternProjectsPanel userId={associate.userId} />
          ) : (
            <p className="text-sm text-zinc-500">No linked user.</p>
          )}
        </TabsContent>
      </Tabs>

      {/* Feedback Dialog */}
      <Dialog open={feedbackDialogOpen} onOpenChange={setFeedbackDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              Provide Feedback
            </DialogTitle>
            <DialogDescription>
              Add feedback for the report dated{' '}
              {selectedReport && new Date(selectedReport.date).toLocaleDateString()}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Textarea
              placeholder="Enter your feedback for the associate..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="min-h-[150px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFeedbackDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmitFeedback}
              disabled={!feedback.trim() || updateLogMutation.isPending}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Submit Feedback
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Review & Evaluate Dialog */}
      <Dialog open={reviewDialogOpen} onOpenChange={setReviewDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Review & Evaluate</DialogTitle>
            <DialogDescription>
              Run internship decisions for {associate.name}. Extend and complete use the current
              review flow, while end and hire trigger lifecycle updates.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2">
            <Button
              variant="outline"
              className="w-full justify-start"
              disabled={!isActiveIntern || isActionPending}
              onClick={() => {
                setNewEndDate(associate.endDate);
                setExtendDialogOpen(true);
                setReviewDialogOpen(false);
              }}
            >
              <Calendar className="mr-2 h-4 w-4" />
              Extend Internship
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start"
              disabled={!canCompleteInternship || isActionPending}
              onClick={() => {
                setCompleteDialogOpen(true);
                setReviewDialogOpen(false);
              }}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Complete Internship
            </Button>

            <Button
              variant="outline"
              className="w-full justify-start"
              disabled={!isActiveIntern || isActionPending}
              onClick={handleEndInternship}
            >
              <Clock className="mr-2 h-4 w-4" />
              End Internship
            </Button>

            <Button
              className="w-full justify-start"
              disabled={!canHireAsEmployee || isActionPending}
              onClick={handleHireAsEmployee}
            >
              <User className="mr-2 h-4 w-4" />
              Hire as Employee
            </Button>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Extend Internship Dialog - V2-2.6 */}
      <Dialog open={extendDialogOpen} onOpenChange={setExtendDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Extend Internship
            </DialogTitle>
            <DialogDescription>
              Extend {associate.name}'s internship end date. Current end date:{' '}
              {new Date(associate.endDate).toLocaleDateString()}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-end-date">New End Date</Label>
              <Input
                id="new-end-date"
                type="date"
                value={newEndDate}
                onChange={(e) => setNewEndDate(e.target.value)}
                min={associate.endDate}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="extend-reason">Reason for Extension</Label>
              <Textarea
                id="extend-reason"
                placeholder="Explain why the internship is being extended..."
                value={extendReason}
                onChange={(e) => setExtendReason(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setExtendDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleExtendInternship}
              disabled={!newEndDate.trim() || !extendReason.trim() || extendMutation.isPending}
            >
              <Calendar className="mr-2 h-4 w-4" />
              Extend Internship
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Complete Internship Dialog */}
      <Dialog open={completeDialogOpen} onOpenChange={setCompleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-success" />
              Complete Internship
            </DialogTitle>
            <DialogDescription>
              Mark {associate.name}'s internship as complete. This will:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Change the associate's status to "Completed"</li>
                <li>Generate a completion certificate</li>
                <li>Notify the associate and supervisor</li>
              </ul>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCompleteInternship}
              disabled={updateInternshipMutation.isPending}
            >
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Complete Internship
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}


function InternProjectsPanel({ userId }: { userId: string }): ReactNode {
  const { data, isLoading } = useProjects({ leadUserId: userId, pageSize: 50 });
  const projects = data?.data ?? [];

  if (isLoading) {
    return <p className="text-sm text-zinc-500">Loading projects...</p>;
  }
  if (projects.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-zinc-500">
          This associate has no projects yet.
        </CardContent>
      </Card>
    );
  }
  return (
    <div className="space-y-3">
      {projects.map((p) => (
        <ProjectRow key={p.id} project={p} />
      ))}
    </div>
  );
}

function ProjectRow({
  project,
}: {
  project: { id: string; name: string; progress_pct: number; health: 'on_track' | 'at_risk' | 'overdue'; points_total: number };
}): ReactNode {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <ProgressRing value={project.progress_pct} size={56} strokeWidth={5} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <Link
                href={`/admin/projects/${project.id}?mode=readonly`}
                className="truncate text-sm font-semibold text-zinc-900 hover:underline dark:text-zinc-50"
              >
                {project.name}
              </Link>
              {project.progress_pct < 100 ? <HealthPill health={project.health} /> : null}
              <Badge variant="outline">{project.points_total} pts</Badge>
            </div>
            <p className="mt-2 text-xs text-zinc-500">
              Interns can complete their own milestones directly from the project board.
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
