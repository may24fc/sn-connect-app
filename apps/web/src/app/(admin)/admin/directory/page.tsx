'use client';

import { InviteUserModal } from '@/components/admin/InviteUserModal';
import { SortableTableHead } from '@/components/data-display/SortableTableHead';
import { StatCard, StatCardGrid } from '@/components/data-display/StatCard';
import { useAuth } from '@/contexts/AuthContext';
import { useCreateDepartment, useDepartments } from '@/hooks/useDepartments';
import { useDirectory, useDirectoryExport } from '@/hooks/useDirectory';
import type { DirectoryEntry, DirectoryFilters } from '@/hooks/useDirectory';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  EmptyState,
  Input,
  Label,
  MultiSelectFilter,
  CountBadge,
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
import { useToast } from '@hr-portal/ui';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Clock,
  Download,
  Eye,
  MoreHorizontal,
  Pencil,
  Save,
  Search,
  Target,
  Trash2,
  Users,
  UserCheck,
  UserPlus,
  Plus,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type ReactNode, useState } from 'react';

const UNASSIGNED_DEPARTMENT = '__unassigned_department__';

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n: string) => n[0])
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
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isAdminOrSuperAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const isSuperAdmin = user?.role === 'super_admin';
  const [search, setSearch] = useState('');
  const [roleFilters, setRoleFilters] = useState<string[]>([]);
  const [departmentFilters, setDepartmentFilters] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [employmentTypeFilter, setEmploymentTypeFilter] = useState('');
  const [sortBy, setSortBy] = useState('full_name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [page, setPage] = useState(1);
  const pageSize = 20;
  const [inviteLeadershipOpen, setInviteLeadershipOpen] = useState(false);

  // Delete employee state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [employeeToDelete, setEmployeeToDelete] = useState<DirectoryEntry | null>(null);

  // Edit employee state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [employeeToEdit, setEmployeeToEdit] = useState<DirectoryEntry | null>(null);
  const [editDepartment, setEditDepartment] = useState('');
  const [editPosition, setEditPosition] = useState('');
  const [editStartDate, setEditStartDate] = useState('');
  const [showCreateDepartmentForm, setShowCreateDepartmentForm] = useState(false);
  const [newDepartmentName, setNewDepartmentName] = useState('');
  const [createDepartmentError, setCreateDepartmentError] = useState('');
  const { addToast } = useToast();
  const {
    data: departmentsData,
    isLoading: departmentsLoading,
    isError: departmentsIsError,
    refetch: refetchDepartments,
  } = useDepartments({ page: 1, pageSize: 200 });
  const createDepartmentMutation = useCreateDepartment();

  const deleteEmployeeMutation = useMutation({
    mutationFn: async (entry: DirectoryEntry) => {
      // If the user has an employee record, delete that; otherwise delete the user record
      if (entry.employee_id) {
        const response = await fetch(`/api/employees/${entry.employee_id}`, {
          method: 'DELETE',
        });
        if (!response.ok) {
          const error = await response.json().catch(() => ({ error: 'Failed to remove employee' }));
          throw new Error(error.error || 'Failed to remove employee');
        }
        return response.json();
      }
      // No employee record – soft-delete the user record
      const response = await fetch(`/api/users/${entry.user_id}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to remove user' }));
        throw new Error(error.error || 'Failed to remove user');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['directory'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setDeleteDialogOpen(false);
      setEmployeeToDelete(null);
      addToast({ title: 'Employee deleted', variant: 'success' });
    },
    onError: () => {
      addToast({ title: 'Failed to delete employee', variant: 'error' });
    },
  });

  const updateEmployeeMutation = useMutation({
    mutationFn: async ({
      employeeId,
      data,
    }: {
      employeeId: string;
      data: { department?: string; position?: string; date_hired?: string | null };
    }) => {
      const response = await fetch(`/api/employees/${employeeId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to update employee' }));
        throw new Error(error.error || 'Failed to update employee');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['directory'] });
      queryClient.invalidateQueries({ queryKey: ['employees'] });
      setEditDialogOpen(false);
      setEmployeeToEdit(null);
      addToast({ title: 'Employee updated', variant: 'success' });
    },
    onError: () => {
      addToast({ title: 'Failed to update employee', variant: 'error' });
    },
  });

  const handleDeleteClick = (entry: DirectoryEntry) => {
    setEmployeeToDelete(entry);
    setDeleteDialogOpen(true);
  };

  const handleEditClick = (entry: DirectoryEntry) => {
    setEmployeeToEdit(entry);
    setEditDepartment(entry.department_name || '');
    setEditPosition(entry.position || '');
    setEditStartDate(entry.start_date || '');
    setShowCreateDepartmentForm(false);
    setNewDepartmentName('');
    setCreateDepartmentError('');
    setEditDialogOpen(true);
  };

  const closeEditDialog = () => {
    setEditDialogOpen(false);
    setEmployeeToEdit(null);
    setEditDepartment('');
    setEditPosition('');
    setEditStartDate('');
    setShowCreateDepartmentForm(false);
    setNewDepartmentName('');
    setCreateDepartmentError('');
  };

  const handleEditSubmit = () => {
    if (!employeeToEdit?.employee_id) return;
    updateEmployeeMutation.mutate({
      employeeId: employeeToEdit.employee_id,
      data: {
        department: editDepartment,
        position: editPosition,
        date_hired: editStartDate || null,
      },
    });
  };

  const handleCreateDepartment = async (): Promise<void> => {
    const departmentName = newDepartmentName.trim();

    if (!departmentName) {
      setCreateDepartmentError('Department name is required.');
      return;
    }

    setCreateDepartmentError('');

    try {
      const result = await createDepartmentMutation.mutateAsync({ name: departmentName });
      await refetchDepartments();
      setEditDepartment(result.data.name);
      setNewDepartmentName('');
      setShowCreateDepartmentForm(false);
      addToast({ title: 'Department created', variant: 'success' });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to create department';
      setCreateDepartmentError(message);
      addToast({ title: message, variant: 'error' });
    }
  };

  const filters: DirectoryFilters = {
    sortBy,
    sortOrder,
    page,
    pageSize,
    ...(search && { search }),
    ...(roleFilters.length > 0 && { roles: roleFilters }),
    ...(departmentFilters.length > 0 && { departments: departmentFilters }),
    ...(statusFilter && { status: statusFilter }),
    ...(employmentTypeFilter && { employmentType: employmentTypeFilter }),
  };

  const { data, isLoading, isError } = useDirectory(filters);
  const { exportCsv, exportExcel } = useDirectoryExport(filters);

  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      await exportCsv();
      addToast({ title: 'Export complete', variant: 'success' });
    } catch {
      addToast({ title: 'Failed to export CSV', variant: 'error' });
    } finally {
      setExporting(false);
    }
  };

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      await exportExcel();
      addToast({ title: 'Export complete', variant: 'success' });
    } catch {
      addToast({ title: 'Failed to export Excel', variant: 'error' });
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
  const departmentOptions = (departmentsData?.data ?? []).map((department) => ({
    value: department.name,
    label: department.name,
  }));
  const roleOptions = (metadata?.availableRoles || []).map((role) => ({
    value: role,
    label: role.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()),
  }));
  const editableDepartmentNames = Array.from(
    new Set(
      [employeeToEdit?.department_name, ...(departmentsData?.data ?? []).map((department) => department.name)]
        .filter((department): department is string => Boolean(department))
    )
  );

  return (
    <div className="flex flex-col gap-6 p-3">
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
        <div className="flex items-center gap-2">
          {isSuperAdmin && (
            <Button size="sm" onClick={() => setInviteLeadershipOpen(true)}>
              <UserPlus className="h-4 w-4 mr-2" strokeWidth={1.5} />
              Invite Leadership
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleExport} disabled={exporting}>
            <Download className="h-4 w-4 mr-2" strokeWidth={1.5} />
            {exporting ? 'Exporting...' : 'Export CSV'}
          </Button>
          <Button variant="outline" size="sm" onClick={handleExportExcel} disabled={exporting}>
            <Download className="h-4 w-4 mr-2" strokeWidth={1.5} />
            {exporting ? 'Exporting...' : 'Export Excel'}
          </Button>
        </div>
      </div>

      {/* Summary Stats */}
      {metadata && (
        <StatCardGrid columns={5}>
          <StatCard
            label="Total"
            value={metadata.total}
            icon={<Users className="h-4 w-4" strokeWidth={1.5} />}
          />
          <StatCard
            label="Active"
            value={metadata.active}
            icon={<UserCheck className="h-4 w-4" strokeWidth={1.5} />}
          />
          <StatCard
            label="Interns"
            value={metadata.interns}
            icon={<BookOpen className="h-4 w-4" strokeWidth={1.5} />}
          />
          <StatCard
            label="On Leave"
            value={metadata.onLeave}
            icon={<Clock className="h-4 w-4" strokeWidth={1.5} />}
          />
          <StatCard
            label="Probation"
            value={metadata.probation}
            icon={<AlertCircle className="h-4 w-4" strokeWidth={1.5} />}
          />
        </StatCardGrid>
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
              onValueChange={(v) => {
                setStatusFilter(v === 'all' ? '' : v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
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
                <SelectItem value="all">Employment Type</SelectItem>
                <SelectItem value="regular">Regular</SelectItem>
                <SelectItem value="probationary">Probationary</SelectItem>
                <SelectItem value="intern">Intern</SelectItem>
                <SelectItem value="project_based">Project Based</SelectItem>
              </SelectContent>
            </Select>
          </div>
        

      {/* Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">
              Directory
              {pagination && (
                <span className="text-sm font-normal text-zinc-500 dark:text-zinc-400 ml-2">
                  ({pagination.total} total)
                </span>
              )}
            </CardTitle>
            {/* Pagination - Gmail style at top */}
            {pagination && pagination.totalPages > 1 && (
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
                    onClick={() => setPage(Math.max(1, page - 1))}
                    disabled={page <= 1}
                  >
                    <ChevronLeft className="h-4 w-4" strokeWidth={1.5} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    aria-label="Next page"
                    onClick={() => setPage(Math.min(pagination.totalPages, page + 1))}
                    disabled={page >= pagination.totalPages}
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
            <EmptyState
              icon={<div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-600 border-t-transparent" />}
              title="Loading directory"
              description="Fetching employee records and current filter results."
              size="sm"
            />
          ) : isError ? (
            <EmptyState
              icon={AlertCircle}
              title="Failed to load directory"
              description="There was a problem fetching the employee directory. Please try again."
              size="sm"
            />
          ) : entries.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No employees found"
              description="No employees matched your current directory filters."
              size="sm"
            />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <SortableTableHead column="full_name" sortColumn={sortBy} sortDirection={sortOrder} onSort={handleSort} className="w-[250px]">Employee</SortableTableHead>
                    <TableHead>Role</TableHead>
                    <SortableTableHead column="department_name" sortColumn={sortBy} sortDirection={sortOrder} onSort={handleSort}>Department</SortableTableHead>
                    <TableHead>Position</TableHead>
                    <SortableTableHead column="status" sortColumn={sortBy} sortDirection={sortOrder} onSort={handleSort}>Status</SortableTableHead>
                    <SortableTableHead column="start_date" sortColumn={sortBy} sortDirection={sortOrder} onSort={handleSort}>Start Date</SortableTableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.map((entry) => (
                    <TableRow
                      key={entry.user_id}
                      className="cursor-pointer hover:bg-zinc-50 dark:hover:bg-zinc-800/50"
                      onDoubleClick={() => router.push(`/admin/directory/${entry.user_id}`)}
                    >
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={entry.avatar_url || undefined} />
                            <AvatarFallback className="text-xs bg-slate-100 dark:bg-zinc-900/30 text-slate-700 dark:text-zinc-400">
                              {getInitials(entry.full_name || 'U')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                {entry.full_name || 'Unknown'}
                              </p>
                              {(entry.pending_changes_count ?? 0) > 0 && (
                                <CountBadge
                                  className="gap-0.5"
                                  variant="accent"
                                  size="sm"
                                  title={`${entry.pending_changes_count} pending change request(s)`}
                                >
                                  <AlertCircle className="h-2.5 w-2.5" strokeWidth={2} />
                                  {entry.pending_changes_count}
                                </CountBadge>
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
                          className="flex items-center justify-end"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon-sm"
                                title="Actions"
                              >
                                <MoreHorizontal className="h-4 w-4" strokeWidth={1.5} />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => router.push(`/admin/directory/${entry.user_id}`)}
                              >
                                <Eye className="mr-2 h-3.5 w-3.5" strokeWidth={1.5} />
                                View Details
                              </DropdownMenuItem>
                              {entry.employee_id && (
                                <DropdownMenuItem
                                  onClick={() => router.push(`/admin/performance/employee/${entry.employee_id}`)}
                                >
                                  <Target className="mr-2 h-3.5 w-3.5" strokeWidth={1.5} />
                                  View Performance
                                </DropdownMenuItem>
                              )}
                              {isAdminOrSuperAdmin && entry.employee_id && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() => handleEditClick(entry)}
                                  >
                                    <Pencil className="mr-2 h-3.5 w-3.5" strokeWidth={1.5} />
                                    Edit Employee Details
                                  </DropdownMenuItem>
                                </>
                              )}
                              {isSuperAdmin && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
                                    onClick={() => handleDeleteClick(entry)}
                                  >
                                    <Trash2 className="mr-2 h-3.5 w-3.5" strokeWidth={1.5} />
                                    Remove
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600 dark:text-red-400">
              <Trash2 className="h-5 w-5" />
              Remove Employee
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to remove{' '}
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                {employeeToDelete?.full_name}
              </span>
              ? This action will soft-delete their employee record. This can be reversed by a database administrator.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false);
                setEmployeeToDelete(null);
              }}
              disabled={deleteEmployeeMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (employeeToDelete) {
                  deleteEmployeeMutation.mutate(employeeToDelete);
                }
              }}
              disabled={deleteEmployeeMutation.isPending}
            >
              {deleteEmployeeMutation.isPending ? 'Removing...' : 'Remove Employee'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <InviteUserModal
        open={inviteLeadershipOpen}
        onOpenChange={setInviteLeadershipOpen}
        allowedRoles={['admin', 'super_admin']}
      />

      {/* Edit Employee Dialog */}
      <Dialog
        open={editDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            closeEditDialog();
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5" />
              Edit Employee
            </DialogTitle>
            <DialogDescription>
              Update department, position, and start date for{' '}
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                {employeeToEdit?.full_name}
              </span>
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-department">Department</Label>
              <Select
                value={editDepartment || UNASSIGNED_DEPARTMENT}
                onValueChange={(value) => {
                  setEditDepartment(value === UNASSIGNED_DEPARTMENT ? '' : value);
                }}
              >
                <SelectTrigger id="edit-department" disabled={departmentsLoading && editableDepartmentNames.length === 0}>
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={UNASSIGNED_DEPARTMENT}>Unassigned</SelectItem>
                  {editableDepartmentNames.map((dept) => (
                    <SelectItem key={dept} value={dept}>
                      {dept}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs text-zinc-500 dark:text-zinc-400">
                  {departmentsLoading
                    ? 'Loading departments...'
                    : departmentsIsError
                      ? 'Unable to load the saved departments right now.'
                      : 'Departments come from your saved Supabase department list.'}
                </div>
                {isAdminOrSuperAdmin && !showCreateDepartmentForm && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setShowCreateDepartmentForm(true);
                      setCreateDepartmentError('');
                    }}
                  >
                    <Plus className="mr-2 h-4 w-4" strokeWidth={1.5} />
                    Create department
                  </Button>
                )}
              </div>
              {showCreateDepartmentForm && (
                <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-900/40">
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <Label htmlFor="new-department-name">New department name</Label>
                      <Input
                        id="new-department-name"
                        value={newDepartmentName}
                        onChange={(event) => setNewDepartmentName(event.target.value)}
                        placeholder="Enter department name"
                        disabled={createDepartmentMutation.isPending}
                      />
                    </div>
                    {createDepartmentError && (
                      <p className="text-sm text-rose-600 dark:text-rose-400">
                        {createDepartmentError}
                      </p>
                    )}
                    <div className="flex items-center justify-end gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={createDepartmentMutation.isPending}
                        onClick={() => {
                          setShowCreateDepartmentForm(false);
                          setNewDepartmentName('');
                          setCreateDepartmentError('');
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        disabled={createDepartmentMutation.isPending}
                        onClick={() => void handleCreateDepartment()}
                      >
                        {createDepartmentMutation.isPending ? 'Creating...' : 'Create'}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-position">Position</Label>
              <Input
                id="edit-position"
                value={editPosition}
                onChange={(e) => setEditPosition(e.target.value)}
                placeholder="Enter position title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-start-date">Start Date</Label>
              <Input
                id="edit-start-date"
                type="date"
                value={editStartDate}
                onChange={(event) => setEditStartDate(event.target.value)}
              />
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                This updates the employee&apos;s hire date used for milestone and anniversary calculations.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={closeEditDialog}
              disabled={updateEmployeeMutation.isPending || createDepartmentMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEditSubmit}
              disabled={updateEmployeeMutation.isPending || createDepartmentMutation.isPending}
            >
              <Save className="mr-2 h-4 w-4" />
              {updateEmployeeMutation.isPending ? 'Saving...' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
