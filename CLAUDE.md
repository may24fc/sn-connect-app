# CLAUDE.md - SN Connect Development Guidelines

## Project Overview

**SN Connect** (repo `sn-management-app`) is a pnpm + Turborepo monorepo holding two production Next.js apps:

- **Control Hub** (`apps/web`, `@hr-portal/web`, port **3001**) — the internal HR/operations portal with an AI agent. Tagline: *"Where Policy Meets Productivity"*. Deploys to `app.sngroup.com.au`.
- **SN Group public site** (`apps/www`, `@sn-group/www`, port **3000**) — the corporate marketing site, careers, and public inquiry intake. Deploys to `www.sngroup.com.au`.

Both share Supabase, `@hr-portal/ui`, and `@hr-portal/database`.

## Architecture

```
Interface Layer     --> Next.js 15 + React 19: apps/web (portal), apps/www (public site), apps/mobile (Capacitor skeleton)
Data Layer          --> Supabase PostgreSQL + RLS + Storage + pgvector (supabase/)
Background Jobs     --> Supabase Edge Functions (scheduled) + Inngest (event-driven) + Vercel Cron + n8n (digests)
AI Layer            --> OpenAI via packages/ai (chat, embeddings, chunking, receipt/intake extraction)
Integrations        --> Wise (payouts), Google Drive + Calendar, Resend (email), Telegram, Mux, LangWatch (tracing)
```

## Tech Stack (Actual)

| Category | Technology | Version |
|----------|------------|---------|
| Framework | Next.js (App Router) | 15.5.7 (pinned via pnpm override) |
| React | React | 19.0 |
| TypeScript | TypeScript (strict) | 5.7 |
| Monorepo | pnpm workspaces + Turborepo | 9.15 / 2.8 |
| Data Fetching | TanStack Query | 5.60 |
| Tables | TanStack Table | 8.20 |
| UI Primitives | Radix UI | Various |
| Styling | Tailwind CSS + CVA | 3.4 |
| Icons | Lucide React | 0.468 |
| Charts | Recharts | 2.15 |
| Motion | Framer Motion (+ GSAP/Lenis on www) | 10 / 11 |
| Forms | React Hook Form + Zod | 7.55 / 3.24 |
| Database | Supabase JS + @supabase/ssr | 2.47 / 0.7 |
| AI | `openai` (chat `gpt-5.4-mini`, embeddings `text-embedding-3-small`) | 4.76 |
| Background jobs | Inngest | 3.54 |
| Observability | @vercel/otel + LangWatch | 2.1 / 0.20 |
| Docs/Files | exceljs, pdfkit, mammoth, docx | — |
| Linting | Biome | 1.9 |
| Testing | Vitest + Playwright | 2.1 / 1.58 |

> `packages/auth` still declares `jose`, but runtime auth is Supabase Auth (cookies via `@supabase/ssr`), not hand-rolled JWTs.

## Project Structure

```
sn-connect-app/
├── apps/
│   ├── web/                    # Control Hub portal (@hr-portal/web, :3001)
│   │   ├── middleware.ts       # Session refresh + coarse route protection (NOT a security boundary)
│   │   ├── src/app/            # Route groups: (auth), (employee), (admin), (self-service) + api/
│   │   ├── src/components/     # ~20 domain folders (admin, tasks, reports, crm, tickets, …)
│   │   ├── src/contexts/       # AuthContext
│   │   ├── src/hooks/          # ~115 useX hooks + hooks/queries
│   │   ├── src/lib/            # supabase/, schemas/, inngest/, notifications/, fx/, wise/, payroll/, …
│   │   └── tailwind.config.ts  # SN teal design tokens
│   ├── www/                    # Public SN Group site (@sn-group/www, :3000)
│   └── mobile/                 # Capacitor wrapper (skeleton)
├── packages/
│   ├── ui/                     # 26 primitives, 24 component groups, layout (Sidebar/Header/PageHeader)
│   ├── database/               # Generated Supabase types, branded types, enums, zod schemas
│   ├── ai/                     # OpenAI wrappers: chat, embeddings, chunking, intake, receipt
│   ├── auth/                   # Auth helpers
│   └── config/                 # Zod-validated env (src/env.ts)
├── supabase/
│   ├── migrations/             # 194 SQL migrations
│   ├── functions/              # 17 Deno Edge Functions
│   └── seed/
├── n8n/workflows/              # 13 workflow JSON files (digests, reminders, escalations)
├── scripts/                    # Node .mjs ops scripts (backfill/, drive/, env/, production/, playwright/, …)
├── e2e/                        # Playwright specs
├── tests/                      # Vitest (api/, app/, components/, hooks/, lib/, schemas/)
├── docs/                       # adr/, apps/, deployment/, guides/, production/, proposals/, payments/
└── .github/workflows/          # ci, pr-checks, security, vercel-deploy, supabase-*-deploy, maintenance, crons
```

