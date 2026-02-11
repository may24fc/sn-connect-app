# CLAUDE.md - SN Connect HR Portal Development Guidelines

## Project Overview

**SN Connect** is an enterprise HR Portal with an AI Agent serving as a centralized reference for HR and employees. The system uses a three-tier architecture deployed as a pnpm monorepo.

**Tagline:** "Where Policy Meets Productivity"

## Architecture

```
Interface Layer     --> Next.js 15 + React 19 (apps/web) + Capacitor (apps/mobile)
Orchestration Layer --> n8n workflows (n8n/workflows/)
Data Layer          --> Supabase PostgreSQL with RLS (supabase/)
AI Layer            --> Anthropic Claude SDK (packages/ai/)
```

## Tech Stack (Actual)

| Category | Technology | Version |
|----------|------------|---------|
| Framework | Next.js (App Router) | 15.1 |
| React | React | 19.0 |
| TypeScript | TypeScript (strict mode) | 5.7 |
| Data Fetching | TanStack Query | 5.60 |
| Tables | TanStack Table | 8.20 |
| UI Primitives | Radix UI | Various |
| Styling | Tailwind CSS + CVA | 3.4 |
| Icons | Lucide React | 0.468 |
| Charts | Recharts | 2.15 |
| Database | Supabase JS | 2.47 |
| JWT | jose | 5.9 |
| AI | @anthropic-ai/sdk | 0.32 |
| Linting | Biome | 1.9 |
| Testing | Vitest + Playwright | 2.1 / 1.58 |
| Package Manager | pnpm workspaces | 9.15 |

## Project Structure

```
/workspaces/sn-hr-portal/
├── apps/
│   ├── web/                    # Next.js 15 App Router application
│   │   ├── src/app/            # Route groups: (auth), (employee), (admin)
│   │   ├── src/components/     # App-specific components
│   │   ├── src/contexts/       # React contexts (AuthContext)
│   │   ├── src/lib/            # Utilities (query-client.ts)
│   │   └── tailwind.config.ts  # Titanium & Indigo design tokens
│   └── mobile/                 # Capacitor wrapper (skeleton)
├── packages/
│   ├── ui/                     # Shared UI components
│   │   ├── src/primitives/     # Radix-based primitives (button, input, etc.)
│   │   ├── src/components/     # Composite components by domain
│   │   ├── src/layout/         # Sidebar, Header
│   │   └── src/types/          # Component type definitions
│   ├── database/               # Supabase types + branded types
│   ├── auth/                   # JWT utilities (empty - to be implemented)
│   ├── ai/                     # Claude SDK wrapper (empty - to be implemented)
│   └── config/                 # Shared configuration
├── supabase/
│   ├── migrations/             # SQL migrations (Phase 1 complete)
│   ├── functions/              # Edge functions (empty - to be implemented)
│   └── seed/                   # Seed data
├── n8n/
│   └── workflows/              # Workflow JSON files (empty - to be implemented)
├── e2e/                        # Playwright E2E tests
├── docs/                       # Documentation
├── tests/                      # Unit tests (vitest configured)
└── .github/workflows/          # CI/CD (ci, deploy, playwright, security)
```

## Role System

### Database Roles (6 roles in user_role enum)
- `admin` - Full system access
- `hr` - HR department access
- `cos` - Chief of Staff access
- `ceo` - Executive access
- `employee` - Regular employee access
- `intern` - Intern limited access

### UI Roles (4 roles in AuthContext)
- `super_admin` - Maps to admin + elevated privileges
- `admin` - Maps to hr/cos/ceo
- `employee` - Regular employee
- `intern` - Intern

**WARNING:** Role mismatch exists between DB and UI. Resolution needed in Phase 1.

## Database Schema (Phase 1 - Complete)

### Tables
| Table | Description | RLS |
|-------|-------------|-----|
| `users` | Extends auth.users with HR fields | Yes |
| `employees` | 201 file data (PII, payroll) | Yes |
| `departments` | Organizational structure | Yes |
| `documents` | File references for 201 files | Yes |
| `audit_logs` | Tracks sensitive operations | Yes |

### Enums
- `user_role` - 6 roles
- `user_status` - active, on_leave, terminated
- `employment_type` - regular, probationary, intern, project_based
- `work_arrangement` - part_time, full_time
- `document_type` - 10 document categories

