'use client';

import { useInternships } from '@/hooks/useInternships';
import { useOnboardingProfiles } from '@/hooks/useOnboardingProfiles';
import { useRealtimeOnboardingApprovals } from '@/hooks/useRealtimeOnboardingApprovals';
import { useRealtimeInternships } from '@/hooks/useRealtimeInternships';
import { useRealtimeInternDailyLogs } from '@/hooks/useRealtimeInternDailyLogs';
import { type InternshipFilters } from '@/lib/query-keys';
import { useQueryClient } from '@tanstack/react-query';
import {
  Avatar,
  AvatarFallback,
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Input,
  type InternDashboardStats,
  type InternId,
  InternList,
  InternRow,
  type InternSummary,
  InternshipSummaryCards,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  type SupervisorId,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@hr-portal/ui';
import {
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileText,
  Filter,
  GraduationCap,
  Search,
  UserPlus,
  AlertCircle,
  Calendar,
  ThumbsUp,
  MessageSquare,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type ReactNode, useMemo, useState } from 'react';
import { InviteUserModal } from '@/components/admin/InviteUserModal';
import { ApproveOnboardingModal } from '@/components/admin/ApproveOnboardingModal';
import { AssignEmployeeModal } from '@/components/admin/AssignEmployeeModal';
function formatDateTime(dateString: string): string {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  }).format(date);
}