## Role System

### Database roles (`user_role` enum, 7 values)
`employee` · `associate` · `admin` · `super_admin` · `hr` · `cos` · `ceo`

`hr`, `cos`, and `ceo` are legacy values retained in the enum; new accounts use the four canonical roles.

### UI roles (4, in `AuthContext`)
`employee` · `associate` · `admin` · `super_admin`

Mapping lives in `apps/web/src/contexts/AuthContext.tsx` (`resolveUiRole`): `hr`/`cos`/`ceo` → `admin`; legacy `intern` → `associate`.

### Role helpers
- `apps/web/src/lib/auth/role.ts` — `KNOWN_DB_ROLES`, `normalizeDbRoleClaim`, `getNormalizedMetadataRole` (reads `app_metadata.db_role`)
- `apps/web/src/lib/roles.ts` — `EMPLOYEE_EQUIVALENT_ROLES` (`employee`, `admin`, `super_admin`) plus expand/collapse helpers

Beyond roles, several modules gate access with **per-user grant tables**: `ats_access_grants`, `crm_access_grants`, `marketing_access_grants`, `pa_task_access_grants`, `ai_spending_access_grants`, `revenue_forecast_access_grants`.

## Database

194 timestamped migrations (`20260123` → `20260916`) · ~123 tables · 51 enums · 5 views · ~748 RLS policy statements · ~76 functions · ~470 indexes.
Reference: `supabase/SCHEMA_SUMMARY.md` · `docs/apps/web/architecture/database.md`.

Repair/`ensure_*` migrations recreate earlier objects, so grep-derived counts overstate the live schema.

### Core tables
`users` · `employees` (201-file PII/payroll) · `departments` · `divisions` · `documents` · `audit_logs` · `notifications`

### Feature domains
| Domain | Tables |
|--------|--------|
| Onboarding / Offboarding | `onboarding_profiles`, `onboarding_documents`, `onboarding_checklists`, `onboarding_tasks`, `checklist_templates`, `offboarding`, `offboarding_tasks` |
| Tasks & PA tasks | `tasks`, `task_comments`, `task_proofs`, `pa_tasks`, `pa_task_attachments`, `pa_task_statuses/priorities/categories`, `pa_task_access_grants` |
| Projects | `projects`, `project_contributors`, `project_milestones`, `project_checklist_items`, `project_backlog`, `project_documentations` |
| Reports | `reports`, `report_metrics` (hierarchy via `parent_report_id`, `hierarchy_path`) |
| Invoices & payouts | `invoices`, `invoice_line_items`, `wise_payments`, `employee_banking_info`, `fx_rates`, `bank_registry` |
| Expenses | `expense_entries`, `marketing_entries`, `marketing_campaigns`, `marketing_platforms`, `marketing_entry_receipts`, `marketing_access_grants`, `ai_expenses`, `ai_expense_providers` |
| Announcements | `announcements`, `announcement_reads`, `announcement_comments`, `announcement_attachments`, `announcement_stars` |
| Resources | `resources`, `resource_categories`, `resource_folders`, `resource_views`, `resource_bookmarks`, `resource_collections`, `collection_resources` |
| Performance | `review_cycles`, `performance_reviews`, `okrs`, `okr_targets`, `okr_target_evidence`, `kpis`, `kpi_evidence`, `monthly_self_evaluations`, `quarterly_temperature_checks`, `five_percent_reflections`, `monthly_call_feedback`, `performance_evaluation_drafts/summaries`, `associate_evaluations`, `weekly_commitments`, `weekly_commitment_items` |
| Internships | `internships`, `intern_daily_logs`, `intern_eod_digest_runs` |
| Tickets | `tickets`, `ticket_comments`, `ticket_handlers`, `ticket_attachments` |
| ATS / recruiting | `job_postings`, `job_requisitions`, `job_applications`, `ats_access_grants` |
| CRM & revenue | `crm_sfo_leads`, `crm_tech_inquiries`, `crm_access_grants`, `sfo_revenue_entries`, `sfo_revenue_goals`, `revenue_forecast_access_grants` |
| Public website | `business_units`, `website_content`, `public_inquiries`, `inquiry_rate_limit_buckets`, `inquiry_deduplication_keys` |
| Calendar & standups | `company_events`, `company_calendar_event_sync`, `company_calendar_sync_state`, `standup_recordings`, `standup_topics` |
| AI | `knowledge_sources`, `knowledge_embeddings` (pgvector), `knowledge_source_versions`, `ai_conversations`, `ai_messages`, `query_cache` |
| Gamification & culture | `points_events`, `user_gamification`, `leaderboard_snapshots`, `badge_definitions`, `user_badges`, `user_domain_mastery`, `wellness_bingo_*`, `christmas_tree_events`, `christmas_ornaments`, `christmas_wishes` |
| Misc | `profile_change_requests`, `user_role_metadata`, `role_kpi_entries` |

