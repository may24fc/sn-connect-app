'use client';

import { type DirectoryEntry, useDirectory } from '@/hooks/useDirectory';
import { useDepartments } from '@/hooks/useDepartments';
import {
  usePerformanceCycles,
  usePerformanceOKRs,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@hr-portal/ui';
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  LayoutGrid,
  List,
  Search,
  Settings,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type ReactNode, useMemo, useState } from 'react';

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
}

type ViewMode = 'cards' | 'list';
type CardSortMode = 'weighted_desc' | 'weighted_asc' | 'name_asc';

export default function AdminPerformancePage(): ReactNode {
  usePerformanceRealtime();
  const router = useRouter();

  // Filters & pagination
  const [search, setSearch] = useState('');
  const [roleFilters, setRoleFilters] = useState<string[]>([]);
  const [departmentFilters, setDepartmentFilters] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState('accessible');
  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [cardSortMode, setCardSortMode] = useState<CardSortMode>('weighted_desc');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Fetch cycles + OKRs for performance data
  const { data: cycles = [] } = usePerformanceCycles();
  const activeCycle = cycles.find((cycle) => cycle.status === 'active') || cycles[0] || null;
  const { data: okrs = [] } = usePerformanceOKRs(activeCycle?.id);

  // Fetch directory entries
  // Map status filter values to API status params
  const statusFilterMap: Record<string, string | undefined> = {
    all: undefined,
    accessible: 'active,probation',
    active: 'active',
    probation: 'probation',
    pending_onboarding: 'pending_onboarding',
    awaiting_approval: 'awaiting_approval',
    on_leave: 'on_leave',
    terminated: 'terminated',
  };

  const filters = {
    ...(search ? { search } : {}),
    ...(roleFilters.length > 0 ? { roles: roleFilters } : {}),
    ...(departmentFilters.length > 0 ? { departments: departmentFilters } : {}),
    ...(statusFilter !== 'all' && statusFilterMap[statusFilter]
      ? { status: statusFilterMap[statusFilter] }
      : {}),
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

      map.set(empId, {
        employeeId: empId,
        okrCount: empOkrs.length,
        weightedMean,
      });
    }

    return map;
  }, [okrs]);

  const handleRowClick = (entry: DirectoryEntry): void => {
    if (entry.employee_id) {
      router.push(`/admin/performance/employee/${entry.employee_id}`);
    }
  };

  const sortedCardEntries = useMemo(() => {
    const scoreFor = (entry: DirectoryEntry): number => {
      if (!entry.employee_id) return -1;
      return performanceSummaries.get(entry.employee_id)?.weightedMean ?? -1;
    };

    return [...entries].sort((a, b) => {
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
  }, [cardSortMode, entries, performanceSummaries]);

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
          <Link href="/admin/performance/cycles">
            <Button variant="outline">
              <Settings className="mr-2 h-4 w-4" />
              Manage Cycles
            </Button>
          </Link>
        </div>
      </div>

      {/* Current Cycle Banner */}
      {activeCycle && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Calendar className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h2 className="font-semibold">{activeCycle.name}</h2>
                  <p className="text-sm text-muted-foreground">
                    {formatDate(activeCycle.startDate)} - {formatDate(activeCycle.endDate)}
                  </p>
                </div>
              </div>
              <Badge variant="success">Active Cycle</Badge>
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  OKR Due
                </p>
                <p className="text-sm font-medium text-foreground mt-1">
                  {activeCycle.okrSubmissionDeadline
                    ? formatDate(activeCycle.okrSubmissionDeadline)
                    : 'Not set'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  KPI Due
                </p>
                <p className="text-sm font-medium text-foreground mt-1">
                  {activeCycle.kpiSubmissionDeadline
                    ? formatDate(activeCycle.kpiSubmissionDeadline)
                    : 'Not set'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Self-Assessment
                </p>
                <p className="text-sm font-medium text-foreground mt-1">
                  {activeCycle.selfAssessmentDeadline
                    ? formatDate(activeCycle.selfAssessmentDeadline)
                    : 'Not set'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Manager Review
                </p>
                <p className="text-sm font-medium text-foreground mt-1">
                  {activeCycle.managerReviewDeadline
                    ? formatDate(activeCycle.managerReviewDeadline)
                    : 'Not set'}
                </p>
              </div>
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
          value={statusFilter}
          onValueChange={(value) => {
            setStatusFilter(value);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="accessible">Active & Probation</SelectItem>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="active">Active</SelectItem>
            <SelectItem value="probation">Probation</SelectItem>
            <SelectItem value="pending_onboarding">Pending Onboarding</SelectItem>
            <SelectItem value="awaiting_approval">Awaiting Approval</SelectItem>
            <SelectItem value="on_leave">On Leave</SelectItem>
            <SelectItem value="terminated">Terminated</SelectItem>
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
        {viewMode === 'cards' && (
          <Select value={cardSortMode} onValueChange={(value) => setCardSortMode(value as CardSortMode)}>
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
                  {(page - 1) * pageSize + 1}-
                  {Math.min(page * pageSize, pagination.total)} of {pagination.total}
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
              description={search ? 'Try adjusting your search or filters.' : 'There are no employees to show yet.'}
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
                              <p className="text-xs text-muted-foreground truncate">
                                {entry.position || 'No position'}
                              </p>
                            </div>
                          </div>
                          <Badge variant={getRoleBadgeVariant(entry.role)} className="text-xs capitalize">
                            {entry.role?.replace('_', ' ') || '—'}
                          </Badge>
                        </div>

                        <div className="mt-4 rounded-lg border border-border/70 bg-muted/20 p-3">
                          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">
                            Overall Weighted Average
                          </p>
                          <p className={`mt-1 text-2xl font-bold tabular-nums ${getProgressColor(perf?.weightedMean || 0)}`}>
                            {perf ? `${perf.weightedMean}%` : '—'}
                          </p>
                        </div>

                        <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                          <span>{entry.department_name || 'No department'}</span>
                          <span>{perf ? `${perf.okrCount} objective${perf.okrCount === 1 ? '' : 's'}` : 'No objectives'}</span>
                        </div>

                        <div className="mt-2">
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
                    <span>Status</span>
                    <span className="text-right">Overall Weighted Average</span>
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
                            </div>

                            {/* Score */}
                            <div className="hidden md:flex justify-end">
                              {perf ? (
                                <span
                                  className={`text-sm font-semibold tabular-nums ${getProgressColor(perf.weightedMean)}`}
                                >
                                  {perf.weightedMean}%
                                </span>
                              ) : (
                                <span className="text-xs text-muted-foreground">—</span>
                              )}
                            </div>

                            {/* Mobile meta */}
                            <div className="flex items-center gap-2 md:hidden">
                              <Badge
                                variant={getRoleBadgeVariant(entry.role)}
                                className="text-xs capitalize"
                              >
                                {entry.role?.replace('_', ' ') || '—'}
                              </Badge>
                              {entry.department_name && (
                                <span className="text-xs text-muted-foreground">
                                  {entry.department_name}
                                </span>
                              )}
                              {perf && (
                                <span
                                  className={`ml-auto text-xs font-semibold ${getProgressColor(perf.weightedMean)}`}
                                >
                                  {perf.weightedMean}%
                                </span>
                              )}
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
