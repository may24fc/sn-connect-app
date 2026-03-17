'use client';

import { AlertCircle, Calendar, Check, Clock, Copy, FileText, Loader2, Tag, User, Users } from 'lucide-react';
import * as React from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '../../primitives/avatar';
import { Badge } from '../../primitives/badge';
import { Button } from '../../primitives/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../../primitives/card';
import { Label } from '../../primitives/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../primitives/select';
import { Separator } from '../../primitives/separator';
import { Textarea } from '../../primitives/textarea';
import type { Task, TaskStatus } from '../../types/task.types';
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

export interface TaskDetailViewProps {
  task: Task;
  onStatusChange?: (status: TaskStatus, note?: string) => void;
  isUpdating?: boolean;
  canUpdateStatus?: boolean;
  className?: string;
}

export function TaskDetailView({
  task,
  onStatusChange,
  isUpdating = false,
  canUpdateStatus = false,
  className,
}: TaskDetailViewProps): React.ReactNode {
  const [selectedStatus, setSelectedStatus] = React.useState<TaskStatus>(task.status);
  const [note, setNote] = React.useState('');
  const [showNoteInput, setShowNoteInput] = React.useState(false);
  const [copiedId, setCopiedId] = React.useState(false);

  const copyTaskId = (): void => {
    navigator.clipboard.writeText(task.id).catch(() => undefined);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const isOverdue = isTaskOverdue(task.dueDate, task.status);
  const assignees = task.assignees || [];

  const handleStatusUpdate = (): void => {
    if (onStatusChange && selectedStatus !== task.status) {
      onStatusChange(selectedStatus, note || undefined);
      setNote('');
      setShowNoteInput(false);
    }
  };

  const handleStatusChange = (status: TaskStatus): void => {
    setSelectedStatus(status);
    // Show note input when changing to blocked or completed
    if (status === 'blocked' || status === 'completed') {
      setShowNoteInput(true);
    } else {
      setShowNoteInput(false);
    }
  };

  const formatDate = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatDateTime = (dateString: string): string => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <Card className={cn('w-full', className)}>
      <CardHeader>
        <div className="space-y-4">
          {/* Priority and Status Badges */}
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
              <Badge className={cn('border-0', TASK_CATEGORY_STYLES[task.category])}>
                {formatTaskCategory(task.category)}
              </Badge>
            )}
          </div>

          {/* Title */}
          <div>
            <CardTitle className="text-2xl">{task.title}</CardTitle>
            <CardDescription className="mt-1.5 flex items-center gap-2">
              <span>Task reference</span>
              <button
                type="button"
                onClick={copyTaskId}
                title="Click to copy full ID"
                className="inline-flex items-center gap-1 font-mono text-xs bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 px-1.5 py-0.5 rounded transition-colors"
              >
                #{task.id.slice(0, 8).toUpperCase()}
                {copiedId ? (
                  <Check className="h-3 w-3 text-green-500" />
                ) : (
                  <Copy className="h-3 w-3 opacity-60" />
                )}
              </button>
            </CardDescription>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Description */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <FileText className="h-4 w-4" />
            Description
          </div>
          <p className="text-sm whitespace-pre-wrap pl-6">{task.description}</p>
        </div>

        <Separator />

        {/* Metadata Grid */}
        <div className="grid gap-4 sm:grid-cols-2">
          {/* Due Date */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Calendar className="h-4 w-4" />
              Due Date
            </div>
            <p className={cn('text-sm font-medium pl-6', isOverdue && 'text-error')}>
              {formatDate(task.dueDate)}
              <span className="block text-xs text-muted-foreground mt-1">
                {formatDueDate(task.dueDate)}
              </span>
            </p>
          </div>

          {/* Category */}
          {task.category && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Tag className="h-4 w-4" />
                Category
              </div>
              <p className="text-sm font-medium pl-6">{formatTaskCategory(task.category)}</p>
            </div>
          )}

          {task.tags && task.tags.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                <Tag className="h-4 w-4" />
                Tags
              </div>
              <div className="flex flex-wrap gap-2 pl-6">
                {task.tags.map((tag) => (
                  <Badge key={tag} variant="outline">
                    #{tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Created By */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <User className="h-4 w-4" />
              Created By
            </div>
            <p className="text-sm font-medium pl-6">
              {task.createdByName}
              <span className="block text-xs text-muted-foreground mt-1">
                {formatDateTime(task.createdAt)}
              </span>
            </p>
          </div>

          {/* Last Updated */}
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Clock className="h-4 w-4" />
              Last Updated
            </div>
            <p className="text-sm font-medium pl-6">{formatDateTime(task.updatedAt)}</p>
          </div>
        </div>

        <Separator />

        {/* Assignees */}
        <div className="space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Users className="h-4 w-4" />
            Assigned To ({assignees.length})
          </div>
          <div className="grid gap-3 sm:grid-cols-2 pl-6">
            {assignees.map((assignee) => (
              <div
                key={assignee.id}
                className="flex items-center gap-3 rounded-lg border border-border p-3"
              >
                <Avatar className="h-10 w-10">
                  <AvatarImage src={assignee.avatarUrl} alt={assignee.name} />
                  <AvatarFallback>
                    {assignee.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .toUpperCase()
                      .slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{assignee.name}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="truncate">{assignee.department}</span>
                    <span>•</span>
                    <span className="capitalize">{assignee.role}</span>
                  </div>
                  {assignee.completedAt && (
                    <p className="text-xs text-success mt-1">
                      Completed {formatDateTime(assignee.completedAt)}
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Status Update Form (if canUpdateStatus) */}
        {canUpdateStatus && task.status !== 'completed' && (
          <>
            <Separator />
            <div className="space-y-4">
              <div className="flex items-center gap-2 text-sm font-medium">
                <AlertCircle className="h-4 w-4 text-primary" />
                Update Task Status
              </div>
              <div className="space-y-4 pl-6">
                <div className="space-y-2">
                  <Label htmlFor="status">New Status</Label>
                  <Select
                    value={selectedStatus}
                    onValueChange={(value: TaskStatus) => handleStatusChange(value)}
                    disabled={isUpdating}
                  >
                    <SelectTrigger id="status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="in_progress">In Progress</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                      <SelectItem value="blocked">Blocked</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {showNoteInput && (
                  <div className="space-y-2">
                    <Label htmlFor="note">
                      Note {selectedStatus === 'blocked' ? '(Required)' : '(Optional)'}
                    </Label>
                    <Textarea
                      id="note"
                      placeholder={
                        selectedStatus === 'blocked'
                          ? 'Explain why this task is blocked...'
                          : 'Add any additional notes or comments...'
                      }
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="min-h-[80px]"
                      disabled={isUpdating}
                    />
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </CardContent>

      {canUpdateStatus && task.status !== 'completed' && (
        <CardFooter className="border-t border-border pt-4">
          <Button
            onClick={handleStatusUpdate}
            disabled={
              isUpdating ||
              selectedStatus === task.status ||
              (selectedStatus === 'blocked' && !note.trim())
            }
            className="w-full sm:w-auto ml-auto"
          >
            {isUpdating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Updating...
              </>
            ) : (
              'Update Status'
            )}
          </Button>
        </CardFooter>
      )}
    </Card>
  );
}