### Views
`employee_directory` · `individual_performance_summary` · `root_reports` · `marketing_platform_totals` · `marketing_monthly_platform_totals`

### Helper functions (selection)
`user_has_role` · `user_has_any_role` · `get_user_role` · `is_manager_of` · `get_direct_reports` · `is_on_probation` · `calculate_tenure_days` · `soft_delete` · `match_knowledge_embeddings` · `get_report_children` / `get_report_tree` · `get_knowledge_source_versions` / `restore_knowledge_source_version` · `get_resource_category_tree` · `calculate_okr_progress` · `get_intern_eod_digest_source`

## Background Jobs

| Mechanism | Where | Use |
|-----------|-------|-----|
| Supabase Edge Functions (17) | `supabase/functions/` | Scheduled HR jobs: `onboarding-new-employee`, `probation-check`, `offboarding-exit-process`, `check-late-reports`, `evaluation-cadence-reminders`, `intern-eod-reminder`, `intern-weekly-summary`, `payroll-reminder`, `milestone-announcements`, `announcements-lifecycle`, `resources-lifecycle`, `cleanup-old-notifications`, `cleanup-soft-deleted`, `update-fx-rates`, `generate-embeddings`, `transcribe-recording` |
| Inngest (5) | `apps/web/src/lib/inngest/functions/` | Event-driven: `parse-resume`, `evaluate-resume`, `process-drive-doc`, `process-expense-receipt`, `process-project-intake`. Typed event schemas in `lib/inngest/client.ts`; handler at `/api/inngest`. Local: `pnpm inngest:dev` |
| Vercel Cron | `vercel.json` → `/api/cron/*` | `drive-watch-renew` (01:00), `drive-doc-sync` (02:00) |
| GitHub Actions | `.github/workflows/` | `daily-milestones.yml`, `evaluation-cadence-reminders.yml`, `maintenance.yml` |
| n8n (13) | `n8n/workflows/` | Telegram/email digests, reminders, escalations (ADR-004 explains why core cron lives in Edge Functions) |

## Code Standards

### TypeScript
```typescript
// Strict mode - no `any`. Use `unknown` + type guards.
// Explicit return types on exported functions and components.
// Branded types for IDs
import { brandEmployeeId, brandUserId } from '@hr-portal/database';
type EmployeeId = string & { readonly __brand: 'EmployeeId' };
```

### React/Next.js
```typescript
// Server Components by default; 'use client' only for hooks/event handlers.

import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';   // central key factory

export function useEmployees(filters: EmployeeFilters) {
  return useQuery({
    queryKey: queryKeys.employees.list(filters),
    queryFn: () => fetchEmployees(filters),
  });
}
```
Query keys live in `apps/web/src/lib/query-keys.ts`; mutation helpers in `lib/mutation-helpers.ts`.

### Components
```typescript
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/utils/cn';

const buttonVariants = cva('base-classes', {
  variants: { variant: { primary: '…', secondary: '…' }, size: { sm: '…', md: '…' } },
  defaultVariants: { variant: 'primary', size: 'md' },
});
// Radix primitives with React.forwardRef
```

### Database conventions
```sql
CREATE TABLE table_name (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  -- domain columns
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz
);

ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_name FORCE ROW LEVEL SECURITY;
```
snake_case columns · `idx_tablename_columnname` · `tablename_operation_context_policy`.
Migrations are **append-only** — never edit one that has shipped; add a new migration instead.

