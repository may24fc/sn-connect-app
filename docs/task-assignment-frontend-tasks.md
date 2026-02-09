# Task Assignment Feature - Frontend Development Tasks

## Overview

This document provides a structured task list for implementing the task assignment feature. Tasks are organized by priority and include specific files to create/modify, component specifications, and acceptance criteria.

---

## Phase 1: Type Definitions & Foundation

### Task 1.1: Create Task Type Definitions
**Priority:** Critical
**File:** `/workspaces/sn-hr-portal/packages/ui/src/types/task.types.ts`

```typescript
// Branded Types
export type TaskId = string & { __brand: 'TaskId' };
export type TaskAssignmentId = string & { __brand: 'TaskAssignmentId' };

// Enums
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'blocked';

// Interfaces
export interface Task {
  id: TaskId;
  title: string;
  description: string;
  priority: TaskPriority;
  status: TaskStatus;
  category?: string;
  dueDate: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt: string;
  assignees: TaskAssignee[];
}

export interface TaskAssignee {
  id: string;
  name: string;
  email: string;
  role: 'employee' | 'intern';
  department: string;
  avatarUrl?: string;
  assignedAt: string;
  completedAt?: string;
}

export interface TaskFormData {
  title: string;
  description: string;
  priority: TaskPriority;
  dueDate: string;
  category?: string;
  assigneeIds: string[];
}

export interface TaskFilters {
  status?: TaskStatus | 'all';
  priority?: TaskPriority | 'all';
  assigneeId?: string;
  search?: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface TaskDashboardStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  overdue: number;
}

// Status configuration
export const TASK_PRIORITY_CONFIG: Record<TaskPriority, {
  label: string;
  variant: 'success' | 'warning' | 'error' | 'secondary';
  icon: string;
}> = {
  low: { label: 'Low', variant: 'success', icon: 'Circle' },
  medium: { label: 'Medium', variant: 'warning', icon: 'Circle' },
  high: { label: 'High', variant: 'error', icon: 'Circle' },
  urgent: { label: 'Urgent', variant: 'error', icon: 'AlertCircle' },
};

export const TASK_STATUS_CONFIG: Record<TaskStatus, {
  label: string;
  variant: 'secondary' | 'default' | 'success' | 'error';
  icon: string;
}> = {
  pending: { label: 'Pending', variant: 'secondary', icon: 'Clock' },
  in_progress: { label: 'In Progress', variant: 'default', icon: 'ArrowRight' },
  completed: { label: 'Completed', variant: 'success', icon: 'Check' },
  blocked: { label: 'Blocked', variant: 'error', icon: 'X' },
};
```

**Acceptance Criteria:**
- [ ] All types follow existing branded type pattern
- [ ] Configuration objects exported for component use
- [ ] Types exported from `packages/ui/src/index.ts`

---

### Task 1.2: Update UI Package Exports
**Priority:** Critical
**File:** `/workspaces/sn-hr-portal/packages/ui/src/index.ts`

Add exports for new task types and components (as they are created).

---

## Phase 2: UI Components

### Task 2.1: TaskPriorityBadge Component
**Priority:** High
**File:** `/workspaces/sn-hr-portal/packages/ui/src/components/tasks/TaskPriorityBadge.tsx`

```typescript
interface TaskPriorityBadgeProps {
  priority: TaskPriority;
  size?: 'sm' | 'default';
  showIcon?: boolean;
  className?: string;
}
```

**Pattern Reference:** `/workspaces/sn-hr-portal/packages/ui/src/components/internship/InternStatusBadge.tsx`

**Acceptance Criteria:**
- [ ] Uses Badge primitive from existing UI library
- [ ] Color-coded by priority (green/yellow/orange/red)
- [ ] Includes icon for accessibility
- [ ] Supports size variants

---

### Task 2.2: TaskStatusBadge Component
**Priority:** High
**File:** `/workspaces/sn-hr-portal/packages/ui/src/components/tasks/TaskStatusBadge.tsx`

```typescript
interface TaskStatusBadgeProps {
  status: TaskStatus;
  size?: 'sm' | 'default';
  showIcon?: boolean;
  className?: string;
}
```

