'use client';

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
  type InternId,
  type InternshipPeriodId,
  InternshipStatusBadge,
  Progress,
  type SupervisorId,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Textarea,
  calculateHoursProgress,
  getDaysRemaining,
} from '@hr-portal/ui';
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
import Link from 'next/link';
import { type ReactNode, use, useState } from 'react';

// Mock data
const mockIntern = {
  id: 'intern-1' as InternId,
  name: 'John Doe',
  email: 'john.doe@university.edu',
  phone: '+1 (555) 123-4567',
  school: 'State University',
  program: 'Computer Science',
  department: 'Engineering',
  supervisor: 'Sarah Johnson',
  supervisorId: 'sup-1' as SupervisorId,
  supervisorEmail: 'sarah.johnson@company.com',
  startDate: '2024-01-15',
  endDate: '2024-04-15',
  requiredHours: 480,
  completedHours: 245,
  status: 'active' as const,
  notes: 'Excellent progress. Shows great initiative and is quick to learn new technologies.',
};

const mockReports: Array<DailyReport> = [
  {
    id: 'report-1' as DailyReportId,
    internId: 'intern-1' as InternId,
    internshipPeriodId: 'period-1' as InternshipPeriodId,
    date: '2024-02-15',
    tasksCompleted:
      'Worked on implementing the dashboard UI components. Fixed several bugs in the navigation system. Participated in code review session.',
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

// Weekly hours data for timeline
const mockWeeklyHours = [
  { week: 'Week 1', hours: 40, target: 40 },
  { week: 'Week 2', hours: 38, target: 40 },
  { week: 'Week 3', hours: 42, target: 40 },
  { week: 'Week 4', hours: 40, target: 40 },
  { week: 'Week 5', hours: 45, target: 40 },
  { week: 'Week 6', hours: 40, target: 40 },
];

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
  const { id: _id } = use(params);
  const [feedbackDialogOpen, setFeedbackDialogOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<DailyReport | null>(null);
  const [feedback, setFeedback] = useState('');
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);

  const daysRemaining = getDaysRemaining(mockIntern.endDate);
  const progressPercentage = calculateHoursProgress(
    mockIntern.completedHours,
    mockIntern.requiredHours
  );
  const pendingReports = mockReports.filter((r) => r.status === 'submitted').length;

  const handleProvideFeedback = (report: DailyReport): void => {
    setSelectedReport(report);
    setFeedback('');
    setFeedbackDialogOpen(true);
  };

  const handleSubmitFeedback = (): void => {
    setFeedbackDialogOpen(false);
    setSelectedReport(null);
  };

  const handleCompleteInternship = (): void => {
    setCompleteDialogOpen(false);
  };

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
            <h1 className="text-2xl font-bold text-foreground">Intern Profile</h1>
            <p className="text-muted-foreground">View and manage intern details</p>
          </div>
        </div>
        <div className="flex gap-2">
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
              <DropdownMenuItem>
                <Download className="mr-2 h-4 w-4" />
                Export Report
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Award className="mr-2 h-4 w-4" />
                Generate Certificate
              </DropdownMenuItem>
              {mockIntern.status === 'active' && progressPercentage >= 100 && (
                <DropdownMenuItem onClick={() => setCompleteDialogOpen(true)}>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Complete Internship
                </DropdownMenuItem>
              )}
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
                <AvatarFallback className="text-2xl">{getInitials(mockIntern.name)}</AvatarFallback>
              </Avatar>
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <h2 className="text-xl font-bold">{mockIntern.name}</h2>
                  <InternshipStatusBadge status={mockIntern.status} />
                </div>
                <p className="text-muted-foreground">{mockIntern.program}</p>
                <div className="flex flex-wrap gap-4 mt-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Mail className="h-4 w-4" />
                    {mockIntern.email}
                  </span>
                  <span className="flex items-center gap-1">
                    <Phone className="h-4 w-4" />
                    {mockIntern.phone}
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
                <p className="font-medium text-sm">{mockIntern.school}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Building2 className="h-4 w-4" />
                  <span className="text-xs">Department</span>
                </div>
                <p className="font-medium text-sm">{mockIntern.department}</p>
              </div>
              <div className="p-3 rounded-lg bg-muted/50">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <User className="h-4 w-4" />
                  <span className="text-xs">Supervisor</span>
                </div>
                <p className="font-medium text-sm">{mockIntern.supervisor}</p>
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
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-2">
            <HoursProgressCard
              completedHours={mockIntern.completedHours}
              requiredHours={mockIntern.requiredHours}
              startDate={mockIntern.startDate}
              endDate={mockIntern.endDate}
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
                      {new Date(mockIntern.startDate).toLocaleDateString('en-US', {
                        month: 'long',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">End Date</p>
                    <p className="font-medium">
                      {new Date(mockIntern.endDate).toLocaleDateString('en-US', {
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
                            ((new Date().getTime() - new Date(mockIntern.startDate).getTime()) /
                              (new Date(mockIntern.endDate).getTime() -
                                new Date(mockIntern.startDate).getTime())) *
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
              <CardDescription>Internal notes about this intern</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm">{mockIntern.notes || 'No notes added yet.'}</p>
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
                      Provide feedback to help the intern improve
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <DailyReportList reports={mockReports} />

          {/* Add feedback button for pending reports */}
          {mockReports
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
                {mockWeeklyHours.map((week, index) => (
                  <div key={index} className="space-y-2">
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
              placeholder="Enter your feedback for the intern..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              className="min-h-[150px]"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFeedbackDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmitFeedback} disabled={!feedback.trim()}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Submit Feedback
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
              Mark {mockIntern.name}'s internship as complete. This will:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Change the intern's status to "Completed"</li>
                <li>Generate a completion certificate</li>
                <li>Notify the intern and supervisor</li>
              </ul>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCompleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCompleteInternship}>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Complete Internship
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
