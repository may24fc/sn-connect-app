'use client';

import { type DirectoryEntry, useDirectory } from '@/hooks/useDirectory';
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
  Input,
  ProgressGauge,
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

export default function AdminPerformancePage(): ReactNode {
  usePerformanceRealtime();
  const router = useRouter();

  // View toggle
  const [viewMode, setViewMode] = useState<'list' | 'cards'>('list');

  // Filters & pagination
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('accessible');
  const [page, setPage] = useState(1);
  const pageSize = viewMode === 'cards' ? 12 : 15;

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
    ...(roleFilter !== 'all' ? { role: roleFilter } : {}),
    ...(departmentFilter !== 'all' ? { department: departmentFilter } : {}),
    ...(statusFilter !== 'all' && statusFilterMap[statusFilter]
      ? { status: statusFilterMap[statusFilter] }
      : {}),
    page,
    pageSize,
    sortBy: 'full_name',
    sortOrder: 'asc' as const,
  };

  const { data, isLoading } = useDirectory(filters);

  const entries = data?.data || [];
  const pagination = data?.pagination;
  const totalPages = pagination?.totalPages || 1;

  // Extract unique departments for filter
  const departments = Array.from(
    new Set(entries.map((e) => e.department_name).filter(Boolean))
  ).sort() as string[];

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Performance</h1>
          <p className="text-muted-foreground">
            View and evaluate individual OKRs and performance
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
          </CardContent>
        </Card>
      )}

      {/* Filters + View Toggle */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col lg:flex-row gap-3">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, position, email..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  className="pl-10 bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
                />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Select
                  value={roleFilter}
                  onValueChange={(value) => {
                    setRoleFilter(value);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Roles</SelectItem>
                    <SelectItem value="employee">Employee</SelectItem>
                    <SelectItem value="intern">Intern</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
                <Select
                  value={departmentFilter}
                  onValueChange={(value) => {
                    setDepartmentFilter(value);
                    setPage(1);
                  }}
                >
                  <SelectTrigger className="w-[170px]">
                    <SelectValue placeholder="Department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Departments</SelectItem>
                    {departments.map((dept) => (
                      <SelectItem key={dept} value={dept}>
                        {dept}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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

                {/* View Toggle */}
                <div className="inline-flex items-center rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 p-0.5">
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('list');
                      setPage(1);
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      viewMode === 'list'
                        ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 shadow-sm'
                        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                    }`}
                  >
                    <List className="h-3.5 w-3.5" strokeWidth={1.5} />
                    List
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setViewMode('cards');
                      setPage(1);
                    }}
                    className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      viewMode === 'cards'
                        ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 shadow-sm'
                        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                    }`}
                  >
                    <LayoutGrid className="h-3.5 w-3.5" strokeWidth={1.5} />
                    Cards
                  </button>
                </div>

                {/* Pagination - Gmail style at top */}
                {totalPages > 1 && (
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">
                      {(page - 1) * pageSize + 1}-
                      {Math.min(page * pageSize, pagination?.total ?? 0)} of {pagination?.total ?? 0}
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
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        aria-label="Next page"
                        disabled={page >= totalPages}
                        onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : entries.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-20">
            <Users className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">No employees found</p>
            {search && (
              <p className="text-xs text-muted-foreground mt-1">
                Try adjusting your search or filters
              </p>
            )}
          </CardContent>
        </Card>
      ) : viewMode === 'list' ? (
        /* ═══════════════ LIST VIEW ═══════════════ */
        <Card>
          <CardContent className="p-0">
            {/* Table header */}
            <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr_100px] gap-4 px-6 py-3 border-b border-border bg-muted/30 text-xs font-medium text-muted-foreground uppercase tracking-wider">
              <span>Employee</span>
              <span>Department</span>
              <span>Role</span>
              <span>Status</span>
              <span className="text-right">Score</span>
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
                    <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr_100px] gap-2 md:gap-4 items-center">
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
          </CardContent>
        </Card>
      ) : (
        /* ═══════════════ CARDS VIEW ═══════════════ */
        <>
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
                  className="text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Card className="h-full hover:shadow-md hover:border-primary/30 transition-all cursor-pointer">
                    <CardContent className="p-5">
                      <div className="flex flex-col items-center text-center">
                        {/* Avatar + gauge */}
                        <div className="relative mb-3">
                          <ProgressGauge
                            value={perf?.weightedMean ?? 0}
                            label=""
                            size="lg"
                          />
                          <Avatar className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-14 w-14 border-2 border-background">
                            <AvatarImage src={entry.avatar_url || undefined} />
                            <AvatarFallback className="text-sm bg-primary/10 text-primary">
                              {getInitials(entry.full_name || 'U')}
                            </AvatarFallback>
                          </Avatar>
                        </div>

                        {/* Name + position */}
                        <h3 className="font-semibold text-foreground truncate w-full">
                          {entry.full_name}
                        </h3>
                        <p className="text-xs text-muted-foreground truncate w-full">
                          {entry.position || 'No position'}
                        </p>

                        {/* Score */}
                        <div className="mt-3">
                          {perf ? (
                            <span
                              className={`text-2xl font-bold tabular-nums ${getProgressColor(perf.weightedMean)}`}
                            >
                              {perf.weightedMean}%
                            </span>
                          ) : (
                            <span className="text-sm text-muted-foreground">No data</span>
                          )}
                        </div>

                        {/* Meta badges */}
                        <div className="flex items-center gap-2 mt-2 flex-wrap justify-center">
                          <Badge
                            variant={getRoleBadgeVariant(entry.role)}
                            className="text-[10px] capitalize"
                          >
                            {entry.role?.replace('_', ' ') || '—'}
                          </Badge>
                          {entry.department_name && (
                            <Badge variant="outline" className="text-[10px]">
                              {entry.department_name}
                            </Badge>
                          )}
                        </div>

                        {/* OKR count */}
                        {perf && perf.okrCount > 0 && (
                          <p className="text-[10px] text-muted-foreground mt-2">
                            {perf.okrCount} objective{perf.okrCount !== 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}
