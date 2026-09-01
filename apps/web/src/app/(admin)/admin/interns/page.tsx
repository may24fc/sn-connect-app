'use client';

import { SortableTableHead } from '@/components/data-display/SortableTableHead';
import { StatCard, StatCardGrid } from '@/components/data-display';
import { ApproveOnboardingModal } from '@/components/admin/ApproveOnboardingModal';
import { AssignEmployeeModal } from '@/components/admin/AssignEmployeeModal';
import { EODReportDetailModal } from '@/components/admin/EODReportDetailModal';
import { InviteUserModal } from '@/components/admin/InviteUserModal';
import { OnboardingChecklistDialog } from '@/components/admin/OnboardingChecklistDialog';
import { RejectedOnboardingDeleteButton } from '@/components/admin/RejectedOnboardingDeleteButton';
import { useAuth } from '@/contexts/AuthContext';
import { useEmployees } from '@/hooks/useEmployees';
import { useInternships } from '@/hooks/useInternships';
import { useOnboardingProfiles } from '@/hooks/useOnboardingProfiles';
import { useRealtimeInternDailyLogs } from '@/hooks/useRealtimeInternDailyLogs';
import { useRealtimeInternships } from '@/hooks/useRealtimeInternships';
import { useRealtimeOnboardingApprovals } from '@/hooks/useRealtimeOnboardingApprovals';
import { useTableSort } from '@/hooks/useTableSort';
import { exportToCsv, formatDateForCsv, formatPercentageForCsv } from '@/lib/csv';
import {
  getOnboardingReviewStateBadgeVariant,
  getOnboardingReviewStateLabel,
} from '@/lib/onboarding-review-state';
import { getOnboardingStepLabel } from '@/lib/onboarding-step';
import type { InternshipFilters } from '@/lib/query-keys';
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
  EmptyState,
  Input,
  type InternDashboardStats,
  type InternId,
  InternList,
  InternRow,
  type InternSummary,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  CountBadge,
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

  Textarea,
} from '@hr-portal/ui';
import { useToast } from '@hr-portal/ui';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  AlertTriangle,
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
  RotateCcw,
  Star,
  ThumbsUp,
  Trash2,
  TrendingUp,
  UserPlus,
  Users,
  XCircle,
} from 'lucide-react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
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

type AssociateEvaluationStage = 1 | 2 | 3 | 4;
type AssociateEvaluationStatus = 'on-track' | 'at-risk' | 'completed' | 'extended';
type AssociateEvaluationView = 'cards' | 'list';

interface AssociateEvaluationRecord {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  department: string;
  position: string;
  startDate: string;
  evaluationEndDate: string;
  stage: AssociateEvaluationStage;
  status: AssociateEvaluationStatus;
  daysRemaining: number;
  manager: string;
}

interface PersistedAssociateEvaluation {
  id: string;
  internship_id: string;
  employee_id: string;
  stage: number;
  overall_assessment: string;
  key_strengths: string;
  areas_for_continued_growth: string;
  overall_performance: number;
  evaluated_by: string;
  evaluated_at: string;
  updated_at: string;
}

const ASSOCIATE_STAGE_LABELS: Record<AssociateEvaluationStage, { name: string; description: string }> = {
  1: { name: '0-30 Days', description: 'Orientation and settling in' },
  2: { name: '30-60 Days', description: 'Progress check' },
  3: { name: '60-90 Days', description: 'Readiness review' },
  4: { name: '90+ Days', description: 'Final evaluation' },
};

const ASSOCIATE_STATUS_CONFIG: Record<
  AssociateEvaluationStatus,
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

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function getDaysRemaining(targetDate: string): number {
  const now = new Date();
  const end = new Date(targetDate);
  const ms = end.getTime() - now.getTime();
  return Math.ceil(ms / (1000 * 60 * 60 * 24));
}

function getAssociateStage(startDate: string, endDate: string): AssociateEvaluationStage {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const totalDays = Math.max(
    1,
    Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  );
  const elapsed = Math.max(0, Math.ceil((Date.now() - start.getTime()) / (1000 * 60 * 60 * 24)));
  const ratio = elapsed / totalDays;

  if (ratio >= 0.75) return 4;
  if (ratio >= 0.5) return 3;
  if (ratio >= 0.25) return 2;
  return 1;
}

