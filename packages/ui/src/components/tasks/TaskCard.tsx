'use client';

import { AlertCircle, Calendar, ChevronRight, User, Users } from 'lucide-react';
import type * as React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '../../primitives/avatar';
import { Badge } from '../../primitives/badge';
import { Button } from '../../primitives/button';
import { Card, CardContent, CardHeader } from '../../primitives/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../primitives/select';
import type { Task, TaskId, TaskStatus } from '../../types/task.types';
import { formatDueDate, isTaskOverdue } from '../../types/task.types';
import { cn } from '../../utils/cn';
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

export interface TaskCardProps {
  task: Task;
  variant?: 'default' | 'compact';
  onStatusChange?: (taskId: TaskId, status: TaskStatus) => void;
  onViewDetails?: (taskId: TaskId) => void;
  showAssignees?: boolean;
  className?: string;
}

export function TaskCard({
  task,
  variant = 'default',
  onStatusChange,
  onViewDetails,
  showAssignees = true,
  className,
}: TaskCardProps): React.ReactNode {
  const isOverdue = isTaskOverdue(task.dueDate, task.status);
  const isCompleted = task.status === 'completed';

  const handleStatusChange = (newStatus: string): void => {
    if (onStatusChange && newStatus !== task.status) {
      onStatusChange(task.id, newStatus as TaskStatus);
    }
  };

  const handleViewDetails = (): void => {
    if (onViewDetails) {
      onViewDetails(task.id);
    }
  };

  // Compact variant for dashboard widgets
  if (variant === 'compact') {
    return (
      <div
        className={cn(
          'flex items-center justify-between rounded-lg border border-border p-3 transition-colors hover:bg-muted/50',
          onViewDetails && 'cursor-pointer',
          isCompleted && 'opacity-60',
          className
        )}
        onClick={onViewDetails ? handleViewDetails : undefined}
        role={onViewDetails ? 'button' : undefined}
        tabIndex={onViewDetails ? 0 : undefined}
        onKeyDown={(e) => {
          if (onViewDetails && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            handleViewDetails();
          }
        }}
      >
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <TaskPriorityBadge priority={task.priority} size="sm" />
            {isOverdue && (
              <Badge variant="error" className="gap-1 text-xs py-0 px-2">
                <AlertCircle className="h-2.5 w-2.5" />
                Overdue
              </Badge>
            )}
          </div>
          <h4 className={cn('font-medium text-sm line-clamp-1', isCompleted && 'line-through')}>
            {task.title}
          </h4>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Calendar className="h-3 w-3" />
            {formatDueDate(task.dueDate)}
          </div>
        </div>
        <TaskStatusBadge status={task.status} size="sm" />
      </div>
    );
  }

  // Default variant for full task lists
  return (
    <Card
      className={cn('transition-shadow hover:shadow-md', isCompleted && 'opacity-75', className)}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <TaskPriorityBadge priority={task.priority} />
              <TaskStatusBadge status={task.status} />
              {isOverdue && (
                <Badge variant="error" className="gap-1">
                  <AlertCircle className="h-3 w-3" />
                  Overdue
                </Badge>
              )}
              {task.category && (
                <Badge className={cn('text-xs border-0', TASK_CATEGORY_STYLES[task.category])}>
                  {formatTaskCategory(task.category)}
                </Badge>
              )}
            </div>
            <h3
              className={cn(
                'text-lg font-semibold',
                isCompleted && 'line-through text-muted-foreground'
              )}
            >
              {task.title}
            </h3>
          </div>
          {onViewDetails && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleViewDetails}
              aria-label="View task details"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Description Preview */}
        <p className="text-sm text-muted-foreground line-clamp-2">{task.description}</p>

        {task.tags && task.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {task.tags.slice(0, 4).map((tag) => (
              <Badge key={tag} variant="outline" className="text-xs">
                #{tag}
              </Badge>
            ))}
          </div>
        )}

        {/* Metadata Grid */}
        <div className="grid gap-3 text-sm">
          {/* Due Date */}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Due:</span>
            <span className={cn('font-medium', isOverdue && 'text-error')}>
              {formatDueDate(task.dueDate)}
            </span>
          </div>

          {/* Created By */}
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-muted-foreground" />
            <span className="text-muted-foreground">Created by:</span>
            <span className="font-medium">{task.createdByName}</span>
          </div>

          {/* Assignees */}
          {showAssignees && task.assignees.length > 0 && (
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Assigned to:</span>
              <div className="flex -space-x-2">
                {task.assignees.slice(0, 3).map((assignee) => (
                  <Avatar key={assignee.id} className="h-6 w-6 border-2 border-background">
                    <AvatarImage src={assignee.avatarUrl} alt={assignee.name} />
                    <AvatarFallback className="text-xs">
                      {assignee.name
                        .split(' ')
                        .map((n) => n[0])
                        .join('')
                        .toUpperCase()
                        .slice(0, 2)}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {task.assignees.length > 3 && (
                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-muted text-xs font-medium border-2 border-background">
                    +{task.assignees.length - 3}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Status Update Dropdown */}
        {onStatusChange && !isCompleted && (
          <div className="pt-2 border-t border-border">
            <Select value={task.status} onValueChange={handleStatusChange}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Update status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="blocked">Blocked</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
