'use client';

import type { TaskRecord } from '@/hooks/useTasks';
import { getTaskDetailPath } from '@/lib/task-navigation';
import {
  Badge,
  Button,
  Card,
  CardContent,
  CountBadge,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  Label,
  TaskPriorityBadge,
  Textarea,
} from '@hr-portal/ui';
import type { TaskPriority } from '@hr-portal/ui';
import { GripVertical, MoreHorizontal } from 'lucide-react';
import Link from 'next/link';
import { type DragEvent, useCallback, useMemo, useState } from 'react';

type TaskStatusDB = 'pending' | 'in_progress' | 'blocked' | 'completed' | 'cancelled';

const COUNT_BADGE_VARIANT_BY_STATUS = {
  pending: 'warning',
  in_progress: 'info',
  completed: 'success',
  blocked: 'danger',
  cancelled: 'danger',
} as const;

const STATUS_COLUMNS: Array<{
  value: TaskStatusDB;
  label: string;
  headerColor: string;
  dropZoneColor: string;
}> = [
  {
    value: 'pending',
    label: 'Pending',
    headerColor: 'bg-zinc-100 dark:bg-zinc-800',
    dropZoneColor: 'bg-zinc-50/50 dark:bg-zinc-900/50',
  },
  {
    value: 'in_progress',
    label: 'In Progress',
    headerColor: 'bg-zinc-100 dark:bg-zinc-800/50',
    dropZoneColor: 'bg-zinc-50/30 dark:bg-zinc-900/30',
  },
  {
    value: 'blocked',
    label: 'Blocked',
    headerColor: 'bg-amber-100 dark:bg-amber-900/50',
    dropZoneColor: 'bg-amber-50/30 dark:bg-amber-950/30',
  },
  {
    value: 'completed',
    label: 'Completed',
    headerColor: 'bg-green-100 dark:bg-green-900/50',
    dropZoneColor: 'bg-green-50/30 dark:bg-green-950/30',
  },
  {
    value: 'cancelled',
    label: 'Cancelled',
    headerColor: 'bg-red-100 dark:bg-red-900/50',
    dropZoneColor: 'bg-red-50/30 dark:bg-red-950/30',
  },
];

interface TaskKanbanBoardProps {
  tasks: Array<TaskRecord>;
  onStatusChange: (
    taskId: string,
    newStatus: TaskStatusDB,
    blockedReason?: string | null
  ) => Promise<void>;
  linkPrefix?: string;
  returnTo?: string;
  isUpdating?: boolean;
  includeCancelled?: boolean;
}

const formatDate = (value: string | null | undefined): string => {
  if (!value) return '';
  try {
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '';
  }
};