function StageIndicator({
  stage,
  status,
}: { stage: AssociateEvaluationStage; status: AssociateEvaluationStatus }): ReactNode {
  const stages: AssociateEvaluationStage[] = [1, 2, 3, 4];

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-1">
        {stages.map((currentStage) => (
          <div
            key={currentStage}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              currentStage < stage
                ? 'bg-emerald-500 dark:bg-emerald-400'
                : currentStage === stage
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
          {ASSOCIATE_STAGE_LABELS[stage].name}
        </span>
        <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
          {ASSOCIATE_STAGE_LABELS[stage].description}
        </span>
      </div>
    </div>
  );
}

export default function AdminInternsPage(): ReactNode {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isSuperAdmin = user?.role === 'super_admin';
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [schoolFilter, setSchoolFilter] = useState<string>('all');
  const [supervisorFilter, setSupervisorFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [hoursMode, setHoursMode] = useState<'weekly' | 'entire'>('weekly');
  const [associateEvaluationSearch, setAssociateEvaluationSearch] = useState('');
  const [associateEvaluationStatusFilter, setAssociateEvaluationStatusFilter] = useState<string>('all');
  const [associateEvaluationDepartmentFilter, setAssociateEvaluationDepartmentFilter] = useState<string>('all');
  const [associateEvaluationView, setAssociateEvaluationView] = useState<AssociateEvaluationView>('cards');

  // Modal states
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [checklistDialogOpen, setChecklistDialogOpen] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState<any | null>(null);
  const [assignmentModalOpen, setAssignmentModalOpen] = useState(false);
  const [assignmentData, setAssignmentData] = useState<any | null>(null);
  const [assignmentModalMode, setAssignmentModalMode] = useState<
    'employee-assignment' | 'employee-probation' | 'associate-assignment'
  >('associate-assignment');
  const [selectedEodLog, setSelectedEodLog] = useState<(typeof dailyLogs)[number] | null>(null);
  const [associateEvaluationDialogOpen, setAssociateEvaluationDialogOpen] = useState(false);
  const [selectedAssociateForEvaluation, setSelectedAssociateForEvaluation] =
    useState<AssociateEvaluationRecord | null>(null);
  const [overallAssessment, setOverallAssessment] = useState('');
  const [keyStrengths, setKeyStrengths] = useState('');
  const [areasForContinuedGrowth, setAreasForContinuedGrowth] = useState('');
  const [overallPerformanceStars, setOverallPerformanceStars] = useState(3);

  // Delete associate state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [internToDelete, setInternToDelete] = useState<InternSummary | null>(null);
  const { addToast } = useToast();

  const deleteInternMutation = useMutation({
    mutationFn: async (internshipId: string) => {
      const response = await fetch(`/api/internships/${internshipId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to delete associate' }));
        throw new Error(error.error || 'Failed to delete associate');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['internships'] });
      queryClient.invalidateQueries({ queryKey: ['directory'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setDeleteDialogOpen(false);
      setInternToDelete(null);
      addToast({ title: 'Associate deleted', variant: 'success' });
    },
    onError: () => {
      addToast({ title: 'Failed to delete associate', variant: 'error' });
    },
  });

  const handleDeleteIntern = (associate: InternSummary) => {
    setInternToDelete(associate);
    setDeleteDialogOpen(true);
  };

  // Real-time approvals hook
  const { pendingApprovals } = useRealtimeOnboardingApprovals('associate');
  const pendingApprovalById = useMemo(
    () => new Set(pendingApprovals.map((approval) => approval.id)),
    [pendingApprovals]
  );

  // Real-time internships hook
  const { internships: _realtimeInternships, isSubscribed: _isInternshipsSubscribed } =
    useRealtimeInternships();

  // Real-time daily logs hook
  const { dailyLogs, isSubscribed: _isDailyLogsSubscribed } = useRealtimeInternDailyLogs();

  // Sort state for Pending Approvals table
  const pendingSort = useTableSort({ initialColumn: 'submitted', initialDirection: 'desc' });
  const sortedPending = pendingSort.sortItems(pendingApprovals, {
    associate: (a) => a.full_name?.toLowerCase() ?? '',
    email: (a) => a.email_address?.toLowerCase() ?? '',
    position: (a) => a.position?.toLowerCase() ?? '',
    submitted: (a) => a.completed_at ?? '',
  });
  const pendingSortHeadProps = { sortColumn: pendingSort.sortColumn, sortDirection: pendingSort.sortDirection, onSort: pendingSort.handleSort };

  // Sort state for EOD Reports table
  const eodSort = useTableSort({ initialColumn: 'date', initialDirection: 'desc' });
  const sortedDailyLogs = eodSort.sortItems(dailyLogs, {
    associate: (l) => {
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
  const internshipsForOnboardingQuery = useInternships({ page: 1, pageSize: 100 });
  const { data: employeeRecordsData } = useEmployees({ page: 1, pageSize: 500, status: 'active' });

  // Fetch associate onboarding profiles
  const { data: onboardingData, isLoading: onboardingLoading } = useOnboardingProfiles({
    role: 'associate',
    page: 1,
    pageSize: 50,
  });
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

  const interns = useMemo<Array<InternSummary>>(
    () =>
      (internshipsQuery.data?.data || []).map((internship) => ({
        id: internship.id as InternId,
        name: internship.name,
        email: internship.email,
        ...(internship.avatarUrl ? { avatarUrl: internship.avatarUrl } : {}),
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
        weeklyRequiredHours: internship.weeklyRequiredHours,
        weeklyCompletedHours: internship.weeklyCompletedHours,
        status: internship.status === 'converted' ? 'completed' : internship.status,
        ...(internship.lastReportDate ? { lastReportDate: internship.lastReportDate } : {}),
        pendingReports: internship.pendingReports,
      })),
    [internshipsQuery.data]
  );
  const employeeRecords = employeeRecordsData?.data || [];
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

  const internshipDepartmentByEmployeeId = useMemo(
    () =>
      new Map(
        (internshipsForOnboardingQuery.data?.data || [])
          .filter((internship) => internship.employeeId && internship.department)
          .map((internship) => [internship.employeeId, internship.department])
      ),
    [internshipsForOnboardingQuery.data]
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

  const filteredInterns = interns.filter((associate) => {
    const matchesSearch =
      associate.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      associate.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      associate.program.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus =
      statusFilter === 'all' ||
      (statusFilter === 'converted'
        ? associate.status === 'completed'
        : associate.status === statusFilter);
    const matchesSchool = schoolFilter === 'all' || associate.school === schoolFilter;
    const matchesSupervisor = supervisorFilter === 'all' || associate.supervisor === supervisorFilter;
    return matchesSearch && matchesStatus && matchesSchool && matchesSupervisor;
  });

  const associateEvaluationRecords = useMemo<Array<AssociateEvaluationRecord>>(
    () =>
      interns
        .filter((associate) => Boolean(associate.startDate && associate.endDate))
        .map((associate) => {
          const daysRemaining = getDaysRemaining(associate.endDate);
          const baseEndDate = new Date(associate.startDate);
          // Use a 90-day baseline so extensions naturally shift stage and status windows.
          baseEndDate.setDate(baseEndDate.getDate() + 90);
          const isExtended = new Date(associate.endDate) > baseEndDate;

          let status: AssociateEvaluationStatus;
          if (associate.status === 'completed') {
            status = 'completed';
          } else if (isExtended) {
            status = 'extended';
          } else if (daysRemaining <= 14) {
            status = 'at-risk';
          } else {
            status = 'on-track';
          }

          return {
            id: associate.id,
            name: associate.name,
            email: associate.email,
            ...(associate.avatarUrl ? { avatarUrl: associate.avatarUrl } : {}),
            department: associate.department || 'Unassigned',
            position: associate.program || 'Associate',
            startDate: associate.startDate,
            evaluationEndDate: associate.endDate,
            stage: getAssociateStage(associate.startDate, associate.endDate),
            status,
            daysRemaining: Math.max(0, daysRemaining),
            manager: associate.supervisor || 'Unassigned',
          };
        }),
    [interns]
  );

  const associateEvaluationInternshipIds = useMemo(
    () => associateEvaluationRecords.map((record) => record.id),
    [associateEvaluationRecords]
  );

  const associateEvaluationsQuery = useQuery({
    queryKey: ['associate-evaluations', associateEvaluationInternshipIds],
    enabled: associateEvaluationInternshipIds.length > 0,
    queryFn: async (): Promise<{ data: Array<PersistedAssociateEvaluation> }> => {
      const params = new URLSearchParams({
        internshipIds: associateEvaluationInternshipIds.join(','),
      });
      const response = await fetch(`/api/internships/evaluations?${params.toString()}`);

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ error: 'Failed to fetch associate evaluations' }));
        throw new Error(error.error || 'Failed to fetch associate evaluations');
      }

      return response.json();
    },
  });

  const evaluationsByInternshipAndStage = useMemo(() => {
    const map = new Map<string, PersistedAssociateEvaluation>();
    for (const evaluation of associateEvaluationsQuery.data?.data || []) {
      map.set(`${evaluation.internship_id}:${evaluation.stage}`, evaluation);
    }
    return map;
  }, [associateEvaluationsQuery.data?.data]);

  const associateEvaluationDepartments = useMemo(
    () =>
      [...new Set(associateEvaluationRecords.map((record) => record.department))]
        .filter(Boolean)
        .sort((left, right) => left.localeCompare(right)),
    [associateEvaluationRecords]
  );

  const filteredAssociateEvaluations = useMemo(
    () =>
      associateEvaluationRecords.filter((record) => {
        const normalizedSearch = associateEvaluationSearch.trim().toLowerCase();
        const matchesSearch =
          normalizedSearch.length === 0 ||
          record.name.toLowerCase().includes(normalizedSearch) ||
          record.position.toLowerCase().includes(normalizedSearch);
        const matchesStatus =
          associateEvaluationStatusFilter === 'all' ||
          record.status === associateEvaluationStatusFilter;
        const matchesDepartment =
          associateEvaluationDepartmentFilter === 'all' ||
          record.department === associateEvaluationDepartmentFilter;
        return matchesSearch && matchesStatus && matchesDepartment;
      }),
    [
      associateEvaluationRecords,
      associateEvaluationSearch,
      associateEvaluationStatusFilter,
      associateEvaluationDepartmentFilter,
    ]
  );

  const associatesOnEvaluation = useMemo(
    () =>
      associateEvaluationRecords.filter(
        (record) => record.status === 'on-track' || record.status === 'at-risk' || record.status === 'extended'
      ).length,
    [associateEvaluationRecords]
  );

  const associatesAtRisk = useMemo(
    () => associateEvaluationRecords.filter((record) => record.status === 'at-risk').length,
    [associateEvaluationRecords]
  );

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
        rowMapper: (associate) => [
          associate.name,
          associate.email,
          associate.school,
          associate.program,
          associate.department,
          associate.supervisor,
          formatDateForCsv(associate.startDate),
          formatDateForCsv(associate.endDate),
          associate.requiredHours,
          associate.completedHours,
          formatPercentageForCsv(associate.progressPercentage),
          associate.status,
        ],
      });
    } finally {
      setExporting(false);
    }
  }, [filteredInterns]);

  const handleViewIntern = (associate: InternSummary): void => {
    router.push(`/admin/interns/${associate.id}`);
  };

  const currentPathWithSearch = useMemo(() => {
    const query = searchParams.toString();
    return query ? `${pathname}?${query}` : pathname;
  }, [pathname, searchParams]);

  const buildOnboardingDetailHref = (profileId: string): string => {
    const returnTo = encodeURIComponent(currentPathWithSearch);
    return `/admin/onboarding/${profileId}?returnTo=${returnTo}`;
  };

  const openAssignmentModal = (data: any): void => {
    setAssignmentData(data);
    setAssignmentModalMode('associate-assignment');
    setAssignmentModalOpen(true);
  };

  const handleAssignmentModalChange = (open: boolean): void => {
    setAssignmentModalOpen(open);
    if (!open) {
      setAssignmentData(null);
      setAssignmentModalMode('associate-assignment');
    }
  };

  const openInternAssignmentFromProfile = (profile: any): void => {
    const employeeRecord = employeeRecordByUserId.get(profile.user_id) ||
      employeeRecordByEmail.get(String(profile.email_address || '').toLowerCase());
    const relatedInternship = (internshipsForOnboardingQuery.data?.data || []).find(
      (internship) => internship.employeeId === profile.employee_id
    );
    const onboardingDepartment = Array.isArray(profile.departments)
      ? profile.departments[0]?.name
      : profile.departments?.name;
    const assignedDepartment = profile.employee_id
      ? internshipDepartmentByEmployeeId.get(profile.employee_id)
      : null;

    openAssignmentModal({
      userId: profile.user_id,
      fullName: profile.full_name || 'Unnamed',
      email: profile.email_address || employeeRecord?.company_email || employeeRecord?.personal_email || '',
      role: 'associate',
      position: profile.position || employeeRecord?.position || null,
      departmentName: employeeRecord?.department || assignedDepartment || onboardingDepartment || null,
      divisionName: employeeRecord?.division || null,
      startDate: relatedInternship?.startDate || null,
      endDate: relatedInternship?.endDate || null,
      requiredHours: relatedInternship?.requiredHours ?? null,
      weeklyRequiredHours: relatedInternship?.weeklyRequiredHours ?? 20,
      school: relatedInternship?.school || null,
      program: relatedInternship?.program || null,
    });
  };

  const openInternAssignmentFromIntern = (associate: InternSummary): void => {
    const internshipRecord = (internshipsQuery.data?.data || []).find(
      (record) => record.id === associate.id
    );

    if (!internshipRecord) {
      addToast({
        title: 'Unable to open assignment',
        description: 'The selected internship record could not be loaded.',
        variant: 'error',
      });
      return;
    }

    const employeeRecord = employeeRecordByUserId.get(internshipRecord.userId) ||
      employeeRecordByEmail.get(String(internshipRecord.email).toLowerCase());

    openAssignmentModal({
      userId: internshipRecord.userId,
      fullName: internshipRecord.name,
      email: internshipRecord.email,
      role: 'associate',
      position: employeeRecord?.position || null,
      divisionId: internshipRecord.divisionId || undefined,
      departmentName: internshipRecord.department || employeeRecord?.department || null,
      divisionName: internshipRecord.division || employeeRecord?.division || null,
      startDate: internshipRecord.startDate,
      endDate: internshipRecord.endDate,
      requiredHours: internshipRecord.requiredHours,
      weeklyRequiredHours: internshipRecord.weeklyRequiredHours,
      school: internshipRecord.school || null,
      program: internshipRecord.program || null,
    });
  };

  const saveAssociateEvaluationMutation = useMutation({
    mutationFn: async (payload: {
      internshipId: string;
      stage: number;
      overallAssessment: string;
      keyStrengths: string;
      areasForContinuedGrowth: string;
      overallPerformance: number;
    }): Promise<{ data: PersistedAssociateEvaluation }> => {
      const response = await fetch('/api/internships/evaluations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ error: 'Failed to save associate evaluation' }));
        throw new Error(error.error || 'Failed to save associate evaluation');
      }

      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['associate-evaluations'] });
    },
  });

  const handleOpenAssociateEvaluation = (record: AssociateEvaluationRecord): void => {
    const existingEvaluation = evaluationsByInternshipAndStage.get(`${record.id}:${record.stage}`);

    setSelectedAssociateForEvaluation(record);
    setOverallAssessment(existingEvaluation?.overall_assessment || '');
    setKeyStrengths(existingEvaluation?.key_strengths || '');
    setAreasForContinuedGrowth(existingEvaluation?.areas_for_continued_growth || '');
    setOverallPerformanceStars(existingEvaluation?.overall_performance || 3);
    setAssociateEvaluationDialogOpen(true);
  };

  const handleSubmitAssociateEvaluation = async (): Promise<void> => {
    if (!selectedAssociateForEvaluation) {
      return;
    }

    try {
      await saveAssociateEvaluationMutation.mutateAsync({
        internshipId: selectedAssociateForEvaluation.id,
        stage: selectedAssociateForEvaluation.stage,
        overallAssessment,
        keyStrengths,
        areasForContinuedGrowth,
        overallPerformance: overallPerformanceStars,
      });

      addToast({
        title: 'Associate evaluation submitted',
        description: `${selectedAssociateForEvaluation.name}'s ${ASSOCIATE_STAGE_LABELS[selectedAssociateForEvaluation.stage].name} evaluation was recorded.`,
        variant: 'success',
      });

      setAssociateEvaluationDialogOpen(false);
      setSelectedAssociateForEvaluation(null);
    } catch (error) {
      addToast({
        title: 'Failed to save associate evaluation',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'error',
      });
    }
  };

  return (
    <div className="space-y-6 p-3">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Associate Management</h1>
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
            Invite Associate
          </Button>
        </div>
      </div>

      <Tabs defaultValue="internships" className="space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            <TabsTrigger value="internships">Internships</TabsTrigger>
            <TabsTrigger value="evaluations">
              Evaluations
              {associatesOnEvaluation > 0 && (
                <CountBadge className="ml-2" variant="warning" size="md" count={associatesOnEvaluation} />
              )}
            </TabsTrigger>
            <TabsTrigger value="onboarding">Onboarding Data</TabsTrigger>
            <TabsTrigger value="eod-reports">
              EOD Reports
              {dailyLogs.filter((log) => !log.is_approved).length > 0 && (
                <CountBadge
                  className="ml-2"
                  variant="danger"
                  size="md"
                  count={dailyLogs.filter((log) => !log.is_approved).length}
                />
              )}
            </TabsTrigger>
          </TabsList>

          <Button variant="outline" size="sm" onClick={() => setChecklistDialogOpen(true)}>
            <FileText className="mr-2 h-4 w-4" />
            View Onboarding Checklist
          </Button>
        </div>

        <TabsContent value="internships" className="space-y-6">
          {/* Summary Cards */}
          <StatCardGrid columns={4}>
            <StatCard
              label="Active Interns"
              value={stats.activeInterns}
              trend={{ direction: 'stable', value: `${stats.completedInterns} completed` }}
              icon={<GraduationCap className="h-4 w-4" strokeWidth={1.5} />}
            />
            <StatCard
              label="Average Progress"
              value={`${stats.averageProgress}%`}
              trend={{ direction: 'up', value: `${stats.totalHoursLogged.toLocaleString()} total hours logged` }}
              icon={<TrendingUp className="h-4 w-4" strokeWidth={1.5} />}
            />
            <StatCard
              label="Reports This Week"
              value={stats.reportsThisWeek}
              trend={{ direction: 'stable', value: `${stats.pendingReports} pending review` }}
              icon={<FileText className="h-4 w-4" strokeWidth={1.5} />}
            />
            <StatCard
              label="Total Interns"
              value={stats.totalInterns}
              icon={<Users className="h-4 w-4" strokeWidth={1.5} />}
            />
          </StatCardGrid>

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
            <div className="flex flex-wrap items-center gap-3">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Status</SelectItem>
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
                  <SelectItem value="all">School</SelectItem>
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
                  <SelectItem value="all">Supervisor</SelectItem>
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
                <RotateCcw className="mr-2 h-4 w-4" />
                Clear All Filters
              </Button>
            </div>
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

          {/* Interns Header */}
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Associates ({filteredInterns.length})</h2>
            <div className="inline-flex items-center rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 p-0.5">
              <button
                type="button"
                onClick={() => setHoursMode('weekly')}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  hoursMode === 'weekly'
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 shadow-sm'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                }`}
              >
                Weekly Hours
              </button>
              <button
                type="button"
                onClick={() => setHoursMode('entire')}
                className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                  hoursMode === 'entire'
                    ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 shadow-sm'
                    : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                }`}
              >
                Entire Hours
              </button>
            </div>
          </div>

          {/* Interns Display */}
          {viewMode === 'grid' ? (
            <InternList
              interns={filteredInterns}
              hoursMode={hoursMode}
              onView={handleViewIntern}
              onEditDetails={openInternAssignmentFromIntern}
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
                  filteredInterns.map((associate) => (
                    <InternRow key={associate.id} associate={associate} hoursMode={hoursMode} onView={handleViewIntern} {...(isSuperAdmin && { onDelete: handleDeleteIntern })} />
                  ))
                ) : (
                  <EmptyState
                    icon={GraduationCap}
                    title={
                      searchQuery ||
                      statusFilter !== 'all' ||
                      schoolFilter !== 'all' ||
                      supervisorFilter !== 'all'
                        ? 'No interns match the selected filters'
                        : 'No interns found'
                    }
                    description={
                      searchQuery ||
                      statusFilter !== 'all' ||
                      schoolFilter !== 'all' ||
                      supervisorFilter !== 'all'
                        ? 'Adjust the filters to widen the associate list.'
                        : 'Associate records will appear here once accounts and internships are created.'
                    }
                    size="sm"
                  />
                )}
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

        <TabsContent value="evaluations" className="space-y-6">
          <StatCardGrid columns={2}>
            <StatCard
              label="On Evaluation"
              value={associatesOnEvaluation}
              icon={<Users className="h-4 w-4" strokeWidth={1.5} />}
            />
            <StatCard
              label="At Risk"
              value={associatesAtRisk}
              trend={
                associatesAtRisk > 0
                  ? { direction: 'up', value: 'Needs attention' }
                  : { direction: 'stable', value: 'No issues' }
              }
              icon={<AlertTriangle className="h-4 w-4" strokeWidth={1.5} />}
            />
          </StatCardGrid>

          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" strokeWidth={1.5} />
              <Input
                placeholder="Search associates..."
                value={associateEvaluationSearch}
                onChange={(event) => setAssociateEvaluationSearch(event.target.value)}
                className="pl-10 bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Select value={associateEvaluationStatusFilter} onValueChange={setAssociateEvaluationStatusFilter}>
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
              <Select value={associateEvaluationDepartmentFilter} onValueChange={setAssociateEvaluationDepartmentFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Department</SelectItem>
                  {associateEvaluationDepartments.map((department) => (
                    <SelectItem key={department} value={department}>
                      {department}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="inline-flex items-center rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 p-0.5">
                <button
                  type="button"
                  onClick={() => setAssociateEvaluationView('cards')}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    associateEvaluationView === 'cards'
                      ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 shadow-sm'
                      : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                  }`}
                >
                  <LayoutGrid className="h-3.5 w-3.5" strokeWidth={1.5} />
                  Cards
                </button>
                <button
                  type="button"
                  onClick={() => setAssociateEvaluationView('list')}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                    associateEvaluationView === 'list'
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

          {filteredAssociateEvaluations.length === 0 ? (
            <Card>
              <CardContent>
                <EmptyState
                  icon={CheckCircle2}
                  title="No associates on evaluation"
                  description="Associate 30-60-90 evaluation records will appear here when internship dates are assigned."
                  size="sm"
                />
              </CardContent>
            </Card>
          ) : associateEvaluationView === 'cards' ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredAssociateEvaluations.map((record) => {
                const isUrgent = record.daysRemaining <= 14;
                const statusConfig = ASSOCIATE_STATUS_CONFIG[record.status];
                const StatusIcon = statusConfig.icon;
                const isAlreadyEvaluated =
                  evaluationsByInternshipAndStage.has(`${record.id}:${record.stage}`);
                const existingEvaluation = evaluationsByInternshipAndStage.get(
                  `${record.id}:${record.stage}`
                );

                return (
                  <Card key={record.id} className={isUrgent ? 'border-amber-300 dark:border-amber-700' : ''}>
                    <CardHeader className="pb-3">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={record.avatarUrl} />
                          <AvatarFallback className="text-xs bg-slate-100 dark:bg-zinc-900/30 text-slate-700 dark:text-zinc-400">
                            {getInitials(record.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-sm">{record.name}</CardTitle>
                          <CardDescription className="text-xs">{record.position}</CardDescription>
                        </div>
                        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${statusConfig.badgeClass}`}>
                          <StatusIcon className="h-3 w-3" strokeWidth={1.5} />
                          {statusConfig.label}
                        </span>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <StageIndicator stage={record.stage} status={record.status} />
                      <div className="flex justify-between text-xs text-zinc-500 dark:text-zinc-400">
                        <span>Started: {formatDate(record.startDate)}</span>
                        <span>{record.department}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock
                          className={`h-3.5 w-3.5 ${isUrgent ? 'text-amber-500' : 'text-zinc-500 dark:text-zinc-400'}`}
                          strokeWidth={1.5}
                        />
                        <span
                          className={`text-xs font-medium ${isUrgent ? 'text-amber-600 dark:text-amber-400' : 'text-zinc-600 dark:text-zinc-300'}`}
                        >
                          {record.daysRemaining <= 0
                            ? 'Evaluation period ended'
                            : `${record.daysRemaining} days remaining`}
                        </span>
                      </div>
                      {isAlreadyEvaluated ? (
                        <Badge variant="success" className="w-fit gap-1">
                          <CheckCircle2 className="h-3 w-3" strokeWidth={1.5} />
                          Evaluated
                        </Badge>
                      ) : null}
                      {existingEvaluation?.evaluated_at ? (
                        <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                          Evaluated on {formatDate(existingEvaluation.evaluated_at)}
                        </p>
                      ) : null}
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full"
                        onClick={() => handleOpenAssociateEvaluation(record)}
                      >
                        <Eye className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.5} />
                        {isAlreadyEvaluated ? 'Re-evaluate' : 'Evaluate'}
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          ) : (
            <Card>
              <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                <div className="grid grid-cols-[1fr_120px_160px_120px_100px_80px] gap-4 px-4 py-2.5 text-xs font-medium text-zinc-500 dark:text-zinc-400 bg-zinc-50/50 dark:bg-zinc-800/30">
                  <span>Associate</span>
                  <span>Department</span>
                  <span>Stage</span>
                  <span>Remaining</span>
                  <span>Status</span>
                  <span>Action</span>
                </div>
                {filteredAssociateEvaluations.map((record) => {
                  const statusConfig = ASSOCIATE_STATUS_CONFIG[record.status];
                  const StatusIcon = statusConfig.icon;
                  const isAlreadyEvaluated =
                    evaluationsByInternshipAndStage.has(`${record.id}:${record.stage}`);

                  return (
                    <div
                      key={record.id}
                      className="grid grid-cols-[1fr_120px_160px_120px_100px_80px] gap-4 px-4 py-3 items-center hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar className="h-8 w-8 shrink-0">
                          <AvatarImage src={record.avatarUrl} />
                          <AvatarFallback className="text-xs bg-slate-100 dark:bg-zinc-900/30 text-slate-700 dark:text-zinc-400">
                            {getInitials(record.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-50 truncate">{record.name}</p>
                          <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">{record.position}</p>
                          {isAlreadyEvaluated ? (
                            <p className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400">
                              Evaluated
                            </p>
                          ) : null}
                        </div>
                      </div>
                      <span className="text-xs text-zinc-600 dark:text-zinc-300 truncate">{record.department}</span>
                      <div className="flex items-center gap-1.5">
                        <div className="flex items-center gap-0.5">
                          {([1, 2, 3, 4] as AssociateEvaluationStage[]).map((stage) => (
                            <div
                              key={stage}
                              className={`h-1.5 w-5 rounded-full ${
                                stage < record.stage
                                  ? 'bg-emerald-500 dark:bg-emerald-400'
                                  : stage === record.stage
                                    ? record.status === 'at-risk'
                                      ? 'bg-amber-500'
                                      : record.status === 'extended'
                                        ? 'bg-orange-500'
                                        : 'bg-slate-800'
                                    : 'bg-zinc-200 dark:bg-zinc-700'
                              }`}
                            />
                          ))}
                        </div>
                        <span className="text-[10px] text-zinc-500 dark:text-zinc-400 whitespace-nowrap">
                          {ASSOCIATE_STAGE_LABELS[record.stage].name}
                        </span>
                      </div>
                      <span className="text-xs text-zinc-600 dark:text-zinc-300">
                        {record.daysRemaining <= 0 ? 'Ended' : `${record.daysRemaining}d left`}
                      </span>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium w-fit ${statusConfig.badgeClass}`}>
                        <StatusIcon className="h-3 w-3" strokeWidth={1.5} />
                        {statusConfig.label}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0"
                        onClick={() => handleOpenAssociateEvaluation(record)}
                        aria-label={isAlreadyEvaluated ? 'Re-evaluate associate' : 'Evaluate associate'}
                      >
                        <Eye className="h-4 w-4" strokeWidth={1.5} />
                      </Button>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="onboarding" className="space-y-6">
          {/* Approval Stats */}
          <StatCardGrid columns={4}>
            <StatCard
              label="In Progress"
              value={onboardingData?.summary.inProgress ?? 0}
              icon={<Clock className="h-4 w-4" strokeWidth={1.5} />}
            />
            <StatCard
              label="Awaiting Approval"
              value={onboardingData?.summary.awaitingReview ?? pendingApprovals.length}
              icon={<AlertCircle className="h-4 w-4" strokeWidth={1.5} />}
            />
            <StatCard
              label="Rejected"
              value={onboardingData?.summary.rejected ?? 0}
              icon={<XCircle className="h-4 w-4" strokeWidth={1.5} />}
            />
            <StatCard
              label="Approved"
              value={onboardingData?.summary.approved ?? 0}
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
                      Review and approve associate onboarding submissions to activate their accounts.
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
                    <SortableTableHead column="associate" {...pendingSortHeadProps}>Associate</SortableTableHead>
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

          {/* All Onboarding Submissions */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Rejected Submissions</CardTitle>
              <CardDescription>
                Completed associate onboarding submissions that were rejected and are waiting on updates.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Associate</TableHead>
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
                          <div className="flex items-center justify-end gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => router.push(`/admin/onboarding/${profile.id}`)}
                            >
                              <Eye className="mr-1 h-4 w-4" />
                              View Details
                            </Button>
                            <RejectedOnboardingDeleteButton
                              profileId={profile.id}
                              fullName={profile.full_name || 'This associate'}
                              subjectLabel="associate"
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
                          description="Rejected associate onboarding submissions will appear here with their latest review notes."
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
              <CardTitle className="text-base">All Onboarding Submissions</CardTitle>
              <CardDescription>Complete history of associate onboarding data</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableTableHead column="associate" {...onboardSortHeadProps}>Associate</SortableTableHead>
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
                      associate: (p: any) => p.full_name?.toLowerCase() ?? '',
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
                        ? internshipDepartmentByEmployeeId.get(profile.employee_id)
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
                                    role: 'associate',
                                    user_id: profile.user_id,
                                    completed_at: profile.completed_at ?? profile.updated_at ?? profile.created_at,
                                  })
                                }
                              >
                                <CheckCircle2 className="mr-1 h-4 w-4" />
                                Review & Approve
                              </Button>
                            ) : (profile.review_state ?? 'in_progress') === 'approved' ? (
                              <div className="flex items-center justify-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => openInternAssignmentFromProfile(profile)}
                                >
                                  {department ? 'Edit Assignment' : 'Complete Assignment'}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => router.push(buildOnboardingDetailHref(profile.id))}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </div>
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
                              : 'No associate onboarding submissions found'
                          }
                          description={
                            onboardingLoading
                              ? 'Associate onboarding submissions are still loading.'
                              : 'Completed and in-progress associate onboarding records will appear here.'
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

        {/* EOD Reports Tab */}
        <TabsContent value="eod-reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                End of Day Reports
                
              </CardTitle>
              <CardDescription>
                Monitor daily reports submitted by associates.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Summary Stats */}
                <StatCardGrid columns={2}>
                  <StatCard
                    label="Total Reports"
                    value={dailyLogs.length}
                    icon={<FileText className="h-4 w-4" strokeWidth={1.5} />}
                  />
                  <StatCard
                    label="Total Hours Logged"
                    value={dailyLogs.reduce((sum, log) => sum + Number(log.hours_worked || 0), 0)}
                    icon={<CheckCircle2 className="h-4 w-4" strokeWidth={1.5} />}
                  />
                </StatCardGrid>

                {/* Reports Table */}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <SortableTableHead column="associate" {...eodSortHeadProps}>Associate</SortableTableHead>
                      <SortableTableHead column="date" {...eodSortHeadProps}>Date</SortableTableHead>
                      <SortableTableHead column="school" {...eodSortHeadProps}>School</SortableTableHead>
                      <SortableTableHead column="department" {...eodSortHeadProps}>Department</SortableTableHead>
                      <SortableTableHead column="hours" {...eodSortHeadProps}>Hours</SortableTableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {dailyLogs.length > 0 ? (
                      sortedDailyLogs.map((log) => {
                        const internName = log.internship?.employee
                          ? `${log.internship.employee.first_name} ${log.internship.employee.last_name}`
                          : 'Unknown Associate';

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
                        <TableCell colSpan={6} className="py-12">
                          <EmptyState
                            icon={FileText}
                            title="No daily reports found"
                            description="Reports will appear here when interns submit their EOD forms."
                            size="sm"
                          />
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
        defaultRole="associate"
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
        onSuccess={() => {
          // Invalidate queries to refresh the UI
          queryClient.invalidateQueries({ queryKey: ['internships'] });
          queryClient.invalidateQueries({ queryKey: ['onboarding'] });
          queryClient.invalidateQueries({ queryKey: ['probation'] });
          queryClient.invalidateQueries({ queryKey: ['employees'] });
          queryClient.invalidateQueries({ queryKey: ['directory'] });
          queryClient.invalidateQueries({ queryKey: ['users'] });
          setAssignmentData(null);
          setAssignmentModalOpen(false);
          setAssignmentModalMode('associate-assignment');
        }}
      />

      <OnboardingChecklistDialog
        open={checklistDialogOpen}
        onOpenChange={setChecklistDialogOpen}
        profiles={onboardingData?.data ?? []}
        roleLabel="associate"
      />

      <EODReportDetailModal
        open={!!selectedEodLog}
        onOpenChange={(open) => {
          if (!open) setSelectedEodLog(null);
        }}
        log={selectedEodLog}
      />

      <Dialog
        open={associateEvaluationDialogOpen}
        onOpenChange={(open) => {
          setAssociateEvaluationDialogOpen(open);
          if (!open) {
            setSelectedAssociateForEvaluation(null);
          }
        }}
      >
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Associate Evaluation</DialogTitle>
            <DialogDescription>
              30-60-90 review for {selectedAssociateForEvaluation?.name ?? 'selected associate'}
            </DialogDescription>
          </DialogHeader>

          {selectedAssociateForEvaluation && (
            <div className="space-y-4">
              <div className="rounded-lg bg-muted/50 p-4">
                <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">{selectedAssociateForEvaluation.name}</p>
                <p className="text-xs text-muted-foreground">
                  {selectedAssociateForEvaluation.position} - {selectedAssociateForEvaluation.department}
                </p>
                <p className="text-xs text-muted-foreground">
                  Supervisor: {selectedAssociateForEvaluation.manager}
                </p>
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">1. Overall assessment</p>
                <Textarea
                  value={overallAssessment}
                  onChange={(event) => setOverallAssessment(event.target.value)}
                  className="min-h-[110px]"
                  placeholder="Write the overall assessment as a paragraph."
                />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">2. Key strengths</p>
                <Textarea
                  value={keyStrengths}
                  onChange={(event) => setKeyStrengths(event.target.value)}
                  className="min-h-[110px]"
                  placeholder="Summarize key strengths as a paragraph."
                />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">3. Areas for Continued Growth</p>
                <Textarea
                  value={areasForContinuedGrowth}
                  onChange={(event) => setAreasForContinuedGrowth(event.target.value)}
                  className="min-h-[110px]"
                  placeholder="Describe growth areas as a paragraph."
                />
              </div>

              <div className="space-y-2">
                <p className="text-sm font-medium">4. Overall performance</p>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      onClick={() => setOverallPerformanceStars(rating)}
                      className="transition-transform hover:scale-110"
                      aria-label={`Rate ${rating} star${rating > 1 ? 's' : ''}`}
                    >
                      <Star
                        className={`h-6 w-6 ${rating <= overallPerformanceStars ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'}`}
                      />
                    </button>
                  ))}
                  <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                    {overallPerformanceStars}/5
                  </span>
                </div>
              </div>
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAssociateEvaluationDialogOpen(false);
                setSelectedAssociateForEvaluation(null);
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                void handleSubmitAssociateEvaluation();
              }}
              disabled={
                saveAssociateEvaluationMutation.isPending ||
                !selectedAssociateForEvaluation ||
                !overallAssessment.trim() ||
                !keyStrengths.trim() ||
                !areasForContinuedGrowth.trim()
              }
            >
              {saveAssociateEvaluationMutation.isPending ? 'Saving...' : 'Submit Evaluation'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <Trash2 className="h-5 w-5" />
              Remove Associate
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
              {deleteInternMutation.isPending ? 'Removing...' : 'Remove Associate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
