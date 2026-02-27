# UI Component Reference — Index

> Audience: Developers

The SN Connect design system is built on Radix UI primitives styled with Tailwind CSS and class-variance-authority (CVA). Components live in two locations:

- **`packages/ui/`** — Shared primitives and composite components (used across apps)
- **`apps/web/src/components/`** — App-specific components (Next.js pages only)

---

## Primitives (19)

> Location: `packages/ui/src/primitives/`

Radix-based building blocks. All support `className` override via `cn()` utility. All use forwarded refs.

| Primitive | File | Description |
|-----------|------|-------------|
| Avatar | `avatar.tsx` | User avatar with image fallback |
| Badge | `badge.tsx` | Status/label badge with CVA variants |
| Button | `button.tsx` | Primary action button with variant, size, loading, press states |
| Card | `card.tsx` | Container card (Card, CardHeader, CardContent, CardFooter, CardTitle, CardDescription) |
| Checkbox | `checkbox.tsx` | Radix checkbox with indicator |
| Dialog | `dialog.tsx` | Modal dialog with overlay, close button |
| DropdownMenu | `dropdown-menu.tsx` | Radix dropdown with items, separators, sub-menus |
| Input | `input.tsx` | Text input with Tailwind styling |
| Label | `label.tsx` | Form label with Radix label primitive |
| PasswordInput | `password-input.tsx` | Input with show/hide toggle for passwords |
| Progress | `progress.tsx` | Radix progress bar with percentage indicator |
| Select | `select.tsx` | Radix select dropdown with value, trigger, content |
| Separator | `separator.tsx` | Horizontal/vertical separator line |
| Skeleton | `skeleton.tsx` | Shimmer loading placeholder |
| Table | `table.tsx` | HTML table with styled header, body, row, cell |
| Tabs | `tabs.tsx` | Radix tabs with list, trigger, content |
| Textarea | `textarea.tsx` | Multi-line text input |
| Toast | `toast.tsx` | Notification toast with Radix toast primitive |
| Tooltip | `tooltip.tsx` | Radix tooltip with trigger and content |

→ [Full reference](primitives.md)

---

## Layout (2)

> Location: `packages/ui/src/layout/`

| Component | File | Description |
|-----------|------|-------------|
| Header | `Header.tsx` | Top navigation bar (h-16) with user menu, notifications |
| Sidebar | `Sidebar.tsx` | Role-based navigation sidebar (w-64 / w-16 collapsed) |

---

## Composite Components by Domain

### Announcements (9)

> Location: `packages/ui/src/components/announcements/`

| Component | Description |
|-----------|-------------|
| `AnnouncementAnalytics` | Read count charts and time series |
| `AnnouncementCard` | Announcement list item with status, priority |
| `AnnouncementDetailDialog` | Full announcement view in a dialog |
| `AnnouncementEditor` | Rich text editor for creating/editing |
| `AnnouncementFilters` | Search, status, category, date filters |
| `AnnouncementPreview` | Preview before publishing |
| `AttachmentUploader` | File upload with progress and preview |
| `TargetingSelector` | Audience targeting (roles, departments) |

→ [Full reference](announcements.md)

### AI Knowledge (14)

> Location: `packages/ui/src/components/ai-knowledge/`

| Component | Description |
|-----------|-------------|
| `AccessToggle` | Toggle AI knowledge source active status |
| `AIKnowledgeManager` | Main management interface with tabs |
| `ChatInterface` | AI chat conversation UI |
| `ChatMessage` | Individual message bubble (user/assistant) |
| `DebugPanel` | Developer debug panel for RAG context |
| `KnowledgeBasePanel` | Knowledge source list and management |
| `PlaygroundPanel` | Chat playground for testing |
| `SourceFilters` | Filter sources by type, status |
| `SourceRow` | Single knowledge source row |
| `SourcesInventory` | Full source management table |
| `UploadProgress` | File upload progress indicator |
| `UploadZone` | Drag-and-drop file upload area |

→ [Full reference](ai-knowledge.md)

### Forms (6)

> Location: `packages/ui/src/components/forms/`

| Component | Description |
|-----------|-------------|
| `Form` | Form wrapper with React Hook Form context |
| `FormField` | Field wrapper with label, error display |
| `FormInput` | Controlled text input |
| `FormSelect` | Controlled select dropdown |
| `FormTextarea` | Controlled textarea |

→ [Full reference](forms.md)

### Internship (7)

> Location: `packages/ui/src/components/internship/`

| Component | Description |
|-----------|-------------|
| `DailyReportCard` | Single daily log display |
| `EODReportForm` | End-of-day report submission form |
| `HoursProgressCard` | Hours completed vs required progress bar |
| `InternCard` | Intern profile summary card |
| `InternshipSummaryCards` | Aggregate metrics (active, completed, hours) |
| `InternStatusBadge` | Internship status badge (active, completed, etc.) |

→ [Full reference](internship.md)

### Performance (6)

> Location: `packages/ui/src/components/performance/`

