'use client';

import { TaskKanbanBoard, type TaskStatusDB } from '@/components/tasks';
import { useCreateTask } from '@/hooks/useCreateTask';
import { useEmployees } from '@/hooks/useEmployees';
import { useTaskAssignees } from '@/hooks/useTaskAssignees';
import { useTasks, type TaskRecord } from '@/hooks/useTasks';
import { useTasksRealtime } from '@/hooks/useTasksRealtime';
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
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Skeleton,
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
  TaskPriorityBadge,
  TaskStatusBadge,
  Textarea,
  useToast,
} from '@hr-portal/ui';
import type { TaskPriority, TaskStatus } from '@hr-portal/ui';
import { Calendar, LayoutGrid, List, Plus } from 'lucide-react';
import Link from 'next/link';
import { type FormEvent, useCallback, useMemo, useState } from 'react';

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
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [assignmentError, setAssignmentError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<ViewMode>('board');
  const { addToast } = useToast();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState<string>('');
  const [priority, setPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [dueDate, setDueDate] = useState('');

  const taskFilters: TaskFilters = {
    page: 1,
    pageSize: 100,
  };

  if (search) {
    taskFilters.search = search;
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Task Management</h1>
          <p className="text-sm text-muted-foreground">
            Create and assign tasks to employees and interns
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Task
        </Button>
      </div>

      {/* Stats Overview */}
      <div className="flex flex-wrap gap-2">
        <Badge variant="secondary">
          All <span className="ml-1 font-semibold">{taskStats.total}</span>
        </Badge>
        <Badge variant="secondary">
          Pending <span className="ml-1 font-semibold text-amber-600">{taskStats.pending}</span>
        </Badge>
        <Badge variant="secondary">
          In Progress{' '}
          <span className="ml-1 font-semibold text-indigo-600">{taskStats.in_progress}</span>
        </Badge>
        <Badge variant="secondary">
          Cancelled <span className="ml-1 font-semibold text-red-600">{taskStats.cancelled}</span>
        </Badge>
        <Badge variant="secondary">
          Completed <span className="ml-1 font-semibold text-green-600">{taskStats.completed}</span>
        </Badge>
      </div>

      {/* View Tabs */}
      <Tabs value={activeView} onValueChange={(v) => setActiveView(v as ViewMode)}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <TabsList>
            <TabsTrigger value="list" className="gap-1.5">
              <List className="h-4 w-4" />
              List View
            </TabsTrigger>
            <TabsTrigger value="board" className="gap-1.5">
              <LayoutGrid className="h-4 w-4" />
              Board View
            </TabsTrigger>
          </TabsList>

          {/* Search */}
          <Input
            placeholder="Search tasks..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            className="max-w-xs"
          />
        </div>

        {/* List View */}
        <TabsContent value="list" className="mt-4">
          {isLoading ? (
            <TasksLoadingSkeleton viewMode="list" />
          ) : error ? (
            <Card>
              <CardContent className="p-6 text-sm text-red-600">Failed to load tasks.</CardContent>
            </Card>
          ) : (
            <TaskListView tasks={tasks} assigneeById={assigneeById} />
          )}
        </TabsContent>

        {/* Board View */}
        <TabsContent value="board" className="mt-4">
          {isLoading ? (
            <TasksLoadingSkeleton viewMode="board" />
          ) : error ? (
            <Card>
              <CardContent className="p-6 text-sm text-red-600">Failed to load tasks.</CardContent>
            </Card>
          ) : tasks.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-sm text-muted-foreground">
                No tasks found. Create your first task to get started.
              </CardContent>
            </Card>
          ) : (
            <TaskKanbanBoard
              tasks={tasks}
              onStatusChange={handleStatusChange}
              linkPrefix="/super-admin/tasks"
            />
          )}
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

            {/* Grid: Priority + Due Date */}
            <div className="grid gap-4 sm:grid-cols-2">
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
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-xs font-medium text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300">
                          {assignee.name
                            .split(' ')
                            .map((n) => n[0])
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
              <TableHead>Task</TableHead>
              <TableHead>Assignee</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tasks.map((task) => {
              const assignee = task.assigned_to ? assigneeById.get(task.assigned_to) : null;
              const assigneeName = assignee?.name || task.assignee_name || 'Unassigned';
              return (
                <TableRow key={task.id}>
                  <TableCell>
                    <p className="text-sm font-medium">{task.title}</p>
                    {task.description && (
                      <p className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">
                        {task.description}
                      </p>
                    )}
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
                    <TaskStatusBadge status={task.status as TaskStatus} size="sm" />
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
