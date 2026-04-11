'use client';

import { ApproveOnboardingModal } from '@/components/admin/ApproveOnboardingModal';
import { AssignEmployeeModal } from '@/components/admin/AssignEmployeeModal';
import { SortableTableHead } from '@/components/data-display/SortableTableHead';
import { StatCard, StatCardGrid } from '@/components/data-display/StatCard';
import { InviteUserModal } from '@/components/admin/InviteUserModal';
import { useOnboardingProfiles } from '@/hooks/useOnboardingProfiles';
import {
  getOnboardingReviewStateBadgeVariant,
  getOnboardingReviewStateLabel,
} from '@/lib/onboarding-review-state';
import { getOnboardingStepLabel } from '@/lib/onboarding-step';
import { useCompleteProbation, useExtendProbation, useProbation } from '@/hooks/useProbation';
import { useRealtimeOnboardingApprovals } from '@/hooks/useRealtimeOnboardingApprovals';
import { useRealtimeProbationEmployees } from '@/hooks/useRealtimeProbationEmployees';
import { useTableSort } from '@/hooks/useTableSort';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  EmptyState,
  Input,
  Progress,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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
  Textarea,
  useToast,
} from '@hr-portal/ui';
import { useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  Clock,
  Eye,
  FileText,
  Loader2,
  MessageSquare,
  MoreVertical,
  Search,
  Star,
  Target,
  TrendingUp,
  UserPlus,
  Users,
  XCircle,
  X,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type ReactNode, useMemo, useState } from 'react';
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

type ProbationStatus = 'on-track' | 'at-risk' | 'completed' | 'extended';
type ProbationStage = 1 | 2 | 3 | 4;
type PerformanceRating =
  | 'exceptional'
  | 'exceeds'
  | 'meets'
  | 'needs_improvement'
  | 'unsatisfactory';

interface OKR {
  id: string;
  objective: string;
  keyResults: Array<{
    id: string;
    description: string;
    target: string;
    current: string;
    progress: number;
  }>;
  status: 'draft' | 'submitted' | 'approved' | 'in_progress' | 'completed';
}

interface KPI {
  id: string;
  name: string;
  description: string;
  target: string;
  actual: string;
  score: number;
}

interface Employee {
  id: string;
  name: string;
  email: string;
  department: string;
  position: string;
  startDate: string;
  stage: ProbationStage;
  status: ProbationStatus;
  daysRemaining: number;
  manager: string;
  avatarUrl?: string;
  documentsComplete: number;
  totalDocuments: number;
  okrs: Array<OKR>;
  kpis: Array<KPI>;
}

const statusConfig: Record<
  ProbationStatus,
  {
    label: string;
    variant: 'success' | 'warning' | 'error' | 'secondary';
    icon: typeof CheckCircle2;
  }
> = {
  'on-track': { label: 'On Track', variant: 'success', icon: TrendingUp },
  'at-risk': { label: 'At Risk', variant: 'error', icon: AlertTriangle },
  completed: { label: 'Completed', variant: 'secondary', icon: CheckCircle2 },
  extended: { label: 'Extended', variant: 'warning', icon: Clock },
};

const ratingConfig: Record<
  PerformanceRating,
  { label: string; description: string; color: string }
> = {
  exceptional: {
    label: 'Exceptional',
    description: 'Consistently exceeds all expectations and delivers outstanding results',
    color: 'bg-emerald-500',
  },
  exceeds: {
    label: 'Exceeds Expectations',
    description: 'Frequently exceeds expectations and delivers high-quality work',
    color: 'bg-green-500',
  },
  meets: {
    label: 'Meets Expectations',
    description: 'Consistently meets job requirements and expectations',
    color: 'bg-blue-500',
  },
  needs_improvement: {
    label: 'Needs Improvement',
    description: 'Performance is below expectations in some areas',
    color: 'bg-yellow-500',
  },
  unsatisfactory: {
    label: 'Unsatisfactory',
    description: 'Performance is significantly below expectations',
    color: 'bg-red-500',
  },
};

