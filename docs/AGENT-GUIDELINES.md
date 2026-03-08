# Agent Guidelines — SN Connect HR Portal

> These guidelines apply to **every agent** (AI or human) executing tasks on this codebase.  
> They are non-negotiable defaults. Deviate only with explicit justification documented in an ADR.

---

## Table of Contents

1. [Clean Code](#1-clean-code)
2. [Update Docs Immediately](#2-update-docs-immediately)
3. [Self-Feedback Iteration](#3-self-feedback-iteration)
4. [Security First](#4-security-first)
5. [Scope Discipline](#5-scope-discipline)
6. [Communication Standards](#6-communication-standards)

---

## 1. Clean Code

Write code that the next developer — human or AI — can understand without asking you.

### 1.1 TypeScript Standards

- **No `any` types.** Use `unknown` with proper type guards, or define the correct type.
- **Explicit return types** on all exported functions and components.
- **Branded types for all IDs** — never pass raw `string` where a domain ID is expected.

```typescript
// ✅ Correct
import { brandEmployeeId, brandUserId } from '@hr-portal/database';

function getEmployee(id: EmployeeId): Promise<Employee> { ... }

// ❌ Wrong
function getEmployee(id: string): Promise<any> { ... }
```

- Run `pnpm typecheck` before declaring a task complete. Zero errors is the only acceptable outcome.

### 1.2 Naming Conventions

| Artifact | Convention | Example |
|----------|------------|---------|
| React component files | PascalCase | `EmployeeCard.tsx` |
| UI primitives | lowercase | `button.tsx` |
| Hooks | `use` prefix, camelCase | `useEmployees.ts` |
| Utilities | camelCase | `formatDate.ts` |
| Type files | PascalCase + `.types.ts` | `employee.types.ts` |
| Zod schemas | camelCase + `.schema.ts` | `employee.schema.ts` |
| Tests | same name + `.test.ts` | `formatDate.test.ts` |
| E2E specs | `.spec.ts` | `login.spec.ts` |
| SQL migrations | `YYYYMMDDHHMMSS_description.sql` | `20260227120000_add_onboarding.sql` |
| n8n workflows | `{domain}-{action}.json` | `notifications-birthday-reminder.json` |

### 1.3 Component Patterns

Always use CVA for component variants. Never hard-code conditional class strings.

```typescript
// ✅ Correct — CVA + cn
const badgeVariants = cva('base-classes', {
  variants: {
    status: {
      active: 'bg-emerald-100 text-emerald-700',
      terminated: 'bg-red-100 text-red-700',
    },
  },
  defaultVariants: { status: 'active' },
});

// ❌ Wrong
const className = status === 'active' ? 'bg-emerald-100' : 'bg-red-100';
```

Use **Server Components by default**. Add `'use client'` only when the component needs browser APIs, event handlers, or React hooks.

### 1.4 Data Fetching

Use the TanStack Query key factory pattern. Never use bare string arrays as query keys.

```typescript
// apps/web/src/lib/query-keys.ts
export const queryKeys = {
  employees: {
    all: ['employees'] as const,
    list: (filters: EmployeeFilters) => [...queryKeys.employees.all, 'list', filters] as const,
    detail: (id: EmployeeId) => [...queryKeys.employees.all, 'detail', id] as const,
  },
};
```

### 1.5 Database Conventions

Every new table must have:

```sql
id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
created_at  timestamptz DEFAULT now() NOT NULL,
updated_at  timestamptz DEFAULT now() NOT NULL,
created_by  uuid REFERENCES auth.users(id),
deleted_at  timestamptz  -- soft delete, never hard delete
```

- Always enable RLS: `ALTER TABLE t ENABLE ROW LEVEL SECURITY; ALTER TABLE t FORCE ROW LEVEL SECURITY;`
- Policy naming: `tablename_operation_context_policy` (e.g., `employees_select_own_policy`)
- Always use `soft_delete(table_name, record_id)` — never `DELETE FROM`.

### 1.6 API Routes

```typescript
// Required structure for every route handler
export async function GET(request: NextRequest): Promise<NextResponse> {
  // 1. Validate JWT (jose library, Authorization header)
  // 2. Parse & validate input with Zod
  // 3. Query Supabase with user RLS context
  // 4. Return typed response
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // 1–3. Same as GET
  // 4. Audit log sensitive mutations → audit_logs table
  // 5. Return result
}
```

### 1.7 Linting

Run `pnpm lint` before closing a task. All Biome checks must pass — do not suppress rules without a comment explaining why.

---

## 2. Update Docs Immediately

**Documentation is code.** A feature shipped without updated docs is an incomplete task.

### 2.1 What Triggers a Doc Update

| Change Made | Required Update |
|-------------|-----------------|
| New API endpoint | `docs/api/{resource}.md` — add route, schema, examples |
| New or modified DB table/column | `supabase/SCHEMA_SUMMARY.md` + relevant migration comments |
| New architectural decision | New `docs/adr/ADR-NNN-{title}.md` |
| New package or major dependency | README for the affected package |
| New user-facing feature | `docs/guides/user-workflows.md` or add a new guide |
| New n8n workflow | `docs/guides/` — add Mermaid sequence diagram |
| Breaking change (schema, API, auth) | `CHANGELOG.md` under the correct version heading |
| Environment variable added/removed | `docs/ENVIRONMENT.md` |
| Role or permission change | `docs/adr/` + `docs/guides/QUICK-START-RBAC.md` |

### 2.2 ADR Process

Create an ADR for any decision that:
- Changes the tech stack
- Affects security or RLS policies
- Alters the role system
- Introduces a new architectural pattern

Use the canonical format and number sequentially (check `docs/adr/` for the next `NNN`):

```markdown
# ADR NNNN: [Title]

## Status
Proposed | Accepted | Deprecated | Superseded by ADR XXXX

## Context
## Decision
## Consequences
## Alternatives
## References
```

ADRs are **immutable once accepted**. To change a decision, write a new ADR that supersedes the old one.

### 2.3 CHANGELOG Maintenance

Follow [Keep a Changelog](https://keepachangelog.com/) format at the root `CHANGELOG.md`:

```markdown
## [Unreleased]

### Added
- feat(auth): Supabase Auth JWT validation middleware

### Fixed
- fix(employees): RLS policy for manager view (#42)

### Security
- Enforced rate limiting on auth endpoints (5 req/min)
```

Always reference migration files by timestamp when schema changes are included.

### 2.4 Accuracy Rule

Never document behaviour that does not yet exist. If a feature is planned but not implemented, mark it explicitly:

```markdown
> **Not yet implemented** — tracked in PENDING_TASKS.md
```

---

## 3. Self-Feedback Iteration

Do not submit the first draft of any task. Run at least one full feedback loop before declaring done.

### 3.1 The Iteration Loop

```
Plan → Implement → Self-Review → Fix → Validate → Done
         ↑___________________________|
              (repeat if issues found)
```

**Step 1 — Plan**  
Before writing code, state what you will change and why. Check `PENDING_TASKS.md` and existing docs for relevant context. Identify affected files, RLS policies, and any downstream consumers.

**Step 2 — Implement**  
Make the smallest change that fully addresses the task. One concern per commit.

**Step 3 — Self-Review**  
After implementation, read your own diff as if you were a reviewer who did not write it. Ask:

- Does this follow all standards in Section 1 (Clean Code)?
- Is there any `any` type, hard-coded class, or raw string ID?
- Does every new public function have an explicit return type?
- Are error paths handled, not just the happy path?
- Could this change break any existing RLS policy?
- Does this leak sensitive data (SSN, salary, payroll accounts, medical records)?
- Is there a test for the behaviour I just added?

**Step 4 — Fix**  
Address every issue found in Step 3. Do not skip "minor" issues — they accumulate into technical debt.

**Step 5 — Validate**  
Run the relevant checks before marking done:

```bash
pnpm typecheck     # zero errors required
pnpm lint          # zero Biome violations required
pnpm test          # relevant unit/integration tests pass
```

For UI changes, visually verify in both light and dark mode using the Titanium & Indigo design tokens.  
For API changes, confirm the route returns correct shape for both success and error scenarios.  
For schema changes, verify RLS policies still cover all access paths.

**Step 6 — Done**  
A task is done only when Steps 1–5 are complete **and** documentation is updated per Section 2.

### 3.2 Feedback Checklist (copy into PR descriptions)

```
## Self-Review Checklist

### Code Quality
- [ ] No `any` types — strict TypeScript throughout
- [ ] Branded types used for all domain IDs
- [ ] Explicit return types on all exported functions
- [ ] CVA used for all component variants (no conditional class strings)
- [ ] Server Components used by default; `'use client'` justified

### Data & Security
- [ ] JWT validation present on every new API route
- [ ] Input validated with Zod before use
- [ ] RLS policies verified — no unintended data exposure
- [ ] Sensitive fields excluded from logs and API responses
- [ ] Audit logging added for all mutations to sensitive tables

### Database
- [ ] New tables follow required column conventions (id, timestamps, deleted_at)
- [ ] RLS enabled and forced on all new tables
- [ ] Soft delete used — no hard DELETE statements
- [ ] Migration filename follows YYYYMMDDHHMMSS_description.sql

### Tests
- [ ] Business logic covered by unit tests (Vitest, ≥ 80%)
- [ ] New API routes covered by integration tests
- [ ] Critical user flows covered or updated in Playwright specs

### Documentation
- [ ] API docs updated in docs/api/
- [ ] CHANGELOG.md updated
- [ ] ADR created if an architectural decision was made
- [ ] ENVIRONMENT.md updated if env vars changed
- [ ] PENDING_TASKS.md updated if a tracked item was completed
```

### 3.3 When Blocked

If a task cannot be completed cleanly within scope:

1. **Do not ship a partial solution silently.** Document what was done and what remains.
2. Add the remaining work to `PENDING_TASKS.md` with a clear description and reason for deferral.
3. Leave `TODO:` comments in code pointing to the `PENDING_TASKS.md` entry — never leave unexplained `TODO`s.

---

## 4. Security First

These rules override convenience in every situation.

- **Never log or return:** SSN/government IDs, payroll account numbers, salary data, medical records, personal addresses, emergency contacts.
- **Never skip JWT validation** on an API route, even in development.
- **Never bypass RLS** by using the service role key in application code paths accessible to users.
- **Rate limits must be respected** in all new endpoints: auth (5 req/min), general API (100 req/min), file uploads (10 req/min).
- **Never commit secrets.** Use `.env.local` (gitignored). Reference `docs/ENVIRONMENT.md` for the template.

---

## 5. Scope Discipline

- **One PR, one concern.** Do not mix feature work with refactoring or doc updates in the same commit unless they are inextricably linked.
- **Do not modify files outside your task scope** without a clear reason documented in the PR description.
- **Do not upgrade dependencies** as a side effect of a feature PR. Open a separate chore PR.
- **Do not change RLS policies** without an explicit security review step in the PR checklist.

---

## 6. Communication Standards

### Commit Messages

Follow the Conventional Commits format defined in CLAUDE.md:

```
<type>(<scope>): <subject>

[optional body]

[optional footer: references, breaking changes]
```

Types: `feat` | `fix` | `docs` | `style` | `refactor` | `test` | `chore`

**Subject line rules:**
- Imperative mood: "add", not "added" or "adds"
- No period at the end
- Max 72 characters

### PR Descriptions

Every PR must include:
1. **What** — a plain-English summary of the change
2. **Why** — the problem being solved or feature being added
3. **How** — key implementation decisions
4. **Testing** — how you verified the change works
5. The self-review checklist from Section 3.2

### In-Code Comments

Comment **why**, not what. If the code itself doesn't explain the reason, explain it in a comment. Delete commented-out code before merging.

```typescript
// ✅ Useful comment
// Use the service role only here — RLS would block the audit write
// because audit_logs restricts inserts to server-side operations.
const audit = createServiceClient();

// ❌ Useless comment
// Create the client
const client = createClient();
```

---

*Last updated: 2026-02-27 | Maintained by the Documentation Specialist agent*  
*For architectural context, see [CLAUDE.md](../CLAUDE.md) and [docs/adr/](adr/)*
