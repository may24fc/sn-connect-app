'use client';

import { useTask } from '@/hooks/useTask';
import { useUpdateTask } from '@/hooks/useUpdateTask';
import { formatDate } from '@/lib/format';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  TaskPriorityBadge,
  TaskStatusBadge,
  useToast,
} from '@hr-portal/ui';
import type { TaskPriority, TaskStatus } from '@hr-portal/ui';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { use } from 'react';

export default function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const { addToast } = useToast();

  const { data, isLoading, error } = useTask(id);
  const updateTask = useUpdateTask(id);

  const task = data?.data;

  if (isLoading) {
    return <div className="text-sm text-muted-foreground">Loading task...</div>;
  }

  if (error || !task) {
    return <div className="text-sm text-error">Failed to load task.</div>;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button variant="ghost" asChild>
        <Link href="/tasks">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Tasks
        </Link>
      </Button>

      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3">
            <CardTitle>{task.title}</CardTitle>
            <TaskStatusBadge status={task.status as TaskStatus} />
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {task.description || 'No description provided.'}
          </p>

          <div className="grid gap-3 sm:grid-cols-2 text-sm">
            <p className="flex items-center gap-2">
              <span className="text-muted-foreground">Priority:</span>{' '}
              <TaskPriorityBadge priority={task.priority as TaskPriority} size="sm" />
            </p>
            <p>
              <span className="text-muted-foreground">Due Date:</span> {formatDate(task.due_date)}
            </p>
            <p>
              <span className="text-muted-foreground">Assigned To:</span>{' '}
              {task.assignee_name || '—'}
            </p>
            <p>
              <span className="text-muted-foreground">Assigned By:</span>{' '}
              {task.assigner_name || '—'}
            </p>
          </div>

          <div className="space-y-2 max-w-xs">
            <Label>Update Status</Label>
            <Select
              value={task.status}
              disabled={updateTask.isPending}
              onValueChange={(value) => {
                const newStatus = value as 'pending' | 'in_progress' | 'completed' | 'cancelled';
                updateTask.mutate(
                  { status: newStatus },
                  {
                    onSuccess: () => {
                      addToast({
                        title: 'Task updated',
                        description: `Status changed to ${newStatus.replace('_', ' ')}`,
                        variant: 'success',
                      });
                    },
                    onError: (error) => {
                      addToast({
                        title: 'Error',
                        description:
                          error instanceof Error ? error.message : 'Failed to update task',
                        variant: 'error',
                      });
                    },
                  }
                );
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="in_progress">In Progress</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
