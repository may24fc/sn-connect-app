'use client';

import type { ReactNode } from 'react';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Edit, Trash2, Loader2 } from 'lucide-react';
import { Button, TaskDetailView } from '@hr-portal/ui';
import type { Task, TaskStatus } from '@hr-portal/ui';

// Mock data - Replace with actual API calls
const mockTask: Task = {
  id: '1' as any,
  title: 'Review Q1 Financial Reports',
  description: 'Analyze and review all financial reports from Q1, focusing on budget variances and cost optimization opportunities. This includes reviewing all departmental budgets, identifying areas of overspending, and preparing recommendations for the executive team.',
  priority: 'high',
  status: 'in_progress',
  category: 'Finance',
  dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
  createdBy: 'admin-1',
  createdByName: 'Admin User',
  createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
  updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
  assignees: [
    {
      id: '3',
      name: 'Mike Chen',
      email: 'mike.chen@company.com',
      role: 'employee',
      department: 'Finance',
      avatarUrl: '',
      assignedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
    {
      id: '5',
      name: 'Anna Lee',
      email: 'anna.lee@company.com',
      role: 'employee',
      department: 'Finance',
      avatarUrl: '',
      assignedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    },
  ],
};

interface TaskDetailPageProps {
  params: {
    id: string;
  };
}

export default function TaskDetailPage({ params }: TaskDetailPageProps): ReactNode {
  const router = useRouter();
  const [task, setTask] = useState<Task | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    // TODO: Replace with actual API call
    const fetchTask = async (): Promise<void> => {
      setIsLoading(true);
      try {
        await new Promise((resolve) => setTimeout(resolve, 500));
        setTask(mockTask);
      } catch (error) {
        console.error('Failed to fetch task:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTask();
  }, [params.id]);

  const handleStatusChange = async (status: TaskStatus, note?: string): Promise<void> => {
    setIsUpdating(true);
    try {
      // TODO: Replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (task) {
        setTask({
          ...task,
          status,
          updatedAt: new Date().toISOString(),
        });
      }

      console.log('Status updated:', status, note);
    } catch (error) {
      console.error('Failed to update task status:', error);
    } finally {
      setIsUpdating(false);
    }
  };

  const handleEdit = (): void => {
    // TODO: Implement edit functionality
    console.log('Edit task:', task?.id);
  };

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
        <Button
          variant="ghost"
          onClick={() => router.push('/super-admin/tasks')}
          className="w-fit"
        >
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
