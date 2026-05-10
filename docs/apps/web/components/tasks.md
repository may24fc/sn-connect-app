# Task Components Reference

> Audience: Developers

Task management UI components used in the task list, task detail, and task creation pages.

**Location:** `packages/ui/src/components/tasks/`  
**Import:** `import { TaskCard, TaskForm, TaskList, TaskStatusBadge, ... } from '@hr-portal/ui';`

---

## TaskPriorityBadge

Renders a `Badge` with color mapped to task priority.

| Priority | Color |
|----------|-------|
| `low` | Secondary (zinc) |
| `medium` | Indigo |
| `high` | Warning (amber) |
| `urgent` | Destructive (rose) |

```tsx
<TaskPriorityBadge priority="high" />
```

---

## TaskStatusBadge

Renders a `Badge` with color mapped to task status.

| Status | Color |
|--------|-------|
| `todo` | Secondary |
| `in_progress` | Indigo |
| `done` | Success (emerald) |
| `cancelled` | Destructive |

```tsx
<TaskStatusBadge status="in_progress" />
```

---

## TaskCard

Single task list item displaying title, priority, status, assignee, and due date. Supports click handler for navigation.

```typescript
interface TaskCardProps {
  task: Task;
  onClick?: (task: Task) => void;
}
```

---

## TaskSummaryCards

Dashboard summary showing task counts by status (total, in progress, completed, overdue).

```typescript
interface TaskSummaryCardsProps {
  stats: TaskDashboardStats;
}
```

---

## TaskFilters

Filter bar for task lists. Controls status, priority, and assignee filters.

```typescript
interface TaskFiltersProps {
  filters: TaskFiltersState;
  onChange: (filters: TaskFiltersState) => void;
  assignees?: TaskAssignee[];
}
```

---

## TaskAssigneeSelect

User picker dropdown for assigning tasks. Shows avatar, name, and role.

```typescript
interface TaskAssigneeSelectProps {
  value?: string;
  onChange: (assigneeId: string) => void;
  assignees: TaskAssignee[];
}
```

---

## TaskForm

Creation/edit form for tasks with fields: title, description, priority, status, due date, assignee.

```typescript
interface TaskFormProps {
  initialData?: Partial<TaskFormData>;
  onSubmit: (data: TaskFormData) => void;
  assignees?: TaskAssignee[];
  isLoading?: boolean;
}
```

---

## TaskList

Sorted task list rendering `TaskCard` items with optional empty state.

```typescript
interface TaskListProps {
  tasks: Task[];
  onTaskClick?: (task: Task) => void;
  isLoading?: boolean;
}
```

---

## TaskDetailView

Full task detail panel with title, description, status controls, comments section, and activity history.

```typescript
interface TaskDetailViewProps {
  task: Task;
  onStatusChange?: (status: TaskStatus) => void;
  onEdit?: () => void;
  comments?: Comment[];
}
```

---

*Last updated: 2026-02-27*
