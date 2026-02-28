'use client';

import { useDirectory, useDirectoryExport } from '@/hooks/useDirectory';
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
  Input,
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
} from '@hr-portal/ui';
import {
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  Search,
  Target,
  Users,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type ReactNode, useState } from 'react';

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function getStatusBadgeVariant(
  status: string | null
): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (status) {
    case 'active':
      return 'default';
    case 'on_leave':
      return 'secondary';
    case 'terminated':
      return 'destructive';
    case 'probation':
      return 'outline';
    default:
      return 'secondary';
  }
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function AdminDirectoryPage(): ReactNode {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [employmentTypeFilter, setEmploymentTypeFilter] = useState('');
  const [sortBy, setSortBy] = useState('full_name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const filters = {
    search: search || undefined,
    role: roleFilter || undefined,
    department: departmentFilter || undefined,
    status: statusFilter || undefined,
    employmentType: employmentTypeFilter || undefined,
    sortBy,
    sortOrder,
    page,
    pageSize,
  };

  const { data, isLoading, isError } = useDirectory(filters);
  const { exportCsv } = useDirectoryExport(filters);

  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportCsv();
    } catch {
      // silently fail
    } finally {
      setExporting(false);
    }
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const entries = data?.data || [];
  const metadata = data?.metadata;
  const pagination = data?.pagination;

  return (
    <div className="flex flex-col gap-6 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 tracking-tight">
            Employee Directory
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Master directory of all employees and interns
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
          <Download className="h-4 w-4 mr-2" strokeWidth={1.5} />
          {exporting ? 'Exporting...' : 'Export CSV'}
        </Button>
      </div>

      {/* Summary Stats */}
      {metadata && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-zinc-400" strokeWidth={1.5} />
                <div>
                  <p className="text-2xl font-semibold text-zinc-900 dark:text-zinc-50 tabular-nums">
                    {metadata.total}
                  </p>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">Total</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-semibold text-emerald-600 dark:text-emerald-400 tabular-nums">
                {metadata.active}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Active</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-semibold text-indigo-600 dark:text-indigo-400 tabular-nums">
                {metadata.interns}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Interns</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-semibold text-amber-600 dark:text-amber-400 tabular-nums">
                {metadata.onLeave}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">On Leave</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-2xl font-semibold text-orange-600 dark:text-orange-400 tabular-nums">
                {metadata.probation}
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">Probation</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[200px]">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-400"
                strokeWidth={1.5}
              />
              <Input
                placeholder="Search by name, email, or position..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-10"
              />
            </div>
            <Select
              value={roleFilter}
              onValueChange={(v) => {
                setRoleFilter(v === 'all' ? '' : v);
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
                <SelectItem value="super_admin">Super Admin</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v === 'all' ? '' : v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="probation">Probation</SelectItem>
                <SelectItem value="on_leave">On Leave</SelectItem>
                <SelectItem value="terminated">Terminated</SelectItem>
              </SelectContent>
            </Select>
            <Select
              value={employmentTypeFilter}
              onValueChange={(v) => {
                setEmploymentTypeFilter(v === 'all' ? '' : v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Employment Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="regular">Regular</SelectItem>
                <SelectItem value="probationary">Probationary</SelectItem>
                <SelectItem value="intern">Intern</SelectItem>
                <SelectItem value="project_based">Project Based</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            Directory
            {pagination && (
              <span className="text-sm font-normal text-zinc-500 dark:text-zinc-400 ml-2">
                ({pagination.total} total)
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
            </div>
          ) : isError ? (
            <div className="flex items-center justify-center py-12 text-sm text-red-500">
              Failed to load directory. Please try again.
            </div>
          ) : entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-sm text-zinc-500 dark:text-zinc-400">
              <Users className="h-8 w-8 mb-2 text-zinc-300 dark:text-zinc-600" strokeWidth={1.5} />
              <p>No employees found matching your filters.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[250px]">
                      <button
                        type="button"
                        className="flex items-center gap-1 hover:text-zinc-900 dark:hover:text-zinc-100"
                        onClick={() => handleSort('full_name')}
                      >
                        Employee
                        {sortBy === 'full_name' && (
                          <span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </button>
                    </TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>
                      <button
                        type="button"
                        className="flex items-center gap-1 hover:text-zinc-900 dark:hover:text-zinc-100"
                        onClick={() => handleSort('department_name')}
                      >
                        Department
                        {sortBy === 'department_name' && (
                          <span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </button>
                    </TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>
                      <button
                        type="button"
                        className="flex items-center gap-1 hover:text-zinc-900 dark:hover:text-zinc-100"
                        onClick={() => handleSort('status')}
                      >
                        Status
                        {sortBy === 'status' && (
                          <span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </button>
                    </TableHead>
                    <TableHead>
                      <button
                        type="button"
                        className="flex items-center gap-1 hover:text-zinc-900 dark:hover:text-zinc-100"
                        onClick={() => handleSort('start_date')}
                      >
                        Start Date
                        {sortBy === 'start_date' && (
                          <span className="text-xs">{sortOrder === 'asc' ? '↑' : '↓'}</span>
                        )}
                      </button>
                    </TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow
                      key={entry.user_id}
                      className="cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                      onClick={() => router.push(`/admin/directory/${entry.user_id}`)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={entry.avatar_url || undefined} />
                            <AvatarFallback className="text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400">
                              {getInitials(entry.full_name || 'U')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                {entry.full_name || 'Unknown'}
                              </p>
                              {(entry.pending_changes_count ?? 0) > 0 && (
                                <span
                                  className="inline-flex items-center gap-0.5 rounded-full bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400"
                                  title={`${entry.pending_changes_count} pending change request(s)`}
                                >
                                  <AlertCircle className="h-2.5 w-2.5" strokeWidth={2} />
                                  {entry.pending_changes_count}
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-zinc-500 dark:text-zinc-400">
                              {entry.email || '—'}
                            </p>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="text-xs capitalize">
                          {entry.role?.replace('_', ' ') || '—'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-zinc-600 dark:text-zinc-300">
                        {entry.department_name || '—'}
                      </TableCell>
                      <TableCell className="text-sm text-zinc-600 dark:text-zinc-300">
                        {entry.position || '—'}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={getStatusBadgeVariant(entry.status)}
                          className="text-xs capitalize"
                        >
                          {entry.status?.replace('_', ' ') || '—'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-zinc-600 dark:text-zinc-300 tabular-nums">
                        {formatDate(entry.start_date)}
                      </TableCell>
                      <TableCell className="text-sm text-zinc-600 dark:text-zinc-300">
                        {entry.contact_number || '—'}
                      </TableCell>
                      <TableCell>
                        <div
                          className="flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Link href={`/admin/directory/${entry.user_id}`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              title="View Details"
                            >
                              <Eye className="h-3.5 w-3.5" strokeWidth={1.5} />
                            </Button>
                          </Link>
                          {entry.employee_id && (
                            <Link href={`/admin/performance/employee/${entry.employee_id}`}>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                title="View Performance"
                              >
                                <Target className="h-3.5 w-3.5" strokeWidth={1.5} />
                              </Button>
                            </Link>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* Pagination */}
          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-zinc-200 dark:border-zinc-800 px-4 py-3">
              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                Page {pagination.page} of {pagination.totalPages}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page <= 1}
                >
                  <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(Math.min(pagination.totalPages, page + 1))}
                  disabled={page >= pagination.totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4" strokeWidth={1.5} />
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
