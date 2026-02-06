'use client';

import type { ReactNode } from 'react';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { CheckSquare, Clock, ArrowRight, CheckCircle2, X } from 'lucide-react';
import {
  Tabs,
  TabsList,
  TabsTrigger,
  TabsContent,
  TaskFilters,
  TaskList,
  Badge,
} from '@hr-portal/ui';
import type {
  Task,
  TaskId,
  TaskStatus,
  TaskFilters as TaskFiltersType,
} from '@hr-portal/ui';
import { useAuth } from '@/contexts/AuthContext';

// Mock data - Replace with actual API calls
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
    ],
  },
  {
    id: '2' as TaskId,
    title: 'Prepare Monthly Report',
    description: 'Compile and prepare the monthly departmental report for submission to management.',
    priority: 'medium',
    status: 'pending',
    category: 'Reports',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    createdBy: 'admin-1',
    createdByName: 'Admin User',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    assignees: [
      {
        id: 'current-user',
        name: 'Current User',
        email: 'user@company.com',
        role: 'employee',
        department: 'Finance',
        avatarUrl: '',
        assignedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
  },
  {
    id: '3' as TaskId,
    title: 'Code Review: Authentication Module',
    description: 'Review the new authentication module implementation and provide feedback.',
    priority: 'high',
    status: 'completed',
    category: 'Engineering',
    dueDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    createdBy: 'admin-1',
    createdByName: 'Admin User',
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    assignees: [
      {
        id: 'current-user',
        name: 'Current User',
        email: 'user@company.com',
        role: 'employee',
        department: 'Engineering',
        avatarUrl: '',
        assignedAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(),
        completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
  },
  {
    id: '4' as TaskId,
    title: 'Update Documentation',
    description: 'Update the project documentation with recent changes and new features.',
    priority: 'low',
    status: 'blocked',
    category: 'Documentation',
    dueDate: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000).toISOString(),
    createdBy: 'admin-1',
    createdByName: 'Admin User',
    createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    assignees: [
      {
        id: 'current-user',
        name: 'Current User',
        email: 'user@company.com',
        role: 'employee',
        department: 'Engineering',
        avatarUrl: '',
        assignedAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
      },
    ],
  },
];

export default function MyTasksPage(): ReactNode {
  const { user } = useAuth();
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>(mockTasks);
  const [activeTab, setActiveTab] = useState<TaskStatus | 'all'>('all');
  const [filters, setFilters] = useState<TaskFiltersType>({});

  // Calculate task counts per status
  const taskCounts = useMemo(() => {
    return {
      all: tasks.length,
      pending: tasks.filter((t) => t.status === 'pending').length,
      in_progress: tasks.filter((t) => t.status === 'in_progress').length,
      completed: tasks.filter((t) => t.status === 'completed').length,
      blocked: tasks.filter((t) => t.status === 'blocked').length,
    };
  }, [tasks]);

  // Filter tasks by active tab and additional filters
  const filteredTasks = useMemo(() => {
    let result = tasks;

    // Filter by active tab
    if (activeTab !== 'all') {
      result = result.filter((task) => task.status === activeTab);
    }

    // Apply additional filters
    if (filters.search) {
      const searchLower = filters.search.toLowerCase();
      result = result.filter(
        (task) =>
          task.title.toLowerCase().includes(searchLower) ||
          task.description.toLowerCase().includes(searchLower)
      );
    }

    if (filters.priority && filters.priority !== 'all') {
      result = result.filter((task) => task.priority === filters.priority);
    }

    if (filters.dateFrom) {
      result = result.filter((task) => new Date(task.dueDate) >= new Date(filters.dateFrom!));
    }

    if (filters.dateTo) {
      result = result.filter((task) => new Date(task.dueDate) <= new Date(filters.dateTo!));
    }

    return result;
  }, [tasks, activeTab, filters]);

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
    router.push(`/tasks/${taskId}`);
  };

  const tabs = [
    {
      value: 'all' as const,
      label: 'All Tasks',
      icon: CheckSquare,
      count: taskCounts.all,
    },
    {
      value: 'pending' as const,
      label: 'Pending',
      icon: Clock,
      count: taskCounts.pending,
    },
    {
      value: 'in_progress' as const,
      label: 'In Progress',
      icon: ArrowRight,
      count: taskCounts.in_progress,
    },
    {
      value: 'completed' as const,
      label: 'Completed',
      icon: CheckCircle2,
      count: taskCounts.completed,
    },
    {
      value: 'blocked' as const,
      label: 'Blocked',
      icon: X,
      count: taskCounts.blocked,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">My Tasks</h1>
        <p className="text-muted-foreground">
          View and manage all tasks assigned to you
        </p>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as TaskStatus | 'all')}>
        <TabsList className="grid w-full grid-cols-5 lg:w-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger key={tab.value} value={tab.value} className="gap-2">
                <Icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
                <Badge variant="secondary" className="ml-1">
                  {tab.count}
                </Badge>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* Filters */}
        <div className="mt-6">
          <TaskFilters
            filters={filters}
            onFiltersChange={setFilters}
            showAssigneeFilter={false}
          />
        </div>

        {/* Task Lists */}
        {tabs.map((tab) => (
          <TabsContent key={tab.value} value={tab.value} className="space-y-4">
            <TaskList
              tasks={filteredTasks}
              variant="cards"
              onStatusChange={handleStatusChange}
              onViewDetails={handleViewDetails}
              showAssignees={false}
              emptyMessage={
                tab.value === 'all'
                  ? 'No tasks assigned to you yet'
                  : `No ${tab.label.toLowerCase()} tasks`
              }
            />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
