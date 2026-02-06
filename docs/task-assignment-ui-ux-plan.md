# Task Assignment Feature - UI/UX Design Plan

## Executive Summary

This document provides a comprehensive UI/UX plan for implementing a task assignment feature in the SN HR Portal. The feature enables Super Admins to create and assign tasks to employees and interns, with a notification system to alert assignees.

**User Story:** "I as the super admin can assign some tasks and employees/interns should be notified"

---

## Table of Contents

1. [Research & Design Rationale](#research--design-rationale)
2. [User Flow Diagrams](#user-flow-diagrams)
3. [Information Architecture](#information-architecture)
4. [Wireframe Descriptions](#wireframe-descriptions)
5. [Component Hierarchy](#component-hierarchy)
6. [Notification System Design](#notification-system-design)
7. [Accessibility Requirements](#accessibility-requirements)
8. [Mobile Responsiveness](#mobile-responsiveness)
9. [Design Tokens & Styling](#design-tokens--styling)
10. [Integration Points](#integration-points)

---

## Research & Design Rationale

### Evidence-Based Design Decisions

#### F-Pattern Reading (Nielsen Norman Group)
- **Application:** Task lists and forms are designed with left-aligned content, with the most important information (task title, status, due date) positioned in the top-left quadrant where users naturally look first.
- **Source:** https://www.nngroup.com/articles/f-shaped-pattern-reading-web-content/

#### Left-Side Bias (NN Group, 2024)
- **Application:** Navigation remains in the left sidebar. Task filters and search are positioned on the left side of the task list view.
- **Source:** https://www.nngroup.com/articles/horizontal-attention-leans-left/

#### Hick's Law - Choice Reduction
- **Application:** The task creation form uses a stepped approach when complexity increases. Priority and status options are limited to 4 and 3 choices respectively to reduce decision time.

#### Fitts's Law - Target Sizing
- **Application:** All interactive elements meet the 44x44px minimum touch target. Primary CTAs (Create Task, Submit) are prominently sized at h-10 (40px) or h-12 (48px).

### Existing Pattern Alignment

Based on analysis of the codebase, this design follows established patterns:

| Pattern | Source File | Application |
|---------|-------------|-------------|
| Card-based layouts | `EmployeeDashboard.tsx`, `InternDashboard.tsx` | Task cards, summary cards |
| Form structure | `EODReportForm.tsx` | Task creation form |
| Badge status indicators | `badge.tsx`, `InternStatusBadge.tsx` | Task priority/status badges |
| Table layouts | `table.tsx` | Task list view |
| Dialog modals | `dialog.tsx` | Task details, quick assign |

---

## User Flow Diagrams

### Flow 1: Super Admin Creates and Assigns Task

```
[Super Admin Dashboard]
         |
         v
[Clicks "Task Management" in Sidebar]
         |
         v
[Task Management Page Loads]
    +----+----+
    |         |
    v         v
[View Tasks] [Create Task Button]
    |              |
    |              v
    |    [Create Task Dialog/Page Opens]
    |              |
    |              v
    |    [Fill Task Details]
    |    - Title (required)
    |    - Description (required)
    |    - Priority (Low/Medium/High/Urgent)
    |    - Due Date (required)
    |    - Category (optional)
    |              |
    |              v
    |    [Select Assignees]
    |    - Search employees/interns
    |    - Multi-select with checkboxes
    |    - Filter by department/role
    |              |
    |              v
    |    [Review & Submit]
    |              |
    |              v
    |    [Task Created]
    |    [Notifications Sent to Assignees]
    |              |
    +------+------+
           v
[Return to Task List with Success Toast]
```

### Flow 2: Employee/Intern Views Assigned Tasks

```
[Employee/Intern Dashboard]
         |
    +----+------------+
    |                 |
    v                 v
[Notification Badge] [Dashboard Widget]
[in Header]          [Assigned Tasks Card]
    |                      |
    v                      v
[Click Bell Icon]    [Click "View All Tasks"]
    |                      |
    v                      |
[Notification Panel]       |
[Shows New Task]           |
    |                      |
    v                      |
[Click Notification]       |
    |                      |
    +----------+-----------+
               v
     [My Tasks Page]
          |
          v
    [Task List View]
    - Filter by status
    - Sort by due date
    - Search tasks
          |
          v
    [Click Task Row]
          |
          v
    [Task Detail View]
    - Full description
    - Due date
    - Priority
    - Mark as complete
```

### Flow 3: Task Status Update

```
[My Tasks Page]
      |
      v
[Click Status Dropdown on Task]
      |
      v
[Select New Status]
- Pending -> In Progress
- In Progress -> Completed
- Any -> Blocked (with reason)
      |
      v
[Optimistic UI Update]
      |
      v
[API Call to Update]
      |
   +--+--+
   |     |
   v     v
[Success] [Error]
   |       |
   v       v
[Toast]  [Rollback UI]
         [Show Error Toast]
```

---

## Information Architecture

### Navigation Updates

#### Super Admin Sidebar Addition

```typescript
// Addition to superAdminNavItems in Sidebar.tsx
const superAdminNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/super-admin/dashboard', icon: Home },
  { label: 'Task Management', href: '/super-admin/tasks', icon: ClipboardList }, // NEW
  { label: 'Interns', href: '/admin/interns', icon: GraduationCap },
  { label: 'Performance', href: '/admin/performance', icon: Target },
  { label: 'Probation', href: '/admin/probation', icon: ClipboardList },
  { label: 'Payroll Approvals', href: '/super-admin/payroll-approvals', icon: FileCheck },
];
```

#### Employee Sidebar Addition

```typescript
// Addition to employeeNavItems in Sidebar.tsx
const employeeNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/dashboard', icon: Home },
  { label: 'My Tasks', href: '/tasks', icon: CheckSquare }, // NEW
  { label: 'My Profile', href: '/profile', icon: User },
  { label: 'My 201 Files', href: '/files', icon: FolderOpen },
  { label: 'Payroll', href: '/payroll', icon: Receipt },
  { label: 'Performance Reviews', href: '/performance', icon: Target },
  { label: 'Announcements', href: '/announcements', icon: Megaphone },
];
```

#### Intern Sidebar Addition

```typescript
// Addition to internNavItems in Sidebar.tsx
const internNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/intern/dashboard', icon: Home },
  { label: 'My Tasks', href: '/tasks', icon: CheckSquare }, // NEW
  { label: 'My Profile', href: '/profile', icon: User },
  { label: 'My 201 Files', href: '/files', icon: FolderOpen },
  { label: 'Performance Reviews', href: '/performance', icon: Target },
  { label: 'Announcements', href: '/announcements', icon: Megaphone },
];
```

### Route Structure

```
# Super Admin Routes
/super-admin/tasks              # Task management dashboard
/super-admin/tasks/create       # Create new task (can also be dialog)
/super-admin/tasks/[id]         # View/edit task details

# Employee/Intern Routes
/tasks                          # My assigned tasks list
/tasks/[id]                     # Task detail view
```

---

## Wireframe Descriptions

### Page 1: Task Management Dashboard (Super Admin)

#### Layout Structure:
- **Header Row:** Page title "Task Management" with subtitle, primary "Create Task" button on right
- **Summary Cards Row:** 4-column grid with Total Tasks, Pending, In Progress, Completed counts
- **Filter Bar:** Search input (left), status dropdown, priority dropdown, assignee dropdown, date range
- **Task Table:** Checkbox column, Task title, Assignee(s) with avatars, Priority badge, Status badge, Due date, Actions dropdown
- **Pagination:** Bottom of table

#### Key Design Decisions:
1. Summary cards use the same pattern as Super Admin Dashboard (see `/apps/web/src/app/(admin)/super-admin/dashboard/page.tsx` lines 123-193)
2. Table follows pattern from `table.tsx` primitives
3. Create Task button follows pattern from dashboard quick actions

### Page 2: Create Task Form (Super Admin)

#### Layout Structure:
- **Back Navigation:** "Back to Tasks" link with arrow
- **Task Details Card:**
  - Title input (required)
  - Description textarea (required, min 20 chars)
  - Priority select (Low, Medium, High, Urgent)
  - Due date picker (required, future dates only)
  - Category select (optional)
- **Assignee Selection Card:**
  - Search input for filtering
  - Role filter (All, Employees, Interns)
  - Department filter
  - Scrollable checkbox list with avatar, name, role, department
  - Selected assignees as removable chips
- **Form Footer:** Cancel button (outline), Create Task button (primary)

#### Design Pattern Source:
- Form structure from `EODReportForm.tsx`
- Card layout from existing dashboard patterns
- Validation pattern with error states

### Page 3: My Tasks (Employee/Intern View)

#### Layout Structure:
- **Page Header:** Title "My Tasks", subtitle
- **Status Tabs:** All, Pending, In Progress, Completed (with count badges)
- **Filter Row:** Search input, Priority filter, Date sort
- **Task Cards:** Priority indicator, title, description preview, due date, status dropdown, chevron to detail

#### Design Pattern Source:
- Tabs from `tabs.tsx` primitives
- Card layout from `EmployeeDashboard.tsx` announcements section

### Page 4: Task Detail View

#### Layout Structure:
- **Back Navigation:** "Back to My Tasks"
- **Priority Badge:** Prominent at top
- **Task Detail Card:**
  - Title (h2)
  - Description section
  - Metadata grid (Due date, Category, Assigned by, Created date)
  - Separator
  - Status update dropdown
  - Optional note textarea
  - Update Status button

---

## Component Hierarchy

### New Components to Create

```
packages/ui/src/
├── components/
│   └── tasks/                          # NEW DIRECTORY
│       ├── index.ts                    # Export barrel
│       ├── TaskCard.tsx                # Individual task display
│       ├── TaskList.tsx                # List/table of tasks
│       ├── TaskStatusBadge.tsx         # Status indicator badges
│       ├── TaskPriorityBadge.tsx       # Priority indicator badges
│       ├── TaskForm.tsx                # Create/edit task form
│       ├── TaskFilters.tsx             # Filter controls
│       ├── TaskSummaryCards.tsx        # Dashboard summary cards
│       ├── TaskAssigneeSelect.tsx      # Multi-select assignee picker
│       └── TaskDetailView.tsx          # Full task detail display
├── types/
│   └── task.types.ts                   # NEW: Task type definitions
```

---

## Notification System Design

### Notification Triggers

| Event | Recipients | Notification Type |
|-------|-----------|-------------------|
| Task assigned | Assignee(s) | In-app + Email (optional) |
| Task due soon (24h) | Assignee(s) | In-app |
| Task overdue | Assignee(s) + Admin | In-app + Email |
| Task status changed | Admin (creator) | In-app |
| Task completed | Admin (creator) | In-app |

### In-App Notification Structure

```typescript
interface TaskNotification {
  id: string;
  type: 'task_assigned' | 'task_due_soon' | 'task_overdue' | 'task_updated';
  taskId: string;
  taskTitle: string;
  message: string;
  createdAt: string;
  read: boolean;
  actionUrl: string;
}
```

### Dashboard Widget Design

Add "Assigned Tasks" card to EmployeeDashboard.tsx and InternDashboard.tsx showing 3-5 recent tasks with "View All" link.

---

## Accessibility Requirements

### WCAG 2.1 AA Compliance

| Component | Keyboard Support |
|-----------|-----------------|
| Task table | Arrow keys navigate, Enter opens, Space toggles checkbox |
| Status dropdown | Arrow keys cycle, Enter selects, Escape closes |
| Assignee picker | Tab navigates, Space toggles checkboxes |
| Dialog | Tab trapped, Escape closes, focus returns |
| Form | Tab order follows visual, Enter submits |

### Color + Icon Indicators

All status/priority use both color AND icon/text:

| Priority | Color | Icon |
|----------|-------|------|
| Low | Green | Circle |
| Medium | Yellow | Circle |
| High | Orange | Circle |
| Urgent | Red | AlertCircle |

| Status | Color | Icon |
|--------|-------|------|
| Pending | Gray | Clock |
| In Progress | Blue | ArrowRight |
| Completed | Green | Check |
| Blocked | Red | X |

---

## Mobile Responsiveness

### Breakpoint Behavior

| Component | Mobile (<640px) | Tablet (640-1024px) | Desktop (>1024px) |
|-----------|----------------|---------------------|-------------------|
| Summary Cards | 2x2 grid | 2x2 grid | 4-column row |
| Task Table | Card list | Simplified table | Full table |
| Filter Bar | Stacked, collapsible | 2-column | Single row |
| Task Form | Multi-step wizard | 2-column | 2-column |

### Touch Targets

All interactive elements: minimum 44x44px touch area.

---

## Design Tokens & Styling

### Colors (from existing Tailwind config)

```typescript
// Priority colors
const priorityColors = {
  low: 'text-green-600 bg-green-100',
  medium: 'text-yellow-600 bg-yellow-100',
  high: 'text-orange-600 bg-orange-100',
  urgent: 'text-red-600 bg-red-100',
};

// Status colors
const statusColors = {
  pending: 'text-gray-600 bg-gray-100',
  in_progress: 'text-blue-600 bg-blue-100',
  completed: 'text-green-600 bg-green-100',
  blocked: 'text-red-600 bg-red-100',
};
```

---

## Integration Points

### API Endpoints Required

```typescript
// Task Management (Super Admin)
POST   /api/tasks              // Create task
GET    /api/tasks              // List all tasks
GET    /api/tasks/:id          // Get task details
PUT    /api/tasks/:id          // Update task
DELETE /api/tasks/:id          // Delete task

// My Tasks (Employee/Intern)
GET    /api/tasks/assigned     // Get assigned tasks
PUT    /api/tasks/:id/status   // Update task status

// Notifications
GET    /api/notifications      // Get notifications
PUT    /api/notifications/:id/read  // Mark as read
```

### Existing Component Reuse

| Component | Usage |
|-----------|-------|
| Card, CardHeader, CardContent | Task cards, summary cards |
| Badge | Priority and status |
| Button | All actions |
| Input, Textarea | Form fields |
| Select | Filters and status |
| Dialog | Create task modal |
| Table | Task list |
| Tabs | Status filtering |
| Avatar | Assignee display |
| Checkbox | Selection |

---

## Critical Reference Files

The following files contain patterns to follow:

1. **`/apps/web/src/app/(admin)/super-admin/dashboard/page.tsx`** - Super Admin dashboard structure with summary cards, quick actions, and data displays
2. **`/apps/web/src/components/dashboards/EmployeeDashboard.tsx`** - Employee dashboard with action cards and announcements pattern
3. **`/packages/ui/src/components/internship/EODReportForm.tsx`** - Form structure with validation
4. **`/packages/ui/src/layout/Sidebar.tsx`** - Navigation item structure for adding new routes
5. **`/packages/ui/src/primitives/badge.tsx`** - Badge variants pattern
6. **`/apps/web/tailwind.config.ts`** - Design tokens and color palette
