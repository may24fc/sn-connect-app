# @hr-portal/database

Shared database types, branded IDs, enum constants, and validation schemas for the Control Hub HR Portal.

## Installation

This package is automatically available via pnpm workspaces:

```typescript
import { type Database, brandUserId, UserRole } from '@hr-portal/database';
```

## Exports

### Database Types (`database.types.ts`)

Auto-generated Supabase types (`pnpm db:generate`). Provides full type coverage for all tables, views, functions, and enums.

```typescript
import type { Database } from '@hr-portal/database';

type Tables = Database['public']['Tables'];
type UsersRow = Tables['users']['Row'];
type UsersInsert = Tables['users']['Insert'];
type UsersUpdate = Tables['users']['Update'];
```

#### Tables (30+)

| Domain | Tables |
|--------|--------|
| **Core** | `users`, `employees`, `departments`, `documents`, `audit_logs`, `notifications` |
| **Onboarding** | `onboarding_profiles`, `onboarding_documents`, `onboarding_checklists`, `onboarding_tasks` |
| **Tasks** | `tasks`, `task_comments` |
| **Reports** | `reports`, `report_metrics` |
| **Invoices** | `invoices`, `invoice_line_items` |
| **Announcements** | `announcements`, `announcement_reads`, `announcement_comments`, `announcement_attachments` |
| **Resources** | `resources`, `resource_categories`, `resource_views`, `resource_bookmarks`, `resource_collections`, `collection_resources` |
| **Performance** | `review_cycles`, `performance_reviews`, `okrs`, `kpis` |
| **Internships** | `internships`, `internship_daily_logs` |
| **AI Knowledge** | `knowledge_sources`, `knowledge_embeddings`, `knowledge_source_versions` |
| **Standups** | `standup_recordings`, `standup_topics` |
| **Multi-Currency** | `fx_rates`, `bank_registry` |
| **Role Metadata** | `user_role_metadata`, `role_kpi_entries` |

#### Views

| View | Description |
|------|-------------|
| `employee_directory` | Joined users + employees + internships |
| `individual_performance_summary` | Aggregated KPIs, OKRs, reviews per employee |
| `root_reports` | Top-level reports with child counts |

#### Functions

| Function | Description |
|----------|-------------|
| `match_knowledge_embeddings()` | Vector similarity search |
| `get_report_children()` / `get_report_tree()` | Report hierarchy traversal |
| `get_knowledge_source_versions()` / `restore_knowledge_source_version()` | Knowledge versioning |
| `get_resource_category_tree()` | Hierarchical categories with counts |
| `calculate_okr_progress()` | OKR auto-progress |

### Type Helpers (`type-helpers.ts`)

Convenience type aliases for table rows, inserts, and updates:

```typescript
import type { UserRow, EmployeeRow, DepartmentRow } from '@hr-portal/database';
```

### Branded Types (`branded-types.ts`)

Compile-time type-safe IDs preventing accidental misuse:

| Type | Brand Helper |
|------|-------------|
| `UserId` | `brandUserId(id)` |
| `EmployeeId` | `brandEmployeeId(id)` |
| `DepartmentId` | `brandDepartmentId(id)` |
| `DocumentId` | `brandDocumentId(id)` |
| `TaskId` | `brandTaskId(id)` |
| `ReportId` | `brandReportId(id)` |
| `ResourceId` | `brandResourceId(id)` |
| `AnnouncementId` | `brandAnnouncementId(id)` |
| `ReviewCycleId` | `brandReviewCycleId(id)` |
| `PerformanceReviewId` | `brandPerformanceReviewId(id)` |
| `OkrId` | `brandOkrId(id)` |
| `KpiId` | `brandKpiId(id)` |

```typescript
import { brandUserId, type UserId } from '@hr-portal/database';

function getUser(id: UserId) { /* ... */ }

// ✅ Correct
getUser(brandUserId('some-uuid'));

// ❌ Compile error — plain string is not UserId
getUser('some-uuid');
```

### Enum Constants (`enums.ts`)

Runtime-safe enum values:

| Enum | Values |
|------|--------|
| `UserRole` | `Employee`, `Intern`, `Admin`, `SuperAdmin` |
| `UserStatus` | `Active`, `OnLeave`, `Terminated` |
| `EmploymentType` | `Regular`, `Probationary`, `Intern`, `ProjectBased` |
| `WorkArrangement` | `PartTime`, `FullTime` |
| `DocumentType` | 10 categories |
| `TaskStatus` | `Todo`, `InProgress`, `Completed`, `OnHold`, `Cancelled` |
| `TaskPriority` | `Low`, `Medium`, `High`, `Urgent` |
| `InvoiceStatus` | `Draft`, `Submitted`, `Approved`, `Rejected` |
| `NotificationType` | `TaskAssigned`, `TaskDue`, `ReportSubmitted`, `ReportApproved`, `ReportRejected`, `AnnouncementNew`, `ResourceNew`, `Reminder`, `OnboardingStep`, `ProbationUpdate`, `System` |
| `ResourceAccessLevel` | `Full`, `ViewOnly` |
| `KnowledgeSourceType` | `Pdf`, `Docx`, `Url`, `Manual` |

### Validation Schemas (`schemas/`)

Zod schemas for resource operations:

- `resourceSchema.ts` — Create/update resources
- `resourceFilterSchema.ts` — Filter validation
- `resourceTargetingSchema.ts` — Audience targeting
- `resourceUploadSchema.ts` — File upload validation

## Regenerating Types

```bash
pnpm db:generate
```

This runs `supabase gen types typescript` and writes to `src/database.types.ts`.

> **Note:** New tables added via migrations (e.g., `resource_categories`, `knowledge_source_versions`, `user_role_metadata`, `role_kpi_entries`) will only appear in types after running `db:generate` against the live database.
