'use client';

import { ConfirmActionDialog } from '@/components/ConfirmActionDialog';
import { useBackNavigation } from '@/hooks/useBackNavigation';
import { useTaskProofs } from '@/hooks/useTaskProofs';
import { formatDate } from '@/lib/format';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Skeleton,
  TaskDetailView,
  useToast,
} from '@hr-portal/ui';
import type { Task, TaskStatus } from '@hr-portal/ui';
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  FileText,
  Link2,
  Loader2,
  Trash2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { use, useEffect, useState } from 'react';

interface ApiTaskPayload {
  id: string;
  title: string;
  description: string | null;
  assigned_to: string | null;
  assigned_by: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  due_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  assignee_name?: string | null;
  assigner_name?: string | null;
}

function toApiTaskStatus(status: TaskStatus): ApiTaskPayload['status'] {
  return status === 'blocked' ? 'cancelled' : status;
}

function toTaskDetailViewModel(apiTask: ApiTaskPayload): Task {
  const mappedStatus: TaskStatus = apiTask.status === 'cancelled' ? 'blocked' : apiTask.status;

  return {
    id: apiTask.id as Task['id'],
    title: apiTask.title,
    description: apiTask.description || 'No description provided.',
    priority: apiTask.priority,
    status: mappedStatus,
    dueDate: apiTask.due_date || apiTask.created_at,
    createdBy: apiTask.assigned_by,
    createdByName: apiTask.assigner_name || 'System',
    createdAt: apiTask.created_at,
    updatedAt: apiTask.updated_at,
    assignees: apiTask.assigned_to
      ? [
          {
            id: apiTask.assigned_to,
            name: apiTask.assignee_name || 'Assigned User',
            email: '',
            role: 'employee',
            department: '—',
            assignedAt: apiTask.created_at,
            ...(apiTask.completed_at ? { completedAt: apiTask.completed_at } : {}),
          },
        ]
      : [],
  };
}

interface TaskDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default function TaskDetailPage({ params }: TaskDetailPageProps): ReactNode {
  const { id } = use(params);
  const router = useRouter();
  const handleBack = useBackNavigation({ fallbackPath: '/super-admin/tasks' });
  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const { addToast } = useToast();
  const { data: proofsData, isLoading: proofsLoading } = useTaskProofs(id);

  const proofs = proofsData?.data || [];

  useEffect(() => {
    const fetchTask = async (): Promise<void> => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/tasks/${id}`);
        if (response.ok) {
          const data = await response.json();
          setTask(toTaskDetailViewModel(data.data as ApiTaskPayload));
        } else {
          const error = await response.json().catch(() => ({ error: 'Failed to load task' }));
          setTask(null);
          addToast({ title: error.error || 'Failed to load task', variant: 'error' });
        }
      } catch {
        setTask(null);
        addToast({ title: 'Failed to load task', variant: 'error' });
      } finally {
        setIsLoading(false);
      }
    };

    void fetchTask();
  }, [addToast, id]);

  const handleStatusChange = async (status: TaskStatus): Promise<void> => {
    setIsUpdating(true);
    try {
      const apiStatus = toApiTaskStatus(status);
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: apiStatus }),
      });

      if (!response.ok) {
        const error = await response
          .json()
          .catch(() => ({ error: 'Failed to update task status' }));
        throw new Error(error.error || 'Failed to update task status');
      }

      const data = await response.json();
      setTask(toTaskDetailViewModel(data.data as ApiTaskPayload));
      addToast({
        title: `Task status updated to ${status.replace('_', ' ')}`,
        variant: 'success',
      });
    } catch (error) {
      addToast({
        title: error instanceof Error ? error.message : 'Failed to update task status',
        variant: 'error',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (): Promise<void> => {
    setIsDeleting(true);

    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Failed to delete task' }));
        throw new Error(error.error || 'Failed to delete task');
      }

      setDeleteDialogOpen(false);
      addToast({ title: 'Task deleted', variant: 'success' });
      router.push('/super-admin/tasks');
    } catch (error) {
      addToast({
        title: error instanceof Error ? error.message : 'Failed to delete task',
        variant: 'error',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <EmptyState
          icon={<Loader2 className="h-6 w-6 animate-spin" />}
          title="Loading task details"
          description="Retrieving the task record and submitted proofs."
          size="sm"
        />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-lg font-medium mb-2">Task not found</p>
          <p className="text-sm text-muted-foreground mb-4">
            The task you are looking for does not exist.
          </p>
          <Button onClick={handleBack}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Tasks
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Button variant="ghost" onClick={handleBack} className="w-fit">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Tasks
        </Button>
        <div className="flex gap-2">
          <Button
            variant="destructive"
            onClick={() => setDeleteDialogOpen(true)}
            disabled={isDeleting}
          >
            <Trash2 className="mr-2 h-4 w-4" />
            {isDeleting ? 'Deleting...' : 'Delete'}
          </Button>
        </div>
      </div>

      <ConfirmActionDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete task"
        description={`Are you sure you want to delete "${task.title}"? This action removes it from active task management.`}
        confirmLabel="Delete task"
        isPending={isDeleting}
        onConfirm={() => {
          void handleDelete();
        }}
      />

      {/* Task Details */}
      <TaskDetailView
        task={task}
        onStatusChange={handleStatusChange}
        isUpdating={isUpdating}
        canUpdateStatus={true}
      />

      {/* Proof of Completion Section */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">Proof of Completion</CardTitle>
            {proofs.length > 0 && (
              <span className="flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 rounded-full px-2 py-0.5">
                <CheckCircle2 className="h-3 w-3" />
                {proofs.length} submitted
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            Proofs submitted by the assignee for this task.
          </p>
        </CardHeader>
        <CardContent>
          {proofsLoading ? (
            <div className="space-y-3">
              <Skeleton className="h-16 w-full" />
              <Skeleton className="h-16 w-full" />
            </div>
          ) : proofs.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No proof submitted yet"
              description="Submitted proof links or files will appear here once the assignee adds them."
              size="sm"
            />
          ) : (
            <div className="space-y-3">
              {proofs.map((proof) => (
                <div
                  key={proof.id}
                  className="flex items-start gap-3 rounded-lg border border-zinc-200 dark:border-zinc-700 p-3"
                >
                  <div className="mt-0.5 flex-shrink-0">
                    {proof.proof_type === 'link' ? (
                      <Link2 className="h-4 w-4 text-indigo-500" />
                    ) : (
                      <FileText className="h-4 w-4 text-zinc-500" />
                    )}
                  </div>
                  <div className="min-w-0">
                    {proof.label && <p className="text-sm font-medium truncate">{proof.label}</p>}
                    {proof.proof_type === 'link' ? (
                      <a
                        href={proof.content}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 truncate"
                      >
                        {proof.content}
                        <ExternalLink className="h-3 w-3 flex-shrink-0" />
                      </a>
                    ) : (
                      <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                        {proof.content}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      by {proof.submitted_by_name} &middot; {formatDate(proof.created_at)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
