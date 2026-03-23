'use client';

import { SortableTableHead } from '@/components/data-display/SortableTableHead';
import { ApproveOnboardingModal } from '@/components/admin/ApproveOnboardingModal';
import { AssignEmployeeModal } from '@/components/admin/AssignEmployeeModal';
import { EODReportDetailModal } from '@/components/admin/EODReportDetailModal';
import { InviteUserModal } from '@/components/admin/InviteUserModal';
import { useAuth } from '@/contexts/AuthContext';
import { useInternships } from '@/hooks/useInternships';
import { useOnboardingProfiles } from '@/hooks/useOnboardingProfiles';
import { useRealtimeInternDailyLogs } from '@/hooks/useRealtimeInternDailyLogs';
import { useRealtimeInternships } from '@/hooks/useRealtimeInternships';
import { useRealtimeOnboardingApprovals } from '@/hooks/useRealtimeOnboardingApprovals';
import { useTableSort } from '@/hooks/useTableSort';
import { exportToCsv, formatDateForCsv, formatPercentageForCsv } from '@/lib/csv';
import type { InternshipFilters } from '@/lib/query-keys';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { useToast } from '@hr-portal/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  Clock,
  Download,
  Eye,
  FileText,
  GraduationCap,
  LayoutGrid,
  List,
  Search,
  ThumbsUp,
  Trash2,
  UserPlus,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type ReactNode, useCallback, useMemo, useState } from 'react';
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
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isSuperAdmin = user?.role === 'super_admin';
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
  const [selectedEodLog, setSelectedEodLog] = useState<(typeof dailyLogs)[number] | null>(null);

  // Delete intern state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [internToDelete, setInternToDelete] = useState<InternSummary | null>(null);
  const { addToast } = useToast();

  const deleteInternMutation = useMutation({
    mutationFn: async (internshipId: string) => {
      const response = await fetch(`/api/internships/${internshipId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to delete intern' }));
        throw new Error(error.error || 'Failed to delete intern');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['internships'] });
      queryClient.invalidateQueries({ queryKey: ['directory'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setDeleteDialogOpen(false);
      setInternToDelete(null);
      addToast({ title: 'Intern deleted', variant: 'success' });
    },
    onError: () => {
      addToast({ title: 'Failed to delete intern', variant: 'error' });
    },
  });

  const handleDeleteIntern = (intern: InternSummary) => {
    setInternToDelete(intern);
    setDeleteDialogOpen(true);
  };

  // Real-time approvals hook
  const { pendingApprovals, isSubscribed } = useRealtimeOnboardingApprovals('intern');

  // Real-time internships hook
  const { internships: _realtimeInternships, isSubscribed: _isInternshipsSubscribed } =
    useRealtimeInternships();

  // Real-time daily logs hook
  const { dailyLogs, isSubscribed: isDailyLogsSubscribed } = useRealtimeInternDailyLogs();

  // Sort state for Pending Approvals table
  const pendingSort = useTableSort({ initialColumn: 'submitted', initialDirection: 'desc' });
  const sortedPending = pendingSort.sortItems(pendingApprovals, {
    intern: (a) => a.full_name?.toLowerCase() ?? '',
    email: (a) => a.email_address?.toLowerCase() ?? '',
    position: (a) => a.position?.toLowerCase() ?? '',
    submitted: (a) => a.completed_at ?? '',
  });
  const pendingSortHeadProps = { sortColumn: pendingSort.sortColumn, sortDirection: pendingSort.sortDirection, onSort: pendingSort.handleSort };

  // Sort state for EOD Reports table
  const eodSort = useTableSort({ initialColumn: 'date', initialDirection: 'desc' });
  const sortedDailyLogs = eodSort.sortItems(dailyLogs, {
    intern: (l) => {
      const emp = l.internship?.employee;
      return emp ? `${emp.first_name} ${emp.last_name}`.toLowerCase() : '';
    },
    date: (l) => l.log_date ?? '',
    school: (l) => l.internship?.school?.toLowerCase() ?? '',
    department: (l) => l.internship?.department?.toLowerCase() ?? '',
    hours: (l) => l.hours_worked ?? 0,
    status: (l) => (l.is_approved ? 1 : 0),
  });
  const eodSortHeadProps = { sortColumn: eodSort.sortColumn, sortDirection: eodSort.sortDirection, onSort: eodSort.handleSort };

  // Sort state for Onboarding Submissions table
  const onboardSort = useTableSort({ initialColumn: 'submitted', initialDirection: 'desc' });
  const onboardSortHeadProps = { sortColumn: onboardSort.sortColumn, sortDirection: onboardSort.sortDirection, onSort: onboardSort.handleSort };

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

  const [exporting, setExporting] = useState(false);

  const handleExportReport = useCallback((): void => {
    setExporting(true);
    try {
      exportToCsv(filteredInterns, {
        filename: 'interns-report',
        headers: [
          'Name',
          'Email',
          'School',
          'Program',
          'Department',
          'Supervisor',
          'Start Date',
          'End Date',
          'Required Hours',
          'Completed Hours',
          'Progress',
          'Status',
        ],
        rowMapper: (intern) => [
          intern.name,
          intern.email,
          intern.school,
          intern.program,
          intern.department,
          intern.supervisor,
          formatDateForCsv(intern.startDate),
          formatDateForCsv(intern.endDate),
          intern.requiredHours,
          intern.completedHours,
          formatPercentageForCsv(intern.progressPercentage),
          intern.status,
        ],
      });
    } finally {
      setExporting(false);
    }
  }, [filteredInterns]);

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
          <Button variant="outline" onClick={handleExportReport} disabled={exporting}>
            <Download className="mr-2 h-4 w-4" />
            {exporting ? 'Exporting...' : 'Export Report'}
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
            {dailyLogs.filter((log) => !log.is_approved).length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {dailyLogs.filter((log) => !log.is_approved).length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="internships" className="space-y-6">
          {/* Summary Cards */}
          <InternshipSummaryCards stats={stats} />

          {/* Filters + View Toggle */}
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, or program..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
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
                <SelectTrigger className="w-[160px]">
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
                <SelectTrigger className="w-[160px]">
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
              <div className="inline-flex items-center rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 p-0.5">
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    viewMode === 'grid'
                      ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 shadow-sm'
                      : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                  }`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" strokeWidth={1.5} />
                  Cards
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    viewMode === 'list'
                      ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 shadow-sm'
                      : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                  }`}
                >
                  <List className="h-3.5 w-3.5" strokeWidth={1.5} />
                  List
                </button>
              </div>
            </div>
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
           

          {/* Interns Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Interns ({filteredInterns.length})</h2>
          </div>

          {/* Interns Display */}
          {viewMode === 'grid' ? (
            <InternList
              interns={filteredInterns}
              onView={handleViewIntern}
              {...(isSuperAdmin && { onDelete: handleDeleteIntern })}
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
                    <InternRow key={intern.id} intern={intern} onView={handleViewIntern} {...(isSuperAdmin && { onDelete: handleDeleteIntern })} />
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
              <CardContent className="p-6 text-sm text-muted-foreground">
                Loading interns...
              </CardContent>
            </Card>
          )}

          {internshipsQuery.error && (
            <Card className="border-destructive/50 bg-destructive/5">
              <CardContent className="p-6 text-sm text-destructive">
                Failed to load interns.
              </CardContent>
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
                      {pendingApprovals.length} Onboarding Submission
                      {pendingApprovals.length !== 1 ? 's' : ''} Awaiting Review
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
                    <SortableTableHead column="intern" {...pendingSortHeadProps}>Intern</SortableTableHead>
                    <SortableTableHead column="email" {...pendingSortHeadProps}>Email</SortableTableHead>
                    <SortableTableHead column="position" {...pendingSortHeadProps}>Position</SortableTableHead>
                    <SortableTableHead column="submitted" {...pendingSortHeadProps}>Submitted</SortableTableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingApprovals.length > 0 ? (
                    sortedPending.map((approval) => (
                      <TableRow
                        key={approval.id}
                        className="hover:bg-yellow-50/50 dark:hover:bg-yellow-900/5"
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarFallback className="text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400">
                                {approval.full_name
                                  ?.split(' ')
                                  .map((n: string) => n[0])
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
                      <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
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
                    <SortableTableHead column="intern" {...onboardSortHeadProps}>Intern</SortableTableHead>
                    <SortableTableHead column="email" {...onboardSortHeadProps}>Email</SortableTableHead>
                    <SortableTableHead column="department" {...onboardSortHeadProps}>Department</SortableTableHead>
                    <SortableTableHead column="status" {...onboardSortHeadProps}>Status</SortableTableHead>
                    <SortableTableHead column="step" {...onboardSortHeadProps}>Current Step</SortableTableHead>
                    <SortableTableHead column="submitted" {...onboardSortHeadProps}>Submitted</SortableTableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {onboardingData?.data && onboardingData.data.length > 0 ? (
                    onboardSort.sortItems([...onboardingData.data], {
                      intern: (p: any) => p.full_name?.toLowerCase() ?? '',
                      email: (p: any) => p.email_address?.toLowerCase() ?? '',
                      department: (p: any) => {
                        const dept = Array.isArray(p.departments) ? p.departments[0]?.name : p.departments?.name;
                        return dept?.toLowerCase() ?? '';
                      },
                      status: (p: any) => p.status ?? '',
                      step: (p: any) => p.current_step ?? '',
                      submitted: (p: any) => p.created_at ?? '',
                    }).map((profile: any) => {
                      const department = Array.isArray(profile.departments)
                        ? profile.departments[0]?.name
                        : profile.departments?.name;

                      return (
                        <TableRow key={profile.id} className="cursor-pointer hover:bg-muted/50 transition-colors" onDoubleClick={() => router.push(`/admin/onboarding/${profile.id}`)}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9">
                                <AvatarFallback className="text-xs">
                                  {profile.full_name
                                    ?.split(' ')
                                    .map((n: string) => n[0])
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
                            <Badge variant={profile.status === 'completed' ? 'success' : 'warning'}>
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
                      <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
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
                Monitor daily reports submitted by interns. Pending approvals require supervisor
                review.
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
                            {dailyLogs.filter((log) => !log.is_approved).length}
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
                            {dailyLogs.filter((log) => log.is_approved).length}
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
                      <SortableTableHead column="intern" {...eodSortHeadProps}>Intern</SortableTableHead>
                      <SortableTableHead column="date" {...eodSortHeadProps}>Date</SortableTableHead>
                      <SortableTableHead column="school" {...eodSortHeadProps}>School</SortableTableHead>
                      <SortableTableHead column="department" {...eodSortHeadProps}>Department</SortableTableHead>
                      <SortableTableHead column="hours" {...eodSortHeadProps}>Hours</SortableTableHead>
                      <SortableTableHead column="status" {...eodSortHeadProps}>Status</SortableTableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dailyLogs.length > 0 ? (
                      sortedDailyLogs.map((log) => {
                        const internName = log.internship?.employee
                          ? `${log.internship.employee.first_name} ${log.internship.employee.last_name}`
                          : 'Unknown Intern';

                        return (
                          <TableRow key={log.id} className="cursor-pointer hover:bg-muted/50 transition-colors" onDoubleClick={() => setSelectedEodLog(log)}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <Avatar className="h-9 w-9">
                                  <AvatarFallback className="text-xs">
                                    {internName
                                      .split(' ')
                                      .map((n: string) => n[0])
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
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setSelectedEodLog(log)}
                                title="View report details"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    ) : (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                          <div className="flex flex-col items-center gap-2">
                            <FileText className="h-12 w-12 text-muted-foreground/50" />
                            <p>No daily reports found</p>
                            <p className="text-sm">
                              Reports will appear here when interns submit their EOD forms
                            </p>
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

      <EODReportDetailModal
        open={!!selectedEodLog}
        onOpenChange={(open) => {
          if (!open) setSelectedEodLog(null);
        }}
        log={selectedEodLog}
      />

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <Trash2 className="h-5 w-5" />
              Remove Intern
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to remove{' '}
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                {internToDelete?.name}
              </span>
              ? This will soft-delete their internship and employee records. This can be reversed by a database administrator.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setInternToDelete(null);
              }}
              disabled={deleteInternMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (internToDelete) {
                  deleteInternMutation.mutate(internToDelete.id);
                }
              }}
              disabled={deleteInternMutation.isPending}
            >
              {deleteInternMutation.isPending ? 'Removing...' : 'Remove Intern'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
