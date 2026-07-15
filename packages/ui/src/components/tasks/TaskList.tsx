'use client';

import { ClipboardList, Edit, Eye, Loader2, MoreVertical, Trash2 } from 'lucide-react';
import type * as React from 'react';
import { Badge } from '../../primitives/badge';
import { Button } from '../../primitives/button';
import { Card, CardContent } from '../../primitives/card';
import { Checkbox } from '../../primitives/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../../primitives/dropdown-menu';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../primitives/table';
import type { Task, TaskId, TaskStatus } from '../../types/task.types';
import { formatDueDate, isTaskOverdue } from '../../types/task.types';
import { cn } from '../../utils/cn';
import { TaskCard } from './TaskCard';
import { TaskPriorityBadge } from './TaskPriorityBadge';
import { TaskStatusBadge } from './TaskStatusBadge';

const TASK_CATEGORY_STYLES: Record<string, string> = {
  launch: 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300',
  optimization: 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300',
  maintenance: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  research: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
  administrative: 'bg-zinc-200 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300',
  other: 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300',
};

function formatTaskCategory(category: string): string {
  return category.charAt(0).toUpperCase() + category.slice(1).replace(/_/g, ' ');
}

export interface TaskListProps {
  tasks: Array<Task>;
  variant?: 'table' | 'cards';
  onStatusChange?: (taskId: TaskId, status: TaskStatus) => void;
  onViewDetails?: (taskId: TaskId) => void;
  onEdit?: (taskId: TaskId) => void;
  onDelete?: (taskId: TaskId) => void;
  selectable?: boolean;
  selectedIds?: Array<TaskId>;
  onSelectionChange?: (ids: Array<TaskId>) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  className?: string;
}

export function TaskList({
  tasks,
  variant = 'table',
  onStatusChange,
  onViewDetails,
  onEdit,
  onDelete,
  selectable = false,
  selectedIds = [],
  onSelectionChange,
  isLoading = false,
  emptyMessage = 'No tasks found',
  className,
}: TaskListProps): React.ReactNode {
  const handleSelectAll = (checked: boolean): void => {
    if (onSelectionChange) {
      onSelectionChange(checked ? tasks.map((task) => task.id) : []);
    }
  };

  const handleSelectTask = (taskId: TaskId, checked: boolean): void => {
    if (onSelectionChange) {
      if (checked) {
        onSelectionChange([...selectedIds, taskId]);
      } else {
        onSelectionChange(selectedIds.filter((id) => id !== taskId));
      }
    }
  };

  const allSelected = tasks.length > 0 && selectedIds.length === tasks.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < tasks.length;

  // Loading state
  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="p-8 flex flex-col items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mb-4" />
          <p className="text-sm text-muted-foreground">Loading tasks...</p>
        </CardContent>
      </Card>
    );
  }

  // Empty state
  if (tasks.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-8 text-center text-muted-foreground">
          <ClipboardList className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>{emptyMessage}</p>
        </CardContent>
      </Card>
    );
  }

  // Cards variant (for employee/associate view)
  if (variant === 'cards') {
    return (
      <div className={cn('space-y-4', className)}>
        {tasks.map((task) => (
          <TaskCard
            key={task.id}
            task={task}
            {...(onStatusChange && { onStatusChange })}
            {...(onViewDetails && { onViewDetails })}
            showAssignees={true}
          />
        ))}
      </div>
    );
  }

  // Table variant (for admin view)
  return (
    <Card className={className}>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                {selectable && (
                  <TableHead className="w-12">
                    <Checkbox
                      checked={someSelected ? 'indeterminate' : allSelected}
                      onCheckedChange={handleSelectAll}
                      aria-label="Select all tasks"
                    />
                  </TableHead>
                )}
                <TableHead>Title</TableHead>
                <TableHead className="w-[120px]">Priority</TableHead>
                <TableHead className="w-[140px]">Status</TableHead>
                <TableHead className="w-[160px]">Due Date</TableHead>
                <TableHead className="w-[140px]">Assignees</TableHead>
                <TableHead className="w-[100px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => {
                const isSelected = selectedIds.includes(task.id);
                const isOverdue = isTaskOverdue(task.dueDate, task.status);

                return (
                  <TableRow
                    key={task.id}
                    className={cn(
                      task.status === 'completed' && 'opacity-60',
                      isSelected && 'bg-muted/50'
                    )}
                  >
                    {selectable && (
                      <TableCell>
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={(checked) =>
                            handleSelectTask(task.id, checked as boolean)
                          }
                          aria-label={`Select ${task.title}`}
                        />
                      </TableCell>
                    )}
                    <TableCell>
                      <div className="space-y-1">
                        <p
                          className={cn(
                            'font-medium',
                            task.status === 'completed' && 'line-through'
                          )}
                        >
                          {task.title}
                        </p>
                        <p className="text-sm text-muted-foreground line-clamp-1">
                          {task.description}
                        </p>
                        {task.category && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            <Badge
                              className={cn(
                                'border-0 text-[11px]',
                                TASK_CATEGORY_STYLES[task.category]
                              )}
                            >
                              {formatTaskCategory(task.category)}
                            </Badge>
                            {task.tags?.slice(0, 2).map((tag) => (
                              <Badge key={tag} variant="outline" className="text-[11px]">
                                #{tag}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <TaskPriorityBadge priority={task.priority} />
                    </TableCell>
                    <TableCell>
                      <TaskStatusBadge status={task.status} />
                    </TableCell>
                    <TableCell>
                      <span className={cn('text-sm', isOverdue && 'text-error font-medium')}>
                        {formatDueDate(task.dueDate)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex -space-x-2">
                        {task.assignees.slice(0, 3).map((assignee) => (
                          <div
                            key={assignee.id}
                            className="h-7 w-7 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-medium"
                            title={assignee.name}
                          >
                            {assignee.name
                              .split(' ')
                              .map((n) => n[0])
                              .join('')
                              .toUpperCase()
                              .slice(0, 2)}
                          </div>
                        ))}
                        {task.assignees.length > 3 && (
                          <div className="h-7 w-7 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-medium">
                            +{task.assignees.length - 3}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            aria-label="Open task actions menu"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {onViewDetails && (
                            <DropdownMenuItem onClick={() => onViewDetails(task.id)}>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                          )}
                          {onEdit && (
                            <DropdownMenuItem onClick={() => onEdit(task.id)}>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                          )}
                          {onDelete && (
                            <>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => onDelete(task.id)}
                                className="text-error focus:text-error"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
