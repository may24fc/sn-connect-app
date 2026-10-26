'use client';

import { type DirectoryEntry, useDirectory } from '@/hooks/useDirectory';
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  Badge,
  Button,
  Card,
  CardContent,
  EmptyState,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  PageTitle,
} from '@hr-portal/ui';
import { ArrowLeft, Users } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { type ReactNode, useState } from 'react';
import { FilterSearchInput } from '@/components/data-display/FilterControls';
import { PaginationBar } from '@/components/data-display/PaginationBar';

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
    case 'associate':
      return 'warning';
    default:
      return 'secondary';
  }
}

export default function IndividualPerformancePage(): ReactNode {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [departmentFilter, setDepartmentFilter] = useState('all');
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const filters = {
    ...(search ? { search } : {}),
    ...(roleFilter !== 'all' ? { role: roleFilter } : {}),
    ...(departmentFilter !== 'all' ? { department: departmentFilter } : {}),
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

  const handleRowClick = (entry: DirectoryEntry): void => {
    if (entry.employee_id) {
      router.push(`/admin/performance/employee/${entry.employee_id}`);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button asChild variant="ghost" size="icon">
            <Link href="/admin/performance" aria-label="Back to performance">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <div>
            <PageTitle>Individual OKRs &amp; KPIs</PageTitle>
            <p className="mt-1 text-sm text-muted-foreground">
              Select an employee or associate to review their OKRs, targets, and KPI details
            </p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <FilterSearchInput
              placeholder="Search by name, position, email..."
              value={search}
              onChange={(value) => {
                  setSearch(value);
                  setPage(1);
                }}
              maxLength={200}
              className="sm:w-auto sm:flex-1"
            />
            <Select
              value={roleFilter}
              onValueChange={(value) => {
                setRoleFilter(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Roles</SelectItem>
                <SelectItem value="employee">Employee</SelectItem>
                <SelectItem value="associate">Associate</SelectItem>
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
              <SelectTrigger className="w-full sm:w-[200px]">
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
        </CardContent>
      </Card>

      {/* Employee Table */}
      <Card>
        {/* Pagination - Gmail style at top */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-muted/30">
            <p className="text-xs text-muted-foreground">
              {pagination?.total ?? 0} total
            </p>
            <PaginationBar
              page={page}
              totalPages={totalPages}
              onPageChange={setPage}
              total={pagination?.total ?? 0}
              pageSize={pageSize}
            />
          </div>
        )}
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
              {/* Table header */}
              <div className="hidden md:grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 px-6 py-3 border-b border-border bg-muted/30 text-xs font-medium text-muted-foreground">
                <span>Employee</span>
                <span>Department</span>
                <span>Role</span>
                <span>Status</span>
              </div>

              {/* Table rows */}
              <div className="divide-y divide-border">
                {entries.map((entry) => (
                  <button
                    key={entry.user_id}
                    type="button"
                    onClick={() => handleRowClick(entry)}
                    disabled={!entry.employee_id}
                    className="w-full text-left px-6 py-4 hover:bg-muted/50 transition-colors cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_1fr] gap-2 md:gap-4 items-center">
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
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