export function TaskKanbanBoard({
  tasks,
  onStatusChange,
  linkPrefix = '/tasks',
  returnTo = linkPrefix,
  isUpdating = false,
  includeCancelled = true,
}: TaskKanbanBoardProps) {
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatusDB | null>(null);
  const [movingTaskId, setMovingTaskId] = useState<string | null>(null);
  const [blockedMove, setBlockedMove] = useState<string | null>(null);
  const [blockedReason, setBlockedReason] = useState('');
  const [announcement, setAnnouncement] = useState('');
  const [moveError, setMoveError] = useState('');
  const visibleColumns = useMemo(
    () => STATUS_COLUMNS.filter((column) => includeCancelled || column.value !== 'cancelled'),
    [includeCancelled]
  );

  // Group tasks by status
  const tasksByStatus = useMemo(() => {
    const groups: Record<TaskStatusDB, Array<TaskRecord>> = {
      pending: [],
      in_progress: [],
      blocked: [],
      completed: [],
      cancelled: [],
    };

    for (const task of tasks) {
      const status = task.status as TaskStatusDB;
      if (groups[status]) {
        groups[status].push(task);
      }
    }

    return groups;
  }, [tasks]);

  const moveTask = useCallback(
    async (taskId: string, newStatus: TaskStatusDB, reason?: string) => {
      const task = tasks.find((item) => item.id === taskId);
      if (!task || task.status === newStatus || movingTaskId || isUpdating) return;

      setMovingTaskId(taskId);
      setMoveError('');
      setAnnouncement(
        `Moving ${task.title} to ${STATUS_COLUMNS.find((column) => column.value === newStatus)?.label}.`
      );
      try {
        await onStatusChange(taskId, newStatus, newStatus === 'blocked' ? reason : null);
        setAnnouncement(
          `${task.title} moved to ${STATUS_COLUMNS.find((column) => column.value === newStatus)?.label}.`
        );
      } catch {
        const message = `Could not move ${task.title}. It remains in ${STATUS_COLUMNS.find((column) => column.value === task.status)?.label ?? task.status}. Try again.`;
        setAnnouncement(message);
        setMoveError(message);
      } finally {
        setMovingTaskId(null);
      }
    },
    [isUpdating, movingTaskId, onStatusChange, tasks]
  );

  const requestMove = useCallback(
    (taskId: string, newStatus: TaskStatusDB) => {
      const task = tasks.find((item) => item.id === taskId);
      if (!task || task.status === newStatus || movingTaskId || isUpdating) return;
      if (newStatus === 'blocked') {
        setBlockedMove(taskId);
        setBlockedReason(task.blocked_reason ?? '');
        return;
      }
      void moveTask(taskId, newStatus);
    },
    [isUpdating, moveTask, movingTaskId, tasks]
  );

  const handleDragStart = useCallback(
    (e: DragEvent<HTMLSpanElement>, taskId: string) => {
      if (movingTaskId || isUpdating) {
        e.preventDefault();
        return;
      }
      setDraggedTaskId(taskId);
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('application/x-sn-task', taskId);
      const card = e.currentTarget.closest('[data-kanban-card]');
      if (card) e.dataTransfer.setDragImage(card, 20, 20);
    },
    [isUpdating, movingTaskId]
  );

  const handleDragEnd = useCallback(() => {
    setDraggedTaskId(null);
    setDragOverColumn(null);
  }, []);

  const handleDragOver = useCallback(
    (e: DragEvent<HTMLDivElement>, status: TaskStatusDB) => {
      const draggedTask = tasks.find((task) => task.id === draggedTaskId);
      if (!draggedTask || draggedTask.status === status) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      setDragOverColumn((current) => (current === status ? current : status));
    },
    [draggedTaskId, tasks]
  );

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
      setDragOverColumn(null);
    }
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>, newStatus: TaskStatusDB) => {
      e.preventDefault();
      setDragOverColumn(null);
      if (draggedTaskId && e.dataTransfer.getData('application/x-sn-task') === draggedTaskId) {
        requestMove(draggedTaskId, newStatus);
      }
      setDraggedTaskId(null);
    },
    [draggedTaskId, requestMove]
  );

  return (
    <div>
      <p className="mb-3 text-xs text-muted-foreground">
        Drag a card by its handle, or use its Move menu to change status.
      </p>
      <div data-testid="kanban-announcement" aria-live="polite" className="sr-only">
        {announcement}
      </div>
      {moveError ? (
        <p
          role="alert"
          className="mb-3 rounded-md border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
        >
          {moveError}
        </p>
      ) : null}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {visibleColumns.map((column) => {
          const columnTasks = tasksByStatus[column.value] || [];
          const isDropTarget = dragOverColumn === column.value;

          return (
            <div key={column.value} className="flex flex-col">
              {/* Column Header */}
              <div
                className={`mb-3 flex items-center justify-between rounded-md px-3 py-2 ${column.headerColor}`}
              >
                <span className="text-sm font-medium">{column.label}</span>
                <CountBadge
                  variant={COUNT_BADGE_VARIANT_BY_STATUS[column.value]}
                  size="md"
                  count={columnTasks.length}
                />
              </div>

              {/* Drop Zone */}
              <div
                data-testid={`kanban-column-${column.value}`}
                aria-label={`${column.label} tasks`}
                className={`flex flex-1 flex-col gap-2 rounded-md border-2 p-2 transition-colors min-h-[200px] ${
                  isDropTarget
                    ? 'border-primary bg-primary/10 ring-2 ring-primary/20'
                    : `border-zinc-200 dark:border-zinc-800 ${column.dropZoneColor}`
                }`}
                onDragOver={(e) => handleDragOver(e, column.value)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, column.value)}
              >
                {columnTasks.length === 0 ? (
                  <div className="flex h-full min-h-[120px] items-center justify-center text-xs text-muted-foreground">
                    {isDropTarget ? `Drop in ${column.label}` : 'No tasks'}
                  </div>
                ) : (
                  <>
                    {isDropTarget ? (
                      <p className="rounded border border-dashed border-primary p-2 text-center text-xs font-medium text-primary">
                        Drop in {column.label}
                      </p>
                    ) : null}
                    {columnTasks.map((task) => (
                      <TaskKanbanCard
                        key={task.id}
                        task={task}
                        linkPrefix={linkPrefix}
                        returnTo={returnTo}
                        isDragging={draggedTaskId === task.id}
                        isUpdating={isUpdating || movingTaskId !== null}
                        availableStatuses={visibleColumns}
                        onMove={requestMove}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                      />
                    ))}
                  </>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <Dialog
        open={blockedMove !== null}
        onOpenChange={(open) => {
          if (!open) setBlockedMove(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>What is blocking this task?</DialogTitle>
            <DialogDescription>
              Add a short reason so your team can help unblock it.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label htmlFor="kanban-blocked-reason">Blocker reason</Label>
            <Textarea
              id="kanban-blocked-reason"
              value={blockedReason}
              onChange={(e) => setBlockedReason(e.target.value)}
              placeholder="Describe what you need to continue"
              maxLength={500}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setBlockedMove(null)}>
              Cancel
            </Button>
            <Button
              disabled={!blockedReason.trim() || movingTaskId !== null}
              onClick={() => {
                if (blockedMove && blockedReason.trim()) {
                  void moveTask(blockedMove, 'blocked', blockedReason.trim());
                  setBlockedMove(null);
                }
              }}
            >
              Move to Blocked
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface TaskKanbanCardProps {
  task: TaskRecord;
  linkPrefix: string;
  returnTo: string;
  isDragging: boolean;
  isUpdating: boolean;
  availableStatuses: typeof STATUS_COLUMNS;
  onMove: (taskId: string, status: TaskStatusDB) => void;
  onDragStart: (e: DragEvent<HTMLSpanElement>, taskId: string) => void;
  onDragEnd: () => void;
}

function TaskKanbanCard({
  task,
  linkPrefix,
  returnTo,
  isDragging,
  isUpdating,
  availableStatuses,
  onMove,
  onDragStart,
  onDragEnd,
}: TaskKanbanCardProps) {
  return (
    <div
      data-kanban-card
      data-testid={`kanban-task-${task.id}`}
      className={`group ${isDragging ? 'opacity-50' : ''}`}
    >
      <Card className="transition-shadow hover:shadow-md">
        <CardContent className="p-3">
          <div className="flex items-start gap-2">
            <span
              draggable={!isUpdating}
              onDragStart={(e) => onDragStart(e, task.id)}
              onDragEnd={onDragEnd}
              aria-hidden="true"
              title="Drag to move"
              className="mt-0.5 shrink-0 cursor-grab text-muted-foreground active:cursor-grabbing"
            >
              <GripVertical className="h-4 w-4" />
            </span>
            <div className="flex-1 min-w-0">
              <Link href={getTaskDetailPath(task.id, linkPrefix, returnTo)} className="block">
                <p className="text-sm font-medium leading-tight hover:text-slate-700 dark:hover:text-slate-400 line-clamp-2">
                  {task.title}
                </p>
              </Link>
              {task.description && (
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {task.description}
                </p>
              )}
              <Badge variant="outline" className="mt-2 max-w-full truncate text-[11px]">
                {task.project_name || 'Ad-hoc / Internal Ops'}
              </Badge>
              {task.milestone_name ? (
                <p className="mt-1 truncate text-[11px] text-muted-foreground">
                  Milestone: {task.milestone_name}
                </p>
              ) : null}
              <div className="mt-2 flex items-center justify-between gap-2">
                <TaskPriorityBadge priority={task.priority as TaskPriority} size="sm" />
                {task.due_date && (
                  <span className="text-xs text-muted-foreground">{formatDate(task.due_date)}</span>
                )}
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  disabled={isUpdating}
                  aria-label={`Move ${task.title}`}
                  className="shrink-0 rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary disabled:opacity-50"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {availableStatuses
                  .filter((column) => column.value !== task.status)
                  .map((column) => (
                    <DropdownMenuItem
                      key={column.value}
                      onSelect={() => onMove(task.id, column.value)}
                    >
                      Move to {column.label}
                    </DropdownMenuItem>
                  ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export type { TaskKanbanBoardProps, TaskStatusDB };
