'use client';

import { SortableTableHead } from '@/components/data-display/SortableTableHead';
import { StatCard, StatCardGrid } from '@/components/data-display/StatCard';
import { TaskKanbanBoard, type TaskStatusDB } from '@/components/tasks';
import { SuperAdminTicketsPanel } from '@/components/tickets/SuperAdminTicketsPanel';
import { useCreateTask } from '@/hooks/useCreateTask';
import { useEmployees } from '@/hooks/useEmployees';
import { useTaskAssignees } from '@/hooks/useTaskAssignees';
import { useTasks, type TaskRecord } from '@/hooks/useTasks';
import { useTasksRealtime } from '@/hooks/useTasksRealtime';
import { useTableSort } from '@/hooks/useTableSort';
import type { TaskFilters } from '@/lib/query-keys';
import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogFooter,
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
  Skeleton,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
  TaskPriorityBadge,
  TaskStatusBadge,
  Textarea,
  useToast,
} from '@hr-portal/ui';
import type { TaskPriority, TaskStatus } from '@hr-portal/ui';
import { Calendar, CheckCircle2, ClipboardList, Clock, LayoutGrid, List, Loader2, Plus, Search, X, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { type FormEvent, useCallback, useEffect, useMemo, useState } from 'react';

type TaskCategoryValue = (typeof TASK_CATEGORY_OPTIONS)[number]['value'];

const TASK_CATEGORY_OPTIONS = [
  { value: 'launch', label: 'Launch' },
  { value: 'optimization', label: 'Optimization' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'research', label: 'Research' },
  { value: 'administrative', label: 'Administrative' },
  { value: 'other', label: 'Other' },
] as const;

const PRESET_TAGS = [
  'urgent',
  'high-priority',
  'onboarding',
  'documentation',
  'review',
  'follow-up',
  'blocked',
  'compliance',
  'training',
  'deadline',
  'meeting',
  'Q1',
  'Q2',
  'Q3',
  'Q4',
] as const;

function TagChipsInput({
  value,
  onChange,
}: {
  value: string[];
  onChange: (tags: string[]) => void;
}) {
  const [customInput, setCustomInput] = useState('');

  const togglePreset = (tag: string): void => {
    if (value.includes(tag)) {
      onChange(value.filter((t) => t !== tag));
    } else {
      onChange([...value, tag]);
    }
  };

  const addCustom = (raw: string): void => {
    const trimmed = raw.trim().toLowerCase().replace(/\s+/g, '-');
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setCustomInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      if (customInput.trim()) addCustom(customInput);
    } else if (e.key === 'Backspace' && !customInput && value.length > 0) {
      const last = value[value.length - 1];
      if (last) onChange(value.slice(0, -1));
    }
  };

  const unselectedPresets = PRESET_TAGS.filter((t) => !value.includes(t));

  return (
    <div className="space-y-3">
      {/* Selected chips */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-slate-100 dark:bg-slate-950/50 text-slate-700 dark:text-slate-300 text-xs px-2.5 py-1 font-medium"
            >
              #{tag}
              <button
                type="button"
                onClick={() => onChange(value.filter((t) => t !== tag))}
                className="hover:text-slate-900 dark:hover:text-white transition-colors ml-0.5"
                aria-label={`Remove ${tag}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Preset suggestion chips */}
      {unselectedPresets.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {unselectedPresets.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => togglePreset(tag)}
              className="inline-flex items-center gap-0.5 rounded-full border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400 text-xs px-2.5 py-1 hover:border-slate-400 hover:text-slate-700 dark:hover:border-slate-500 dark:hover:text-slate-400 transition-colors"
            >
              + {tag}
            </button>
          ))}
        </div>
      )}

      {/* Custom tag input */}
      <div className="flex items-center gap-2">
        <Input
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a custom tag and press Enter…"
          className="h-8 text-xs"
        />
        {customInput.trim() && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addCustom(customInput)}
            className="h-8 text-xs shrink-0"
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Add
          </Button>
        )}
      </div>
    </div>
  );
}

type ViewMode = 'list' | 'board';

const formatDate = (value: string | null | undefined): string => {
  if (!value) return '—';
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '—';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
};

export default function TaskManagementPage() {
  const searchParams = useSearchParams();
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<ViewMode>('board');
  const [activeManagementTab, setActiveManagementTab] = useState<'tasks' | 'tickets'>(
    searchParams.get('tab') === 'tickets' ? 'tickets' : 'tasks'
  );
  const { addToast } = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState<string>('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [category, setCategory] = useState<TaskCategoryValue | ''>('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [dueDate, setDueDate] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState('');

  const taskFilters: TaskFilters = {
    page: 1,
    pageSize: 100,
  };

  if (search) {
    taskFilters.search = search;
  }
  if (categoryFilter !== 'all') {
    taskFilters.category = categoryFilter;
  }
  const normalizedTagFilter = tagFilter
    .split(',')
    .map((tag) => tag.trim())
    .filter(Boolean);
  if (normalizedTagFilter.length > 0) {
    taskFilters.tags = normalizedTagFilter;
  }

  const { data: tasksData, isLoading, error } = useTasks(taskFilters);
  const { data: assigneesData, isLoading: assigneesLoading } = useTaskAssignees(true);
  const { data: employeesData, isLoading: employeesLoading } = useEmployees({
    page: 1,
    pageSize: 200,
  });
  const createTask = useCreateTask();

  useTasksRealtime({ scope: 'all' });

  const tasks = tasksData?.data || [];
  const assignees = assigneesData?.data || [];

  const employeeFallbackAssignees = useMemo(() => {
    const employees = employeesData?.data || [];
    return employees
      .map((employee) => ({
        id: employee.user_id,
        role: employee.employment_type === 'intern' ? ('intern' as const) : ('employee' as const),
        name: `${employee.first_name} ${employee.last_name}`,
        email: employee.company_email || employee.personal_email || null,
      }))
      .filter((option) => Boolean(option.id));
  }, [employeesData?.data]);

  const effectiveAssignees = assignees.length > 0 ? assignees : employeeFallbackAssignees;

  const assigneeById = useMemo(() => {
    return new Map(effectiveAssignees.map((assignee) => [assignee.id, assignee]));
  }, [effectiveAssignees]);

  // Stats for header badges
  const taskStats = useMemo(() => {
    return {
      total: tasks.length,
      pending: tasks.filter((t) => t.status === 'pending').length,
      in_progress: tasks.filter((t) => t.status === 'in_progress').length,
      cancelled: tasks.filter((t) => t.status === 'cancelled').length,
      completed: tasks.filter((t) => t.status === 'completed').length,
    };
  }, [tasks]);

  // Handler for drag-and-drop status change in Kanban board
  const handleStatusChange = useCallback(async (taskId: string, newStatus: TaskStatusDB) => {
    const response = await fetch(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to update task');
    }
  }, []);

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAssignmentError(null);

    try {
      await createTask.mutateAsync({
        title,
        description: description || undefined,
        assignedTo: assignedTo || undefined,
        priority,
        status: 'pending',
        category: category || undefined,
        tags: selectedTags,
        dueDate: dueDate || undefined,
      });

      addToast({
        title: 'Task created',
        description: 'Task has been assigned successfully',
        variant: 'success',
      });

      setCreateOpen(false);
      setTitle('');
      setDescription('');
      setAssignedTo('');
      setPriority('medium');
      setCategory('');
      setSelectedTags([]);
      setDueDate('');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to create task';
      setAssignmentError(message);
      addToast({
        title: 'Error',
        description: message,
        variant: 'error',
      });
    }
  };

  useEffect(() => {
    setActiveManagementTab(searchParams.get('tab') === 'tickets' ? 'tickets' : 'tasks');
  }, [searchParams]);

  return (
    <div className="space-y-6 p-3">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Task Management</h1>
          <p className="text-sm text-muted-foreground">
            Oversee staff tasks and triage employee support tickets.
          </p>
        </div>
        {activeManagementTab === 'tasks' ? (
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Task
          </Button>
        ) : null}
      </div>

      <Tabs
        value={activeManagementTab}
        onValueChange={(value) => setActiveManagementTab(value as 'tasks' | 'tickets')}
        className="space-y-6"
      >
        <TabsList>
          <TabsTrigger value="tasks">Tasks</TabsTrigger>
          <TabsTrigger value="tickets">Tickets</TabsTrigger>
        </TabsList>

        <TabsContent value="tasks" className="space-y-6">
          <StatCardGrid columns={5}>
            <StatCard
              label="All"
              value={taskStats.total}
              icon={<ClipboardList className="h-4 w-4" strokeWidth={1.5} />}
            />
            <StatCard
              label="Pending"
              value={taskStats.pending}
              icon={<Clock className="h-4 w-4" strokeWidth={1.5} />}
            />
            <StatCard
              label="In Progress"
              value={taskStats.in_progress}
              icon={<Loader2 className="h-4 w-4" strokeWidth={1.5} />}
            />
            <StatCard
              label="Cancelled"
              value={taskStats.cancelled}
              icon={<XCircle className="h-4 w-4" strokeWidth={1.5} />}
            />
            <StatCard
              label="Completed"
              value={taskStats.completed}
              icon={<CheckCircle2 className="h-4 w-4" strokeWidth={1.5} />}
            />
          </StatCardGrid>

          <div>
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search tasks..."
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="pl-10 bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
                />
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                  <SelectTrigger className="w-[170px]">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Categories</SelectItem>
                    {TASK_CATEGORY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Input
                  value={tagFilter}
                  onChange={(event) => setTagFilter(event.target.value)}
                  placeholder="Tags: onboarding, urgent"
                  className="w-[220px] bg-white dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700"
                />

                <div className="inline-flex items-center rounded-lg border border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/50 p-0.5">
                  <button
                    type="button"
                    onClick={() => setActiveView('list')}
                    className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      activeView === 'list'
                        ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 shadow-sm'
                        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                    }`}
                  >
                    <List className="h-3.5 w-3.5" strokeWidth={1.5} />
                    List
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveView('board')}
                    className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                      activeView === 'board'
                        ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-zinc-50 shadow-sm'
                        : 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-300'
                    }`}
                  >
                    <LayoutGrid className="h-3.5 w-3.5" strokeWidth={1.5} />
                    Board
                  </button>
                </div>
              </div>
            </div>

            {activeView === 'list' && <div className="mt-4">
              {isLoading ? (
                <TasksLoadingSkeleton viewMode="list" />
              ) : error ? (
                <Card>
                  <CardContent className="p-6">
                    <EmptyState
                      icon={ClipboardList}
                      title="Failed to load tasks"
                      description="The task list could not be retrieved. Refresh and try again."
                      size="sm"
                    />
                  </CardContent>
                </Card>
              ) : (
                <TaskListView tasks={tasks} assigneeById={assigneeById} />
              )}
            </div>}

            {activeView === 'board' && <div className="mt-4">
              {isLoading ? (
                <TasksLoadingSkeleton viewMode="board" />
              ) : error ? (
                <Card>
                  <CardContent className="p-6">
                    <EmptyState
                      icon={ClipboardList}
                      title="Failed to load tasks"
                      description="The task board could not be retrieved. Refresh and try again."
                      size="sm"
                    />
                  </CardContent>
                </Card>
              ) : tasks.length === 0 ? (
                <Card>
                  <CardContent className="py-12">
                    <EmptyState
                      icon={ClipboardList}
                      title="No tasks found"
                      description="Create your first task to get started."
                      size="sm"
                    />
                  </CardContent>
                </Card>
              ) : (
                <TaskKanbanBoard
                  tasks={tasks}
                  onStatusChange={handleStatusChange}
                  linkPrefix="/super-admin/tasks"
                />
              )}
            </div>}
          </div>
        </TabsContent>

        <TabsContent value="tickets">
          <SuperAdminTicketsPanel />
        </TabsContent>
      </Tabs>

      {/* Create Task Modal */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Task</DialogTitle>
          </DialogHeader>
          <form className="space-y-5" onSubmit={handleCreate}>
            {/* Title - Required */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">
                Title <span className="text-red-500">*</span>
              </Label>
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Enter task title"
                required
              />
            </div>

            {/* Description - Optional */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Description</Label>
              <Textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="Add a description for this task..."
                rows={3}
              />
            </div>

            {/* Grid: Priority + Category + Due Date */}
            <div className="grid gap-4 sm:grid-cols-3">
              {/* Priority - Required */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">
                  Priority <span className="text-red-500">*</span>
                </Label>
                <Select
                  value={priority}
                  onValueChange={(value) =>
                    setPriority(value as 'low' | 'medium' | 'high' | 'urgent')
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-green-500" />
                        Low
                      </span>
                    </SelectItem>
                    <SelectItem value="medium">
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-amber-500" />
                        Medium
                      </span>
                    </SelectItem>
                    <SelectItem value="high">
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-orange-500" />
                        High
                      </span>
                    </SelectItem>
                    <SelectItem value="urgent">
                      <span className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-red-500" />
                        Urgent
                      </span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-medium">Category</Label>
                <Select
                  value={category || 'uncategorized'}
                  onValueChange={(value) =>
                    setCategory(value === 'uncategorized' ? '' : (value as TaskCategoryValue))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="uncategorized">No category</SelectItem>
                    {TASK_CATEGORY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Due Date - Optional */}
              <div className="space-y-1.5">
                <Label className="text-sm font-medium">
                  <Calendar className="mr-1 inline-block h-3.5 w-3.5" />
                  Due Date
                </Label>
                <Input
                  type="date"
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                  min={new Date().toISOString().slice(0, 10)}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Tags</Label>
              <TagChipsInput value={selectedTags} onChange={setSelectedTags} />
            </div>

            {/* Assignee - Optional */}
            <div className="space-y-1.5">
              <Label className="text-sm font-medium">Assign To</Label>
              <Select
                value={assignedTo || 'unassigned'}
                onValueChange={(value) => setAssignedTo(value === 'unassigned' ? '' : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select an assignee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="unassigned">
                    <span className="text-muted-foreground">Unassigned</span>
                  </SelectItem>
                  {effectiveAssignees.map((assignee) => (
                    <SelectItem key={assignee.id} value={assignee.id}>
                      <span className="flex items-center gap-2">
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-medium text-slate-700 dark:bg-slate-900 dark:text-slate-300">
                          {assignee.name
                            .split(' ')
                            .map((n: string) => n[0])
                            .join('')
                            .slice(0, 2)}
                        </span>
                        {assignee.name}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!(assigneesLoading || employeesLoading) && effectiveAssignees.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No assignees available. Ensure employee accounts exist.
                </p>
              )}
            </div>

            {assignmentError && <p className="text-sm text-red-600">{assignmentError}</p>}

            <DialogFooter className="gap-2 sm:gap-0">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={
                  createTask.isPending || assigneesLoading || employeesLoading || !title.trim()
                }
              >
                <Plus className="mr-2 h-4 w-4" />
                {createTask.isPending ? 'Creating...' : 'Create Task'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ============================================================================
// Sub-Components
// ============================================================================

interface AssigneeInfo {
  id: string;
  name: string;
  email: string | null;
  role: 'employee' | 'intern';
}

function TasksLoadingSkeleton({ viewMode }: { viewMode: ViewMode }) {
  if (viewMode === 'board') {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((col) => (
          <div key={`col-${col}`} className="space-y-3">
            <Skeleton className="h-10 w-full rounded-md" />
            <div className="space-y-2 rounded-md border border-zinc-200 p-2 dark:border-zinc-800">
              <Skeleton className="h-24 w-full" />
              <Skeleton className="h-24 w-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <div className="space-y-2 p-4">
          {[1, 2, 3, 4, 5].map((n) => (
            <Skeleton key={`skeleton-row-${n}`} className="h-12 w-full" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function TaskListView({
  tasks,
  assigneeById,
}: {
  tasks: Array<TaskRecord>;
  assigneeById: Map<string, AssigneeInfo>;
}) {
  const router = useRouter();
  const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
  const statusOrder: Record<string, number> = { pending: 0, in_progress: 1, completed: 2, cancelled: 3 };

  const { sortColumn, sortDirection, handleSort, sortItems } = useTableSort({ initialColumn: 'due_date' });

  const sortedTasks = sortItems(tasks, {
    title: (t) => t.title.toLowerCase(),
    assignee: (t) => {
      const a = t.assigned_to ? assigneeById.get(t.assigned_to) : null;
      return (a?.name || t.assignee_name || 'Unassigned').toLowerCase();
    },
    priority: (t) => priorityOrder[t.priority] ?? 99,
    status: (t) => statusOrder[t.status] ?? 99,
    category: (t) => t.category ?? '',
    due_date: (t) => t.due_date ?? '',
  });

  const sortHeadProps = { sortColumn, sortDirection, onSort: handleSort };

  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-sm text-muted-foreground">
          No tasks found. Create your first task to get started.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <SortableTableHead column="title" {...sortHeadProps}>Task</SortableTableHead>
              <SortableTableHead column="assignee" {...sortHeadProps}>Assignee</SortableTableHead>
              <SortableTableHead column="priority" {...sortHeadProps}>Priority</SortableTableHead>
              <SortableTableHead column="status" {...sortHeadProps}>Status</SortableTableHead>
              <SortableTableHead column="due_date" {...sortHeadProps}>Due Date</SortableTableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTasks.map((task) => {
              const assignee = task.assigned_to ? assigneeById.get(task.assigned_to) : null;
              const assigneeName = assignee?.name || task.assignee_name || 'Unassigned';
              return (
                <TableRow key={task.id} className="cursor-pointer hover:bg-muted/50 transition-colors" onDoubleClick={() => router.push(`/super-admin/tasks/${task.id}`)}>
                  <TableCell>
                    <p className="text-sm font-medium">{task.title}</p>
                    {task.description && (
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                        {task.description}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {task.category && (
                        <Badge variant="outline" className="text-[11px] capitalize">
                          {task.category.replace(/_/g, ' ')}
                        </Badge>
                      )}
                      {task.tags?.slice(0, 2).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-[11px]">
                          #{tag}
                        </Badge>
                      ))}
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="flex items-center gap-2 text-sm">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-zinc-200 text-xs font-medium dark:bg-zinc-700">
                        {assigneeName
                          .split(' ')
                          .map((n: string) => n[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase()}
                      </span>
                      {assigneeName}
                    </span>
                  </TableCell>
                  <TableCell>
                    <TaskPriorityBadge priority={task.priority as TaskPriority} size="sm" />
                  </TableCell>
                  <TableCell>
                    <TaskStatusBadge status={task.status as TaskStatus} size="sm" dueDate={task.due_date ?? undefined} />
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDate(task.due_date)}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/super-admin/tasks/${task.id}`}>View</Link>
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