export default function AdminInternsPage(): ReactNode {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [schoolFilter, setSchoolFilter] = useState<string>('all');
  const [supervisorFilter, setSupervisorFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
  // Modal states
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState<any | null>(null);
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [assignmentData, setAssignmentData] = useState<any | null>(null);

  // Real-time approvals hook
  const { pendingApprovals, isSubscribed } = useRealtimeOnboardingApprovals('intern');
  
  // Real-time internships hook
  const { internships: _realtimeInternships, isSubscribed: _isInternshipsSubscribed } = useRealtimeInternships();
  
  // Real-time daily logs hook
  const { dailyLogs, isSubscribed: isDailyLogsSubscribed } = useRealtimeInternDailyLogs();

  const internshipFilters: InternshipFilters = {
    page: 1,
    pageSize: 100,
  };

  if (statusFilter !== 'all') {
    internshipFilters.status = statusFilter as 'active' | 'completed' | 'terminated' | 'converted';
  }
  if (schoolFilter !== 'all') {
    internshipFilters.school = schoolFilter;
  }
  if (searchQuery.trim()) {
    internshipFilters.search = searchQuery.trim();
  }

  const internshipsQuery = useInternships(internshipFilters);

  // Fetch intern onboarding profiles
  const { data: onboardingData, isLoading: onboardingLoading } = useOnboardingProfiles({
    role: 'intern',
    page: 1,
    pageSize: 50,
  });

  const interns = useMemo<Array<InternSummary>>(
    () =>
      (internshipsQuery.data?.data || []).map((internship) => ({
        id: internship.id as InternId,
        name: internship.name,
        email: internship.email,
        school: internship.school,
        program: internship.program,
        department: internship.department,
        supervisor: internship.supervisor,
        supervisorId: (internship.supervisorId || '') as SupervisorId,
        startDate: internship.startDate,
        endDate: internship.endDate,
        requiredHours: internship.requiredHours,
        completedHours: internship.completedHours,
        progressPercentage: internship.progressPercentage,
        status: internship.status === 'converted' ? 'completed' : internship.status,
        ...(internship.lastReportDate ? { lastReportDate: internship.lastReportDate } : {}),
        pendingReports: internship.pendingReports,
      })),
    [internshipsQuery.data]
  );

  const stats: InternDashboardStats = internshipsQuery.data?.summary || {
    totalInterns: 0,
    activeInterns: 0,
    completedInterns: 0,
    averageProgress: 0,
    totalHoursLogged: 0,
    pendingReports: 0,
    reportsThisWeek: 0,
  };

  const schools = [...new Set(interns.map((i) => i.school))];
  const supervisors = [...new Set(interns.map((i) => i.supervisor))];

  const filteredInterns = interns.filter((intern) => {
    const matchesSearch =
      intern.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      intern.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      intern.program.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'converted'
        ? intern.status === 'completed'
        : intern.status === statusFilter);
    const matchesSchool = schoolFilter === 'all' || intern.school === schoolFilter;
    const matchesSupervisor = supervisorFilter === 'all' || intern.supervisor === supervisorFilter;
    return matchesSearch && matchesStatus && matchesSchool && matchesSupervisor;
  });

  const handleViewIntern = (intern: InternSummary): void => {
    router.push(`/admin/interns/${intern.id}`);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Intern Management</h1>
          <p className="text-muted-foreground">
            Monitor interns and view their onboarding submissions
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Export Report
          </Button>
          <Button onClick={() => setInviteModalOpen(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Invite Intern
          </Button>
        </div>
      </div>

      <Tabs defaultValue="internships" className="space-y-6">
        <TabsList>
          <TabsTrigger value="internships">Internships</TabsTrigger>
          <TabsTrigger value="onboarding">Onboarding Data</TabsTrigger>
          <TabsTrigger value="eod-reports">
            EOD Reports
            {dailyLogs.filter(log => !log.is_approved).length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {dailyLogs.filter(log => !log.is_approved).length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="internships" className="space-y-6">
          {/* Summary Cards */}
          <InternshipSummaryCards stats={stats} />

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Filter className="h-4 w-4" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col lg:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or program..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full lg:w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="terminated">Terminated</SelectItem>
                <SelectItem value="converted">Converted</SelectItem>
              </SelectContent>
            </Select>
            <Select value={schoolFilter} onValueChange={setSchoolFilter}>
              <SelectTrigger className="w-full lg:w-[180px]">
                <SelectValue placeholder="School" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Schools</SelectItem>
                {schools.map((school) => (
                  <SelectItem key={school} value={school}>
                    {school}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={supervisorFilter} onValueChange={setSupervisorFilter}>
              <SelectTrigger className="w-full lg:w-[180px]">
                <SelectValue placeholder="Supervisor" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Supervisors</SelectItem>
                {supervisors.map((sup) => (
                  <SelectItem key={sup} value={sup}>
                    {sup}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {(statusFilter !== 'all' ||
            schoolFilter !== 'all' ||
            supervisorFilter !== 'all' ||
            searchQuery) && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground">
                Showing {filteredInterns.length} of {interns.length} interns
              </p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                  setSchoolFilter('all');
                  setSupervisorFilter('all');
                }}
              >
                Clear All Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Toggle */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Interns ({filteredInterns.length})</h2>
        <div className="flex gap-2">
          <Button
            variant={viewMode === 'grid' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('grid')}
          >
            Grid
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            List
          </Button>
        </div>
      </div>

      {/* Interns Display */}
      {viewMode === 'grid' ? (
        <InternList
          interns={filteredInterns}
          onView={handleViewIntern}
          layout="grid"
          emptyMessage={
            searchQuery ||
            statusFilter !== 'all' ||
            schoolFilter !== 'all' ||
            supervisorFilter !== 'all'
              ? 'No interns match the selected filters'
              : 'No interns found'
          }
        />
      ) : (
        <Card>
          <CardContent className="p-4 space-y-2">
            {filteredInterns.length > 0 ? (
              filteredInterns.map((intern) => (
                <InternRow key={intern.id} intern={intern} onView={handleViewIntern} />
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <GraduationCap className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>
                  {searchQuery ||
                  statusFilter !== 'all' ||
                  schoolFilter !== 'all' ||
                  supervisorFilter !== 'all'
                    ? 'No interns match the selected filters'
                    : 'No interns found'}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Pending Reports Alert */}
      {stats.pendingReports > 0 && (
        <Card className="border-warning/50 bg-warning/5">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10">
                <FileText className="h-5 w-5 text-warning" />
              </div>
              <div>
                <h3 className="font-semibold text-warning">Pending Report Reviews</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  There are {stats.pendingReports} daily reports waiting for supervisor review.
                  Timely feedback helps interns improve their performance.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {internshipsQuery.isLoading && (
        <Card>
          <CardContent className="p-6 text-sm text-muted-foreground">Loading interns...</CardContent>
        </Card>
      )}

      {internshipsQuery.error && (
        <Card className="border-destructive/50 bg-destructive/5">
          <CardContent className="p-6 text-sm text-destructive">Failed to load interns.</CardContent>
        </Card>
      )}
        </TabsContent>

        <TabsContent value="onboarding" className="space-y-6">
          {/* Real-time Connection Status */}
          {isSubscribed && (
            <Card className="border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-900/20">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 text-sm text-green-700 dark:text-green-400">
                  <div className="h-2 w-2 rounded-full bg-green-600 dark:bg-green-400 animate-pulse" />
                  Real-time monitoring active
                </div>
              </CardContent>
            </Card>
          )}

          {/* Approval Stats */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100 dark:bg-yellow-900/20">
                    <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Awaiting Approval</p>
                    <p className="text-2xl font-bold">{pendingApprovals.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 dark:bg-blue-900/20">
                    <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Submissions</p>
                    <p className="text-2xl font-bold">{onboardingData?.summary.total ?? 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/20">
                    <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Completed</p>
                    <p className="text-2xl font-bold">{onboardingData?.summary.completed ?? 0}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Pending Approvals Alert */}
          {pendingApprovals.length > 0 && (
            <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-900/20">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-yellow-100 dark:bg-yellow-900/20">
                    <AlertCircle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-yellow-800 dark:text-yellow-200">
                      {pendingApprovals.length} Onboarding Submission{pendingApprovals.length !== 1 ? 's' : ''} Awaiting Review
                    </h3>
                    <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                      Review and approve intern onboarding submissions to activate their accounts.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pending Approvals Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pending Approvals</CardTitle>
              <CardDescription>
                Interns who have completed onboarding and are waiting for approval
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Intern</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingApprovals.length > 0 ? (
                    pendingApprovals.map((approval) => (
                      <TableRow key={approval.id} className="hover:bg-yellow-50/50 dark:hover:bg-yellow-900/5">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarFallback className="text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400">
                                {approval.full_name
                                  ?.split(' ')
                                  .map((n) => n[0])
                                  .join('')
                                  .toUpperCase()
                                  .slice(0, 2) || 'NA'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{approval.full_name || 'Unnamed'}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {approval.email_address || 'N/A'}
                        </TableCell>
                        <TableCell className="text-sm">
                          {approval.position || 'Not specified'}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatDateTime(approval.completed_at)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="default"
                            size="sm"
                            className="bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => setSelectedApproval(approval)}
                          >
                            <CheckCircle2 className="mr-1 h-4 w-4" />
                            Review & Approve
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={5}
                        className="text-center py-8 text-muted-foreground"
                      >
                        <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No pending approvals</p>
                        <p className="text-sm mt-1">
                          All onboarding submissions have been processed
                        </p>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* All Onboarding Submissions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">All Onboarding Submissions</CardTitle>
              <CardDescription>Complete history of intern onboarding data</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Intern</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Current Step</TableHead>
                    <TableHead>Submitted</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {onboardingData?.data && onboardingData.data.length > 0 ? (
                    onboardingData.data.map((profile) => {
                      const department = Array.isArray(profile.departments)
                        ? profile.departments[0]?.name
                        : profile.departments?.name;

                      return (
                        <TableRow key={profile.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9">
                                <AvatarFallback className="text-xs">
                                  {profile.full_name
                                    ?.split(' ')
                                    .map((n) => n[0])
                                    .join('')
                                    .toUpperCase()
                                    .slice(0, 2) || 'NA'}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">{profile.full_name || 'Unnamed'}</p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {profile.email_address || 'N/A'}
                          </TableCell>
                          <TableCell>{department || 'N/A'}</TableCell>
                          <TableCell>
                            <Badge
                              variant={profile.status === 'completed' ? 'success' : 'warning'}
                            >
                              {profile.status === 'completed' ? 'Completed' : 'In Progress'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {profile.current_step.replace('_', ' ')}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(profile.created_at).toLocaleDateString()}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => router.push(`/admin/onboarding/${profile.id}`)}
                            >
                              <Eye className="mr-1 h-4 w-4" />
                              View Details
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  ) : (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="text-center py-8 text-muted-foreground"
                      >
                        {onboardingLoading
                          ? 'Loading onboarding data...'
                          : 'No intern onboarding submissions found'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        
        {/* EOD Reports Tab */}
        <TabsContent value="eod-reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                End of Day Reports
                {isDailyLogsSubscribed && (
                  <Badge variant="outline" className="ml-2">
                    ✅ Live
                  </Badge>
                )}
              </CardTitle>
              <CardDescription>
                Monitor daily reports submitted by interns. Pending approvals require supervisor review.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Summary Stats */}
                <div className="grid gap-4 md:grid-cols-3">
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-blue-900/20 flex items-center justify-center">
                          <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">{dailyLogs.length}</p>
                          <p className="text-sm text-muted-foreground">Total Reports</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-yellow-100 dark:bg-yellow-900/20 flex items-center justify-center">
                          <Clock className="h-6 w-6 text-yellow-600 dark:text-yellow-400" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">
                            {dailyLogs.filter(log => !log.is_approved).length}
                          </p>
                          <p className="text-sm text-muted-foreground">Pending Approval</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                          <CheckCircle2 className="h-6 w-6 text-green-600 dark:text-green-400" />
                        </div>
                        <div>
                          <p className="text-2xl font-bold">
                            {dailyLogs.filter(log => log.is_approved).length}
                          </p>
                          <p className="text-sm text-muted-foreground">Approved</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Reports Table */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Intern</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>School</TableHead>
                      <TableHead>Department</TableHead>
                      <TableHead>Hours</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dailyLogs.length > 0 ? (
                      dailyLogs.map((log) => {
                        const internName = log.internship?.employee
                          ? `${log.internship.employee.first_name} ${log.internship.employee.last_name}`
                          : 'Unknown Intern';
                        
                        return (
                          <TableRow key={log.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-9 w-9">
                                  <AvatarFallback className="text-xs">
                                    {internName
                                      .split(' ')
                                      .map((n) => n[0])
                                      .join('')
                                      .toUpperCase()
                                      .slice(0, 2)}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <p className="font-medium">{internName}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Calendar className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm">
                                  {new Date(log.log_date).toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric',
                                  })}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {log.internship?.school || 'N/A'}
                            </TableCell>
                            <TableCell className="text-sm">
                              {log.internship?.department || 'N/A'}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Clock className="h-4 w-4 text-muted-foreground" />
                                <span className="font-medium">{log.hours_worked}h</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {log.is_approved ? (
                                <Badge variant="success" className="flex items-center gap-1 w-fit">
                                  <ThumbsUp className="h-3 w-3" />
                                  Approved
                                </Badge>
                              ) : (
                                <Badge variant="warning" className="flex items-center gap-1 w-fit">
                                  <Clock className="h-3 w-3" />
                                  Pending
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => {
                                      // Navigate to detailed view with the log
                                      router.push(`/admin/interns/${log.internship_id}#daily-logs`);
                                    }}
                                  >
                                    <Eye className="mr-2 h-4 w-4" />
                                    View Details
                                  </DropdownMenuItem>
                                  {!log.is_approved && (
                                    <DropdownMenuItem
                                      onClick={() => {
                                        // TODO: Quick approve action
                                        console.log('Quick approve:', log.id);
                                      }}
                                    >
                                      <CheckCircle2 className="mr-2 h-4 w-4" />
                                      Quick Approve
                                    </DropdownMenuItem>
                                  )}
                                  {log.is_approved && log.supervisor_notes && (
                                    <DropdownMenuItem
                                      onClick={() => {
                                        alert(`Supervisor Notes: ${log.supervisor_notes}`);
                                      }}
                                    >
                                      <MessageSquare className="mr-2 h-4 w-4" />
                                      View Notes
                                    </DropdownMenuItem>
                                  )}
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="text-center py-12 text-muted-foreground"
                        >
                          <div className="flex flex-col items-center gap-2">
                            <FileText className="h-12 w-12 text-muted-foreground/50" />
                            <p>No daily reports found</p>
                            <p className="text-sm">Reports will appear here when interns submit their EOD forms</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <InviteUserModal
        open={inviteModalOpen}
        onOpenChange={setInviteModalOpen}
        defaultRole="intern"
      />
      
      <ApproveOnboardingModal
        open={!!selectedApproval}
        onOpenChange={(open) => !open && setSelectedApproval(null)}
        onboarding={selectedApproval}
        onApprovalSuccess={(data) => {
          setAssignmentData(data);
          setAssignmentModalOpen(true);
        }}
      />
      
      <AssignEmployeeModal
        open={assignmentModalOpen}
        onOpenChange={setAssignmentModalOpen}
        assignmentData={assignmentData}
        onSuccess={() => {
          // Invalidate queries to refresh the UI
          queryClient.invalidateQueries({ queryKey: ['internships'] });
          queryClient.invalidateQueries({ queryKey: ['onboarding_profiles'] });
          queryClient.invalidateQueries({ queryKey: ['probation'] });
          setAssignmentData(null);
          setAssignmentModalOpen(false);
        }}
      />
    </div>
  );
}