| Component | Description |
|-----------|-------------|
| `KPICard` | KPI metric with gauge/progress |
| `OKRCard` | OKR with progress and key results |
| `PerformanceCharts` | Performance trend charts (Recharts) |
| `PerformanceStatusBadge` | Review status badge |
| `PerformanceSummaryCards` | Aggregate performance metrics |

→ [Full reference](performance.md)

### Reports (14)

> Location: `packages/ui/src/components/reports/`

| Component | Description |
|-----------|-------------|
| `InsightsSummary` | Report insights overview |
| `MetricInput` | Metric value input field |
| `MetricKPICard` | KPI metric display for reports |
| `ReportCard` | Report list item card |
| `ReportForm` | Weekly report creation/edit form |
| `ReportStatusBadge` | Report status badge (draft, submitted, approved, rejected) |
| `ReportSubmissionList` | Submitted reports table |
| `ReportSummaryCards` | Aggregate report metrics |
| `SubmissionRateCard` | Submission rate visualization |
| `WeekComparisonTable` | Week-over-week comparison |
| `WeekSelector` | Week picker for report period |
| Analytics charts | `CompletionChart`, `TrendChart`, `DistributionChart` |

→ [Full reference](reports.md)

### Resources (12)

> Location: `packages/ui/src/components/resources/`

| Component | Description |
|-----------|-------------|
| `CategoryBrowser` | Browse resources by category |
| `DocumentViewer` | In-app document preview |
| `ResourceAnalytics` | View and download analytics |
| `ResourceCard` | Resource list/grid item card |
| `ResourceFilters` | Search, category, type, tag filters |
| `ResourceGrid` | Grid layout for resource cards |
| `ResourcePreview` | Resource detail preview panel |
| `ResourceUploader` | File upload with metadata form |
| `TagInput` | Tag autocomplete input |
| `TargetingSelector` | Audience targeting for resources |
| `VideoPlayer` | Embedded video player |

→ [Full reference](resources.md)

### Tasks (10)

> Location: `packages/ui/src/components/tasks/`

| Component | Description |
|-----------|-------------|
| `TaskAssigneeSelect` | Assignee picker dropdown |
| `TaskCard` | Task list item card |
| `TaskDetailView` | Full task detail panel |
| `TaskFilters` | Status, priority, assignee filters |
| `TaskForm` | Task creation/edit form |
| `TaskList` | Task list with sorting |
| `TaskPriorityBadge` | Priority badge (low, medium, high, urgent) |
| `TaskStatusBadge` | Status badge (todo, in_progress, done, cancelled) |
| `TaskSummaryCards` | Aggregate task metrics |

→ [Full reference](tasks.md)

---

## App-Specific Components

> Location: `apps/web/src/components/`

### Admin Modals (3)

| Component | Description |
|-----------|-------------|
| `ApproveOnboardingModal` | Approve/reject onboarding dialog |
| `AssignEmployeeModal` | Assign employee record with probation details |
| `InviteUserModal` | Invite new user form dialog |

### Dashboards (2)

| Component | Description |
|-----------|-------------|
| `EmployeeDashboard` | Employee dashboard layout with stats, events, announcements |
| `InternDashboard` | Intern dashboard with hours progress, EOD form |

### Data Display (4)

| Component | Description |
|-----------|-------------|
| `BentoGrid` | Bento-box grid layout for dashboard cards |
| `DataTable` | TanStack Table wrapper with sorting, filtering, pagination |
| `EmptyState` | Empty state with icon, title, description, action |
| `StatCard` | Metric stat card with icon, value, trend |

### Feedback (3)

| Component | Description |
|-----------|-------------|
| `EmptyState` | Page-level empty state display |
| `SkeletonCard` | Card-shaped loading skeleton |
| `SkeletonTable` | Table-shaped loading skeleton |

→ [Full reference: data-display](data-display.md) | [Full reference: feedback](feedback.md)

---

## Shared Utilities

| Utility | Location | Description |
|---------|----------|-------------|
| `cn()` | `packages/ui/src/utils/cn.ts` | Tailwind class merge (clsx + tailwind-merge) |

---

## Type Definitions

> Location: `packages/ui/src/types/`

| File | Domain |
|------|--------|
| `ai-knowledge.types.ts` | AI knowledge source, embedding, chat types |
| `internship.types.ts` | Internship, daily log types |
| `performance.types.ts` | Review cycle, OKR, KPI types |
| `task.types.ts` | Task, comment, assignee types |

---

## Design Tokens

All components use the **Titanium & Indigo** design system tokens defined in `apps/web/tailwind.config.ts`:

| Token | Light | Dark |
|-------|-------|------|
| Primary | Indigo-600 (`#4F46E5`) | Indigo-500 |
| Background | Zinc-50 (`#FAFAFA`) | Zinc-950 (`#09090B`) |
| Card | White | Zinc-900 |
| Border | Zinc-200 | Zinc-800 |
| Text | Zinc-900 | Zinc-50 |
| Muted | Zinc-500 | Zinc-400 |

- **Base font size:** 14px (`0.875rem`) — dense enterprise UI
- **Font family:** Inter
- **Heading tracking:** `-0.01em` (tight)

---

*Last updated: 2026-02-27*
