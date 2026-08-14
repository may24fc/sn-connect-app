'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useDirectory } from '@/hooks/useDirectory';
import {
  useCreatePaTaskAttachment,
  useDeletePaTaskAttachment,
  usePaTaskAttachments,
} from '@/hooks/usePaTaskAttachments';
import {
  useGrantPaTaskAccess,
  usePaTaskAccess,
  usePaTaskAccessGrants,
  usePaTaskAssignableUsers,
  useRevokePaTaskAccess,
} from '@/hooks/usePaTaskAccess';
import {
  useCreatePaTaskCategory,
  useDeletePaTaskCategory,
  usePaTaskCategories,
  usePaTaskPriorities,
  usePaTaskStatuses,
  useUpdatePaTaskCategory,
} from '@/hooks/usePaTaskLookups';
import { useCreatePaTask, useDeletePaTask, usePaTask, usePaTasks, useUpdatePaTask } from '@/hooks/usePaTasks';
import type { PaTaskLookupColor, PaTaskRecord } from '@/types/pa-task.types';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  EmptyState,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SlidePanel,
  SlidePanelBody,
  SlidePanelContent,
  SlidePanelDescription,
  SlidePanelFooter,
  SlidePanelHeader,
  SlidePanelSection,
  SlidePanelTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
  useToast,
} from '@hr-portal/ui';
import { Loader2, Paperclip, Plus, Search, ShieldCheck, ShieldX, Trash2, UserPlus } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';

type LookupItem = {
  id: string;
  label: string;
  color: PaTaskLookupColor;
  is_default: boolean;
  sort_order?: number;
  is_terminal?: boolean;
};

type PaTaskListRow = PaTaskRecord & {
  assignee_name?: string | null;
  creator_name?: string | null;
  status?: { id: string; label: string; color: PaTaskLookupColor; is_terminal: boolean };
  priority?: { id: string; label: string; color: PaTaskLookupColor };
  category?: { id: string; label: string; color: PaTaskLookupColor } | null;
  attachments?: Array<{
    id: string;
    title: string;
    attachment_type: 'link' | 'file';
    url: string | null;
    storage_path: string | null;
    mime_type: string | null;
  }>;
};

const NONE_VALUE = '__none__';

function colorClass(color: PaTaskLookupColor) {
  const map: Record<PaTaskLookupColor, string> = {
    zinc: 'bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200',
    sky: 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300',
    amber: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
    rose: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
    emerald: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
    orange: 'bg-orange-100 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300',
    violet: 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300',
  };
  return map[color];
}

function formatDate(value: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString();
}

function formatRole(role: string | null): string {
  if (!role) return 'Unknown role';
  return role
    .split('_')
    .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
    .join(' ');
}

