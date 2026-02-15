'use client';

import { useTask } from '@/hooks/useTask';
import { useUpdateTask } from '@/hooks/useUpdateTask';
import {
  Badge,
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
} from '@hr-portal/ui';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { use } from 'react';

const statusVariant: Record<
  'pending' | 'in_progress' | 'completed' | 'cancelled',
  'secondary' | 'pending' | 'approved' | 'error'
> = {
  pending: 'secondary',
  in_progress: 'pending',
  completed: 'approved',
  cancelled: 'error',
};

export default function TaskDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);

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
            <Badge variant={statusVariant[task.status]}>{task.status}</Badge>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground whitespace-pre-wrap">
            {task.description || 'No description provided.'}
          </p>

          <div className="grid gap-3 sm:grid-cols-2 text-sm">
            <p>
              <span className="text-muted-foreground">Priority:</span> {task.priority}
            </p>
            <p>
              <span className="text-muted-foreground">Due Date:</span>{' '}
              {task.due_date ? task.due_date.slice(0, 10) : '-'}
            </p>
            <p>
              <span className="text-muted-foreground">Assigned To:</span>{' '}
              {task.assignee_name || '-'}
            </p>
            <p>
              <span className="text-muted-foreground">Assigned By:</span>{' '}
              {task.assigner_name || '-'}
            </p>
          </div>

          <div className="space-y-2 max-w-xs">
            <Label>Update Status</Label>
            <Select
              value={task.status}
              onValueChange={(value) =>
                updateTask.mutate({
                  status: value as 'pending' | 'in_progress' | 'completed' | 'cancelled',
                })
              }
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
