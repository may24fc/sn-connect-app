'use client';

import { useDepartments } from '@/hooks/useDepartments';
import { type DirectoryEntry, useDirectory } from '@/hooks/useDirectory';
import {
  usePerformanceCycles,
  usePerformanceOKRs,
  useUpdatePerformanceCycle,
} from '@/hooks/usePerformance';
import { usePerformanceRealtime } from '@/hooks/usePerformanceRealtime';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Input,
  MultiSelectFilter,
  type OKR,
  type PerformanceRating,
  RATING_CONFIG,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  useToast,
} from '@hr-portal/ui';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  LayoutGrid,
  List,
  Search,
  Settings,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type ReactNode, useEffect, useMemo, useState } from 'react';

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function getRoleBadgeVariant(role: string): 'default' | 'secondary' | 'success' | 'warning' {
  switch (role) {
    case 'admin':
    case 'super_admin':
      return 'default';
    case 'employee':
      return 'secondary';
    case 'intern':
      return 'warning';
    default:
      return 'secondary';
  }
}

function getProgressColor(value: number): string {
  if (value >= 80) return 'text-success';
  if (value >= 50) return 'text-warning';
  return 'text-error';
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

interface EmployeePerformanceSummary {
  employeeId: string;
  okrCount: number;
  weightedMean: number;
  evaluationState: 'pending_hr' | 'pending_calibration' | 'finalized' | 'no_objectives';
  evaluationLabel: string;
  evaluationScoreLabel: string | null;
  evaluationAudit: string;
  evaluationOutstandingCount: number;
}

type ViewMode = 'cards' | 'list';
type CardSortMode = 'weighted_desc' | 'weighted_asc' | 'name_asc';
type SummaryMode = 'progress' | 'evaluation';
type EvaluationAwareOkr = Pick<
  OKR,
  'adminRating' | 'evaluatedBy' | 'evaluatorFirstName' | 'evaluatorRole'
>;
type OkrEvaluationStage = Exclude<EmployeePerformanceSummary['evaluationState'], 'no_objectives'>;

function formatNameList(names: Array<string>): string {
  if (names.length === 1) {
    return names[0] ?? '';
  }

  if (names.length === 2) {
    return `${names[0]} and ${names[1]}`;
  }

  return `${names.slice(0, -1).join(', ')}, and ${names[names.length - 1]}`;
}

function getFinalizedEvaluationAudit(okrs: EvaluationAwareOkr[]): string {
  const calibratorNames = Array.from(
    new Set(
      okrs
        .filter((okr) => okr.evaluatorRole === 'super_admin')
        .map((okr) => okr.evaluatorFirstName?.trim())
        .filter((name): name is string => Boolean(name))
    )
  );

  if (calibratorNames.length === 0) {
    return 'Calibrated by Supervisor.';
  }

  if (calibratorNames.length === 1) {
    return `Calibrated by ${calibratorNames[0]}.`;
  }

  return `Calibrated by ${formatNameList(calibratorNames)}.`;
}

const RATING_SCORES: Record<PerformanceRating, number> = {
  unsatisfactory: 1,
  needs_improvement: 2,
  meets: 3,
  exceeds: 4,
  exceptional: 5,
};

function getRatingFromAverage(score: number): PerformanceRating {
  const rounded = Math.max(1, Math.min(5, Math.round(score)));

  switch (rounded) {
    case 5:
      return 'exceptional';
    case 4:
      return 'exceeds';
    case 3:
      return 'meets';
    case 2:
      return 'needs_improvement';
    default:
      return 'unsatisfactory';
  }
}

function getOkrEvaluationStage(okr: EvaluationAwareOkr): OkrEvaluationStage {
  if (!okr.adminRating || !okr.evaluatedBy) {
    return 'pending_hr';
  }

  if (okr.evaluatorRole === 'super_admin') {
    return 'finalized';
  }

  return 'pending_calibration';
}

function getEvaluationBadgeVariant(
  state: EmployeePerformanceSummary['evaluationState']
): 'default' | 'secondary' | 'success' | 'warning' {
  switch (state) {
    case 'pending_hr':
      return 'warning';
    case 'pending_calibration':
      return 'default';
    case 'finalized':
      return 'success';
    default:
      return 'secondary';
  }
}

function getEvaluationBadgeLabel(state: EmployeePerformanceSummary['evaluationState']): string {
  switch (state) {
    case 'pending_hr':
      return 'Pending HR';
    case 'pending_calibration':
      return 'Pending Calibration';
    case 'finalized':
      return 'Finalized';
    default:
      return 'No Objectives';
  }
}

export default function AdminPerformancePage(): ReactNode {
  usePerformanceRealtime();
  const router = useRouter();
  const { addToast } = useToast();
  const selectedCycleStorageKey = 'admin-performance-selected-cycle-id';

  // Filters & pagination
  const [search, setSearch] = useState('');
  const [roleFilters, setRoleFilters] = useState<string[]>([]);
  const [departmentFilters, setDepartmentFilters] = useState<string[]>([]);
  const [selectedCycleId, setSelectedCycleId] = useState<string>(() => {
    if (typeof window === 'undefined') {
      return '';
    }

    return window.localStorage.getItem(selectedCycleStorageKey) || '';
  });
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [summaryMode, setSummaryMode] = useState<SummaryMode>('progress');
  const [cardSortMode, setCardSortMode] = useState<CardSortMode>('weighted_desc');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Fetch cycles + OKRs for performance data
  const { data: cycles = [] } = usePerformanceCycles();
  const updateCycle = useUpdatePerformanceCycle();
  const orderedCycles = useMemo(
    () =>
      [...cycles].sort(
        (left, right) =>
          new Date(left.startDate).getTime() - new Date(right.startDate).getTime()
      ),
    [cycles]
  );
  const activeCycle = cycles.find((cycle) => cycle.status === 'active') || null;
  const todayIso = new Date().toISOString().slice(0, 10);
  const nextUpcomingCycle = orderedCycles.find((cycle) => cycle.startDate >= todayIso) || null;
  const latestKnownCycle = orderedCycles.length > 0 ? orderedCycles[orderedCycles.length - 1] : null;
  const fallbackCycle = activeCycle || nextUpcomingCycle || latestKnownCycle;
  const selectedCycle =
    cycles.find((cycle) => cycle.id === selectedCycleId) || fallbackCycle || null;
  const selectedCycleFilterId = selectedCycleId || selectedCycle?.id || '__no_active_cycle__';
  const { data: okrs = [] } = usePerformanceOKRs(selectedCycleFilterId);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (selectedCycleId) {
        window.localStorage.setItem(selectedCycleStorageKey, selectedCycleId);
      } else {
        window.localStorage.removeItem(selectedCycleStorageKey);
      }
    }

    if (!selectedCycleId && fallbackCycle) {
      setSelectedCycleId(fallbackCycle.id);
    }
  }, [fallbackCycle, selectedCycleId, selectedCycleStorageKey]);

  // Fetch directory entries
  const filters = {
    ...(search ? { search } : {}),
    ...(roleFilters.length > 0 ? { roles: roleFilters } : {}),
    ...(departmentFilters.length > 0 ? { departments: departmentFilters } : {}),
    page,
    pageSize,
    sortBy: 'full_name',
    sortOrder: 'asc' as const,
  };

  const { data, isLoading } = useDirectory(filters);
  const { data: departmentsData } = useDepartments({ page: 1, pageSize: 200 });

  const entries = data?.data || [];
  const pagination = data?.pagination;
  const totalPages = pagination?.totalPages || 1;

  // Extract filter options from metadata
  const metadata = data?.metadata;
  const departmentOptions = (departmentsData?.data ?? []).map((department) => ({
    value: department.name,
    label: department.name,
  }));
  const roleOptions = (metadata?.availableRoles || []).map((role: string) => ({
    value: role,
    label: role.replace(/_/g, ' ').replace(/\b\w/g, (char: string) => char.toUpperCase()),
  }));

  // Compute per-employee performance summaries from OKRs
  const performanceSummaries = useMemo<Map<string, EmployeePerformanceSummary>>(() => {
    const map = new Map<string, EmployeePerformanceSummary>();

    // Group OKRs by employeeId
    const employeeOkrs = new Map<string, typeof okrs>();
    for (const okr of okrs) {
      const existing = employeeOkrs.get(okr.employeeId) || [];
      existing.push(okr);
      employeeOkrs.set(okr.employeeId, existing);
    }

    // Calculate weighted mean for each employee
    for (const [empId, empOkrs] of employeeOkrs) {
      const totalWeight = empOkrs.reduce((sum, o) => sum + (o.weight || 1), 0);
      const weightedSum = empOkrs.reduce(
        (sum, o) => sum + o.progressPercentage * (o.weight || 1),
        0
      );
      const weightedMean = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;

      const stageCounts = empOkrs.reduce(
        (counts, okr) => {
          const stage = getOkrEvaluationStage(okr);
          counts[stage] += 1;
          return counts;
        },
        {
          pending_hr: 0,
          pending_calibration: 0,
          finalized: 0,
        } as Record<'pending_hr' | 'pending_calibration' | 'finalized', number>
      );

      let evaluationState: EmployeePerformanceSummary['evaluationState'];
      if (empOkrs.length === 0) {
        evaluationState = 'no_objectives';
      } else if (stageCounts.finalized === empOkrs.length) {
        evaluationState = 'finalized';
      } else if (stageCounts.pending_hr > 0) {
        evaluationState = 'pending_hr';
      } else {
        evaluationState = 'pending_calibration';
      }

      const ratedOkrs = empOkrs.filter((okr) => Boolean(okr.adminRating));
      const ratedWeight = ratedOkrs.reduce((sum, okr) => sum + (okr.weight || 1), 0);
      const ratingAverage =
        ratedWeight > 0
          ? ratedOkrs.reduce(
              (sum, okr) =>
                sum +
                RATING_SCORES[(okr.adminRating || 'meets') as PerformanceRating] *
                  (okr.weight || 1),
              0
            ) / ratedWeight
          : 0;
      const aggregateRating =
        ratedOkrs.length > 0 ? RATING_CONFIG[getRatingFromAverage(ratingAverage)].label : null;
      const aggregateScoreLabel = ratedOkrs.length > 0 ? `${ratingAverage.toFixed(1)}/5.0` : null;

      const evaluationLabel =
        evaluationState === 'no_objectives'
          ? 'No Objectives'
          : evaluationState === 'pending_hr'
            ? 'Pending HR Review'
            : aggregateRating || 'Pending Calibration';

      const outstandingCount =
        evaluationState === 'finalized'
          ? 0
          : evaluationState === 'pending_calibration'
            ? stageCounts.pending_calibration
            : stageCounts.pending_hr;

      const evaluationAudit =
        evaluationState === 'no_objectives'
          ? 'No active objectives in this cycle.'
          : evaluationState === 'finalized'
            ? getFinalizedEvaluationAudit(empOkrs)
            : evaluationState === 'pending_calibration'
              ? `${outstandingCount} objective${outstandingCount === 1 ? '' : 's'} pending supervisor calibration.`
              : `${outstandingCount} objective${outstandingCount === 1 ? '' : 's'} awaiting HR baseline.`;

      map.set(empId, {
        employeeId: empId,
        okrCount: empOkrs.length,
        weightedMean,
        evaluationState,
        evaluationLabel,
        evaluationScoreLabel: aggregateScoreLabel,
        evaluationAudit,
        evaluationOutstandingCount: outstandingCount,
      });
    }

    return map;
  }, [okrs]);

  const handleRowClick = (entry: DirectoryEntry): void => {
    if (entry.employee_id) {
      router.push(`/admin/performance/employee/${entry.employee_id}`);
    }
  };

  const getNextCycleAfter = (cycleId: string): (typeof cycles)[number] | null => {
    const currentIndex = orderedCycles.findIndex((cycle) => cycle.id === cycleId);
    if (currentIndex < 0 || currentIndex + 1 >= orderedCycles.length) {
      return null;
    }

    return orderedCycles[currentIndex + 1] || null;
  };

  const handleCloseSelectedCycle = async (): Promise<void> => {
    if (!selectedCycle || selectedCycle.status !== 'active') {
      return;
    }

    const nextCycle = getNextCycleAfter(selectedCycle.id);

    try {
      await updateCycle.mutateAsync({
        id: selectedCycle.id,
        status: 'completed',
      });

      setSelectedCycleId(nextCycle?.id || '');
      addToast({
        title: 'Cycle closed',
        description: nextCycle
          ? `${selectedCycle.name} is now closed. Review ${nextCycle.name} and activate it when ready.`
          : `${selectedCycle.name} is now closed.`,
        variant: 'success',
      });
    } catch (error) {
      const message =
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : 'Failed to close cycle';

      addToast({
        title: 'Error',
        description: message,
        variant: 'error',
      });
    }
  };

  const handleActivateSelectedCycle = async (): Promise<void> => {
    if (!selectedCycle || selectedCycle.status === 'active') {
      return;
    }

    try {
      const currentActive = cycles.find((cycle) => cycle.status === 'active');

      if (currentActive && currentActive.id !== selectedCycle.id) {
        await updateCycle.mutateAsync({
          id: currentActive.id,
          status: 'completed',
        });
      }

      await updateCycle.mutateAsync({
        id: selectedCycle.id,
        status: 'active',
      });

      addToast({
        title: 'Cycle activated',
        description: `${selectedCycle.name} is now active`,
        variant: 'success',
      });
    } catch (error) {
      const message =
        error instanceof Error && error.message.trim().length > 0
          ? error.message
          : 'Failed to activate cycle';

      addToast({
        title: 'Error',
        description: message,
        variant: 'error',
      });
    }
  };

  const sortedCardEntries = useMemo(() => {
    const scoreFor = (entry: DirectoryEntry): number => {
      if (!entry.employee_id) return -1;
      return performanceSummaries.get(entry.employee_id)?.weightedMean ?? -1;
    };

    return [...entries].sort((a, b) => {
      if (summaryMode === 'evaluation') {
        const stagePriority: Record<EmployeePerformanceSummary['evaluationState'], number> = {
          pending_hr: 0,
          pending_calibration: 1,
          finalized: 2,
          no_objectives: 3,
        };
        const aSummary = a.employee_id ? performanceSummaries.get(a.employee_id) : undefined;
        const bSummary = b.employee_id ? performanceSummaries.get(b.employee_id) : undefined;
        const stageDelta =
          stagePriority[aSummary?.evaluationState || 'no_objectives'] -
          stagePriority[bSummary?.evaluationState || 'no_objectives'];

        if (stageDelta !== 0) {
          return stageDelta;
        }

        return (a.full_name || '').localeCompare(b.full_name || '');
      }

      if (cardSortMode === 'name_asc') {
        return (a.full_name || '').localeCompare(b.full_name || '');
      }

      const aScore = scoreFor(a);
      const bScore = scoreFor(b);

      if (cardSortMode === 'weighted_asc') {
        return aScore - bScore;
      }

      return bScore - aScore;
    });
  }, [cardSortMode, entries, performanceSummaries, summaryMode]);

  return (
    <div className="space-y-6 p-3">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">OKRs & KPIs</h1>
          <p className="text-muted-foreground">
            View, compare, and evaluate individual OKRs and KPIs
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/my-performance?create=1">
            <Button>Create My Objective</Button>
          </Link>
          <Link href="/admin/performance/cycles">
            <Button variant="outline">
              <Settings className="mr-2 h-4 w-4" />
              Manage Cycles
            </Button>
          </Link>
        </div>
      </div>

      {/* Current Cycle Banner */}
      {selectedCycle && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="font-semibold">{selectedCycle.name}</h2>
                    <Badge variant={selectedCycle.status === 'active' ? 'success' : 'secondary'}>
                      {selectedCycle.status === 'active' ? 'Active Cycle' : 'Next Quarter Cycle'}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(selectedCycle.startDate)} - {formatDate(selectedCycle.endDate)}
                  </p>
                  {selectedCycle.status !== 'active' && (
                    <p className="mt-1 text-xs font-medium text-muted-foreground">
                      This quarter is ready. Activate it when you want filters and KPIs to move.
                    </p>
                  )}
                </div>
              </div>
              {selectedCycle.status === 'active' ? (
                <Button
                  variant="outline"
                  onClick={() => {
                    void handleCloseSelectedCycle();
                  }}
                  disabled={updateCycle.isPending}
                >
                  {updateCycle.isPending ? 'Closing...' : 'Close Quarter Cycle'}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => {
                    void handleActivateSelectedCycle();
                  }}
                  disabled={updateCycle.isPending}
                >
                  {updateCycle.isPending ? 'Activating...' : 'Activate Quarter Cycle'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
            strokeWidth={1.5}
          />
          <Input
            placeholder="Search by name, email, or position..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-10 bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
          />
        </div>
        <MultiSelectFilter
          label="Roles"
          options={roleOptions}
          selected={roleFilters}
          onSelectionChange={(selected) => {
            setRoleFilters(selected);
            setPage(1);
          }}
        />
        <MultiSelectFilter
          label="Departments"
          options={departmentOptions}
          selected={departmentFilters}
          onSelectionChange={(selected) => {
            setDepartmentFilters(selected);
            setPage(1);
          }}
        />
        <Select
          value={selectedCycleId}
          onValueChange={(value) => {
            setSelectedCycleId(value);
            setPage(1);
          }}
          disabled={cycles.length === 0}
        >
          <SelectTrigger className="w-[220px]">
            <SelectValue placeholder="Cycle" />
          </SelectTrigger>
          <SelectContent>
            {cycles.map((cycle) => (
              <SelectItem key={cycle.id} value={cycle.id}>
                {cycle.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="inline-flex items-center rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 p-0.5">
          <button
            type="button"
            onClick={() => setViewMode('cards')}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              viewMode === 'cards'
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
        <div className="inline-flex items-center rounded-lg border border-primary/20 bg-primary/5 p-0.5">
          <button
            type="button"
            onClick={() => setSummaryMode('progress')}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              summaryMode === 'progress'
                ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-50'
                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            Progress Mode
          </button>
          <button
            type="button"
            onClick={() => setSummaryMode('evaluation')}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              summaryMode === 'evaluation'
                ? 'bg-white text-zinc-900 shadow-sm dark:bg-zinc-700 dark:text-zinc-50'
                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200'
            }`}
          >
            <ClipboardCheck className="h-3.5 w-3.5" strokeWidth={1.5} />
            Evaluation Mode
          </button>
        </div>
        {viewMode === 'cards' && (
          <Select
            value={cardSortMode}
            onValueChange={(value) => setCardSortMode(value as CardSortMode)}
          >
            <SelectTrigger className="w-[230px]">
              <SelectValue placeholder="Sort cards" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="weighted_desc">Highest OWA First</SelectItem>
              <SelectItem value="weighted_asc">Lowest OWA First</SelectItem>
              <SelectItem value="name_asc">Name (A-Z)</SelectItem>
            </SelectContent>
          </Select>
        )}
      </div>

      {/* Content */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              OKRs &amp; KPIs
              {pagination && (
                <span className="text-sm font-normal text-zinc-500 dark:text-zinc-400 ml-2">
                  ({pagination.total} total)
                </span>
              )}
            </CardTitle>
            {pagination && totalPages > 1 && (
              <div className="flex items-center gap-3">
                <span className="text-sm text-zinc-500 dark:text-zinc-400">
                  {(page - 1) * pageSize + 1}-{Math.min(page * pageSize, pagination.total)} of{' '}
                  {pagination.total}
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    aria-label="Previous page"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    aria-label="Next page"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : entries.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No employees found"
              description={
                search
                  ? 'Try adjusting your search or filters.'
                  : 'There are no employees to show yet.'
              }
              size="sm"
            />
          ) : (
            <>
              {viewMode === 'cards' ? (
                <div className="grid gap-4 p-4 sm:grid-cols-2 xl:grid-cols-3">
                  {sortedCardEntries.map((entry) => {
                    const perf = entry.employee_id
                      ? performanceSummaries.get(entry.employee_id)
                      : undefined;

                    return (
                      <button
                        key={entry.user_id}
                        type="button"
                        onClick={() => handleRowClick(entry)}
                        disabled={!entry.employee_id}
                        className="w-full rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-primary/40 hover:shadow-sm disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <Avatar className="h-10 w-10 shrink-0">
                              <AvatarImage src={entry.avatar_url || undefined} />
                              <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                {getInitials(entry.full_name || 'U')}
                              </AvatarFallback>
                            </Avatar>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-foreground truncate">
                                {entry.full_name}
                              </p>
                              <div className="flex sm:flex-row sm:items-center gap-2">
                                <p className="text-xs text-muted-foreground truncate">
                                  {entry.position || 'No position'}
                                </p>
                                <span className="text-xs text-muted-foreground truncate">
                                  · {entry.department_name || 'No department'}
                                </span>
                              </div>
                            </div>
                          </div>
                          <Badge
                            variant={getRoleBadgeVariant(entry.role)}
                            className="text-xs capitalize"
                          >
                            {entry.role?.replace('_', ' ') || '—'}
                          </Badge>
                        </div>

                        <div className="mt-4 rounded-lg border border-border/70 bg-muted/20 p-3">
                          {summaryMode === 'progress' ? (
                            <>
                              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                                Overall Weighted Average
                              </p>
                              <p
                                className={`mt-1 text-2xl font-bold tabular-nums ${getProgressColor(perf?.weightedMean || 0)}`}
                              >
                                {perf ? `${perf.weightedMean}%` : '—'}
                              </p>
                            </>
                          ) : (
                            <>
                              <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                                Final Performance Rating
                              </p>
                              {perf?.evaluationScoreLabel && (
                                <div className="mt-1">
                                  <p className="text-3xl font-bold leading-none tabular-nums text-foreground">
                                    {perf.evaluationScoreLabel}
                                  </p>
                                </div>
                              )}
                              <p className="mt-2 text-sm font-medium leading-tight text-muted-foreground">
                                {perf?.evaluationLabel || 'No Objectives'}
                              </p>
                              <div className="mt-3">
                                <Badge
                                  variant={getEvaluationBadgeVariant(
                                    perf?.evaluationState || 'no_objectives'
                                  )}
                                  className="rounded-full px-2.5 py-1 text-[11px] font-semibold"
                                >
                                  {getEvaluationBadgeLabel(
                                    perf?.evaluationState || 'no_objectives'
                                  )}
                                </Badge>
                              </div>
                              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                                {perf?.evaluationAudit || 'No active objectives in this cycle.'}
                              </p>
                            </>
                          )}
                        </div>

                        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                          <span>
                            {summaryMode === 'progress'
                              ? perf
                                ? `${perf.okrCount} objective${perf.okrCount === 1 ? '' : 's'}`
                                : 'No objectives'
                              : perf?.evaluationState === 'finalized'
                                ? 'Ready to sync'
                                : perf?.evaluationOutstandingCount
                                  ? `${perf.evaluationOutstandingCount} remaining`
                                  : 'No objectives'}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : (
                <>
                  {/* Table header */}
                  <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_180px] gap-4 px-6 py-3 border-b border-border bg-muted/30 text-xs font-medium text-muted-foreground">
                    <span>Employee</span>
                    <span>Department</span>
                    <span>Role</span>
                    <span>{summaryMode === 'progress' ? 'Status' : 'Evaluation State'}</span>
                    <span className="text-right">
                      {summaryMode === 'progress' ? 'Overall Weighted Average' : 'Final Rating'}
                    </span>
                  </div>

                  {/* Table rows */}
                  <div className="divide-y divide-border">
                    {entries.map((entry) => {
                      const perf = entry.employee_id
                        ? performanceSummaries.get(entry.employee_id)
                        : undefined;
                      return (
                        <button
                          key={entry.user_id}
                          type="button"
                          onClick={() => handleRowClick(entry)}
                          disabled={!entry.employee_id}
                          className="w-full text-left px-6 py-4 hover:bg-muted/50 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
                        >
                          <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr_180px] gap-2 md:gap-4 items-center">
                            {/* Employee info */}
                            <div className="flex items-center gap-3">
                              <Avatar className="h-9 w-9 shrink-0">
                                <AvatarImage src={entry.avatar_url || undefined} />
                                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                  {getInitials(entry.full_name || 'U')}
                                </AvatarFallback>
                              </Avatar>
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-foreground truncate">
                                  {entry.full_name}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {entry.position || 'No position'}
                                </p>
                              </div>
                            </div>

                            {/* Department */}
                            <div className="hidden md:block">
                              <p className="text-sm text-foreground truncate">
                                {entry.department_name || '—'}
                              </p>
                            </div>

                            {/* Role */}
                            <div className="hidden md:block">
                              <Badge
                                variant={getRoleBadgeVariant(entry.role)}
                                className="text-xs capitalize"
                              >
                                {entry.role?.replace('_', ' ') || '—'}
                              </Badge>
                            </div>

                            {/* Status */}
                            <div className="hidden md:block">
                              {summaryMode === 'progress' ? (
                                <Badge
                                  variant={
                                    entry.status === 'active'
                                      ? 'success'
                                      : entry.status === 'probation'
                                        ? 'warning'
                                        : 'secondary'
                                  }
                                  className="text-xs capitalize"
                                >
                                  {entry.status?.replace('_', ' ') || '—'}
                                </Badge>
                              ) : (
                                <Badge
                                  variant={getEvaluationBadgeVariant(
                                    perf?.evaluationState || 'no_objectives'
                                  )}
                                  className="text-xs"
                                >
                                  {getEvaluationBadgeLabel(
                                    perf?.evaluationState || 'no_objectives'
                                  )}
                                </Badge>
                              )}
                            </div>

                            {/* Score */}
                            <div className="hidden md:flex justify-end">
                              {summaryMode === 'progress' ? (
                                perf ? (
                                  <span
                                    className={`text-sm font-semibold tabular-nums ${getProgressColor(perf.weightedMean)}`}
                                  >
                                    {perf.weightedMean}%
                                  </span>
                                ) : (
                                  <span className="text-xs text-muted-foreground">—</span>
                                )
                              ) : (
                                <div className="text-right">
                                  {perf?.evaluationScoreLabel && (
                                    <p className="text-lg font-bold leading-none tabular-nums text-foreground">
                                      {perf.evaluationScoreLabel}
                                    </p>
                                  )}
                                  <p className="mt-1 text-xs font-medium text-muted-foreground">
                                    {perf?.evaluationLabel || 'No Objectives'}
                                  </p>
                                </div>
                              )}
                            </div>

                            {/* Mobile meta */}
                            <div className="flex items-center gap-2 md:hidden">
                              <Badge
                                variant={
                                  summaryMode === 'progress'
                                    ? getRoleBadgeVariant(entry.role)
                                    : getEvaluationBadgeVariant(
                                        perf?.evaluationState || 'no_objectives'
                                      )
                                }
                                className="text-xs capitalize"
                              >
                                {summaryMode === 'progress'
                                  ? entry.role?.replace('_', ' ') || '—'
                                  : getEvaluationBadgeLabel(
                                      perf?.evaluationState || 'no_objectives'
                                    )}
                              </Badge>
                              {entry.department_name && (
                                <span className="text-xs text-muted-foreground">
                                  {entry.department_name}
                                </span>
                              )}
                              {perf &&
                                (summaryMode === 'progress' ? (
                                  <span
                                    className={`ml-auto text-xs font-semibold ${getProgressColor(perf.weightedMean)}`}
                                  >
                                    {perf.weightedMean}%
                                  </span>
                                ) : (
                                  <div className="ml-auto text-right">
                                    {perf.evaluationScoreLabel && (
                                      <p className="text-sm font-bold leading-none tabular-nums text-foreground">
                                        {perf.evaluationScoreLabel}
                                      </p>
                                    )}
                                    <p className="mt-1 text-[11px] font-medium text-muted-foreground">
                                      {perf.evaluationLabel}
                                    </p>
                                  </div>
                                ))}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