### Helper Functions
- `user_has_role(user_id, role)` - Check single role
- `user_has_any_role(user_id, roles[])` - Check multiple roles
- `get_user_role(user_id)` - Get user's role
- `is_manager_of(manager_id, employee_id)` - Manager check
- `get_direct_reports(manager_id)` - List direct reports
- `is_on_probation(employee_id)` - Probation status
- `calculate_tenure_days(employee_id)` - Tenure calculation
- `soft_delete(table_name, record_id)` - Generic soft delete

## Code Standards

### TypeScript
```typescript
// Strict mode - no any types
// Explicit return types for all functions
// Branded types for IDs
type EmployeeId = string & { __brand: 'EmployeeId' };
type UserId = string & { __brand: 'UserId' };

// Use helper functions from packages/database
import { brandEmployeeId, brandUserId } from '@hr-portal/database';
```

### React/Next.js Patterns
```typescript
// Server Components by default
// 'use client' only when necessary (hooks, event handlers)

// TanStack Query for data fetching
import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';

export function useEmployees(filters: EmployeeFilters) {
  return useQuery({
    queryKey: queryKeys.employees.list(filters),
    queryFn: () => fetchEmployees(filters),
  });
}

// Query key factory pattern (create in /apps/web/src/lib/query-keys.ts)
export const queryKeys = {
  employees: {
    all: ['employees'] as const,
    list: (filters) => [...queryKeys.employees.all, 'list', filters] as const,
    detail: (id) => [...queryKeys.employees.all, 'detail', id] as const,
  },
};
```

### Component Patterns
```typescript
// CVA for variants (class-variance-authority)
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils/cn';

const buttonVariants = cva('base-classes', {
  variants: {
    variant: { primary: '...', secondary: '...' },
    size: { sm: '...', md: '...' },
  },
  defaultVariants: { variant: 'primary', size: 'md' },
});

// Radix UI primitives with forwarded refs
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size }), className)}
      {...props}
    />
  )
);
```

### Database Conventions
```sql
-- All tables MUST have:
CREATE TABLE table_name (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  -- domain columns
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz  -- soft delete
);

-- Always enable RLS
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_name FORCE ROW LEVEL SECURITY;

-- Column naming: snake_case
-- Index naming: idx_tablename_columnname
-- Policy naming: tablename_operation_context_policy
```

### API Route Patterns (To Be Implemented)
```typescript
// apps/web/src/app/api/[resource]/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

// Always validate input with Zod
const requestSchema = z.object({ /* ... */ });

export async function GET(request: NextRequest) {
  // 1. Validate JWT from Authorization header
  // 2. Parse and validate query params
  // 3. Query Supabase with RLS (user context)
  // 4. Return typed response
}

export async function POST(request: NextRequest) {
  // 1. Validate JWT
  // 2. Parse and validate request body
  // 3. Perform mutation
  // 4. Log to audit_logs for sensitive operations
  // 5. Return result
}
```

### n8n Workflow Conventions (To Be Implemented)
```
Filename: {domain}-{action}.json
Example: notifications-birthday-reminder.json

Structure:
- Trigger node (Webhook, Schedule, or Supabase trigger)
- Validation node (Check required data)
- Action nodes (API calls, emails, etc.)
- Error handling node (Slack/email alerts)
- Audit logging node (Log to Supabase)
```

## File Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `EmployeeCard.tsx` |
| Primitives | lowercase | `button.tsx` |
| Utilities | camelCase | `formatDate.ts` |
| Types | PascalCase + `.types.ts` | `employee.types.ts` |
| Hooks | camelCase + `use` prefix | `useEmployees.ts` |
| Schemas | camelCase + `.schema.ts` | `employee.schema.ts` |
| Tests | Same name + `.test.ts` | `formatDate.test.ts` |
| E2E Tests | `.spec.ts` | `login.spec.ts` |
| Migrations | `YYYYMMDDHHMMSS_description.sql` | `20260123000001_create_enums.sql` |

## Design System: Titanium & Indigo