**Acceptance Criteria:**
- [ ] Uses Badge primitive
- [ ] Color-coded by status
- [ ] Icon included for accessibility

---

### Task 2.3: TaskCard Component
**Priority:** High
**File:** `/workspaces/sn-hr-portal/packages/ui/src/components/tasks/TaskCard.tsx`

```typescript
interface TaskCardProps {
  task: Task;
  variant?: 'default' | 'compact';
  onStatusChange?: (taskId: TaskId, status: TaskStatus) => void;
  onViewDetails?: (taskId: TaskId) => void;
  showAssignees?: boolean;
  className?: string;
}
```

**Pattern Reference:**
- `/workspaces/sn-hr-portal/packages/ui/src/components/internship/DailyReportCard.tsx`
- `/workspaces/sn-hr-portal/apps/web/src/components/dashboards/EmployeeDashboard.tsx` (action cards)

**Acceptance Criteria:**
- [ ] Displays task title, description preview, due date
- [ ] Shows priority and status badges
- [ ] Inline status dropdown for updates
- [ ] Click handler for viewing details
- [ ] Compact variant for dashboard widgets
- [ ] Completed tasks have muted styling

---

### Task 2.4: TaskSummaryCards Component
**Priority:** High
**File:** `/workspaces/sn-hr-portal/packages/ui/src/components/tasks/TaskSummaryCards.tsx`

```typescript
interface TaskSummaryCardsProps {
  stats: TaskDashboardStats;
  className?: string;
}
```

**Pattern Reference:** `/workspaces/sn-hr-portal/apps/web/src/app/(admin)/super-admin/dashboard/page.tsx` (lines 123-193)

**Acceptance Criteria:**
- [ ] 4-column responsive grid
- [ ] Each card shows count with icon
- [ ] Uses existing Card components
- [ ] Proper color coding (primary, warning, success, error)

---

### Task 2.5: TaskFilters Component
**Priority:** High
**File:** `/workspaces/sn-hr-portal/packages/ui/src/components/tasks/TaskFilters.tsx`

```typescript
interface TaskFiltersProps {
  filters: TaskFilters;
  onFiltersChange: (filters: TaskFilters) => void;
  assigneeOptions?: { id: string; name: string }[];
  showAssigneeFilter?: boolean;
  className?: string;
}
```

**Acceptance Criteria:**
- [ ] Search input (left-aligned)
- [ ] Status dropdown
- [ ] Priority dropdown
- [ ] Assignee dropdown (optional, for admin view)
- [ ] Date range picker (optional)
- [ ] Clear filters button
- [ ] Responsive layout

---

### Task 2.6: TaskAssigneeSelect Component
**Priority:** High
**File:** `/workspaces/sn-hr-portal/packages/ui/src/components/tasks/TaskAssigneeSelect.tsx`

```typescript
interface TaskAssigneeSelectProps {
  selectedIds: string[];
  onSelectionChange: (ids: string[]) => void;
  employees: TaskAssignee[];
  isLoading?: boolean;
  className?: string;
}
```

**Acceptance Criteria:**
- [ ] Search input for filtering
- [ ] Role filter (All, Employees, Interns)
- [ ] Department filter
- [ ] Scrollable checkbox list
- [ ] Avatar, name, role, department for each person
- [ ] Selected shown as removable chips below
- [ ] Keyboard accessible
- [ ] Loading state

---

### Task 2.7: TaskForm Component
**Priority:** High
**File:** `/workspaces/sn-hr-portal/packages/ui/src/components/tasks/TaskForm.tsx`

```typescript
interface TaskFormProps {
  onSubmit: (data: TaskFormData) => Promise<void>;
  employees: TaskAssignee[];
  isSubmitting?: boolean;
  initialData?: Partial<TaskFormData>;
  mode?: 'create' | 'edit';
  className?: string;
}
```

**Pattern Reference:** `/workspaces/sn-hr-portal/packages/ui/src/components/internship/EODReportForm.tsx`

