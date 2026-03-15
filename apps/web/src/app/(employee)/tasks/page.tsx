'use client';

import { TaskKanbanBoard, type TaskStatusDB } from '@/components/tasks';
import { useAuth } from '@/contexts/AuthContext';
import { useTasks } from '@/hooks/useTasks';
import { useTasksRealtime } from '@/hooks/useTasksRealtime';
import { formatDate } from '@/lib/format';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Input,
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
  TaskPriorityBadge,
  TaskStatusBadge,
  useToast,
} from '@hr-portal/ui';
import type { TaskPriority, TaskStatus } from '@hr-portal/ui';
import { SortableTableHead } from '@/components/data-display/SortableTableHead';
import { useTableSort } from '@/hooks/useTableSort';
import { ClipboardList, LayoutGrid, List, Search } from 'lucide-react';
import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';

const TASK_CATEGORY_OPTIONS = [
  { value: 'launch', label: 'Launch' },
  { value: 'optimization', label: 'Optimization' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'research', label: 'Research' },
  { value: 'administrative', label: 'Administrative' },
  { value: 'other', label: 'Other' },
] as const;

export default function MyTasksPage() {
  const { user } = useAuth();
  const { addToast } = useToast();
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState<string>('all');
  const [priority, setPriority] = useState<string>('all');
  const [category, setCategory] = useState<string>('all');
  const [tagFilter, setTagFilter] = useState('');
  const [activeView, setActiveView] = useState<'list' | 'board'>('list');
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null);

  const taskFilters = {
    ...(search ? { search } : {}),
    ...(status !== 'all'
      ? { status: status as 'pending' | 'in_progress' | 'completed' | 'cancelled' }
      : {}),
    ...(priority !== 'all' ? { priority: priority as 'low' | 'medium' | 'high' | 'urgent' } : {}),
    ...(category !== 'all' ? { category } : {}),
    ...(tagFilter.trim()
      ? {
          tags: tagFilter
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean),
        }
      : {}),
    ...(user?.id ? { assigneeId: user.id } : {}),
    page: 1,
    pageSize: 100,
  };

  const { data, isLoading, error } = useTasks(taskFilters, { enabled: Boolean(user?.id) });

  useTasksRealtime({
    scope: 'assigned',
    ...(user?.id ? { userId: user.id } : {}),
    enabled: Boolean(user?.id),
  });

  const tasks = data?.data || [];

  const stats = useMemo(() => {
    return {
      total: tasks.length,
      pending: tasks.filter((task) => task.status === 'pending').length,
      inProgress: tasks.filter((task) => task.status === 'in_progress').length,
      completed: tasks.filter((task) => task.status === 'completed').length,
    };
  }, [tasks]);

  // Handler for status change in Kanban board
  const handleStatusChange = useCallback(async (taskId: string, newStatus: TaskStatusDB) => {
    setUpdatingTaskId(taskId);
    try {
      const response = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update task');
      }
      addToast({ title: 'Task status updated', description: `Changed to ${newStatus.replace('_', ' ')}`, variant: 'success' });
    } catch (err) {
      addToast({ title: 'Failed to update task', description: err instanceof Error ? err.message : 'An error occurred', variant: 'error' });
    } finally {
      setUpdatingTaskId(null);
    }
  }, [addToast]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">My Tasks</h1>
          <p className="text-sm text-muted-foreground">Track and update your assigned tasks</p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-amber-600">{stats.pending}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">In Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-indigo-600">{stats.inProgress}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Completed</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">{stats.completed}</p>
          </CardContent>
        </Card>
      </div>

      {/* View Tabs */}
      <div>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
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

          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="w-[200px] pl-10"
                placeholder="Search tasks..."
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </div>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
                <SelectItem value="urgent">Urgent</SelectItem>
              </SelectContent>
            </Select>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                {TASK_CATEGORY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              className="w-[220px]"
              placeholder="Tags: onboarding, urgent"
              value={tagFilter}
              onChange={(event) => setTagFilter(event.target.value)}
            />
          </div>
        </div>

        {/* List View */}
        {activeView === 'list' && <div className="mt-4">
          {isLoading ? (
            <TaskListSkeleton />
          ) : error ? (
            <Card>
              <CardContent className="p-6 text-sm text-red-600">Failed to load tasks.</CardContent>
            </Card>
          ) : (
            <TaskListView tasks={tasks} />
          )}
        </div>}

        {/* Board View */}
        {activeView === 'board' && <div className="mt-4">
          {isLoading ? (
            <TaskBoardSkeleton />
          ) : error ? (
            <Card>
              <CardContent className="p-6 text-sm text-red-600">Failed to load tasks.</CardContent>
            </Card>
          ) : tasks.length === 0 ? (
            <Card>
              <CardContent className="py-12">
                <EmptyState
                  icon={ClipboardList}
                  title="No tasks assigned"
                  description="You don't have any tasks assigned to you yet."
                  className="border-0"
                />
              </CardContent>
            </Card>
          ) : (
            <TaskKanbanBoard
              tasks={tasks}
              onStatusChange={handleStatusChange}
              linkPrefix="/tasks"
              isUpdating={Boolean(updatingTaskId)}
            />
          )}
        </div>}
      </div>
    </div>
  );
}

