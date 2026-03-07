'use client';

import type { TaskRecord } from '@/hooks/useTasks';
import { Badge, Card, CardContent, TaskPriorityBadge, useToast } from '@hr-portal/ui';
import type { TaskPriority } from '@hr-portal/ui';
import { GripVertical } from 'lucide-react';
import Link from 'next/link';
import { type DragEvent, useCallback, useMemo, useState } from 'react';

type TaskStatusDB = 'pending' | 'in_progress' | 'completed' | 'cancelled';

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
    headerColor: 'bg-indigo-100 dark:bg-indigo-900/50',
    dropZoneColor: 'bg-indigo-50/30 dark:bg-indigo-950/30',
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
  onStatusChange: (taskId: string, newStatus: TaskStatusDB) => Promise<void>;
  linkPrefix?: string;
  isUpdating?: boolean;
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
}: TaskKanbanBoardProps) {
  const { addToast } = useToast();
  const [draggedTaskId, setDraggedTaskId] = useState<string | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<TaskStatusDB | null>(null);

  // Group tasks by status
  const tasksByStatus = useMemo(() => {
    const groups: Record<TaskStatusDB, Array<TaskRecord>> = {
      pending: [],
      in_progress: [],
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

  const handleDragStart = useCallback((e: DragEvent<HTMLDivElement>, taskId: string) => {
    setDraggedTaskId(taskId);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', taskId);
    // Add a slight delay to allow the drag image to be set
    const target = e.currentTarget;
    setTimeout(() => {
      target.style.opacity = '0.5';
    }, 0);
  }, []);

  const handleDragEnd = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.currentTarget.style.opacity = '1';
    setDraggedTaskId(null);
    setDragOverColumn(null);
  }, []);

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>, status: TaskStatusDB) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(status);
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverColumn(null);
  }, []);

  const handleDrop = useCallback(
    async (e: DragEvent<HTMLDivElement>, newStatus: TaskStatusDB) => {
      e.preventDefault();
      setDragOverColumn(null);

      const taskId = e.dataTransfer?.getData('text/plain') || draggedTaskId;
      if (!taskId) return;

      // Find current task status
      const currentTask = tasks.find((t) => t.id === taskId);
      if (!currentTask || currentTask.status === newStatus) {
        setDraggedTaskId(null);
        return;
      }

      try {
        await onStatusChange(taskId, newStatus);
        addToast({
          title: 'Task updated',
          description: `Task status changed to ${STATUS_COLUMNS.find((c) => c.value === newStatus)?.label}`,
          variant: 'success',
        });
      } catch (error) {
        addToast({
          title: 'Update failed',
          description: error instanceof Error ? error.message : 'Failed to update task status',
          variant: 'error',
        });
      }

      setDraggedTaskId(null);
    },
    [draggedTaskId, tasks, onStatusChange, addToast]
  );

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {STATUS_COLUMNS.map((column) => {
        const columnTasks = tasksByStatus[column.value] || [];
        const isDropTarget = dragOverColumn === column.value;

        return (
          <div key={column.value} className="flex flex-col">
            {/* Column Header */}
            <div
              className={`mb-3 flex items-center justify-between rounded-md px-3 py-2 ${column.headerColor}`}
            >
              <span className="text-sm font-medium">{column.label}</span>
              <Badge variant="secondary" className="text-xs">
                {columnTasks.length}
              </Badge>
            </div>

            {/* Drop Zone */}
            <div
              className={`flex flex-1 flex-col gap-2 rounded-md border-2 p-2 transition-colors min-h-[200px] ${
                isDropTarget
                  ? 'border-indigo-400 bg-indigo-50/50 dark:border-indigo-600 dark:bg-indigo-950/30'
                  : `border-zinc-200 dark:border-zinc-800 ${column.dropZoneColor}`
              }`}
              onDragOver={(e) => handleDragOver(e, column.value)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, column.value)}
            >
              {columnTasks.length === 0 ? (
                <div className="flex h-full min-h-[120px] items-center justify-center text-xs text-muted-foreground">
                  {isDropTarget ? 'Drop here' : 'No tasks'}
                </div>
              ) : (
                columnTasks.map((task) => (
                  <TaskKanbanCard
                    key={task.id}
                    task={task}
                    linkPrefix={linkPrefix}
                    isDragging={draggedTaskId === task.id}
                    onDragStart={handleDragStart}
                    onDragEnd={handleDragEnd}
                  />
                ))
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

interface TaskKanbanCardProps {
  task: TaskRecord;
  linkPrefix: string;
  isDragging: boolean;
  onDragStart: (e: DragEvent<HTMLDivElement>, taskId: string) => void;
  onDragEnd: (e: DragEvent<HTMLDivElement>) => void;
}

function TaskKanbanCard({
  task,
  linkPrefix,
  isDragging,
  onDragStart,
  onDragEnd,
}: TaskKanbanCardProps) {
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, task.id)}
      onDragEnd={onDragEnd}
      className={`group cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-50' : ''}`}
    >
      <Card className="transition-shadow hover:shadow-md">
        <CardContent className="p-3">
          <div className="flex items-start gap-2">
            <GripVertical className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="flex-1 min-w-0">
              <Link
                href={`${linkPrefix}/${task.id}`}
                className="block"
                onClick={(e) => e.stopPropagation()}
              >
                <p className="text-sm font-medium leading-tight hover:text-indigo-600 dark:hover:text-indigo-400 line-clamp-2">
                  {task.title}
                </p>
              </Link>
              {task.description && (
                <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                  {task.description}
                </p>
              )}
              <div className="mt-2 flex items-center justify-between gap-2">
                <TaskPriorityBadge priority={task.priority as TaskPriority} size="sm" />
                {task.due_date && (
                  <span className="text-xs text-muted-foreground">{formatDate(task.due_date)}</span>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export type { TaskKanbanBoardProps, TaskStatusDB };