**Acceptance Criteria:**
- [ ] Title input (required, validated)
- [ ] Description textarea (required, min 20 chars)
- [ ] Priority select
- [ ] Due date picker (required, future dates)
- [ ] Category select (optional)
- [ ] TaskAssigneeSelect integration
- [ ] Form validation with error messages
- [ ] Loading state during submission
- [ ] Clear/Reset functionality

---

### Task 2.8: TaskList Component
**Priority:** High
**File:** `/workspaces/sn-hr-portal/packages/ui/src/components/tasks/TaskList.tsx`

```typescript
interface TaskListProps {
  tasks: Task[];
  variant?: 'table' | 'cards';
  onStatusChange?: (taskId: TaskId, status: TaskStatus) => void;
  onViewDetails?: (taskId: TaskId) => void;
  onEdit?: (taskId: TaskId) => void;
  onDelete?: (taskId: TaskId) => void;
  selectable?: boolean;
  selectedIds?: TaskId[];
  onSelectionChange?: (ids: TaskId[]) => void;
  isLoading?: boolean;
  emptyMessage?: string;
  className?: string;
}
```

**Pattern Reference:** `/workspaces/sn-hr-portal/packages/ui/src/primitives/table.tsx`

**Acceptance Criteria:**
- [ ] Table variant for admin view
- [ ] Card list variant for employee view
- [ ] Bulk selection support (table variant)
- [ ] Actions dropdown per row
- [ ] Pagination support
- [ ] Empty state
- [ ] Loading skeleton

---

### Task 2.9: TaskDetailView Component
**Priority:** Medium
**File:** `/workspaces/sn-hr-portal/packages/ui/src/components/tasks/TaskDetailView.tsx`

```typescript
interface TaskDetailViewProps {
  task: Task;
  onStatusChange?: (status: TaskStatus, note?: string) => void;
  isUpdating?: boolean;
  canUpdateStatus?: boolean;
  className?: string;
}
```

**Acceptance Criteria:**
- [ ] Full task details display
- [ ] Metadata grid (due date, category, assigned by, created)
- [ ] Status update form (if canUpdateStatus)
- [ ] Optional note input
- [ ] Priority badge prominent

---

### Task 2.10: Component Index & Exports
**Priority:** High
**File:** `/workspaces/sn-hr-portal/packages/ui/src/components/tasks/index.ts`

Export all task components for barrel import.

---

## Phase 3: Page Implementation

### Task 3.1: Super Admin Task Management Page
**Priority:** Critical
**File:** `/workspaces/sn-hr-portal/apps/web/src/app/(admin)/super-admin/tasks/page.tsx`

**Pattern Reference:** `/workspaces/sn-hr-portal/apps/web/src/app/(admin)/super-admin/dashboard/page.tsx`

**Implementation:**
```typescript
export default function TaskManagementPage(): ReactNode {
  // State for tasks, filters, pagination
  // State for create dialog
  // Handlers for CRUD operations

  return (
    <div className="space-y-6">
      {/* Header with title and Create Task button */}
      {/* TaskSummaryCards */}
      {/* TaskFilters */}
      {/* TaskList variant="table" */}
      {/* Dialog with TaskForm */}
    </div>
  );
}
```

**Acceptance Criteria:**
- [ ] Page header with "Create Task" button
- [ ] Summary cards row
- [ ] Filter bar
- [ ] Task table with all columns
- [ ] Bulk selection and actions
- [ ] Create task dialog
- [ ] Edit task dialog
- [ ] Delete confirmation
- [ ] Success/error toasts
- [ ] Loading states

---

### Task 3.2: Super Admin Task Detail Page
**Priority:** Medium
**File:** `/workspaces/sn-hr-portal/apps/web/src/app/(admin)/super-admin/tasks/[id]/page.tsx`

**Acceptance Criteria:**
- [ ] Back navigation
- [ ] Full task details
- [ ] Edit capability
- [ ] Assignee management
- [ ] Activity/history log (optional)

---

### Task 3.3: Employee/Intern My Tasks Page
**Priority:** Critical
**File:** `/workspaces/sn-hr-portal/apps/web/src/app/(employee)/tasks/page.tsx`

**Implementation:**
```typescript
export default function MyTasksPage(): ReactNode {
  // State for tasks, filters
  // Active tab state

  return (
    <div className="space-y-6">
      {/* Header */}
      {/* Status tabs */}
      {/* Simplified filters */}
      {/* TaskList variant="cards" */}
    </div>
  );
}
```