// ============================================================================
// Sub-Components
// ============================================================================

function TaskListSkeleton() {
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Priority</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Due Date</TableHead>
              <TableHead>Assigned By</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {[1, 2, 3, 4, 5].map((n) => (
              <TableRow key={`skeleton-${n}`}>
                <TableCell>
                  <Skeleton className="h-4 w-48 mb-2" />
                  <Skeleton className="h-3 w-64" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-16" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-5 w-20" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-32" />
                </TableCell>
                <TableCell className="text-right">
                  <Skeleton className="h-8 w-16 ml-auto" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function TaskBoardSkeleton() {
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

interface TaskListViewProps {
  tasks: Array<{
    id: string;
    title: string;
    description: string | null;
    priority: string;
    status: string;
    category?: string | null;
    tags?: string[] | null;
    due_date: string | null;
    assigner_name?: string | null;
  }>;
}

function TaskListView({ tasks }: TaskListViewProps) {
  const { sortColumn, sortDirection, handleSort, sortItems } = useTableSort({ initialColumn: 'title' });

  const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
  const statusOrder: Record<string, number> = { pending: 0, in_progress: 1, completed: 2, cancelled: 3 };

  const sortedTasks = sortItems(tasks, {
    title: (t) => t.title.toLowerCase(),
    priority: (t) => priorityOrder[t.priority] ?? 99,
    status: (t) => statusOrder[t.status] ?? 99,
    due_date: (t) => t.due_date ?? '',
    assigner_name: (t) => t.assigner_name ?? '',
    category: (t) => t.category ?? '',
  });

  const sortHeadProps = { sortColumn, sortDirection, onSort: handleSort };

  if (tasks.length === 0) {
    return (
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Title</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Assigned By</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow>
                <TableCell colSpan={6} className="p-0">
                  <EmptyState
                    icon={ClipboardList}
                    title="No tasks assigned"
                    description="You don't have any tasks assigned to you yet. Check back later or contact your manager."
                    className="border-0"
                  />
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
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
              <SortableTableHead column="title" {...sortHeadProps}>Title</SortableTableHead>
              <SortableTableHead column="priority" {...sortHeadProps}>Priority</SortableTableHead>
              <SortableTableHead column="status" {...sortHeadProps}>Status</SortableTableHead>
              <SortableTableHead column="due_date" {...sortHeadProps}>Due Date</SortableTableHead>
              <SortableTableHead column="assigner_name" {...sortHeadProps}>Assigned By</SortableTableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedTasks.map((task) => (
              <TableRow key={task.id}>
                <TableCell>
                  <p className="text-sm font-medium">{task.title}</p>
                  {task.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
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
                  <TaskPriorityBadge priority={task.priority as TaskPriority} size="sm" />
                </TableCell>
                <TableCell>
                  <TaskStatusBadge status={task.status as TaskStatus} size="sm" />
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {formatDate(task.due_date)}
                </TableCell>
                <TableCell className="text-sm">{task.assigner_name || '—'}</TableCell>
                <TableCell className="text-right">
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/tasks/${task.id}`}>View</Link>
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