export default function PaTasksPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const accessQuery = usePaTaskAccess(
    Boolean(user) &&
      (user?.role === 'employee' ||
        user?.role === 'associate' ||
        user?.role === 'admin' ||
        user?.role === 'super_admin')
  );
  const canAccess = Boolean(accessQuery.data?.canAccess);

  const [search, setSearch] = useState('');
  const [accessSearch, setAccessSearch] = useState('');
  const [grantAccessLevel, setGrantAccessLevel] = useState<'member' | 'manager' | 'admin'>('member');
  const [statusId, setStatusId] = useState('all');
  const [priorityId, setPriorityId] = useState('all');
  const [categoryId, setCategoryId] = useState('all');
  const [assigneeId, setAssigneeId] = useState('all');

  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [categoryManagerOpen, setCategoryManagerOpen] = useState(false);
  const [accessManagerOpen, setAccessManagerOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const canManage = Boolean(accessQuery.data?.canManage);

  const directoryQuery = useDirectory({
    search: accessSearch,
    roles: ['employee', 'associate'],
    sortBy: 'full_name',
    sortOrder: 'asc',
    page: 1,
    pageSize: 100,
  });
  const grantsQuery = usePaTaskAccessGrants(canManage);
  const grantAccess = useGrantPaTaskAccess();
  const revokeAccess = useRevokePaTaskAccess();

  const createCategory = useCreatePaTaskCategory();
  const updateCategory = useUpdatePaTaskCategory();
  const deleteCategory = useDeletePaTaskCategory();

  const statusesQuery = usePaTaskStatuses(canAccess);
  const prioritiesQuery = usePaTaskPriorities(canAccess);
  const categoriesQuery = usePaTaskCategories(canAccess);
  const assigneesQuery = usePaTaskAssignableUsers(canAccess);

  const filters = useMemo(() => {
    const nextFilters: {
      search?: string;
      statusId?: string;
      priorityId?: string;
      categoryId?: string;
      assigneeId?: string;
      sortBy: 'updated_at';
      sortOrder: 'desc';
      pageSize: number;
    } = {
      sortBy: 'updated_at',
      sortOrder: 'desc',
      pageSize: 50,
    };

    const normalizedSearch = search.trim();
    if (normalizedSearch) nextFilters.search = normalizedSearch;
    if (statusId !== 'all') nextFilters.statusId = statusId;
    if (priorityId !== 'all') nextFilters.priorityId = priorityId;
    if (categoryId !== 'all') nextFilters.categoryId = categoryId;
    if (assigneeId !== 'all') nextFilters.assigneeId = assigneeId;

    return nextFilters;
  }, [search, statusId, priorityId, categoryId, assigneeId]);

  const tasksQuery = usePaTasks(filters, { enabled: canAccess });
  const taskRows = (tasksQuery.data?.data ?? []) as PaTaskListRow[];
  const selectedTaskQuery = usePaTask(selectedTaskId, detailOpen && Boolean(selectedTaskId));
  const selectedTask = (selectedTaskQuery.data?.data ?? null) as (PaTaskListRow & {
    attachments?: Array<{ id: string }>;
  }) | null;
  const attachmentsQuery = usePaTaskAttachments(selectedTaskId);

  const createTask = useCreatePaTask();
  const deleteTask = useDeletePaTask();
  const updateTask = useUpdatePaTask(selectedTaskId ?? '');
  const createAttachment = useCreatePaTaskAttachment(selectedTaskId ?? '');
  const deleteAttachment = useDeletePaTaskAttachment(selectedTaskId ?? '');

  const statuses = (statusesQuery.data?.data ?? []) as LookupItem[];
  const priorities = (prioritiesQuery.data?.data ?? []) as LookupItem[];
  const categories = (categoriesQuery.data?.data ?? []) as LookupItem[];

  const [createForm, setCreateForm] = useState({
    title: '',
    statusId: '',
    priorityId: '',
    categoryId: NONE_VALUE,
    assignedTo: NONE_VALUE,
    dueDate: '',
    dateGiven: '',
    blockerReason: '',
    waitingOn: '',
    notes: '',
  });

  const [editForm, setEditForm] = useState({
    title: '',
    statusId: '',
    priorityId: '',
    categoryId: NONE_VALUE,
    assignedTo: NONE_VALUE,
    dueDate: '',
    dateGiven: '',
    blockerReason: '',
    waitingOn: '',
    notes: '',
  });

  const [createAttachmentForm, setCreateAttachmentForm] = useState<{
    type: 'link' | 'file';
    title: string;
    url: string;
    file: File | null;
  }>({
    type: 'link',
    title: '',
    url: '',
    file: null,
  });

  const [categoryForm, setCategoryForm] = useState({
    id: '',
    label: '',
    color: 'zinc' as PaTaskLookupColor,
    sortOrder: 0,
  });

  const [attachmentForm, setAttachmentForm] = useState<{
    type: 'link' | 'file';
    title: string;
    url: string;
    file: File | null;
  }>({
    type: 'link',
    title: '',
    url: '',
    file: null,
  });

  const categoryColorOptions: PaTaskLookupColor[] = ['zinc', 'sky', 'amber', 'rose', 'emerald', 'orange', 'violet'];

  const accessGrants = grantsQuery.data?.data ?? [];
  const grantedUserIds = useMemo(() => new Set(accessGrants.map((grant) => grant.userId)), [accessGrants]);
  const accessCandidates = useMemo(
    () =>
      (directoryQuery.data?.data ?? []).filter((entry) => !grantedUserIds.has(entry.user_id)),
    [directoryQuery.data?.data, grantedUserIds]
  );

  async function handleGrantAccess(userId: string, fullName: string, accessLevel: 'member' | 'manager' | 'admin') {
    try {
      await grantAccess.mutateAsync({ userId, accessLevel });
      addToast({
        variant: 'success',
        title: 'PA task access granted',
        description: `${fullName} can now access the PA/EA task tracker as ${accessLevel}.`,
      });
    } catch (error) {
      addToast({
        variant: 'error',
        title: 'Failed to grant PA task access',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    }
  }

  async function handleRevokeAccess(userId: string, fullName: string) {
    try {
      await revokeAccess.mutateAsync(userId);
      addToast({
        variant: 'default',
        title: 'PA task access revoked',
        description: `${fullName} no longer has PA/EA tracker access.`,
      });
    } catch (error) {
      addToast({
        variant: 'error',
        title: 'Failed to revoke PA task access',
        description: error instanceof Error ? error.message : 'Please try again.',
      });
    }
  }

  function resetCategoryForm() {
    setCategoryForm({ id: '', label: '', color: 'zinc', sortOrder: 0 });
  }

  async function handleCategorySubmit() {
    const label = categoryForm.label.trim();
    if (!label) {
      addToast({ title: 'Category label required', description: 'Please enter a category name.', variant: 'error' });
      return;
    }

    try {
      if (categoryForm.id) {
        await updateCategory.mutateAsync({
          id: categoryForm.id,
          label,
          color: categoryForm.color,
          sortOrder: categoryForm.sortOrder,
        });
        addToast({ title: 'Category updated' });
      } else {
        await createCategory.mutateAsync({
          label,
          color: categoryForm.color,
          sortOrder: categoryForm.sortOrder,
          isDefault: false,
        });
        addToast({ title: 'Category created' });
      }
      resetCategoryForm();
    } catch (error) {
      addToast({
        title: categoryForm.id ? 'Update failed' : 'Create failed',
        description: error instanceof Error ? error.message : 'Unable to save category',
        variant: 'error',
      });
    }
  }

  async function handleCategoryDelete(id: string) {
    try {
      await deleteCategory.mutateAsync(id);
      addToast({ title: 'Category removed' });
      if (categoryForm.id === id) {
        resetCategoryForm();
      }
    } catch (error) {
      addToast({
        title: 'Delete failed',
        description: error instanceof Error ? error.message : 'Unable to delete category',
        variant: 'error',
      });
    }
  }

  async function addTaskAttachment(
    taskId: string,
    payload:
      | { attachmentType: 'link'; title: string; url: string }
      | { attachmentType: 'file'; title: string; file: File }
  ): Promise<void> {
    if (payload.attachmentType === 'file') {
      const formData = new FormData();
      formData.append('title', payload.title);
      formData.append('file', payload.file);

      const response = await fetch(`/api/pa-tasks/${taskId}/attachments`, {
        method: 'POST',
        body: formData,
      });
      const result = await response.json().catch(() => ({ error: 'Failed to add task attachment' }));
      if (!response.ok) {
        throw new Error(result.error || 'Failed to add task attachment');
      }
      return;
    }

    const response = await fetch(`/api/pa-tasks/${taskId}/attachments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const result = await response.json().catch(() => ({ error: 'Failed to add task attachment' }));
    if (!response.ok) {
      throw new Error(result.error || 'Failed to add task attachment');
    }
  }

  useEffect(() => {
    if (!createOpen) {
      return;
    }
    const defaultStatus = statuses.find((item) => item.is_default) ?? statuses[0];
    const defaultPriority = priorities.find((item) => item.is_default) ?? priorities[0];
    setCreateForm((prev) => ({
      ...prev,
      statusId: prev.statusId || defaultStatus?.id || '',
      priorityId: prev.priorityId || defaultPriority?.id || '',
    }));
  }, [createOpen, statuses, priorities]);

  useEffect(() => {
    if (!selectedTask) return;
    setEditForm({
      title: selectedTask.title,
      statusId: selectedTask.status_id,
      priorityId: selectedTask.priority_id,
      categoryId: selectedTask.category_id ?? NONE_VALUE,
      assignedTo: selectedTask.assigned_to ?? NONE_VALUE,
      dueDate: selectedTask.due_date ?? '',
      dateGiven: selectedTask.date_given ?? '',
      blockerReason: selectedTask.blocker_reason ?? '',
      waitingOn: selectedTask.waiting_on ?? '',
      notes: selectedTask.notes ?? '',
    });
  }, [selectedTask]);

  if (accessQuery.isLoading) {
    return (
      <div className="flex h-[55vh] items-center justify-center text-muted-foreground">
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        Loading PA tracker access...
      </div>
    );
  }

  if (!canAccess) {
    return (
      <EmptyState
        icon={<Paperclip className="h-12 w-12 text-muted-foreground" />}
        title="PA Tracker access required"
        description="Only users granted by admin/manager can access this module."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">PA Task Tracker</h1>
          <p className="text-sm text-muted-foreground">Centralized PA/EA task tracking with attachments and blockers.</p>
        </div>
        <div className="flex items-center gap-2">
          {canManage ? (
            <>
              <Button variant="outline" onClick={() => setAccessManagerOpen(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Grant Access
              </Button>
              <Button variant="outline" onClick={() => setCategoryManagerOpen(true)}>
                Manage Categories
              </Button>
            </>
          ) : null}
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            New Task
          </Button>
        </div>
      </div>

      <Dialog open={accessManagerOpen} onOpenChange={setAccessManagerOpen}>
        <DialogContent className="max-h-[85vh] max-w-3xl overflow-hidden">
          <DialogHeader>
            <DialogTitle>Manage PA/EA task access</DialogTitle>
            <DialogDescription>
              Grant employee or associate accounts access to the PA/EA task tracker.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-[calc(85vh-7rem)] space-y-6 overflow-y-auto pr-1">
            <section className="space-y-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Current members</h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400">
                    These users can access the PA/EA tracker without manager elevation.
                  </p>
                </div>
                <Badge variant="outline">{accessGrants.length} active</Badge>
              </div>

              {accessGrants.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border px-4 py-6 text-sm text-zinc-500 dark:text-zinc-400">
                  No PA/EA access grants yet.
                </div>
              ) : (
                <div className="space-y-2">
                  {accessGrants.map((grant) => {
                    const fullName = grant.fullName || grant.email || 'Unknown user';
                    const buttonDisabled = revokeAccess.isPending;

                    return (
                      <div
                        key={grant.userId}
                        className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card/70 px-4 py-3"
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                            {fullName}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                            <span>{grant.email ?? 'No email'}</span>
                            <span>•</span>
                            <span>{formatRole(grant.role)}</span>
                            {grant.department ? (
                              <>
                                <span>•</span>
                                <span>{grant.department}</span>
                              </>
                            ) : null}
                          </div>
                        </div>

                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => void handleRevokeAccess(grant.userId, fullName)}
                          disabled={buttonDisabled}
                        >
                          {revokeAccess.isPending ? (
                            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                          ) : (
                            <ShieldX className="mr-1.5 h-4 w-4" />
                          )}
                          Revoke
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>

            <section className="space-y-3">
              <div>
                <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">Grant access</h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Search existing employee or associate accounts and assign track access.
                </p>
              </div>

              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_190px] md:items-end">
                <div className="space-y-2">
                  <Label className="block text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                    Search
                  </Label>
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
                    <Input
                      value={accessSearch}
                      onChange={(event) => setAccessSearch(event.target.value)}
                      placeholder="Search by name, email, or role"
                      className="h-12 pl-10"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="block text-[10px] font-medium uppercase tracking-[0.2em] text-zinc-500 dark:text-zinc-400">
                    Access level
                  </Label>
                  <Select
                    value={grantAccessLevel}
                    onValueChange={(value) => setGrantAccessLevel(value as 'member' | 'manager' | 'admin')}
                  >
                    <SelectTrigger className="h-12 w-full">
                      <SelectValue placeholder="Select level" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="manager">Manager</SelectItem>
                      <SelectItem value="member">Member</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {directoryQuery.isLoading ? (
                <div className="flex min-h-32 items-center justify-center rounded-lg border border-border text-sm text-zinc-500 dark:text-zinc-400">
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Loading eligible users...
                </div>
              ) : directoryQuery.isError || grantsQuery.isError ? (
                <div className="flex min-h-32 items-center justify-center rounded-lg border border-border text-sm text-red-500">
                  Unable to load eligible users right now.
                </div>
              ) : accessCandidates.length === 0 ? (
                <div className="rounded-lg border border-dashed border-border px-4 py-6 text-sm text-zinc-500 dark:text-zinc-400">
                  No unassigned employee or associate accounts found.
                </div>
              ) : (
                <div className="space-y-2">
                  {accessCandidates.map((entry) => {
                    const fullName = entry.full_name || entry.email || 'Unknown user';

                    return (
                      <div
                        key={entry.user_id}
                        className="flex items-center justify-between gap-3 rounded-lg border border-border bg-card/70 px-4 py-3"
                      >
                        <div className="min-w-0 space-y-1">
                          <div className="truncate text-sm font-medium text-zinc-900 dark:text-zinc-50">
                            {fullName}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400">
                            <span>{entry.email ?? 'No email'}</span>
                            <span>•</span>
                            <span>{formatRole(entry.role)}</span>
                            {entry.department_name ? (
                              <>
                                <span>•</span>
                                <span>{entry.department_name}</span>
                              </>
                            ) : null}
                          </div>
                        </div>

                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => void handleGrantAccess(entry.user_id, fullName, grantAccessLevel)}
                          disabled={grantAccess.isPending}
                        >
                          {grantAccess.isPending ? (
                            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                          ) : (
                            <ShieldCheck className="mr-1.5 h-4 w-4" />
                          )}
                          Grant
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        </DialogContent>
      </Dialog>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-5">
            <div className="space-y-1.5 lg:col-span-2">
              <Label>Search</Label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} className="pl-8" placeholder="Task or description..." />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={statusId} onValueChange={setStatusId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {statuses.map((item) => <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Priority</Label>
              <Select value={priorityId} onValueChange={setPriorityId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {priorities.map((item) => <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Assigned To</Label>
              <Select value={assigneeId} onValueChange={setAssigneeId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {(assigneesQuery.data?.data ?? []).map((item) => (
                    <SelectItem key={item.userId} value={item.userId}>{item.fullName}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Category</Label>
              <Select value={categoryId} onValueChange={setCategoryId}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {categories.map((item) => <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="min-w-[1700px]">
              <TableHeader>
                <TableRow>
                  <TableHead>Date Given</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead>Task</TableHead>
                  <TableHead>Document / Email Link (if available)</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Waiting On</TableHead>
                  <TableHead>Notes / Remarks</TableHead>
                  <TableHead>Last Updated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasksQuery.isLoading ? (
                  <TableRow><TableCell colSpan={11} className="py-8 text-center text-muted-foreground">Loading tasks...</TableCell></TableRow>
                ) : taskRows.length === 0 ? (
                  <TableRow><TableCell colSpan={11} className="py-8 text-center text-muted-foreground">No tasks found.</TableCell></TableRow>
                ) : (
                  taskRows.map((task) => (
                    <TableRow
                      key={task.id}
                      className="cursor-pointer align-top"
                      onClick={() => {
                        setSelectedTaskId(task.id);
                        setDetailOpen(true);
                      }}
                    >
                      <TableCell>{formatDate(task.date_given)}</TableCell>
                      <TableCell>{formatDate(task.due_date)}</TableCell>
                      <TableCell>{task.assignee_name ?? 'Unassigned'}</TableCell>
                      <TableCell className="max-w-[320px] truncate font-medium">{task.title}</TableCell>
                      <TableCell className="max-w-[220px] align-top">
                        {task.attachments && task.attachments.length > 0 ? (
                          <div className="flex flex-col gap-1">
                            {task.attachments.slice(0, 3).map((attachment) => (
                              <div key={attachment.id} className="truncate text-xs">
                                {attachment.attachment_type === 'link' && attachment.url ? (
                                  <Link href={attachment.url} target="_blank" rel="noreferrer" className="text-primary underline" onClick={(event) => event.stopPropagation()}>
                                    {attachment.title}
                                  </Link>
                                ) : (
                                  <span className="text-muted-foreground">{attachment.title}</span>
                                )}
                              </div>
                            ))}
                            {task.attachments.length > 3 ? <span className="text-[10px] text-muted-foreground">+{task.attachments.length - 3} more</span> : null}
                          </div>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell>{task.category?.label ?? '—'}</TableCell>
                      <TableCell><Badge variant="secondary" className={task.priority ? colorClass(task.priority.color) : ''}>{task.priority?.label ?? '—'}</Badge></TableCell>
                      <TableCell><Badge className={task.status ? colorClass(task.status.color) : ''}>{task.status?.label ?? '—'}</Badge></TableCell>
                      <TableCell className="max-w-[220px] truncate">{task.waiting_on ?? '—'}</TableCell>
                      <TableCell className="max-w-[260px] truncate">{task.notes ?? '—'}</TableCell>
                      <TableCell>{formatDate(task.updated_at)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <SlidePanel open={categoryManagerOpen} onOpenChange={setCategoryManagerOpen}>
        <SlidePanelContent size="md">
          <SlidePanelHeader>
            <SlidePanelTitle>Manage Categories</SlidePanelTitle>
            <SlidePanelDescription>Keep task categories simple and easy to maintain.</SlidePanelDescription>
          </SlidePanelHeader>
          <SlidePanelBody className="space-y-5">
            <div className="space-y-2 rounded-md border p-3">
              <div className="flex items-center justify-between gap-2">
                <div className="text-sm font-medium text-muted-foreground">
                  {categoryForm.id ? 'Edit category' : 'Add category'}
                </div>
                {categoryForm.id ? (
                  <Button variant="outline" size="sm" onClick={resetCategoryForm}>Clear</Button>
                ) : null}
              </div>
              <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
                <Input
                  placeholder="Category name"
                  value={categoryForm.label}
                  onChange={(e) => setCategoryForm((p) => ({ ...p, label: e.target.value }))}
                />
                <Select
                  value={categoryForm.color}
                  onValueChange={(value) => setCategoryForm((p) => ({ ...p, color: value as PaTaskLookupColor }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {categoryColorOptions.map((color) => (
                      <SelectItem key={color} value={color}>{color.charAt(0).toUpperCase() + color.slice(1)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="text-xs text-muted-foreground">Preview</div>
                <Badge className={colorClass(categoryForm.color)}>{categoryForm.label || 'Category'}</Badge>
              </div>
              <Button
                className="w-full"
                disabled={!categoryForm.label.trim() || createCategory.isPending || updateCategory.isPending}
                onClick={() => void handleCategorySubmit()}
              >
                {categoryForm.id ? 'Save Changes' : 'Create Category'}
              </Button>
            </div>

            <div className="space-y-2">
              <div className="text-sm font-medium text-muted-foreground">Existing categories</div>
              {categories.length === 0 ? (
                <p className="text-sm text-muted-foreground">No categories yet.</p>
              ) : (
                <div className="space-y-2">
                  {categories.map((item) => (
                    <div key={item.id} className="flex items-center justify-between gap-2 rounded-md border p-2.5">
                      <button
                        type="button"
                        className="flex flex-1 items-center gap-2 text-left"
                        onClick={() => setCategoryForm({ id: item.id, label: item.label, color: item.color, sortOrder: item.sort_order ?? 0 })}
                      >
                        <Badge className={colorClass(item.color)}>{item.label}</Badge>
                      </button>
                      <Button variant="outline" size="sm" onClick={() => void handleCategoryDelete(item.id)}>
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </SlidePanelBody>
          <SlidePanelFooter>
            <Button variant="outline" onClick={() => setCategoryManagerOpen(false)}>Close</Button>
          </SlidePanelFooter>
        </SlidePanelContent>
      </SlidePanel>

      <SlidePanel open={createOpen} onOpenChange={setCreateOpen}>
        <SlidePanelContent size="lg">
          <SlidePanelHeader>
            <SlidePanelTitle>Create PA Task</SlidePanelTitle>
            <SlidePanelDescription>Use the PA/EA tracker field order for quick task entry.</SlidePanelDescription>
          </SlidePanelHeader>
          <SlidePanelBody className="space-y-5">
            <SlidePanelSection label="Core">
              <div className="space-y-1.5">
                <Label>Task</Label>
                <Textarea
                  value={createForm.title}
                  onChange={(e) => setCreateForm((p) => ({ ...p, title: e.target.value }))}
                  className="min-h-[80px] resize-y"
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Status</Label>
                  <Select value={createForm.statusId} onValueChange={(value) => setCreateForm((p) => ({ ...p, statusId: value }))}>
                    <SelectTrigger><SelectValue placeholder="Select status" /></SelectTrigger>
                    <SelectContent>{statuses.map((item) => <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Priority</Label>
                  <Select value={createForm.priorityId} onValueChange={(value) => setCreateForm((p) => ({ ...p, priorityId: value }))}>
                    <SelectTrigger><SelectValue placeholder="Select priority" /></SelectTrigger>
                    <SelectContent>{priorities.map((item) => <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Due Date</Label>
                  <Input type="date" value={createForm.dueDate} onChange={(e) => setCreateForm((p) => ({ ...p, dueDate: e.target.value }))} />
                </div>
                <div className="space-y-1.5">
                  <Label>Date Given</Label>
                  <Input type="date" value={createForm.dateGiven} onChange={(e) => setCreateForm((p) => ({ ...p, dateGiven: e.target.value }))} />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Assigned To</Label>
                  <Select value={createForm.assignedTo} onValueChange={(value) => setCreateForm((p) => ({ ...p, assignedTo: value }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_VALUE}>Unassigned</SelectItem>
                      {(assigneesQuery.data?.data ?? []).map((item) => (
                        <SelectItem key={item.userId} value={item.userId}>{item.fullName}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Category</Label>
                  <Select value={createForm.categoryId} onValueChange={(value) => setCreateForm((p) => ({ ...p, categoryId: value }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_VALUE}>None</SelectItem>
                      {categories.map((item) => <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Blockers</Label>
                <Input value={createForm.blockerReason} onChange={(e) => setCreateForm((p) => ({ ...p, blockerReason: e.target.value }))} />
              </div>
              <div className="space-y-1.5">
                <Label>Waiting On</Label>
                <Input value={createForm.waitingOn} onChange={(e) => setCreateForm((p) => ({ ...p, waitingOn: e.target.value }))} />
              </div>
              <div className="space-y-2 rounded-md border p-3">
                <div className="text-sm font-medium text-muted-foreground">Attachments</div>
                <div className="grid gap-2 sm:grid-cols-3">
                  <Select
                    value={createAttachmentForm.type}
                    onValueChange={(value: 'link' | 'file') =>
                      setCreateAttachmentForm((p) => ({ ...p, type: value }))
                    }
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="link">Link</SelectItem>
                      <SelectItem value="file">File</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="Attachment title"
                    value={createAttachmentForm.title}
                    onChange={(e) =>
                      setCreateAttachmentForm((p) => ({ ...p, title: e.target.value }))
                    }
                  />
                  {createAttachmentForm.type === 'link' ? (
                    <Input
                      key="create-link-input"
                      placeholder="https://..."
                      value={createAttachmentForm.url}
                      onChange={(e) =>
                        setCreateAttachmentForm((p) => ({ ...p, url: e.target.value }))
                      }
                    />
                  ) : (
                    <Input
                      key="create-file-input"
                      type="file"
                      onChange={(e) =>
                        setCreateAttachmentForm((p) => ({ ...p, file: e.target.files?.[0] ?? null }))
                      }
                    />
                  )}
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Notes/Remarks</Label>
                <Textarea value={createForm.notes} onChange={(e) => setCreateForm((p) => ({ ...p, notes: e.target.value }))} />
              </div>
            </SlidePanelSection>
          </SlidePanelBody>
          <SlidePanelFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button
              disabled={createTask.isPending || !createForm.title.trim() || !createForm.statusId || !createForm.priorityId}
              onClick={() => {
                void createTask
                  .mutateAsync({
                    title: createForm.title.trim(),
                    statusId: createForm.statusId,
                    priorityId: createForm.priorityId,
                    categoryId: createForm.categoryId === NONE_VALUE ? null : createForm.categoryId,
                    assignedTo: createForm.assignedTo === NONE_VALUE ? null : createForm.assignedTo,
                    dueDate: createForm.dueDate || null,
                    dateGiven: createForm.dateGiven || null,
                    blockerReason: createForm.blockerReason || null,
                    waitingOn: createForm.waitingOn || null,
                    notes: createForm.notes || null,
                  })
                  .then(async (response) => {
                    const hasAttachment =
                      createAttachmentForm.title.trim() &&
                      ((createAttachmentForm.type === 'link' && createAttachmentForm.url.trim()) ||
                        (createAttachmentForm.type === 'file' && createAttachmentForm.file));

                    if (hasAttachment) {
                      try {
                        const attachmentPayload =
                          createAttachmentForm.type === 'link'
                            ? {
                                attachmentType: 'link' as const,
                                title: createAttachmentForm.title.trim(),
                                url: createAttachmentForm.url.trim(),
                              }
                            : {
                                attachmentType: 'file' as const,
                                title: createAttachmentForm.title.trim(),
                                file: createAttachmentForm.file as File,
                              };

                        await addTaskAttachment(response.data.id, attachmentPayload);
                      } catch (error) {
                        addToast({
                          title: 'Task created but attachment could not be added',
                          description: error instanceof Error ? error.message : 'Unable to attach the file or link',
                        });
                      }
                    }

                    addToast({ title: 'Task created', description: 'PA task has been added.' });
                    setCreateOpen(false);
                    setCreateForm({
                      title: '',
                      statusId: '',
                      priorityId: '',
                      categoryId: NONE_VALUE,
                      assignedTo: NONE_VALUE,
                      dueDate: '',
                      dateGiven: '',
                      blockerReason: '',
                      waitingOn: '',
                      notes: '',
                    });
                    setCreateAttachmentForm({ type: 'link', title: '', url: '', file: null });
                  })
                  .catch((error: unknown) => {
                    addToast({
                      title: 'Create failed',
                      description: error instanceof Error ? error.message : 'Unable to create task',
                      variant: 'error',
                    });
                  });
              }}
            >
              {createTask.isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create Task
            </Button>
          </SlidePanelFooter>
        </SlidePanelContent>
      </SlidePanel>

      <SlidePanel open={detailOpen} onOpenChange={setDetailOpen}>
        <SlidePanelContent size="xl">
          <SlidePanelHeader>
            <SlidePanelTitle>Task Details</SlidePanelTitle>
            <SlidePanelDescription>Update status, blockers, notes, and attachments.</SlidePanelDescription>
          </SlidePanelHeader>
          <SlidePanelBody className="space-y-6">
            {!selectedTask ? (
              <div className="text-sm text-muted-foreground">Loading task...</div>
            ) : (
              <>
                <SlidePanelSection label="Task">
                  <div className="space-y-1.5">
                    <Label>Task</Label>
                    <Textarea
                      value={editForm.title}
                      onChange={(e) => setEditForm((p) => ({ ...p, title: e.target.value }))}
                      className="min-h-[120px] resize-y"
                    />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Status</Label>
                      <Select value={editForm.statusId} onValueChange={(value) => setEditForm((p) => ({ ...p, statusId: value }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{statuses.map((item) => <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Priority</Label>
                      <Select value={editForm.priorityId} onValueChange={(value) => setEditForm((p) => ({ ...p, priorityId: value }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>{priorities.map((item) => <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Due Date</Label>
                      <Input type="date" value={editForm.dueDate} onChange={(e) => setEditForm((p) => ({ ...p, dueDate: e.target.value }))} />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Date Given</Label>
                      <Input type="date" value={editForm.dateGiven} onChange={(e) => setEditForm((p) => ({ ...p, dateGiven: e.target.value }))} />
                    </div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label>Assigned To</Label>
                      <Select value={editForm.assignedTo} onValueChange={(value) => setEditForm((p) => ({ ...p, assignedTo: value }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE_VALUE}>Unassigned</SelectItem>
                          {(assigneesQuery.data?.data ?? []).map((item) => (
                            <SelectItem key={item.userId} value={item.userId}>{item.fullName}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>Category</Label>
                      <Select value={editForm.categoryId} onValueChange={(value) => setEditForm((p) => ({ ...p, categoryId: value }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={NONE_VALUE}>None</SelectItem>
                          {categories.map((item) => <SelectItem key={item.id} value={item.id}>{item.label}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Blockers</Label>
                    <Input value={editForm.blockerReason} onChange={(e) => setEditForm((p) => ({ ...p, blockerReason: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Waiting On</Label>
                    <Input value={editForm.waitingOn} onChange={(e) => setEditForm((p) => ({ ...p, waitingOn: e.target.value }))} />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Notes/Remarks</Label>
                    <Textarea value={editForm.notes} onChange={(e) => setEditForm((p) => ({ ...p, notes: e.target.value }))} />
                  </div>
                </SlidePanelSection>

                <SlidePanelSection label="Attachments">
                  <div className="space-y-2 rounded-md border p-3">
                    <div className="grid gap-2 sm:grid-cols-3">
                      <Select value={attachmentForm.type} onValueChange={(value: 'link' | 'file') => setAttachmentForm((p) => ({ ...p, type: value }))}>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="link">Link</SelectItem>
                          <SelectItem value="file">File</SelectItem>
                        </SelectContent>
                      </Select>
                      <Input placeholder="Title" value={attachmentForm.title} onChange={(e) => setAttachmentForm((p) => ({ ...p, title: e.target.value }))} />
                      {attachmentForm.type === 'link' ? (
                        <Input
                          key="detail-link-input"
                          placeholder="https://..."
                          value={attachmentForm.url}
                          onChange={(e) => setAttachmentForm((p) => ({ ...p, url: e.target.value }))}
                        />
                      ) : (
                        <Input
                          key="detail-file-input"
                          type="file"
                          onChange={(e) => setAttachmentForm((p) => ({ ...p, file: e.target.files?.[0] ?? null }))}
                        />
                      )}
                    </div>
                    <Button
                      size="sm"
                      disabled={createAttachment.isPending || !attachmentForm.title.trim() || (attachmentForm.type === 'link' ? !attachmentForm.url.trim() : !attachmentForm.file)}
                      onClick={() => {
                        const request =
                          attachmentForm.type === 'link'
                            ? createAttachment.mutateAsync({
                                attachmentType: 'link',
                                title: attachmentForm.title.trim(),
                                url: attachmentForm.url.trim(),
                              })
                            : createAttachment.mutateAsync({
                                attachmentType: 'file',
                                title: attachmentForm.title.trim(),
                                file: attachmentForm.file as File,
                              });

                        void request
                          .then(() => {
                            addToast({ title: 'Attachment added' });
                            setAttachmentForm({ type: 'link', title: '', url: '', file: null });
                          })
                          .catch((error: unknown) => {
                            addToast({
                              title: 'Attachment failed',
                              description: error instanceof Error ? error.message : 'Unable to add attachment',
                              variant: 'error',
                            });
                          });
                      }}
                    >
                      Add Attachment
                    </Button>
                  </div>

                  <div className="space-y-2">
                    {(attachmentsQuery.data?.data ?? []).length === 0 ? (
                      <p className="text-sm text-muted-foreground">No attachments yet.</p>
                    ) : (
                      (attachmentsQuery.data?.data ?? []).map((attachment) => (
                        <div key={attachment.id} className="flex items-center justify-between rounded-md border p-3">
                          <div>
                            <p className="text-sm font-medium">{attachment.title}</p>
                            {attachment.attachment_type === 'link' && attachment.url ? (
                              <Link href={attachment.url} target="_blank" className="text-xs text-primary underline">
                                Open link
                              </Link>
                            ) : attachment.signed_url ? (
                              <Link href={attachment.signed_url} target="_blank" className="text-xs text-primary underline">
                                Download file
                              </Link>
                            ) : (
                              <p className="text-xs text-muted-foreground">File unavailable</p>
                            )}
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              void deleteAttachment
                                .mutateAsync(attachment.id)
                                .catch((error: unknown) =>
                                  addToast({
                                    title: 'Delete failed',
                                    description: error instanceof Error ? error.message : 'Unable to remove attachment',
                                    variant: 'error',
                                  })
                                );
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))
                    )}
                  </div>
                </SlidePanelSection>
              </>
            )}
          </SlidePanelBody>
          <SlidePanelFooter className="justify-between">
            <Button
              variant="destructive"
              disabled={!selectedTaskId || deleteTask.isPending}
              onClick={() => {
                if (!selectedTaskId) return;
                void deleteTask
                  .mutateAsync(selectedTaskId)
                  .then(() => {
                    addToast({ title: 'Task deleted' });
                    setDetailOpen(false);
                    setSelectedTaskId(null);
                  })
                  .catch((error: unknown) =>
                    addToast({
                      title: 'Delete failed',
                      description: error instanceof Error ? error.message : 'Unable to delete task',
                      variant: 'error',
                    })
                  );
              }}
            >
              Delete
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={() => setDetailOpen(false)}>Close</Button>
              <Button
                disabled={updateTask.isPending || !selectedTaskId || !editForm.title.trim()}
                onClick={() => {
                  if (!selectedTaskId) return;
                  void updateTask
                    .mutateAsync({
                      title: editForm.title.trim(),
                      statusId: editForm.statusId,
                      priorityId: editForm.priorityId,
                      categoryId: editForm.categoryId === NONE_VALUE ? null : editForm.categoryId,
                      assignedTo: editForm.assignedTo === NONE_VALUE ? null : editForm.assignedTo,
                      dueDate: editForm.dueDate || null,
                      dateGiven: editForm.dateGiven || null,
                      blockerReason: editForm.blockerReason || null,
                      waitingOn: editForm.waitingOn || null,
                      notes: editForm.notes || null,
                    })
                    .then(() => addToast({ title: 'Task updated' }))
                    .catch((error: unknown) =>
                      addToast({
                        title: 'Update failed',
                        description: error instanceof Error ? error.message : 'Unable to update task',
                        variant: 'error',
                      })
                    );
                }}
              >
                Save Changes
              </Button>
            </div>
          </SlidePanelFooter>
        </SlidePanelContent>
      </SlidePanel>
    </div>
  );
}