**Acceptance Criteria:**
- [ ] Page header
- [ ] Status tabs with counts
- [ ] Search and filter
- [ ] Task cards with inline status update
- [ ] Loading states
- [ ] Empty states per tab

---

### Task 3.4: Task Detail Page (Employee/Intern)
**Priority:** Medium
**File:** `/workspaces/sn-hr-portal/apps/web/src/app/(employee)/tasks/[id]/page.tsx`

**Acceptance Criteria:**
- [ ] Back navigation
- [ ] TaskDetailView component
- [ ] Status update form
- [ ] Success/error handling

---

## Phase 4: Navigation & Layout Updates

### Task 4.1: Update Sidebar Navigation
**Priority:** Critical
**File:** `/workspaces/sn-hr-portal/packages/ui/src/layout/Sidebar.tsx`

**Changes Required:**
1. Import `CheckSquare` icon from lucide-react
2. Add to `superAdminNavItems`:
   ```typescript
   { label: 'Task Management', href: '/super-admin/tasks', icon: ClipboardList }
   ```
3. Add to `employeeNavItems`:
   ```typescript
   { label: 'My Tasks', href: '/tasks', icon: CheckSquare }
   ```
4. Add to `internNavItems`:
   ```typescript
   { label: 'My Tasks', href: '/tasks', icon: CheckSquare }
   ```

**Acceptance Criteria:**
- [ ] Navigation item appears for each role
- [ ] Active state works correctly
- [ ] Icon displays properly

---

### Task 4.2: Add Tasks Widget to Employee Dashboard
**Priority:** High
**File:** `/workspaces/sn-hr-portal/apps/web/src/components/dashboards/EmployeeDashboard.tsx`

**Changes Required:**
Add "Assigned Tasks" card after "Quick Actions" section:

```typescript
{/* Assigned Tasks */}
<Card>
  <CardHeader className="flex flex-row items-center justify-between">
    <div>
      <CardTitle className="flex items-center gap-2">
        <CheckSquare className="h-5 w-5" />
        Assigned Tasks
      </CardTitle>
      <CardDescription>Tasks requiring your attention</CardDescription>
    </div>
    <Button variant="outline" size="sm" asChild>
      <Link href="/tasks">View All</Link>
    </Button>
  </CardHeader>
  <CardContent>
    {/* Task cards (compact variant) */}
  </CardContent>
</Card>
```

**Acceptance Criteria:**
- [ ] Shows 3-5 most recent/urgent tasks
- [ ] Compact task card display
- [ ] "View All" link to /tasks
- [ ] Handles empty state

---

### Task 4.3: Add Tasks Widget to Intern Dashboard
**Priority:** High
**File:** `/workspaces/sn-hr-portal/apps/web/src/components/dashboards/InternDashboard.tsx`

Same changes as Task 4.2.

---

## Phase 5: Notification System

### Task 5.1: Notification Panel Component
**Priority:** High
**File:** `/workspaces/sn-hr-portal/packages/ui/src/components/NotificationPanel.tsx`

```typescript
interface NotificationPanelProps {
  notifications: Notification[];
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead: () => void;
  onNotificationClick: (notification: Notification) => void;
  isOpen: boolean;
  onClose: () => void;
}
```

**Acceptance Criteria:**
- [ ] Slide-out panel or dropdown
- [ ] List of notifications
- [ ] Unread indicator
- [ ] Mark as read on click
- [ ] Mark all as read button
- [ ] Empty state
- [ ] Keyboard accessible

---

### Task 5.2: Integrate Notifications with Header
**Priority:** High
**Files:**
- `/workspaces/sn-hr-portal/packages/ui/src/layout/Header.tsx`
- `/workspaces/sn-hr-portal/apps/web/src/app/(admin)/layout.tsx`
- `/workspaces/sn-hr-portal/apps/web/src/app/(employee)/layout.tsx`

**Changes Required:**
1. Add state for notification panel visibility
2. Connect notification count to actual data
3. Render NotificationPanel when open

