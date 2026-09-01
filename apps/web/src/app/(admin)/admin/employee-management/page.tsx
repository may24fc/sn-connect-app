'use client';

import { SortableTableHead } from '@/components/data-display/SortableTableHead';
import { StatCard, StatCardGrid } from '@/components/data-display';
import { ApproveOnboardingModal } from '@/components/admin/ApproveOnboardingModal';
import { AssignEmployeeModal } from '@/components/admin/AssignEmployeeModal';
import { InviteUserModal } from '@/components/admin/InviteUserModal';
import { OnboardingChecklistDialog } from '@/components/admin/OnboardingChecklistDialog';
import { RejectedOnboardingDeleteButton } from '@/components/admin/RejectedOnboardingDeleteButton';
import { useAuth } from '@/contexts/AuthContext';
import { useOnboardingProfiles } from '@/hooks/useOnboardingProfiles';
import {
  getOnboardingReviewStateBadgeVariant,
  getOnboardingReviewStateLabel,
} from '@/lib/onboarding-review-state';
import { getOnboardingStepLabel } from '@/lib/onboarding-step';
import { useAddTicketHandler, useRemoveTicketHandler, useTicketHandlers } from '@/hooks/useTicketHandlers';
import {
  type ProbationRecord,
  useCompleteProbation,
  useExtendProbation,
  useProbation,
  useSetProbationStatus,
} from '@/hooks/useProbation';
import { useRealtimeOnboardingApprovals } from '@/hooks/useRealtimeOnboardingApprovals';
import { useTableSort } from '@/hooks/useTableSort';
import { useEmployees } from '@/hooks/useEmployees';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  CountBadge,
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
  Label,
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
  Clock,
  Eye,
  FileText,
  LayoutGrid,
  LifeBuoy,
  List,
  Search,
  ShieldCheck,
  Star,
  Target,
  TrendingUp,
  UserCog,
  UserPlus,
  MoreHorizontal,
  XCircle,
  X,
} from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { type ReactNode, useEffect, useMemo, useState } from 'react';

type EmployeeManagementTab = 'probation' | 'onboarding' | 'it-handlers';

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// ── 30/60/90 Stage System ──────────────────────────────────────────────

type ProbationStage = 1 | 2 | 3 | 4;
type ProbationStatus = 'on-track' | 'at-risk' | 'completed' | 'extended';

const STAGE_LABELS: Record<ProbationStage, { name: string; description: string }> = {
  1: { name: '0–30 Days', description: 'Orientation & settling in' },
  2: { name: '30–60 Days', description: 'Early performance assessment' },
  3: { name: '60–90 Days', description: 'Mid-probation review' },
  4: { name: '90+ Days', description: 'Final evaluation' },
};

const STATUS_CONFIG: Record<
  ProbationStatus,
  { label: string; badgeClass: string; icon: typeof CheckCircle2 }
> = {
  'on-track': {
    label: 'On Track',
    badgeClass: 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400',
    icon: TrendingUp,
  },
  'at-risk': {
    label: 'At Risk',
    badgeClass: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
    icon: AlertTriangle,
  },
  completed: {
    label: 'Completed',
    badgeClass: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400',
    icon: CheckCircle2,
  },
  extended: {
    label: 'Extended',
    badgeClass: 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400',
    icon: Clock,
  },
};