function StageIndicator({
  stage,
  status,
}: { stage: ProbationStage; status: ProbationStatus }): ReactNode {
  const stages = [1, 2, 3, 4];

  return (
    <div className="flex items-center gap-1">
      {stages.map((s) => (
        <div
          key={s}
          className={`h-2 w-6 rounded-full ${
            s < stage
              ? 'bg-success'
              : s === stage
                ? status === 'at-risk'
                  ? 'bg-error'
                  : status === 'extended'
                    ? 'bg-warning'
                    : 'bg-primary'
                : 'bg-muted'
          }`}
        />
      ))}
      <span className="ml-2 text-xs text-muted-foreground">Stage {stage}/4</span>
    </div>
  );
}

function StarRating({
  value,
  onChange,
  readonly = false,
}: {
  value: number;
  onChange?: (rating: number) => void;
  readonly?: boolean;
}): ReactNode {
  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star)}
          className={`transition-colors ${readonly ? '' : 'cursor-pointer hover:scale-110'}`}
        >
          <Star
            className={`h-6 w-6 ${
              star <= value ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'
            }`}
          />
        </button>
      ))}
    </div>
  );
}

function getProbationTrackerViewState({
  isLoading,
  hasError,
  employeeCount,
}: {
  isLoading: boolean;
  hasError: boolean;
  employeeCount: number;
}): 'loading' | 'error' | 'empty' | 'ready' {
  if (hasError) {
    return 'error';
  }

  if (isLoading) {
    return 'loading';
  }

  if (employeeCount === 0) {
    return 'empty';
  }

  return 'ready';
}

