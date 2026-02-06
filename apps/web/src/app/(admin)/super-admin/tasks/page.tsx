'use client';

import type { ReactNode } from 'react';
import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, Trash2 } from 'lucide-react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  TaskSummaryCards,
  TaskFilters,
  TaskList,
  TaskForm,
} from '@hr-portal/ui';
import type {
  Task,
  TaskId,
  TaskStatus,
  TaskFilters as TaskFiltersType,
  TaskDashboardStats,
  TaskFormData,
  TaskAssignee,
} from '@hr-portal/ui';
import { useAuth } from '@/contexts/AuthContext';

// Mock data - Replace with actual API calls
const mockEmployees: TaskAssignee[] = [
  {
    id: '1',
    name: 'John Smith',
    email: 'john.smith@company.com',
    role: 'employee',
    department: 'Engineering',
    avatarUrl: '',
    assignedAt: new Date().toISOString(),
  },
  {
    id: '2',
    name: 'Sarah Johnson',
    email: 'sarah.johnson@company.com',
    role: 'employee',
    department: 'Marketing',
    avatarUrl: '',
    assignedAt: new Date().toISOString(),
  },
  {
    id: '3',
    name: 'Mike Chen',
    email: 'mike.chen@company.com',
    role: 'employee',
    department: 'Finance',
    avatarUrl: '',
    assignedAt: new Date().toISOString(),
  },
  {
    id: '4',
    name: 'Emily Davis',
    email: 'emily.davis@company.com',
    role: 'intern',
    department: 'HR',
    avatarUrl: '',
    assignedAt: new Date().toISOString(),
  },
];

const mockTasks: Task[] = [
  {
    id: '1' as TaskId,
    title: 'Review Q1 Financial Reports',
    description: 'Analyze and review all financial reports from Q1, focusing on budget variances and cost optimization opportunities.',
    priority: 'high',
    status: 'in_progress',
    category: 'Finance',
    dueDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    createdBy: 'admin-1',
    createdByName: 'Admin User',
    createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    assignees: [mockEmployees[2]],
  },
  {
    id: '2' as TaskId,
    title: 'Update Employee Handbook',
    description: 'Review and update the employee handbook with new policies and procedures for remote work.',
    priority: 'medium',
    status: 'pending',
    category: 'HR',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    createdBy: 'admin-1',
    createdByName: 'Admin User',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    assignees: [mockEmployees[3]],
  },
  {
    id: '3' as TaskId,
    title: 'Prepare Marketing Campaign Analysis',
    description: 'Compile data and insights from recent marketing campaigns to present to the executive team.',
    priority: 'urgent',
    status: 'blocked',
    category: 'Marketing',
    dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    createdBy: 'admin-1',
    createdByName: 'Admin User',
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    assignees: [mockEmployees[1]],
  },
  {
    id: '4' as TaskId,
    title: 'Code Review for Authentication Module',
    description: 'Review the new authentication module implementation and provide feedback on security and best practices.',
    priority: 'high',
    status: 'completed',
    category: 'Engineering',
    dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    createdBy: 'admin-1',
    createdByName: 'Admin User',
    createdAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    assignees: [mockEmployees[0]],
  },
];