**Acceptance Criteria:**
- [ ] Bell icon shows actual count
- [ ] Clicking opens notification panel
- [ ] Notifications from API/context

---

## Phase 6: State Management & API Integration

### Task 6.1: Create Tasks Context/Hook
**Priority:** High
**File:** `/workspaces/sn-hr-portal/apps/web/src/contexts/TasksContext.tsx` or `/hooks/useTasks.ts`

**Implementation:**
```typescript
interface TasksContextValue {
  tasks: Task[];
  isLoading: boolean;
  error: Error | null;
  filters: TaskFilters;
  setFilters: (filters: TaskFilters) => void;
  createTask: (data: TaskFormData) => Promise<Task>;
  updateTask: (id: TaskId, data: Partial<TaskFormData>) => Promise<Task>;
  updateTaskStatus: (id: TaskId, status: TaskStatus) => Promise<void>;
  deleteTask: (id: TaskId) => Promise<void>;
  refetch: () => Promise<void>;
}
```

**Acceptance Criteria:**
- [ ] Fetches tasks on mount
- [ ] Handles filtering
- [ ] Optimistic updates
- [ ] Error handling
- [ ] Loading states

---

### Task 6.2: Create Notifications Context/Hook
**Priority:** High
**File:** `/workspaces/sn-hr-portal/apps/web/src/contexts/NotificationsContext.tsx`

**Acceptance Criteria:**
- [ ] Fetches notifications
- [ ] Unread count
- [ ] Mark as read
- [ ] Real-time updates (polling or WebSocket)

---

## Phase 7: Testing

### Task 7.1: Unit Tests for Task Components
**Priority:** High
**Files:** `/workspaces/sn-hr-portal/packages/ui/src/components/tasks/__tests__/`

**Test Coverage:**
- [ ] TaskPriorityBadge renders correctly
- [ ] TaskStatusBadge renders correctly
- [ ] TaskCard displays data correctly
- [ ] TaskForm validates inputs
- [ ] TaskList handles empty state
- [ ] TaskFilters updates correctly

---

### Task 7.2: Integration Tests for Task Pages
**Priority:** Medium
**Files:** E2E tests in `/workspaces/sn-hr-portal/tests/e2e/`

**Test Scenarios:**
- [ ] Super admin can create task
- [ ] Super admin can assign task
- [ ] Employee sees assigned tasks
- [ ] Employee can update task status
- [ ] Notifications appear on assignment

---

## Implementation Order (Recommended)

### Week 1: Foundation
1. Task 1.1: Type definitions
2. Task 1.2: Export updates
3. Task 2.1: TaskPriorityBadge
4. Task 2.2: TaskStatusBadge
5. Task 4.1: Sidebar updates

### Week 2: Core Components
1. Task 2.3: TaskCard
2. Task 2.4: TaskSummaryCards
3. Task 2.5: TaskFilters
4. Task 2.8: TaskList
5. Task 2.10: Component exports

### Week 3: Forms & Assignment
1. Task 2.6: TaskAssigneeSelect
2. Task 2.7: TaskForm
3. Task 2.9: TaskDetailView
4. Task 6.1: Tasks context

### Week 4: Pages
1. Task 3.1: Super Admin Task Management
2. Task 3.2: Super Admin Task Detail
3. Task 3.3: My Tasks Page
4. Task 3.4: Task Detail Page

### Week 5: Dashboard & Notifications
1. Task 4.2: Employee Dashboard widget
2. Task 4.3: Intern Dashboard widget
3. Task 5.1: Notification Panel
4. Task 5.2: Header integration
5. Task 6.2: Notifications context

### Week 6: Testing & Polish
1. Task 7.1: Unit tests
2. Task 7.2: Integration tests
3. Bug fixes and refinements

---

## Definition of Done

Each task is complete when:
- [ ] Code follows TypeScript strict mode
- [ ] Components use explicit return types
- [ ] Follows existing patterns in codebase
- [ ] Responsive at all breakpoints
- [ ] Keyboard accessible
- [ ] Screen reader friendly
- [ ] Unit tests pass (where applicable)
- [ ] No TypeScript errors
- [ ] Code reviewed