export default function ProbationPage(): ReactNode {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const {
    data: probationPayload,
    isLoading: probationLoading,
    error: probationError,
  } = useProbation();
  const completeProbation = useCompleteProbation();
  const extendProbation = useExtendProbation();

  // Fetch employee onboarding profiles
  const { data: onboardingData, isLoading: onboardingLoading } = useOnboardingProfiles({
    role: 'employee',
    page: 1,
    pageSize: 50,
  });

  // Real-time approvals hook
  const { pendingApprovals, isSubscribed } = useRealtimeOnboardingApprovals('employee');

  // Real-time probation employees hook
  const { employees: _realtimeEmployees, isSubscribed: _isProbationSubscribed } =
    useRealtimeProbationEmployees();

  const employeeRecords = probationPayload?.data ?? [];

  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [appraisalDialogOpen, setAppraisalDialogOpen] = useState(false);
  const [overallRating, setOverallRating] = useState<PerformanceRating>('meets');
  const [starRating, setStarRating] = useState(3);
  const [feedback, setFeedback] = useState('');
  const [okrRatings, setOkrRatings] = useState<Record<string, number>>({});
  const [kpiRatings, setKpiRatings] = useState<Record<string, number>>({});

  // Modal states for credentials-first flow
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState<any | null>(null);
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [assignmentData, setAssignmentData] = useState<any | null>(null);

  // Sort hooks for 3 tables
  const probationSort = useTableSort({ initialColumn: 'employee', initialDirection: 'asc' });
  const pendingSort = useTableSort({ initialColumn: 'submitted', initialDirection: 'desc' });
  const onboardSort = useTableSort({ initialColumn: 'submitted', initialDirection: 'desc' });

  const filteredEmployees = employeeRecords.filter((emp) => {
    const matchesSearch =
      emp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      emp.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || emp.status === statusFilter;
    const matchesDepartment = departmentFilter === 'all' || emp.department === departmentFilter;
    return matchesSearch && matchesStatus && matchesDepartment;
  });

  const statusOrder: Record<string, number> = { 'on-track': 0, 'at-risk': 1, extended: 2, completed: 3 };
  const sortedEmployees = probationSort.sortItems(filteredEmployees as Employee[], {
    employee: (e: Employee) => e.name.toLowerCase(),
    department: (e: Employee) => e.department.toLowerCase(),
    stage: (e: Employee) => e.stage,
    status: (e: Employee) => statusOrder[e.status] ?? 99,
    days_left: (e: Employee) => e.daysRemaining,
  });

  const sortedPending = pendingSort.sortItems(pendingApprovals as any[], {
    employee: (a: any) => (a.full_name || '').toLowerCase(),
    email: (a: any) => (a.email_address || '').toLowerCase(),
    position: (a: any) => (a.position || '').toLowerCase(),
    submitted: (a: any) => a.completed_at || '',
  });

  const probationSortHeadProps = {
    sortColumn: probationSort.sortColumn,
    sortDirection: probationSort.sortDirection,
    onSort: probationSort.handleSort,
  };
  const pendingSortHeadProps = {
    sortColumn: pendingSort.sortColumn,
    sortDirection: pendingSort.sortDirection,
    onSort: pendingSort.handleSort,
  };
  const onboardSortHeadProps = {
    sortColumn: onboardSort.sortColumn,
    sortDirection: onboardSort.sortDirection,
    onSort: onboardSort.handleSort,
  };

  const stats = {
    total: employeeRecords.length,
    onTrack: employeeRecords.filter((e) => e.status === 'on-track').length,
    atRisk: employeeRecords.filter((e) => e.status === 'at-risk').length,
    completed: employeeRecords.filter((e) => e.status === 'completed').length,
  };

  const rejectedOnboardingProfiles = useMemo(
    () =>
      [...(onboardingData?.data ?? [])]
        .filter((profile) => profile.review_state === 'rejected')
        .sort((left, right) => {
          const leftTime = left.rejected_at ? new Date(left.rejected_at).getTime() : 0;
          const rightTime = right.rejected_at ? new Date(right.rejected_at).getTime() : 0;
          return rightTime - leftTime;
        }),
    [onboardingData?.data]
  );

  const probationTrackerViewState = getProbationTrackerViewState({
    isLoading: probationLoading,
    hasError: Boolean(probationError),
    employeeCount: employeeRecords.length,
  });

  const departments = [...new Set(employeeRecords.map((e) => e.department))];

  const getInitials = (name: string): string => {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleViewAppraisal = (employee: Employee): void => {
    setSelectedEmployee(employee);
    setAppraisalDialogOpen(true);
    // Reset form
    setOverallRating('meets');
    setStarRating(3);
    setFeedback('');
    setOkrRatings({});
    setKpiRatings({});
  };

  const handleSubmitAppraisal = async (): Promise<void> => {
    if (selectedEmployee) {
      try {
        await completeProbation.mutateAsync({
          employeeId: selectedEmployee.id,
          finalRating: starRating,
          comments: feedback,
        });
        addToast({
          title: 'Probation completed',
          description: `${selectedEmployee.name} has successfully passed probation`,
          variant: 'success',
        });
      } catch (error) {
        addToast({
          title: 'Error',
          description: error instanceof Error ? error.message : 'Failed to complete probation',
          variant: 'error',
        });
      }
    }

    setAppraisalDialogOpen(false);
    setSelectedEmployee(null);
  };

  const handleExtendProbation = async (employeeId: string): Promise<void> => {
    const today = new Date();
    today.setDate(today.getDate() + 14);
    const newEndDate = today.toISOString().slice(0, 10);

    try {
      await extendProbation.mutateAsync({
        employeeId,
        newProbationEndDate: newEndDate,
        reason: 'Extended from probation tracker dashboard',
      });
      addToast({
        title: 'Probation extended',
        description: `Probation period extended by 14 days`,
        variant: 'success',
      });
    } catch (error) {
      addToast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to extend probation',
        variant: 'error',
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Employee Probation</h1>
          <p className="text-muted-foreground">
            Monitor employee probation periods and onboarding status
          </p>
        </div>
        <Button onClick={() => setInviteModalOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Invite Employee
        </Button>
      </div>

      <Tabs defaultValue="probation" className="space-y-6">
        <TabsList>
          <TabsTrigger value="probation">Probation Tracker</TabsTrigger>
          <TabsTrigger value="onboarding">Onboarding Data</TabsTrigger>
        </TabsList>

        <TabsContent value="probation" className="space-y-6">
          {probationTrackerViewState === 'error' ? (
            <Card>
              <CardContent>
                <EmptyState
                  icon={AlertCircle}
                  title="Failed to load probation data"
                  description="The probation tracker could not load employee records. Refresh and try again."
                  size="sm"
                />
              </CardContent>
            </Card>
          ) : probationTrackerViewState === 'loading' ? (
            <Card>
              <CardContent>
                <EmptyState
                  icon={<Loader2 className="h-5 w-5 animate-spin" />}
                  title="Loading probation data"
                  description="Employee probation records are still loading."
                  size="sm"
                />
              </CardContent>
            </Card>
          ) : probationTrackerViewState === 'empty' ? (
            <Card>
              <CardContent>
                <EmptyState
                  icon={Users}
                  title="No probationary employees found"
                  description="There are currently no employees with active probation records."
                  size="sm"
                />
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Probation Stats Cards */}
              <StatCardGrid columns={4}>
                <StatCard
                  label="Total Employees"
                  value={stats.total}
                  icon={<Users className="h-4 w-4" strokeWidth={1.5} />}
                />
                <StatCard
                  label="On Track"
                  value={stats.onTrack}
                  icon={<TrendingUp className="h-4 w-4" strokeWidth={1.5} />}
                />
                <StatCard
                  label="At Risk"
                  value={stats.atRisk}
                  icon={<AlertTriangle className="h-4 w-4" strokeWidth={1.5} />}
                />
                <StatCard
                  label="Completed"
                  value={stats.completed}
                  icon={<CheckCircle2 className="h-4 w-4" strokeWidth={1.5} />}
                />
              </StatCardGrid>

              {/* Filters */}
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search employees..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
                  />
                </div>
                <div className="flex gap-3">
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Status</SelectItem>
                      <SelectItem value="on-track">On Track</SelectItem>
                      <SelectItem value="at-risk">At Risk</SelectItem>
                      <SelectItem value="extended">Extended</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                    <SelectTrigger className="w-[160px]">
                      <SelectValue placeholder="Department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Departments</SelectItem>
                      {departments.map((dept) => (
                        <SelectItem key={dept} value={dept}>
                          {dept}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Employee Table */}
              <Card>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <SortableTableHead column="employee" {...probationSortHeadProps}>Employee</SortableTableHead>
                        <SortableTableHead column="department" {...probationSortHeadProps}>Department</SortableTableHead>
                        <SortableTableHead column="stage" {...probationSortHeadProps}>Stage</SortableTableHead>
                        <SortableTableHead column="status" {...probationSortHeadProps}>Status</SortableTableHead>
                        <TableHead>Documents</TableHead>
                        <TableHead>View</TableHead>
                        <SortableTableHead column="days_left" {...probationSortHeadProps}>Days Left</SortableTableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedEmployees.length > 0 ? (
                        sortedEmployees.map((employee) => {
                          const config = statusConfig[employee.status];
                          const StatusIcon = config.icon;
                          const docProgress = Math.round(
                            (employee.documentsComplete / employee.totalDocuments) * 100
                          );

                          return (
                            <TableRow key={employee.id} className="cursor-pointer hover:bg-muted/50 transition-colors" onDoubleClick={() => handleViewAppraisal(employee)}>
                              <TableCell>
                                <div className="flex items-center gap-3">
                                  <Avatar className="h-9 w-9">
                                    {employee.avatarUrl && <AvatarImage src={employee.avatarUrl} />}
                                    <AvatarFallback className="text-xs">
                                      {getInitials(employee.name)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className="font-medium">{employee.name}</p>
                                    <p className="text-xs text-muted-foreground">{employee.position}</p>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell>{employee.department}</TableCell>
                              <TableCell>
                                <StageIndicator stage={employee.stage} status={employee.status} />
                              </TableCell>
                              <TableCell>
                                <Badge variant={config.variant} className="gap-1">
                                  <StatusIcon className="h-3 w-3" />
                                  {config.label}
                                </Badge>
                              </TableCell>
                              <TableCell>
                                <div className="flex items-center gap-2">
                                  <Progress value={docProgress} className="h-2 w-16" />
                                  <span className="text-xs text-muted-foreground">
                                    {employee.documentsComplete}/{employee.totalDocuments}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleViewAppraisal(employee)}
                                  disabled={employee.okrs.length === 0 && employee.kpis.length === 0}
                                >
                                  <Eye className="mr-1 h-4 w-4" />
                                  View
                                </Button>
                              </TableCell>
                              <TableCell>
                                {employee.status === 'completed' ? (
                                  <span className="text-muted-foreground">-</span>
                                ) : (
                                  <span
                                    className={
                                      employee.daysRemaining <= 15 ? 'text-error font-medium' : ''
                                    }
                                  >
                                    {employee.daysRemaining} days
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="icon" aria-label="More options">
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem onClick={() => handleViewAppraisal(employee)}>
                                      <Eye className="mr-2 h-4 w-4" />
                                      View Appraisal
                                    </DropdownMenuItem>
                                    <DropdownMenuItem>
                                      <MessageSquare className="mr-2 h-4 w-4" />
                                      Add Note
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => {
                                        void handleExtendProbation(employee.id);
                                      }}
                                    >
                                      <ChevronRight className="mr-2 h-4 w-4" />
                                      Advance Stage
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </TableCell>
                            </TableRow>
                          );
                        })
                      ) : (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                            No probationary employees match the current filters
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </>
          )}

          {/* Performance Appraisal Modal */}
          <Dialog open={appraisalDialogOpen} onOpenChange={setAppraisalDialogOpen}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-3">
                  <Target className="h-5 w-5 text-primary" />
                  Performance Appraisal
                </DialogTitle>
                <DialogDescription>
                  Review and rate {selectedEmployee?.name}&apos;s performance based on their OKRs
                  and KPIs
                </DialogDescription>
              </DialogHeader>

              {selectedEmployee && (
                <div className="space-y-6">
                  {/* Employee Info */}
                  <div className="flex items-center gap-4 rounded-lg bg-muted/50 p-4">
                    <Avatar className="h-14 w-14">
                      {selectedEmployee.avatarUrl && (
                        <AvatarImage src={selectedEmployee.avatarUrl} />
                      )}
                      <AvatarFallback className="text-lg">
                        {getInitials(selectedEmployee.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold">{selectedEmployee.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {selectedEmployee.position} - {selectedEmployee.department}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Manager: {selectedEmployee.manager}
                      </p>
                    </div>
                    <Badge variant={statusConfig[selectedEmployee.status].variant}>
                      {statusConfig[selectedEmployee.status].label}
                    </Badge>
                  </div>

                  <Tabs defaultValue="okrs" className="space-y-4">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="okrs">OKRs</TabsTrigger>
                      <TabsTrigger value="kpis">KPIs</TabsTrigger>
                      <TabsTrigger value="rating">Overall Rating</TabsTrigger>
                    </TabsList>

                    {/* OKRs Tab */}
                    <TabsContent value="okrs" className="space-y-4">
                      {selectedEmployee.okrs.length === 0 ? (
                        <Card>
                          <CardContent>
                            <EmptyState
                              icon={Target}
                              title="No OKRs submitted yet"
                              description="Submitted employee objectives will appear here for appraisal once they are available."
                              size="sm"
                            />
                          </CardContent>
                        </Card>
                      ) : (
                        selectedEmployee.okrs.map((okr) => (
                          <Card key={okr.id}>
                            <CardHeader className="pb-3">
                              <div className="flex items-start justify-between">
                                <div>
                                  <CardTitle className="text-base">{okr.objective}</CardTitle>
                                  <CardDescription>
                                    Status:{' '}
                                    <Badge variant="secondary" className="ml-1">
                                      {okr.status.replace('_', ' ')}
                                    </Badge>
                                  </CardDescription>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm text-muted-foreground">Rate this OKR</p>
                                  <StarRating
                                    value={okrRatings[okr.id] || 0}
                                    onChange={(rating) =>
                                      setOkrRatings((prev) => ({ ...prev, [okr.id]: rating }))
                                    }
                                  />
                                </div>
                              </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              {okr.keyResults.map((kr) => (
                                <div key={kr.id} className="rounded-lg border p-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <p className="text-sm font-medium">{kr.description}</p>
                                    <span className="text-sm font-semibold text-primary">
                                      {kr.progress}%
                                    </span>
                                  </div>
                                  <Progress value={kr.progress} className="h-2" />
                                  <div className="flex justify-between mt-2 text-xs text-muted-foreground">
                                    <span>Current: {kr.current}</span>
                                    <span>Target: {kr.target}</span>
                                  </div>
                                </div>
                              ))}
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </TabsContent>

                    {/* KPIs Tab */}
                    <TabsContent value="kpis" className="space-y-4">
                      {selectedEmployee.kpis.length === 0 ? (
                        <Card>
                          <CardContent>
                            <EmptyState
                              icon={TrendingUp}
                              title="No KPIs defined yet"
                              description="Performance metrics will appear here once KPI data has been assigned to this employee."
                              size="sm"
                            />
                          </CardContent>
                        </Card>
                      ) : (
                        selectedEmployee.kpis.map((kpi) => (
                          <Card key={kpi.id}>
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <h4 className="font-medium">{kpi.name}</h4>
                                  <p className="text-sm text-muted-foreground mt-1">
                                    {kpi.description}
                                  </p>
                                  <div className="flex gap-6 mt-3">
                                    <div>
                                      <p className="text-xs text-muted-foreground">Target</p>
                                      <p className="font-semibold">{kpi.target}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-muted-foreground">Actual</p>
                                      <p className="font-semibold">{kpi.actual}</p>
                                    </div>
                                    <div>
                                      <p className="text-xs text-muted-foreground">Score</p>
                                      <p
                                        className={`font-semibold ${
                                          kpi.score >= 100
                                            ? 'text-success'
                                            : kpi.score >= 80
                                              ? 'text-warning'
                                              : 'text-error'
                                        }`}
                                      >
                                        {kpi.score}%
                                      </p>
                                    </div>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-sm text-muted-foreground">Rate</p>
                                  <StarRating
                                    value={kpiRatings[kpi.id] || 0}
                                    onChange={(rating) =>
                                      setKpiRatings((prev) => ({ ...prev, [kpi.id]: rating }))
                                    }
                                  />
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      )}
                    </TabsContent>

                    {/* Overall Rating Tab */}
                    <TabsContent value="rating" className="space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Overall Performance Rating</CardTitle>
                          <CardDescription>
                            Select the overall rating based on OKR and KPI performance
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="flex items-center justify-center gap-4 py-4">
                            <StarRating value={starRating} onChange={setStarRating} />
                            <span className="text-2xl font-bold">{starRating}/5</span>
                          </div>

                          <div className="space-y-2">
                            <label className="text-sm font-medium">Rating Category</label>
                            <Select
                              value={overallRating}
                              onValueChange={(value) =>
                                setOverallRating(value as PerformanceRating)
                              }
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {Object.entries(ratingConfig).map(([key, config]) => (
                                  <SelectItem key={key} value={key}>
                                    <div className="flex items-center gap-2">
                                      <div className={`h-3 w-3 rounded-full ${config.color}`} />
                                      {config.label}
                                    </div>
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <p className="text-sm text-muted-foreground">
                              {ratingConfig[overallRating].description}
                            </p>
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="text-base">Feedback & Comments</CardTitle>
                          <CardDescription>
                            Provide detailed feedback based on {selectedEmployee.name}&apos;s
                            performance
                          </CardDescription>
                        </CardHeader>
                        <CardContent>
                          <Textarea
                            placeholder={`Based on ${selectedEmployee.name}'s ${
                              selectedEmployee.okrs[0]?.objective
                                ? `goal to "${selectedEmployee.okrs[0].objective}"`
                                : 'submitted objectives'
                            }, provide specific feedback on their progress, areas of strength, and areas for improvement...`}
                            value={feedback}
                            onChange={(e) => setFeedback(e.target.value)}
                            className="min-h-[150px]"
                          />
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                </div>
              )}

              <DialogFooter className="flex-col sm:flex-row gap-2">
                <Button variant="outline" onClick={() => setAppraisalDialogOpen(false)}>
                  <X className="mr-2 h-4 w-4" />
                  Cancel
                </Button>
                <Button
                  onClick={() => {
                    void handleSubmitAppraisal();
                  }}
                  disabled={completeProbation.isPending}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Submit Appraisal
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
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
                    <p className="text-2xl font-bold">{onboardingData?.summary.awaitingReview ?? pendingApprovals.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-rose-100 dark:bg-rose-900/20">
                    <XCircle className="h-5 w-5 text-rose-600 dark:text-rose-400" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Rejected</p>
                    <p className="text-2xl font-bold">{onboardingData?.summary.rejected ?? 0}</p>
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
                    <p className="text-sm text-muted-foreground">Approved</p>
                    <p className="text-2xl font-bold">{onboardingData?.summary.approved ?? 0}</p>
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
                      Review and approve employee onboarding submissions to activate their accounts.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pending Approvals Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base text-base">Pending Approvals</CardTitle>
              <CardDescription>
                Employees who have completed onboarding and are waiting for approval
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableTableHead column="employee" {...pendingSortHeadProps}>Employee</SortableTableHead>
                    <SortableTableHead column="email" {...pendingSortHeadProps}>Email</SortableTableHead>
                    <SortableTableHead column="position" {...pendingSortHeadProps}>Position</SortableTableHead>
                    <SortableTableHead column="submitted" {...pendingSortHeadProps}>Submitted</SortableTableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedPending.length > 0 ? (
                    sortedPending.map((approval: any) => (
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
                              {(approval.rejection_count ?? 0) > 0 && (
                                <p className="text-xs text-amber-700 dark:text-amber-300">
                                  Resubmission · rejected {approval.rejection_count} time
                                  {approval.rejection_count === 1 ? '' : 's'}
                                </p>
                              )}
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
                      <TableCell colSpan={5} className="py-8">
                        <EmptyState
                          icon={Clock}
                          title="No pending approvals"
                          description="All onboarding submissions have been processed."
                          size="sm"
                        />
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Rejected Submissions</CardTitle>
              <CardDescription>
                Completed onboarding submissions that were rejected and are waiting on employee edits.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Rejected</TableHead>
                    <TableHead>Notes</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rejectedOnboardingProfiles.length > 0 ? (
                    rejectedOnboardingProfiles.map((profile: any) => (
                      <TableRow key={profile.id} className="hover:bg-rose-50/40 dark:hover:bg-rose-950/10">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarFallback className="text-xs bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
                                {profile.full_name
                                  ?.split(' ')
                                  .map((name: string) => name[0])
                                  .join('')
                                  .toUpperCase()
                                  .slice(0, 2) || 'NA'}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{profile.full_name || 'Unnamed'}</p>
                              <p className="text-xs text-muted-foreground">
                                Rejected {profile.rejection_count ?? 0} time
                                {(profile.rejection_count ?? 0) === 1 ? '' : 's'}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {profile.email_address || 'N/A'}
                        </TableCell>
                        <TableCell className="text-sm">{profile.position || 'Not specified'}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {profile.rejected_at ? formatDateTime(profile.rejected_at) : '—'}
                        </TableCell>
                        <TableCell className="max-w-[280px]">
                          <p className="line-clamp-2 text-sm text-muted-foreground">
                            {profile.rejection_notes || 'No rejection notes captured.'}
                          </p>
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
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="py-8">
                        <EmptyState
                          icon={XCircle}
                          title="No rejected submissions"
                          description="Rejected onboarding submissions will appear here with their latest review notes."
                          size="sm"
                        />
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
              <CardDescription>Complete history of employee onboarding data</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableTableHead column="employee" {...onboardSortHeadProps}>Employee</SortableTableHead>
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
                    onboardSort.sortItems(onboardingData.data as any[], {
                      employee: (p: any) => (p.full_name || '').toLowerCase(),
                      email: (p: any) => (p.email_address || '').toLowerCase(),
                      department: (p: any) => {
                        const dept = Array.isArray(p.departments) ? p.departments[0]?.name : p.departments?.name;
                        return (dept || '').toLowerCase();
                      },
                      status: (p: any) => (p.status === 'completed' ? 0 : 1),
                      step: (p: any) => (p.current_step || '').toLowerCase(),
                      submitted: (p: any) => p.created_at || '',
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
                            <div className="flex flex-wrap items-center gap-2">
                              <Badge variant={getOnboardingReviewStateBadgeVariant(profile.review_state ?? 'in_progress')}>
                                {getOnboardingReviewStateLabel(profile.review_state ?? 'in_progress')}
                              </Badge>
                              {(profile.rejection_count ?? 0) > 0 &&
                                (profile.review_state ?? 'in_progress') === 'awaiting_review' && (
                                  <Badge variant="secondary">Resubmitted</Badge>
                                )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {getOnboardingStepLabel(profile.current_step)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {new Date(profile.completed_at ?? profile.created_at).toLocaleDateString()}
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
                      <TableCell colSpan={7} className="py-8">
                        <EmptyState
                          icon={FileText}
                          title={
                            onboardingLoading
                              ? 'Loading onboarding data'
                              : 'No employee onboarding submissions found'
                          }
                          description={
                            onboardingLoading
                              ? 'Employee onboarding submissions are still loading.'
                              : 'Completed and in-progress employee onboarding records will appear here.'
                          }
                          size="sm"
                        />
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Modals */}
      <InviteUserModal
        open={inviteModalOpen}
        onOpenChange={setInviteModalOpen}
        defaultRole="employee"
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
          queryClient.invalidateQueries({ queryKey: ['probation'] });
          queryClient.invalidateQueries({ queryKey: ['onboarding_profiles'] });
          queryClient.invalidateQueries({ queryKey: ['internships'] });
          setAssignmentData(null);
          setAssignmentModalOpen(false);
        }}
      />

      {/* Performance Appraisal Dialog (existing) */}
    </div>
  );
}