export default function TaskManagementPage(): ReactNode {
  const { user } = useAuth();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>(mockTasks);
  const [filters, setFilters] = useState<TaskFiltersType>({});
  const [selectedIds, setSelectedIds] = useState<TaskId[]>([]);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Calculate dashboard stats
  const stats: TaskDashboardStats = useMemo(() => {
    const now = new Date();
    return {
      total: tasks.length,
      pending: tasks.filter((t) => t.status === 'pending').length,
      inProgress: tasks.filter((t) => t.status === 'in_progress').length,
      completed: tasks.filter((t) => t.status === 'completed').length,
      overdue: tasks.filter(
        (t) => t.status !== 'completed' && new Date(t.dueDate) < now
      ).length,
    };
  }, [tasks]);

  // Filter tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        const matchesSearch =
          task.title.toLowerCase().includes(searchLower) ||
          task.description.toLowerCase().includes(searchLower);
        if (!matchesSearch) return false;
      }

      if (filters.status && filters.status !== 'all') {
        if (task.status !== filters.status) return false;
      }

      if (filters.priority && filters.priority !== 'all') {
        if (task.priority !== filters.priority) return false;
      }

      if (filters.assigneeId) {
        const hasAssignee = task.assignees.some((a) => a.id === filters.assigneeId);
        if (!hasAssignee) return false;
      }

      if (filters.dateFrom) {
        if (new Date(task.dueDate) < new Date(filters.dateFrom)) return false;
      }

      if (filters.dateTo) {
        if (new Date(task.dueDate) > new Date(filters.dateTo)) return false;
      }

      return true;
    });
  }, [tasks, filters]);

  // Get assignee options for filter
  const assigneeOptions = useMemo(() => {
    const uniqueAssignees = new Map<string, { id: string; name: string }>();
    tasks.forEach((task) => {
      task.assignees.forEach((assignee) => {
        if (!uniqueAssignees.has(assignee.id)) {
          uniqueAssignees.set(assignee.id, {
            id: assignee.id,
            name: assignee.name,
          });
        }
      });
    });
    return Array.from(uniqueAssignees.values());
  }, [tasks]);

  const handleCreateTask = async (data: TaskFormData): Promise<void> => {
    setIsSubmitting(true);
    try {
      // TODO: Replace with actual API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const newTask: Task = {
        id: `${tasks.length + 1}` as TaskId,
        title: data.title,
        description: data.description,
        priority: data.priority,
        status: 'pending',
        category: data.category,
        dueDate: data.dueDate,
        createdBy: user?.id || 'admin-1',
        createdByName: user?.name || 'Admin User',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        assignees: mockEmployees.filter((emp) => data.assigneeIds.includes(emp.id)),
      };

      setTasks([newTask, ...tasks]);
      setIsCreateDialogOpen(false);
    } catch (error) {
      console.error('Failed to create task:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = (taskId: TaskId, status: TaskStatus): void => {
    setTasks(
      tasks.map((task) =>
        task.id === taskId
          ? { ...task, status, updatedAt: new Date().toISOString() }
          : task
      )
    );
  };

  const handleViewDetails = (taskId: TaskId): void => {
    router.push(`/super-admin/tasks/${taskId}`);
  };

  const handleEdit = (taskId: TaskId): void => {
    // TODO: Implement edit dialog
    console.log('Edit task:', taskId);
  };

  const handleDelete = (taskId: TaskId): void => {
    // TODO: Implement delete confirmation dialog
    if (confirm('Are you sure you want to delete this task?')) {
      setTasks(tasks.filter((task) => task.id !== taskId));
    }
  };

  const handleBulkDelete = (): void => {
    if (confirm(`Are you sure you want to delete ${selectedIds.length} tasks?`)) {
      setTasks(tasks.filter((task) => !selectedIds.includes(task.id)));
      setSelectedIds([]);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Task Management</h1>
          <p className="text-muted-foreground">
            Create and assign tasks to team members
          </p>
        </div>
        <div className="flex gap-2">
          {selectedIds.length > 0 && (
            <Button variant="destructive" onClick={handleBulkDelete}>
              <Trash2 className="mr-2 h-4 w-4" />
              Delete ({selectedIds.length})
            </Button>
          )}
          <Button onClick={() => setIsCreateDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create Task
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <TaskSummaryCards stats={stats} />

      {/* Filters */}
      <TaskFilters
        filters={filters}
        onFiltersChange={setFilters}
        assigneeOptions={assigneeOptions}
        showAssigneeFilter={true}
      />

      {/* Task List */}
      <TaskList
        tasks={filteredTasks}
        variant="table"
        onStatusChange={handleStatusChange}
        onViewDetails={handleViewDetails}
        onEdit={handleEdit}
        onDelete={handleDelete}
        selectable={true}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
      />

      {/* Create Task Dialog */}
      <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Task</DialogTitle>
            <DialogDescription>
              Assign a new task to team members with clear priorities and deadlines
            </DialogDescription>
          </DialogHeader>
          <TaskForm
            onSubmit={handleCreateTask}
            employees={mockEmployees}
            isSubmitting={isSubmitting}
            mode="create"
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