function StageIndicator({
  stage,
  status,
}: { stage: ProbationStage; status: ProbationStatus }): ReactNode {
  const stages: ProbationStage[] = [1, 2, 3, 4];

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1">
        {stages.map((s) => (
          <div
            key={s}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              s < stage
                ? 'bg-emerald-500 dark:bg-emerald-400'
                : s === stage
                  ? status === 'at-risk'
                    ? 'bg-amber-500 dark:bg-amber-400'
                    : status === 'extended'
                      ? 'bg-orange-500 dark:bg-orange-400'
                      : 'bg-slate-800 dark:bg-zinc-400'
                  : 'bg-zinc-200 dark:bg-zinc-700'
            }`}
          />
        ))}
      </div>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-medium text-zinc-500 dark:text-zinc-400">
          {STAGE_LABELS[stage].name}
        </span>
        <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
          {STAGE_LABELS[stage].description}
        </span>
      </div>
    </div>
  );
}

type ProbationView = 'cards' | 'list';

type PerformanceRating =
  | 'exceptional'
  | 'exceeds'
  | 'meets'
  | 'needs_improvement'
  | 'unsatisfactory';

const ratingConfig: Record<
  PerformanceRating,
  { label: string; description: string; color: string }
> = {
  exceptional: {
    label: 'Exceptional',
    description: 'Outstanding performance that far exceeds expectations',
    color: 'bg-emerald-500',
  },
  exceeds: {
    label: 'Exceeds Expectations',
    description: 'Consistently performs above the expected level',
    color: 'bg-green-500',
  },
  meets: {
    label: 'Meets Expectations',
    description: 'Performs at the expected level for their role',
    color: 'bg-blue-500',
  },
  needs_improvement: {
    label: 'Needs Improvement',
    description: 'Performance is below expectations in some areas',
    color: 'bg-yellow-500',
  },
  unsatisfactory: {
    label: 'Unsatisfactory',
    description: 'Performance does not meet minimum requirements',
    color: 'bg-red-500',
  },
};

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
          className={`transition-colors ${readonly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}`}
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

function resolveEmployeeManagementTab(
  value: string | null,
  canManageItHandlers: boolean
): EmployeeManagementTab {
  if (value === 'onboarding') {
    return 'onboarding';
  }

  if (value === 'it-handlers' && canManageItHandlers) {
    return 'it-handlers';
  }

  return 'probation';
}

function ItHandlersManagementTab(): ReactNode {
  const { addToast } = useToast();
  const [selectedUserId, setSelectedUserId] = useState('');
  const {
    data: ticketHandlersData,
    isLoading: ticketHandlersLoading,
    error: ticketHandlersError,
  } = useTicketHandlers();
  const {
    data: employeesData,
    isLoading: employeesLoading,
    error: employeesError,
  } = useEmployees({ page: 1, pageSize: 200, status: 'active' });
  const addTicketHandler = useAddTicketHandler();
  const removeTicketHandler = useRemoveTicketHandler();

  const activeHandlers = useMemo(
    () =>
      [...(ticketHandlersData?.data ?? [])].sort((left, right) =>
        left.user_name.localeCompare(right.user_name)
      ),
    [ticketHandlersData?.data]
  );

  const activeHandlerIds = useMemo(
    () => new Set(activeHandlers.map((handler) => handler.user_id)),
    [activeHandlers]
  );

  const availableEmployees = useMemo(
    () =>
      [...(employeesData?.data ?? [])]
        .filter(
          (employee) =>
            employee.user_id &&
            employee.employment_type !== 'associate' &&
            !activeHandlerIds.has(employee.user_id)
        )
        .sort((left, right) => {
          const leftName = `${left.first_name} ${left.last_name}`.trim();
          const rightName = `${right.first_name} ${right.last_name}`.trim();
          return leftName.localeCompare(rightName);
        }),
    [activeHandlerIds, employeesData?.data]
  );

  const handleAddTicketHandler = async (): Promise<void> => {
    if (!selectedUserId) {
      return;
    }

    const selectedEmployee = availableEmployees.find(
      (employee) => employee.user_id === selectedUserId
    );

    try {
      await addTicketHandler.mutateAsync(selectedUserId);
      setSelectedUserId('');
      addToast({
        title: 'IT handler added',
        description: selectedEmployee
          ? `${selectedEmployee.first_name} ${selectedEmployee.last_name} can now receive IT tickets.`
          : 'The employee can now receive IT tickets.',
        variant: 'success',
      });
    } catch (error) {
      addToast({
        title: 'Failed to add IT handler',
        description:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred while assigning the IT handler.',
        variant: 'error',
      });
    }
  };

  const handleRemoveTicketHandler = async (
    userId: string,
    userName: string
  ): Promise<void> => {
    try {
      await removeTicketHandler.mutateAsync(userId);
      addToast({
        title: 'IT handler removed',
        description: `${userName} will no longer appear in the IT ticket assignment list.`,
        variant: 'success',
      });
    } catch (error) {
      addToast({
        title: 'Failed to remove IT handler',
        description:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred while removing the IT handler.',
        variant: 'error',
      });
    }
  };

  return (
    <div className="space-y-6">
      <StatCardGrid columns={2}>
        <StatCard
          label="Active IT Handlers"
          value={activeHandlers.length}
          icon={<LifeBuoy className="h-4 w-4" strokeWidth={1.5} />}
        />
        <StatCard
          label="Available Employees"
          value={availableEmployees.length}
          icon={<UserPlus className="h-4 w-4" strokeWidth={1.5} />}
        />
      </StatCardGrid>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">IT Ticket Handlers</CardTitle>
          <CardDescription>
            Assign employee accounts that super-admin can route IT tickets to from the intake queue.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2 rounded-lg border border-border p-4">
            <Label>Add IT Handler</Label>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Select value={selectedUserId} onValueChange={setSelectedUserId}>
                <SelectTrigger className="sm:flex-1">
                  <SelectValue placeholder="Select an employee" />
                </SelectTrigger>
                <SelectContent>
                  {availableEmployees.map((employee) => (
                    <SelectItem key={employee.user_id} value={employee.user_id ?? employee.id}>
                      {employee.first_name} {employee.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                onClick={() => {
                  void handleAddTicketHandler();
                }}
                disabled={addTicketHandler.isPending || !selectedUserId || availableEmployees.length === 0}
              >
                {addTicketHandler.isPending ? 'Adding...' : 'Add Handler'}
              </Button>
            </div>
            {availableEmployees.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No additional active employee accounts are currently available for IT ticket routing.
              </p>
            ) : null}
          </div>

          {ticketHandlersLoading || employeesLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-600 border-t-transparent" />
            </div>
          ) : ticketHandlersError || employeesError ? (
            <EmptyState
              icon={AlertCircle}
              title="Failed to load IT handler management"
              description={
                ticketHandlersError?.message ||
                employeesError?.message ||
                'The IT handler roster could not be loaded.'
              }
              size="sm"
            />
          ) : activeHandlers.length === 0 ? (
            <EmptyState
              icon={LifeBuoy}
              title="No IT handlers assigned"
              description="Add at least one active IT handler so super-admin can dispatch IT tickets."
              size="sm"
            />
          ) : (
            <div className="space-y-3">
              {activeHandlers.map((handler) => (
                <div
                  key={handler.user_id}
                  className="flex flex-col gap-4 rounded-lg border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1">
                    <p className="font-medium text-foreground">{handler.user_name}</p>
                    <p className="text-sm text-muted-foreground">
                      {handler.user_email ?? 'No email on file'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Assigned by {handler.assigned_by_name ?? 'Super Admin'} on{' '}
                      {formatDateTime(handler.created_at)}
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      void handleRemoveTicketHandler(handler.user_id, handler.user_name);
                    }}
                    disabled={removeTicketHandler.isPending}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function EmployeeManagementPage(): ReactNode {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { addToast } = useToast();
  const isSuperAdmin = user?.role === 'super_admin';
  const [activeTab, setActiveTab] = useState<EmployeeManagementTab>(() =>
    resolveEmployeeManagementTab(searchParams.get('tab'), false)
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [probationView, setProbationView] = useState<ProbationView>('cards');
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [checklistDialogOpen, setChecklistDialogOpen] = useState(false);

  // Onboarding modal states
  const [selectedApproval, setSelectedApproval] = useState<any | null>(null);
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [assignmentData, setAssignmentData] = useState<any | null>(null);
  const [assignmentModalMode, setAssignmentModalMode] = useState<
    'employee-assignment' | 'employee-probation' | 'associate-assignment'
  >('employee-assignment');

  // Appraisal dialog state
  const [appraisalDialogOpen, setAppraisalDialogOpen] = useState(false);
  const [selectedProbationEmp, setSelectedProbationEmp] = useState<ProbationRecord | null>(null);
  const [overallRating, setOverallRating] = useState<PerformanceRating>('meets');
  const [starRating, setStarRating] = useState(3);
  const [appraisalFeedback, setAppraisalFeedback] = useState('');
  const [okrRatings, setOkrRatings] = useState<Record<string, number>>({});
  const [kpiRatings, setKpiRatings] = useState<Record<string, number>>({});
  const [directCompleteDialogOpen, setDirectCompleteDialogOpen] = useState(false);
  const [selectedDirectCompleteEmp, setSelectedDirectCompleteEmp] =
    useState<ProbationRecord | null>(null);
  const [extendDialogOpen, setExtendDialogOpen] = useState(false);
  const [selectedExtendEmp, setSelectedExtendEmp] = useState<ProbationRecord | null>(null);
  const [extendDate, setExtendDate] = useState('');
  const completeProbation = useCompleteProbation();
  const extendProbation = useExtendProbation();
  const setProbationStatus = useSetProbationStatus();

  useEffect(() => {
    const tabFromUrl = resolveEmployeeManagementTab(searchParams.get('tab'), isSuperAdmin);
    setActiveTab((prev) => (prev === tabFromUrl ? prev : tabFromUrl));
  }, [isSuperAdmin, searchParams]);

  const currentPathWithSearch = useMemo(() => {
    const query = searchParams.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);

  const handleTabChange = (nextTab: string): void => {
    const resolvedTab = resolveEmployeeManagementTab(nextTab, isSuperAdmin);
    setActiveTab(resolvedTab);

    const nextParams = new URLSearchParams(searchParams.toString());
    nextParams.set('tab', resolvedTab);
    const nextQuery = nextParams.toString();

    router.replace(nextQuery ? `${pathname}?${nextQuery}` : pathname, { scroll: false });
  };

  const buildOnboardingDetailHref = (profileId: string): string => {
    const returnTo = encodeURIComponent(currentPathWithSearch);
    return `/admin/onboarding/${profileId}?returnTo=${returnTo}`;
  };

  const handleOpenAppraisal = (emp: ProbationRecord): void => {
    setSelectedProbationEmp(emp);
    setAppraisalDialogOpen(true);
    setOverallRating('meets');
    setStarRating(3);
    setAppraisalFeedback('');
    setOkrRatings({});
    setKpiRatings({});
  };

  const handleSubmitAppraisal = async (): Promise<void> => {
    if (!selectedProbationEmp) return;
    try {
      await completeProbation.mutateAsync({
        employeeId: selectedProbationEmp.id,
        finalRating: starRating,
        comments: appraisalFeedback,
      });
      addToast({
        title: 'Probation completed',
        description: `${selectedProbationEmp.name} has successfully passed probation`,
        variant: 'success',
      });
    } catch (error) {
      addToast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to complete probation',
        variant: 'error',
      });
    }
    setAppraisalDialogOpen(false);
    setSelectedProbationEmp(null);
  };

  const openDirectCompleteDialog = (emp: ProbationRecord): void => {
    setSelectedDirectCompleteEmp(emp);
    setDirectCompleteDialogOpen(true);
  };

  const handleDirectCompleteProbation = async (): Promise<void> => {
    if (!selectedDirectCompleteEmp) return;

    try {
      await completeProbation.mutateAsync({
        employeeId: selectedDirectCompleteEmp.id,
      });
      addToast({
        title: 'Probation completed',
        description: `${selectedDirectCompleteEmp.name} has been marked as completed without an appraisal.`,
        variant: 'success',
      });
      setDirectCompleteDialogOpen(false);
      setSelectedDirectCompleteEmp(null);
    } catch (error) {
      addToast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to complete probation',
        variant: 'error',
      });
    }
  };

  const handleQuickSetProbationStatus = async (
    emp: ProbationRecord,
    status: 'on-track' | 'at-risk'
  ): Promise<void> => {
    try {
      await setProbationStatus.mutateAsync({ employeeId: emp.id, status });
      addToast({
        title: 'Probation status updated',
        description: `${emp.name} is now marked as ${status === 'on-track' ? 'On Track' : 'At Risk'}.`,
        variant: 'success',
      });
    } catch (error) {
      addToast({
        title: 'Failed to update status',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'error',
      });
    }
  };

  const openExtendDialog = (emp: ProbationRecord): void => {
    const baseDate = emp.probationEndDate ? new Date(emp.probationEndDate) : new Date();
    baseDate.setDate(baseDate.getDate() + 30);

    setSelectedExtendEmp(emp);
    setExtendDate(baseDate.toISOString().slice(0, 10));
    setExtendDialogOpen(true);
  };

  const handleSubmitExtendProbation = async (): Promise<void> => {
    if (!selectedExtendEmp || !extendDate) {
      addToast({
        title: 'Extension date is required',
        description: 'Please select a probation end date.',
        variant: 'error',
      });
      return;
    }

    try {
      await extendProbation.mutateAsync({
        employeeId: selectedExtendEmp.id,
        newProbationEndDate: extendDate,
      });

      addToast({
        title: 'Probation extended',
        description: `${selectedExtendEmp.name}'s probation end date has been updated.`,
        variant: 'success',
      });

      setExtendDialogOpen(false);
      setSelectedExtendEmp(null);
      setExtendDate('');
    } catch (error) {
      addToast({
        title: 'Failed to extend probation',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'error',
      });
    }
  };

  // Probation data
  const { data: probationData, isLoading: probationLoading } = useProbation();
  const { data: employeeRecordsData } = useEmployees({ page: 1, pageSize: 500, status: 'active' });

  // Onboarding profiles
  const { data: onboardingData, isLoading: onboardingLoading } = useOnboardingProfiles({
    role: 'employee',
    page: 1,
    pageSize: 50,
  });

  // Real-time pending approvals for employees
  const { pendingApprovals } = useRealtimeOnboardingApprovals('employee');
  const pendingApprovalById = useMemo(
    () => new Set(pendingApprovals.map((approval) => approval.id)),
    [pendingApprovals]
  );

  // Sort state for Pending Approvals table
  const pendingSort = useTableSort({ initialColumn: 'submitted', initialDirection: 'desc' });
  const sortedPending = pendingSort.sortItems(pendingApprovals, {
    employee: (a) => a.full_name?.toLowerCase() ?? '',
    email: (a) => a.email_address?.toLowerCase() ?? '',
    position: (a) => a.position?.toLowerCase() ?? '',
    submitted: (a) => a.completed_at ?? '',
  });
  const pendingSortHeadProps = { sortColumn: pendingSort.sortColumn, sortDirection: pendingSort.sortDirection, onSort: pendingSort.handleSort };

  // Sort state for All Submissions table
  const onboardSort = useTableSort({ initialColumn: 'submitted', initialDirection: 'desc' });
  const onboardSortHeadProps = { sortColumn: onboardSort.sortColumn, sortDirection: onboardSort.sortDirection, onSort: onboardSort.handleSort };

  const probationEmployees = probationData?.data || [];
  const employeeRecords = employeeRecordsData?.data || [];
  const isExtendDateEarlierThanCurrent = Boolean(
    selectedExtendEmp?.probationEndDate && extendDate && extendDate < selectedExtendEmp.probationEndDate
  );
  const formattedCurrentExtendDate = selectedExtendEmp?.probationEndDate
    ? new Date(selectedExtendEmp.probationEndDate).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      })
    : null;
  const probationDepartmentByEmployeeId = useMemo(
    () =>
      new Map(
        probationEmployees
          .filter((employee: ProbationRecord) => employee.id && employee.department)
          .map((employee: ProbationRecord) => [employee.id, employee.department])
      ),
    [probationEmployees]
  );
  const probationByEmployeeId = useMemo(
    () => new Map(probationEmployees.map((employee: ProbationRecord) => [employee.id, employee])),
    [probationEmployees]
  );
  const employeeRecordByUserId = useMemo(
    () =>
      new Map(
        employeeRecords
          .filter((employee) => employee.user_id)
          .map((employee) => [employee.user_id, employee])
      ),
    [employeeRecords]
  );
  const employeeRecordByEmail = useMemo(
    () =>
      new Map(
        employeeRecords
          .filter((employee) => employee.company_email || employee.personal_email)
          .map((employee) => [
            String(employee.company_email || employee.personal_email || '').toLowerCase(),
            employee,
          ])
      ),
    [employeeRecords]
  );
  const onboardingProfiles = onboardingData?.data || [];
  const inProgressOnboardingCount = onboardingData?.summary.inProgress ?? 0;
  const awaitingReviewCount = onboardingData?.summary.awaitingReview ?? pendingApprovals.length;
  const rejectedOnboardingCount = onboardingData?.summary.rejected ?? 0;
  const approvedOnboardingCount = onboardingData?.summary.approved ?? 0;
  const rejectedOnboardingProfiles = useMemo(
    () =>
      [...onboardingProfiles]
        .filter((profile) => profile.review_state === 'rejected')
        .sort((left, right) => {
          const leftTime = left.rejected_at ? new Date(left.rejected_at).getTime() : 0;
          const rightTime = right.rejected_at ? new Date(right.rejected_at).getTime() : 0;
          return rightTime - leftTime;
        }),
    [onboardingProfiles]
  );

  const onProbationCount = probationEmployees.filter((e: ProbationRecord) => e.status === 'on-track' || e.status === 'at-risk' || e.status === 'extended').length;
  const atRiskCount = probationEmployees.filter((e: ProbationRecord) => e.status === 'at-risk').length;

  const departments = [...new Set(probationEmployees.filter((e: ProbationRecord) => e.department).map((e: ProbationRecord) => e.department))];

  const filteredProbation = probationEmployees.filter((emp: ProbationRecord) => {
    const matchesSearch =
      !searchTerm ||
      emp.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      emp.position?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || emp.status === statusFilter;
    const matchesDepartment = departmentFilter === 'all' || emp.department === departmentFilter;
    return matchesSearch && matchesStatus && matchesDepartment;
  });

  const openAssignmentModal = (
    data: any,
    mode: 'employee-assignment' | 'employee-probation' | 'associate-assignment'
  ): void => {
    setAssignmentData(data);
    setAssignmentModalMode(mode);
    setAssignmentModalOpen(true);
  };

  const handleAssignmentModalChange = (open: boolean): void => {
    setAssignmentModalOpen(open);
    if (!open) {
      setAssignmentData(null);
      setAssignmentModalMode('employee-assignment');
    }
  };

  const openEmployeeAssignmentFromProfile = (
    profile: any,
    mode: 'employee-assignment' | 'employee-probation'
  ): void => {
    const employeeRecord = employeeRecordByUserId.get(profile.user_id) ||
      employeeRecordByEmail.get(String(profile.email_address || '').toLowerCase());
    const probationRecord = profile.employee_id ? probationByEmployeeId.get(profile.employee_id) : undefined;
    const onboardingDepartment = Array.isArray(profile.departments)
      ? profile.departments[0]?.name
      : profile.departments?.name;
    const assignedDepartment = profile.employee_id
      ? probationDepartmentByEmployeeId.get(profile.employee_id)
      : null;

    openAssignmentModal(
      {
        userId: profile.user_id,
        fullName: profile.full_name || 'Unnamed',
        email: profile.email_address || employeeRecord?.company_email || employeeRecord?.personal_email || '',
        role: 'employee',
        position: profile.position || employeeRecord?.position || null,
        inviteProbationMode: profile.invite_probation_mode,
        inviteProbationAuto90: profile.invite_probation_auto_90,
        inviteProbationEndDate: profile.invite_probation_end_date,
        departmentName: employeeRecord?.department || assignedDepartment || onboardingDepartment || null,
        divisionName: employeeRecord?.division || null,
        employmentStatus: probationRecord ? 'probationary' : undefined,
        stage: probationRecord?.stage,
        status: probationRecord?.status === 'completed' || probationRecord?.status === 'extended'
          ? 'on-track'
          : probationRecord?.status,
        probationEndDate: probationRecord?.probationEndDate,
      },
      mode
    );
  };

  const openEmployeeProbationFromRecord = (
    emp: ProbationRecord,
    mode: 'employee-assignment' | 'employee-probation'
  ): void => {
    const employeeRecord = employeeRecordByEmail.get(emp.email.toLowerCase());

    if (!employeeRecord?.user_id) {
      addToast({
        title: 'Unable to reopen assignment',
        description: 'This employee could not be matched to an active user record.',
        variant: 'error',
      });
      return;
    }

    openAssignmentModal(
      {
        userId: employeeRecord.user_id,
        fullName: emp.name,
        email: emp.email,
        role: 'employee',
        position: emp.position || null,
        departmentName: employeeRecord?.department || emp.department || null,
        divisionName: employeeRecord?.division || null,
        employmentStatus: 'probationary',
        stage: emp.stage,
        status: emp.status === 'completed' || emp.status === 'extended' ? 'on-track' : emp.status,
        probationEndDate: emp.probationEndDate,
      },
      mode
    );
  };

  return (
    <div className="flex flex-col gap-6 p-3">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <UserCog className="h-5 w-5 text-zinc-400 dark:text-zinc-500" strokeWidth={1.5} />
            <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight">
              Employee Management
            </h1>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            Manage employee probation, onboarding, and IT ticket routing
          </p>
        </div>
        <Button onClick={() => setInviteModalOpen(true)}>
          <UserPlus className="mr-2 h-4 w-4" />
          Invite Employee
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            <TabsTrigger value="probation">
              Probation
              {probationEmployees.length > 0 && (
                <CountBadge className="ml-2" variant="warning" size="md" count={probationEmployees.length} />
              )}
            </TabsTrigger>
            <TabsTrigger value="onboarding">
              Onboarding
              {onboardingProfiles.length > 0 && (
                <CountBadge className="ml-2" variant="info" size="md" count={onboardingProfiles.length} />
              )}
            </TabsTrigger>
            {isSuperAdmin ? <TabsTrigger value="it-handlers">IT Handlers</TabsTrigger> : null}
          </TabsList>

          <Button variant="outline" size="sm" onClick={() => setChecklistDialogOpen(true)}>
            <FileText className="mr-2 h-4 w-4" />
            View Onboarding Checklist
          </Button>
        </div>

        {/* Probation Tab */}
        <TabsContent value="probation" className="mt-4">
          <StatCardGrid columns={2}>
            <StatCard
              label="On Probation"
              value={onProbationCount}
              icon={<ShieldCheck className="h-4 w-4" strokeWidth={1.5} />}
            />
            <StatCard
              label="At Risk"
              value={atRiskCount}
              trend={
                atRiskCount > 0
                  ? { direction: 'up', value: 'Needs attention' }
                  : { direction: 'stable', value: 'No issues' }
              }
              icon={<AlertTriangle className="h-4 w-4" strokeWidth={1.5} />}
            />
          </StatCardGrid>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center my-4">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.5} />
              <Input
                placeholder="Search employees..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
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
                  <SelectItem value="all">Department</SelectItem>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="inline-flex items-center rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 p-0.5">
                <button
                  type="button"
                  onClick={() => setProbationView('cards')}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    probationView === 'cards'
                      ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 shadow-sm'
                      : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                  }`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" strokeWidth={1.5} />
                  Cards
                </button>
                <button
                  type="button"
                  onClick={() => setProbationView('list')}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    probationView === 'list'
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

          {probationLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-slate-600 border-t-transparent" />
            </div>
          ) : filteredProbation.length === 0 ? (
            <Card>
              <CardContent>
                <EmptyState
                  icon={CheckCircle2}
                  title="No employees on probation"
                  description="Active probation records will appear here when employees enter the review cycle."
                  size="sm"
                />
              </CardContent>
            </Card>
          ) : (
            <>
              {probationView === 'cards' ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredProbation.map(
                    (emp: ProbationRecord) => {
                      const isUrgent = emp.daysRemaining <= 14;
                      const statusCfg = STATUS_CONFIG[emp.status];
                      const StatusIcon = statusCfg.icon;

                      return (
                        <Card
                          key={emp.id}
                          className={isUrgent ? 'border-amber-300 dark:border-amber-700' : ''}
                        >
                          <CardHeader className="pb-3">
                            <div className="flex items-center gap-3">
                              <Avatar className="h-10 w-10">
                                <AvatarImage src={emp.avatarUrl} />
                                <AvatarFallback className="text-xs bg-slate-100 dark:bg-zinc-900/30 text-slate-700 dark:text-zinc-400">
                                  {getInitials(emp.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0 flex-1">
                                <CardTitle className="text-sm">
                                  {emp.name}
                                </CardTitle>
                                <CardDescription className="text-xs">
                                  {emp.position || 'No position'}
                                </CardDescription>
                              </div>
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusCfg.badgeClass}`}
                              >
                                <StatusIcon className="h-3 w-3" strokeWidth={1.5} />
                                {statusCfg.label}
                              </span>
                            </div>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            {/* Stage Progress */}
                            <StageIndicator stage={emp.stage} status={emp.status} />

                            <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
                              <span>Hired: {formatDate(emp.startDate)}</span>
                              <span>{emp.department || '—'}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock
                                className={`h-3.5 w-3.5 ${isUrgent ? 'text-amber-500' : 'text-zinc-500 dark:text-zinc-400'}`}
                                strokeWidth={1.5}
                              />
                              <span
                                className={`text-xs font-medium ${isUrgent ? 'text-amber-600 dark:text-amber-400' : 'text-zinc-600 dark:text-zinc-300'}`}
                              >
                                {emp.daysRemaining <= 0
                                  ? 'Probation ended'
                                  : `${emp.daysRemaining} days remaining`}
                              </span>
                            </div>
                            <div className="mt-1 flex items-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                className="flex-1"
                                onClick={() => handleOpenAppraisal(emp)}
                              >
                                <Eye className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.5} />
                                Evaluate
                              </Button>
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-9 w-9 p-0">
                                    <MoreHorizontal className="h-4 w-4" strokeWidth={1.5} />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => openEmployeeProbationFromRecord(emp, 'employee-probation')}
                                  >
                                    Edit probation
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => handleOpenAppraisal(emp)}>
                                    Mark completed
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => openDirectCompleteDialog(emp)}>
                                    Complete probation now
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => openExtendDialog(emp)}>
                                    Extend probation
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => void handleQuickSetProbationStatus(emp, 'on-track')}
                                  >
                                    Set as on-track
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => void handleQuickSetProbationStatus(emp, 'at-risk')}
                                  >
                                    Set as at-risk
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    }
                  )}
                </div>
              ) : (
                <Card>
                  <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {/* List Header */}
                    <div className="grid grid-cols-[1fr_120px_160px_120px_100px_80px] gap-4 px-4 py-2.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-50/50 dark:bg-zinc-800/30">
                      <span>Employee</span>
                      <span>Department</span>
                      <span>Stage</span>
                      <span>Remaining</span>
                      <span>Status</span>
                      <span>Action</span>
                    </div>
                    {filteredProbation.map((emp: ProbationRecord) => {
                      const isUrgent = emp.daysRemaining <= 14;
                      const statusCfg = STATUS_CONFIG[emp.status];
                      const StatusIcon = statusCfg.icon;

                      return (
                        <div
                          key={emp.id}
                          className={`grid grid-cols-[1fr_120px_160px_120px_100px_80px] gap-4 px-4 py-3 items-center hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors ${
                            isUrgent ? 'bg-amber-50/50 dark:bg-amber-950/10' : ''
                          }`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar className="h-8 w-8 shrink-0">
                              <AvatarImage src={emp.avatarUrl} />
                              <AvatarFallback className="text-xs bg-slate-100 dark:bg-zinc-900/30 text-slate-700 dark:text-zinc-400">
                                {getInitials(emp.name)}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50 truncate">
                                {emp.name}
                              </p>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                                {emp.position || 'No position'}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs text-zinc-600 dark:text-zinc-300 truncate">
                            {emp.department || '—'}
                          </span>
                          {/* Stage mini-indicator */}
                          <div className="flex items-center gap-1.5">
                            <div className="flex items-center gap-0.5">
                              {([1, 2, 3, 4] as ProbationStage[]).map((s) => (
                                <div
                                  key={s}
                                  className={`h-1.5 w-5 rounded-full ${
                                    s < emp.stage
                                      ? 'bg-emerald-500 dark:bg-emerald-400'
                                      : s === emp.stage
                                        ? emp.status === 'at-risk'
                                          ? 'bg-amber-500'
                                          : emp.status === 'extended'
                                            ? 'bg-orange-500'
                                            : 'bg-slate-800'
                                        : 'bg-zinc-200 dark:bg-zinc-700'
                                  }`}
                                />
                              ))}
                            </div>
                            <span className="text-[10px] text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                              {STAGE_LABELS[emp.stage].name}
                            </span>
                          </div>
                          <span className="text-xs text-zinc-600 dark:text-zinc-300">
                            {emp.daysRemaining <= 0 ? 'Ended' : `${emp.daysRemaining}d left`}
                          </span>
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium w-fit ${statusCfg.badgeClass}`}
                          >
                            <StatusIcon className="h-3 w-3" strokeWidth={1.5} />
                            {statusCfg.label}
                          </span>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="xs" className="h-8 w-8 p-0">
                                <MoreHorizontal className="h-4 w-4" strokeWidth={1.5} />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => openEmployeeProbationFromRecord(emp, 'employee-probation')}
                              >
                                Edit probation
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleOpenAppraisal(emp)}>
                                Mark completed
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openDirectCompleteDialog(emp)}>
                                Complete probation now
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => openExtendDialog(emp)}>
                                Extend probation
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => void handleQuickSetProbationStatus(emp, 'on-track')}
                              >
                                Set as on-track
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => void handleQuickSetProbationStatus(emp, 'at-risk')}
                              >
                                Set as at-risk
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      );
                    })}
                  </div>
                </Card>
              )}
            </>
          )}
        </TabsContent>

        {/* Onboarding Tab */}
        <TabsContent value="onboarding" className="mt-4 space-y-6">
          {/* Approval Stats */}
          <StatCardGrid columns={4}>
            <StatCard
              label="In Progress"
              value={inProgressOnboardingCount}
              trend={{ direction: 'stable', value: 'Still being completed' }}
              icon={<Clock className="h-4 w-4" strokeWidth={1.5} />}
            />
            <StatCard
              label="Awaiting Approval"
              value={awaitingReviewCount}
              trend={{
                direction: awaitingReviewCount > 0 ? 'up' : 'stable',
                value: awaitingReviewCount > 0 ? 'Ready for review' : 'No pending reviews',
              }}
              icon={<AlertCircle className="h-4 w-4" strokeWidth={1.5} />}
            />
            <StatCard
              label="Rejected"
              value={rejectedOnboardingCount}
              trend={{
                direction: rejectedOnboardingCount > 0 ? 'up' : 'stable',
                value: rejectedOnboardingCount > 0 ? 'Needs resubmission' : 'No rejected submissions',
              }}
              icon={<XCircle className="h-4 w-4" strokeWidth={1.5} />}
            />
            <StatCard
              label="Approved"
              value={approvedOnboardingCount}
              trend={{
                direction: approvedOnboardingCount > 0 ? 'up' : 'stable',
                value: approvedOnboardingCount > 0 ? 'Already processed' : 'No approved submissions yet',
              }}
              icon={<CheckCircle2 className="h-4 w-4" strokeWidth={1.5} />}
            />
          </StatCardGrid>

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
              <CardTitle className="text-base">Pending Approvals</CardTitle>
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
                  {pendingApprovals.length > 0 ? (
                    sortedPending.map((approval) => (
                      <TableRow
                        key={approval.id}
                        className="hover:bg-yellow-50/50 dark:hover:bg-yellow-900/5"
                      >
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={approval.avatar_url || undefined} />
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
                    rejectedOnboardingProfiles.map((profile) => (
                      <TableRow key={profile.id} className="hover:bg-rose-50/40 dark:hover:bg-rose-950/10">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9">
                              <AvatarImage src={profile.avatar_url || undefined} />
                              <AvatarFallback className="text-xs bg-rose-100 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
                                {profile.full_name
                                  ?.split(' ')
                                  .map((name) => name[0])
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
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => router.push(buildOnboardingDetailHref(profile.id))}
                            >
                              <Eye className="mr-1 h-4 w-4" />
                              View Details
                            </Button>
                            <RejectedOnboardingDeleteButton
                              profileId={profile.id}
                              fullName={profile.full_name || 'This employee'}
                              subjectLabel="employee"
                            />
                          </div>
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
                    onboardSort.sortItems([...onboardingData.data], {
                      employee: (p: any) => p.full_name?.toLowerCase() ?? '',
                      email: (p: any) => p.email_address?.toLowerCase() ?? '',
                      department: (p: any) => {
                        const dept = Array.isArray(p.departments) ? p.departments[0]?.name : p.departments?.name;
                        return dept?.toLowerCase() ?? '';
                      },
                      status: (p: any) => p.status ?? '',
                      step: (p: any) => p.current_step ?? '',
                      submitted: (p: any) => p.created_at ?? '',
                    }).map((profile: any) => {
                      const onboardingDepartment = Array.isArray(profile.departments)
                        ? profile.departments[0]?.name
                        : profile.departments?.name;
                      const assignedDepartment = profile.employee_id
                        ? probationDepartmentByEmployeeId.get(profile.employee_id)
                        : null;
                      const department = assignedDepartment || onboardingDepartment;
                      const isPendingApproval = pendingApprovalById.has(profile.id);

                      return (
                        <TableRow key={profile.id} className="cursor-pointer hover:bg-muted/50 transition-colors" onDoubleClick={() => router.push(buildOnboardingDetailHref(profile.id))}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9">
                                <AvatarImage src={profile.avatar_url || undefined} />
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
                            {isPendingApproval ? (
                              <Button
                                variant="default"
                                size="sm"
                                className="bg-green-600 hover:bg-green-700 text-white"
                                onClick={() =>
                                  setSelectedApproval({
                                    ...profile,
                                    role: 'employee',
                                    user_id: profile.user_id,
                                    completed_at: profile.completed_at ?? profile.updated_at ?? profile.created_at,
                                  })
                                }
                              >
                                <CheckCircle2 className="mr-1 h-4 w-4" />
                                Review & Approve
                              </Button>
                            ) : (profile.review_state ?? 'in_progress') === 'approved' ? (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="outline" size="sm">
                                    <MoreHorizontal className="mr-1 h-4 w-4" />
                                    Manage
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuItem
                                    onClick={() => openEmployeeAssignmentFromProfile(profile, 'employee-assignment')}
                                  >
                                    {department ? 'Edit assignment' : 'Complete assignment'}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => openEmployeeAssignmentFromProfile(profile, 'employee-probation')}
                                  >
                                    {profile.employee_id && probationByEmployeeId.has(profile.employee_id)
                                      ? 'Edit probation'
                                      : 'Assign probation'}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => router.push(buildOnboardingDetailHref(profile.id))}
                                  >
                                    View details
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            ) : (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => router.push(buildOnboardingDetailHref(profile.id))}
                              >
                                <Eye className="mr-1 h-4 w-4" />
                                View Details
                              </Button>
                            )}
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

        {isSuperAdmin ? (
          <TabsContent value="it-handlers" className="mt-4">
            <ItHandlersManagementTab />
          </TabsContent>
        ) : null}


      </Tabs>

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
        onOpenChange={handleAssignmentModalChange}
        assignmentData={assignmentData}
        mode={assignmentModalMode}
        onSuccess={(result) => {
          const completedName = assignmentData?.fullName;

          queryClient.invalidateQueries({ queryKey: ['onboarding_profiles'] });
          queryClient.invalidateQueries({ queryKey: ['probation'] });
          queryClient.invalidateQueries({ queryKey: ['employees'] });
          queryClient.invalidateQueries({ queryKey: ['directory'] });
          queryClient.invalidateQueries({ queryKey: ['users'] });
          setAssignmentData(null);
          setAssignmentModalOpen(false);
          setAssignmentModalMode('employee-assignment');

          addToast({
            title: 'Assignment completed',
            description: completedName
              ? result.role === 'associate'
                ? `${completedName} has been assigned to the internship tracker.`
                : result.employmentStatus === 'confirmed'
                  ? `${completedName} has been assigned as confirmed.`
                  : `${completedName} has been assigned as probationary.`
              : 'The user has been assigned successfully.',
            variant: 'success',
          });
        }}
      />

      <OnboardingChecklistDialog
        open={checklistDialogOpen}
        onOpenChange={setChecklistDialogOpen}
        profiles={onboardingProfiles}
        roleLabel="employee"
      />

      <Dialog
        open={extendDialogOpen}
        onOpenChange={(open) => {
          setExtendDialogOpen(open);
          if (!open) {
            setSelectedExtendEmp(null);
            setExtendDate('');
          }
        }}
      >
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Extend Probation</DialogTitle>
            <DialogDescription>
              Set a new probation end date for {selectedExtendEmp?.name ?? 'this employee'}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2">
            <Label htmlFor="extend-probation-date">New end date</Label>
            <Input
              id="extend-probation-date"
              type="date"
              value={extendDate}
              onChange={(event) => setExtendDate(event.target.value)}
              min={new Date().toISOString().slice(0, 10)}
              disabled={extendProbation.isPending}
            />
            {isExtendDateEarlierThanCurrent && (
              <p className="text-xs text-amber-700 dark:text-amber-400">
                Warning: selected date is earlier than the current probation end date
                {formattedCurrentExtendDate ? ` (${formattedCurrentExtendDate})` : ''}. This will shorten the probation period.
              </p>
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setExtendDialogOpen(false);
                setSelectedExtendEmp(null);
                setExtendDate('');
              }}
              disabled={extendProbation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                void handleSubmitExtendProbation();
              }}
              disabled={extendProbation.isPending || !extendDate}
            >
              {extendProbation.isPending ? 'Updating...' : 'Update End Date'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={directCompleteDialogOpen}
        onOpenChange={(open) => {
          setDirectCompleteDialogOpen(open);
          if (!open) {
            setSelectedDirectCompleteEmp(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Complete Probation Now</DialogTitle>
            <DialogDescription>
              Mark {selectedDirectCompleteEmp?.name ?? 'this employee'} as having already completed
              probation without opening the appraisal form.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 text-sm text-muted-foreground">
            <p>
              This action immediately removes the active probation record and sends the usual
              completion notifications.
            </p>
            <p>Use this when the employee already finished probation before being added here.</p>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDirectCompleteDialogOpen(false);
                setSelectedDirectCompleteEmp(null);
              }}
              disabled={completeProbation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                void handleDirectCompleteProbation();
              }}
              disabled={completeProbation.isPending || !selectedDirectCompleteEmp}
            >
              {completeProbation.isPending ? 'Completing...' : 'Complete probation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Performance Appraisal Dialog */}
      <Dialog open={appraisalDialogOpen} onOpenChange={setAppraisalDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Performance Appraisal</DialogTitle>
            <DialogDescription>
              Review and rate {selectedProbationEmp?.name}&apos;s performance based on their OKRs
              and KPIs
            </DialogDescription>
          </DialogHeader>

          {selectedProbationEmp && (
            <div className="space-y-6">
              {/* Employee Info */}
              <div className="flex items-center gap-4 rounded-lg bg-muted/50 p-4">
                <Avatar className="h-14 w-14">
                  <AvatarImage src={selectedProbationEmp.avatarUrl} />
                  <AvatarFallback className="text-lg">
                    {getInitials(selectedProbationEmp.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold">{selectedProbationEmp.name}</h3>
                  <p className="text-sm text-muted-foreground">
                    {selectedProbationEmp.position} — {selectedProbationEmp.department}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Manager: {selectedProbationEmp.manager}
                  </p>
                </div>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_CONFIG[selectedProbationEmp.status].badgeClass}`}
                >
                  {STATUS_CONFIG[selectedProbationEmp.status].label}
                </span>
              </div>

              <Tabs defaultValue="okrs" className="space-y-4">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="okrs">OKRs</TabsTrigger>
                  <TabsTrigger value="kpis">KPIs</TabsTrigger>
                  <TabsTrigger value="rating">Overall Rating</TabsTrigger>
                </TabsList>

                {/* OKRs Tab */}
                <TabsContent value="okrs" className="space-y-4">
                  {selectedProbationEmp.okrs.length === 0 ? (
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
                    selectedProbationEmp.okrs.map((okr) => (
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
                              <p className="text-sm text-muted-foreground mb-1">Rate this OKR</p>
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
                  {selectedProbationEmp.kpis.length === 0 ? (
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
                    selectedProbationEmp.kpis.map((kpi) => (
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
                              <p className="text-sm text-muted-foreground mb-1">Rate</p>
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
                          onValueChange={(value) => setOverallRating(value as PerformanceRating)}
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
                        Provide detailed feedback for {selectedProbationEmp.name}&apos;s performance
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Textarea
                        placeholder={`Provide specific feedback on ${selectedProbationEmp.name}'s progress, areas of strength, and areas for improvement...`}
                        value={appraisalFeedback}
                        onChange={(e) => setAppraisalFeedback(e.target.value)}
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
    </div>
  );
}
