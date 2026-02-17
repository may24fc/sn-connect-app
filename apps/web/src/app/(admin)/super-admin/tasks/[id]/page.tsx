'use client';

import { Button, TaskDetailView } from '@hr-portal/ui';
import type { Task, TaskStatus } from '@hr-portal/ui';
import { ArrowLeft, Edit, Loader2, Trash2 } from 'lucide-react';
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
            completedAt: apiTask.completed_at || undefined,
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
  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    // TODO: Replace with actual API call
    const fetchTask = async (): Promise<void> => {
      setIsLoading(true);
      try {
        const response = await fetch(`/api/tasks/${id}`);
        if (response.ok) {
          const data = await response.json();
          setTask(toTaskDetailViewModel(data.data as ApiTaskPayload));
        }
      } catch (error) {
        console.error('Failed to fetch task:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTask();
  }, [id]);

  const handleStatusChange = async (status: TaskStatus, _note?: string): Promise<void> => {
    setIsUpdating(true);
    try {
      // TODO: Replace with actual API call
      if (task) {
        setTask({
          ...task,
          status,
          updatedAt: new Date().toISOString(),
        });
      }
    } catch (error) {
      console.error('Failed to update task status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleEdit = (): void => {};

  const handleDelete = (): void => {
    if (confirm('Are you sure you want to delete this task?')) {
      // TODO: Implement delete API call
      router.push('/super-admin/tasks');
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground mx-auto mb-4" />
          <p className="text-sm text-muted-foreground">Loading task details...</p>
        </div>
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
          <Button onClick={() => router.push('/super-admin/tasks')}>
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
        <Button variant="ghost" onClick={() => router.push('/super-admin/tasks')} className="w-fit">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Tasks
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleEdit}>
            <Edit className="mr-2 h-4 w-4" />
            Edit Task
          </Button>
          <Button variant="destructive" onClick={handleDelete}>
            <Trash2 className="mr-2 h-4 w-4" />
            Delete
          </Button>
        </div>
      </div>

      {/* Task Details */}
      <TaskDetailView
        task={task}
        onStatusChange={handleStatusChange}
        isUpdating={isUpdating}
        canUpdateStatus={false} // Admin view - they don't update status, assignees do
      />
    </div>
  );
}