### Colors
- **Primary:** Indigo-600 (#4F46E5) - NOT blue
- **Background:** Zinc-50 (#FAFAFA) light / Zinc-950 (#09090B) dark
- **Cards:** White light / Zinc-900 dark
- **Borders:** Zinc-200 light / Zinc-800 dark
- **Text:** Zinc-900 light / Zinc-50 dark
- **Muted:** Zinc-500

### Typography
- Base: 14px (0.875rem) - dense enterprise UI
- Font: Inter
- Headings: -0.01em tracking (tight)

### Layout
- Fixed viewport: `h-screen overflow-hidden`
- Sidebar: w-64 (256px) / w-16 collapsed
- Header: h-16 (64px)
- Content: Scrolls within container

## Scripts

```bash
# Development
pnpm dev              # Start web app
pnpm dev:mobile       # Start mobile app

# Build
pnpm build            # Build all packages
pnpm build:web        # Build web only
pnpm build:packages   # Build shared packages

# Quality
pnpm lint             # Biome check
pnpm lint:fix         # Biome fix
pnpm format           # Biome format
pnpm typecheck        # TypeScript check

# Testing
pnpm test             # Vitest
pnpm test:ui          # Vitest UI
pnpm test:coverage    # Coverage report
pnpm test:e2e         # Playwright
pnpm test:e2e:ui      # Playwright UI

# Database
pnpm db:migrate       # Run migrations
pnpm db:seed          # Seed data
pnpm db:generate      # Generate types
```

## Security Requirements

### Zero-Trust Principles
1. **Never trust client-side data** - Always validate on server
2. **RLS is the final gatekeeper** - Application checks are secondary
3. **JWT validation required** - All API routes must verify tokens
4. **Audit sensitive operations** - Log to audit_logs table

### Sensitive Data (Never Log)
- SSN / Government IDs
- Payroll account numbers
- Salary information
- Medical records
- Personal addresses
- Emergency contacts

### Rate Limiting (To Be Implemented)
- Auth endpoints: 5 requests/minute
- API endpoints: 100 requests/minute
- File uploads: 10 requests/minute

## Testing Requirements

| Type | Tool | Minimum Coverage |
|------|------|------------------|
| Unit | Vitest | 80% for business logic |
| Integration | Vitest | API routes, hooks |
| E2E | Playwright | Critical user flows |

### Critical Flows Requiring E2E
- Login/logout
- Employee profile update
- Document upload
- Report submission
- Task assignment

## Commit Message Format

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

**Types:** feat, fix, docs, style, refactor, test, chore

**Examples:**
```
feat(auth): add Supabase Auth integration
fix(employees): resolve RLS policy for manager view
docs(api): document employee endpoints
test(reports): add E2E tests for submission flow
```

## PR Requirements

- [ ] All tests passing
- [ ] No TypeScript errors (`pnpm typecheck`)
- [ ] Biome checks pass (`pnpm lint`)
- [ ] Documentation updated (if API changes)
- [ ] Security review (if auth/data changes)
- [ ] RLS policies reviewed (if schema changes)
- [ ] Audit logging added (if sensitive operations)

## Current State Summary

### Completed (Phase 0)
- Monorepo structure with pnpm workspaces
- Next.js 15 + React 19 setup
- Titanium & Indigo design system
- 48+ UI components (primitives + composites)
- Phase 1 database schema (users, employees, documents, departments, audit_logs)
- 26 RLS policies
- TanStack Query infrastructure
- Mock authentication (4 test accounts)
- All UI pages built (frontend shell)
- CI/CD pipelines

### Not Yet Implemented
- Server-side authentication (Supabase Auth)
- API routes (zero endpoints exist)
- n8n workflows
- Supabase Edge Functions
- Real data fetching (all pages use mock data)
- Form validation (React Hook Form + Zod)
- Unit tests
- Middleware for auth protection
- Email/notification system

## Quick Reference

### Test Accounts (Mock Auth)
| Email | Password | Role |
|-------|----------|------|
| employee@test.com | password | employee |
| intern@test.com | password | intern |
| admin@test.com | password | admin |
| superadmin@test.com | password | super_admin |

### Route Groups
- `(auth)` - Login, forgot password
- `(employee)` - Dashboard, profile, files, reports, tasks, performance
- `(admin)` - Admin dashboard, interns, reports, performance cycles
- `(super-admin)` - Super admin dashboard, payroll approvals, AI knowledge

### Key File Locations
- Auth Context: `apps/web/src/contexts/AuthContext.tsx`
- Query Client: `apps/web/src/lib/query-client.ts`
- Database Types: `packages/database/src/database.types.ts`
- UI Primitives: `packages/ui/src/primitives/`
- Tailwind Config: `apps/web/tailwind.config.ts`
- Migrations: `supabase/migrations/`