### API routes (257 handlers across ~50 domains)
```typescript
// apps/web/src/app/api/[resource]/route.ts
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase/server';
```
Established pattern:
1. Resolve auth + role via a domain `_lib.ts` helper (see `api/tasks/_lib.ts` → `getTaskAuthedContext`) — reads `app_metadata.db_role`, falls back to a `users` lookup.
2. Validate input with a Zod schema from `lib/schemas/*.schema.ts`.
3. Query through the RLS-scoped server client. Reach for `createSupabaseAdminClient` only where service-role is genuinely required, and gate it yourself.
4. Return `{ error: string }` on failure — clients parse it via `lib/api-error.ts` (`ApiError`, `toApiError`, `ensureOk`).
5. Log sensitive operations to `audit_logs` (`lib/audit.ts`).

Public prefixes that bypass middleware auth: `/auth/`, `/api/health`, `/api/cron/`, `/api/webhooks/`, `/api/inngest`, `/api/calendar/callback`.

## File Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Components | PascalCase | `EmployeeCard.tsx` |
| Primitives | lowercase | `button.tsx` |
| Utilities | camelCase | `formatDate.ts` |
| Types | PascalCase + `.types.ts` | `employee.types.ts` |
| Hooks | `use` prefix | `useEmployees.ts` |
| Schemas | camelCase + `.schema.ts` | `employee.schema.ts` |
| Route helpers | `_lib.ts` beside `route.ts` | `api/tasks/_lib.ts` |
| Unit tests | same name + `.test.ts` | `formatDate.test.ts` |
| E2E tests | `.spec.ts` | `login.spec.ts` |
| Migrations | `YYYYMMDDHHMMSS_description.sql` | `20260911000002_create_christmas_wish_tree.sql` |
| n8n workflows | `{domain}-{action}.json` | `intern-end-date-reminder.json` |
| Ops scripts | kebab-case `.mjs` under `scripts/<area>/` | `scripts/backfill/backfill-invoice-php-amounts.mjs` |

## Design System

Primary is **SN teal**, shared with the public SN brand — *not* Indigo.

### Colors (`apps/web/tailwind.config.ts`)
- **Primary:** `#175063` (DEFAULT), full 50–950 teal ramp
- **Sidebar:** white surface, Zinc-900 text, Zinc-100 hover, Zinc-200 border
- **Neutrals:** CSS variables (`--background`, `--foreground`, `--card`, `--muted`, `--border`, `--ring`, …) so `darkMode: 'class'` switches automatically — use the semantic Tailwind names, not raw zinc values
- **Semantic:** success `#16A34A`, warning `#F59E0B`, error `#E11D48`

### Typography
- Sizes and line heights come from CSS variables (`--font-size-*`, `--line-height-*`) — dense enterprise scale
- `font-sans` → `var(--font-body)`, `font-heading` → `var(--font-heading)` (see `app/fonts.ts`)
- Headings: `tracking-tighter` (-0.01em) / `tightest` (-0.02em)

### Layout
- Fixed viewport: `h-screen overflow-hidden`; content scrolls inside the container
- Spacing tokens: `spacing.sidebar` (16rem) / `sidebar-collapsed` (4rem) / `header` (4rem)

## Scripts

```bash
# Development
pnpm dev              # www (public site, :3000)
pnpm dev:web          # Control Hub portal (:3001)
pnpm dev:all          # both
pnpm dev:mobile       # Capacitor app
pnpm inngest:dev      # local Inngest dev server against :3001

# Build
pnpm build            # all packages (pnpm -r)
pnpm build:web        # portal
pnpm build:www        # public site (this is Vercel's buildCommand)
pnpm build:packages

# Quality
pnpm lint / lint:fix / format   # Biome
pnpm typecheck                  # tsc across workspaces

# Testing
pnpm test / test:ui / test:coverage   # Vitest
pnpm test:e2e / test:e2e:ui           # Playwright
pnpm test:e2e:local                   # playwright.local.config.ts

# Database & env
pnpm supabase:start / :status / :stop
pnpm db:migrate / db:seed / db:generate
pnpm env:use-local / env:use-staging / env:use-prodops

# Ops (see scripts/)
pnpm drive:watch / drive:watch:renew / drive:ingest
pnpm check:leadership-accounts
pnpm check:production-cleanliness
pnpm reports:backfill-total-spend[:apply]
pnpm invoices:backfill-php-amounts[:apply]
pnpm notifications:backfill-names[:apply]
```

