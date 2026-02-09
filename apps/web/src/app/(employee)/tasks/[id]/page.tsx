'use client';

import { Button, TaskDetailView } from '@hr-portal/ui';
import type { Task, TaskStatus } from '@hr-portal/ui';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { use, useEffect, useState } from 'react';

// Mock data - Replace with actual API calls
const mockTask: Task = {
  id: '1' as any,
  title: 'Review Q1 Financial Reports',
  description:
    'Analyze and review all financial reports from Q1, focusing on budget variances and cost optimization opportunities. This includes reviewing all departmental budgets, identifying areas of overspending, and preparing recommendations for the executive team.\n\nPlease ensure that:\n- All departmental reports are reviewed\n- Budget variance analysis is completed\n- Recommendations are documented\n- Final report is submitted by the due date',
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
      id: 'current-user',
      name: 'Current User',
      email: 'user@company.com',
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
        await new Promise((resolve) => setTimeout(resolve, 500));
        setTask(mockTask);
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
      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (task) {
        const updatedAssignees = task.assignees.map((assignee) => {
          if (assignee.id === 'current-user' && status === 'completed') {
            return {
              ...assignee,
              completedAt: new Date().toISOString(),
            };
          }
          return assignee;
        });

        setTask({
          ...task,
          status,
          updatedAt: new Date().toISOString(),
          assignees: updatedAssignees,
        });
      }

      // Show success message (you can use a toast notification library)
      alert('Task status updated successfully!');
    } catch (error) {
      console.error('Failed to update task status:', error);
      alert('Failed to update task status. Please try again.');
    } finally {
      setIsUpdating(false);
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
          <Button onClick={() => router.push('/tasks')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to My Tasks
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Button variant="ghost" onClick={() => router.push('/tasks')} className="w-fit">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to My Tasks
      </Button>

      {/* Task Details */}
      <TaskDetailView
        task={task}
        onStatusChange={handleStatusChange}
        isUpdating={isUpdating}
        canUpdateStatus={true}
      />
    </div>
  );
}
