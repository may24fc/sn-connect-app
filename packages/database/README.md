# @hr-portal/database

Shared database types, branded IDs, enum constants, and validation schemas for the SN Connect HR Portal.

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