Backfill scripts are dry-run by default; `--apply` (plus `--confirm-prod` where present) performs writes. Never run an `:apply` variant against production without explicit instruction.

## Security Requirements

### Zero-trust principles
1. **Never trust client-side data** — validate on the server with Zod.
2. **RLS is the final gatekeeper.** `middleware.ts` is UX convenience only and says so in its own header comment.
3. **Verify the session in every API route** (`supabase.auth.getUser()` via the domain `_lib.ts` helper).
4. **Audit sensitive operations** to `audit_logs`.
5. **The service-role client bypasses RLS** — `createSupabaseAdminClient` must always be paired with an explicit role/grant check in the handler.

### Never log
SSN/government IDs · payroll and bank account numbers · salary · medical records · home addresses · emergency contacts · Wise recipient details · resume/PII extracted by AI

### Secrets
`SUPABASE_SERVICE_ROLE_KEY`, `OPENAI_API_KEY`, `RESEND_API_KEY`, `WISE_API_KEY`, `CRON_SECRET`, `ADMIN_SECRET_KEY`, `INQUIRY_ABUSE_SECRET`, Google/Telegram credentials — server-only, never `NEXT_PUBLIC_`. Full inventory: `docs/ENVIRONMENT.md`.

### Rate limiting
Public inquiry intake on `apps/www` is rate-limited and de-duplicated in the DB (`inquiry_rate_limit_buckets`, `inquiry_deduplication_keys`, HMAC'd with `INQUIRY_ABUSE_SECRET`). Portal API routes are not yet globally rate-limited.

## Testing

| Type | Tool | Location | State |
|------|------|----------|-------|
| Unit / integration | Vitest | `tests/`, colocated `*.test.ts` | ~56 files — API routes, hooks, lib, schemas |
| E2E | Playwright | `e2e/*.spec.ts` | auth, onboarding, resources, announcements, tickets, leadership smoke, UI audits |

Coverage is uneven; API route handlers and `lib/` helpers are the best-covered areas. Add tests alongside new business logic rather than retrofitting.

Playwright configs: `playwright.config.ts` (CI), `playwright.local.config.ts`, `playwright.tickets.local.config.ts`, `playwright.tour.config.ts`.

## CI/CD

`.github/workflows/ci.yml` runs on push/PR: **quality** (`pnpm lint`, `biome format`, `pnpm typecheck`) → **test** (`pnpm test:coverage`) → **build-packages** → **build-web** → **e2e** (Playwright/Chromium) → **security** (`pnpm audit --prod --audit-level=moderate`) → `ci-success` gate.

Deployment: `vercel-deploy.yml` (root `vercel.json` builds `www`; the portal is a separate Vercel project), `supabase-migrations-deploy.yml` (staging from `dev`, production from `main`; manual runs default to dry-run), `supabase-functions-deploy.yml`.

## Commit Message Format

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```
**Types:** feat, fix, docs, style, refactor, test, chore

```
feat(tickets): add handler assignment dialog
fix(expenses): correct PHP conversion for marketing receipts
docs(api): document ticket endpoints
```

## PR Requirements

- [ ] All tests passing
- [ ] No TypeScript errors (`pnpm typecheck`)
- [ ] Biome checks pass (`pnpm lint`)
- [ ] `CHANGELOG.md` updated for user-visible changes
- [ ] Documentation updated (if API changes)
- [ ] Security review (if auth/data changes)
- [ ] RLS policies reviewed (if schema changes)
- [ ] Audit logging added (if sensitive operations)

## Current State

### Shipped
- Two production Next.js apps (portal + public site) on a shared Supabase backend
- 257 API route handlers · 166 portal pages · 14 public-site pages
- 194 migrations · ~123 tables · ~748 RLS policy statements
- Supabase Auth (PKCE callback + middleware session refresh), 4-role UI model, per-module access grants
- 17 Edge Functions, 5 Inngest functions, 2 Vercel crons, 13 n8n workflows
- AI: RAG chat over `knowledge_embeddings`, conversation history, resume parsing/evaluation, receipt and project-intake extraction, Google Drive knowledge sync
- Wise payouts with webhooks, multi-currency FX, payroll approvals, invoice PDFs
- Performance suite (OKR/KPI with evidence, self-evaluations, temperature checks, evaluation cadence)
- Tickets, PA task tracker, ATS/recruitment, CRM pipeline, revenue forecast, marketing & AI spend tracking
- Gamification (points, badges, leaderboards, wellness bingo, Christmas wish tree)
- CI/CD with automated migration and Edge Function deploys

### Gaps / rough edges
- `JWT_SECRET` is still required by `packages/config/src/env.ts` but no application code reads it — auth is Supabase Auth. Remove it from the schema when convenient.
- `supabase/functions/transcribe-recording/index.ts` calls the Anthropic Messages API with `max_tokens_to_sample` (a legacy Text Completions param); the Messages API expects `max_tokens`, so stand-up summaries likely fail. It degrades gracefully, so the failure is silent.
- Unit test coverage is sparse relative to surface area
- No global API rate limiting on the portal
- Mobile app is a Capacitor skeleton

## Quick Reference

### Local auth
Set `NEXT_PUBLIC_ENABLE_MOCK_AUTH=true` to bypass Supabase entirely (middleware skips server checks; `AuthContext` uses the mock path).

| Email | Password | Role |
|-------|----------|------|
| employee@test.com | password | employee |
| associate@test.com | password | associate |
| admin@test.com | password | admin |
| superadmin@test.com | password | super_admin |

### Route groups (`apps/web/src/app/`)
- `(auth)` — login, forgot-password, reset-password
- `(employee)` — dashboard, profile, tasks, reports, projects, performance, invoice, expenses, announcements, information-hub, tickets, calendar, notifications, ai-spending, ats, crm, intern, manager, associate, pa-tasks, settings, christmas-tree
- `(admin)` — `admin/*` (dashboard, directory, employee-management, onboarding, probation, interns, jobs, recruitment, resources, reports, marketing, expenses, tickets, checklists, company-pulse, war-room, ai-knowledge, …) and `super-admin/*` (dashboard, payroll-approvals, revenue-forecast, tasks, performance, ai-knowledge, …)
- `(self-service)` — bingo, leaderboard, my-performance
- Standalone — `/booking/steven`, `/coming-soon`, `/account-disabled`, `/onboarding/awaiting-approval`, `/crm`, `/marketing/ad-spend`, `/revenue-forecast`

### Key file locations
- Auth context: `apps/web/src/contexts/AuthContext.tsx`
- Role helpers: `apps/web/src/lib/auth/role.ts`, `apps/web/src/lib/roles.ts`
- Supabase clients: `apps/web/src/lib/supabase/{client,server}.ts`
- Middleware: `apps/web/middleware.ts`
- Query keys / client: `apps/web/src/lib/query-keys.ts`, `lib/query-client.ts`
- API error contract: `apps/web/src/lib/api-error.ts`
- Zod schemas: `apps/web/src/lib/schemas/`
- Inngest: `apps/web/src/lib/inngest/`
- Database types: `packages/database/src/database.types.ts`, branded IDs in `src/branded-types.ts`
- Env validation: `packages/config/src/env.ts`
- UI primitives / layout: `packages/ui/src/primitives/`, `packages/ui/src/layout/`
- Tailwind config: `apps/web/tailwind.config.ts`
- Migrations: `supabase/migrations/`

### Docs worth reading before large changes
- `docs/AGENT-GUIDELINES.md` — non-negotiable agent working rules
- `docs/ENVIRONMENT.md` — full env var inventory
- `docs/adr/` — ADR-001 role mapping, ADR-002 resources, ADR-004 Edge Function cron, ADR-005 resource categories, ADR-006 knowledge versioning
- `docs/production/production-launch-checklist.md`
- `CHANGELOG.md` — running record of shipped features

## graphify

This project has a knowledge graph at graphify-out/ with god nodes, community structure, and cross-file relationships.

When the user types `/graphify`, use the installed graphify skill or instructions before doing anything else.

Rules:
- For codebase questions, first run `graphify query "<question>"` when graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for relationships and `graphify explain "<concept>"` for focused concepts. These return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw grep output.
- Dirty graphify-out/ files are expected after hooks or incremental updates; dirty graph files are not a reason to skip graphify. Only skip graphify if the task is about stale or incorrect graph output, or the user explicitly says not to use it.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when query/path/explain do not surface enough context.
- After modifying code, run `graphify update .` to keep the graph current (AST-only, no API cost).
