# Changelog

All notable changes to the SN Connect HR Portal are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

---

## [Unreleased]

### Added

- **Navy & Gold design system** — Full rebrand from Titanium & Indigo to Navy & Gold (zinc palette); font changed from Inter to Source Sans 3 (body) + Lexend (headings)
- **Wise payment gateway** — `wise_payments` and `wise_payment_events` tables; `GET /api/webhooks/wise` receiver; full payment lifecycle tracking (`20260324000001`)
- **Task proofs** — `task_proofs` table; employees can upload evidence files when completing a task; Super Admins can review proofs from task detail; `GET/POST/DELETE /api/tasks/[id]/proofs` (`20260322000001`)
- **KPI scale rating** — `scale_min`/`scale_max` columns on `okr_targets` + `scale_to_okr_targets` migration; new `Scale` metric type on OKR targets with `ScaleRatingInput` UI component (`20260322000002`, `20260322000003`)
- **KPI evidence attachments** — `kpi_evidence` table; `GET/POST /api/performance/kpis/[id]/evidence`; employees upload files to support KPI measurements (`20260322000002`)
- **Announcement starring** — `announcement_stars` table with RLS; `POST /api/announcements/[id]/star` toggle; `GET /api/announcements/starred`; star counts in analytics dashboard; starred page at `/announcements/starred` (`20260321000001`)
- **Announcement archive/restore** — `POST /api/announcements/[id]/restore` restores archived announcements; admin filter by Archived status
- **Jobs archive/restore** — `GET /api/jobs/archived`; `POST /api/jobs/[id]/restore`; archived jobs page at `/admin/jobs/archived`
- **Resources archive/restore** — `POST /api/resources/[id]/restore`; archived resources page at `/admin/resources/archived`
- **CompanyPulse widget** — Dashboard widget showing live company activity feed for all users
- **Milestone banner** — `MilestoneBanner` component on employee/intern dashboards highlighting tenure and work anniversaries; `GET /api/milestones`
- **Help Center** — `/help`, `/help/invoices`, `/help/reports`, `/help/performance-reviews` pages; `HelpLink` + `SectionTooltip` components for contextual guidance throughout the app
- **Team performance view** — `/admin/performance/team` with multi-select dept/role/status filters; `GET /api/performance/team`
- **Activity/audit log** — `/super-admin/activity` page showing paginated audit trail; `GET /api/audit-logs` (super_admin only)
- **AI chat citations** — `CitationBadge`, `CitationPanel`, `CitedContent`, `TextShimmer` components; RAG responses now cite knowledge source titles; `return_source_title_from_embeddings` function (`20260319000001`)
- **Intern daily log draft/submit** — `status` column on `internship_daily_logs` (`draft`/`submitted`); interns can save drafts before submitting (`20260317000001`)
- **Forgot password flow** — `/forgot-password` page; `POST /api/auth/forgot-password`
- **Google Drive webhook** — `GET /api/webhooks/drive` receiver for real-time document sync events
- **Edge Function security hardening** — Auth validation and CORS enforcement on all 3 Supabase Edge Functions
- **Custom SMTP** — Email delivery via custom SMTP relay instead of Supabase default

### Fixed

- `fix(api)`: Use `supabaseAdmin` for all DB operations in POST routes (invoices, OKRs, KPIs, reports) to prevent nested RLS failures
- `fix(api)`: Use admin client for DB operations to bypass nested RLS failures
- `fix(db)`: Update offboarding and onboarding RLS policies to use consolidated role enum (`20260227000002`)

### Removed

- **Calendar** (`/calendar`) — Page and all related API routes removed
- **Leave Requests** (`/leave`) — Leave request feature and all related API routes removed
- **Company Events** — Removed from dashboard and sidebar navigation

### Changed

- **Package READMEs** — README.md for `@hr-portal/ai`, `@hr-portal/auth`, `@hr-portal/config`, `@hr-portal/database`, `@hr-portal/ui`
- **Report hierarchy** — `parent_report_id`, `report_group`, `hierarchy_path` columns on `reports`; `get_report_children()`, `get_report_tree()` functions; `root_reports` view (`20260227000010`)
- **Knowledge versioning** — `knowledge_source_versions` table with auto-snapshot trigger on update; `get_knowledge_source_versions()`, `restore_knowledge_source_version()` functions (`20260227000011`)
- **Resource categories table** — `resource_categories` table replacing static enum; hierarchical with `parent_id`, seed data for 10 categories; `get_resource_category_tree()` function (`20260227000012`)
- **Intern self-init policies** — `internships_insert_self_policy` and `internships_update_self_policy` RLS policies allowing interns to create/update their own internship record (`20260227000013`)
- **Notifications system** — `notifications` table with `notification_type` enum (11 types), 5 RLS policies, deep-link support (`20260227000001`)
- **User role metadata** — `user_role_metadata` and `role_kpi_entries` tables for role-specific KPI tracking with self-management + admin-read RLS (`20260228000004`)
- **Task tags & categories** — `category` (text) and `tags` (text[]) columns on `tasks` with GIN index (`20260228000005`)
- **Resource access levels** — `resource_access_level` enum (`full`, `view_only`), `access_level` column on `resources` (`20260228000006`)
- **OKR/KPI automation** — `progress_pct` generated column on `kpis`, `calculate_okr_progress()` function with auto-update trigger on `okrs` (`20260228000003`)
- **Employee directory view** — `employee_directory` view joining users, employees, and active internships (`20260228000001`)
- **Performance summary view** — `individual_performance_summary` view aggregating KPIs, OKRs, and reviews per employee (`20260228000002`)
- **Phone country codes** — `contact_country_code`, `emergency_contact_country_code`, `payment_phone_country_code` on `onboarding_profiles` (`20260227000003`)
- **Audit log normalization** — `action` and `metadata` columns on `audit_logs` for Edge Function context (`20260227000001`)
- **Agent Guidelines** — `docs/AGENT-GUIDELINES.md` with clean code, doc hygiene, and self-review standards
- **Documentation plan** — `docs/DOCUMENTATION-PLAN.md` with phased plan for comprehensive docs
- **API Reference Index** — `docs/api/README.md` listing all 108 HTTP handlers across 16 domains
- **Component Reference Index** — `docs/components/README.md` listing all primitives and composites
- **Documentation Hub** — `docs/README.md` audience-segmented entry point
- **ADR-005** — Resource categories: enum-to-table migration for dynamic category management
- **ADR-006** — Knowledge base versioning strategy with auto-snapshot triggers

### Fixed

- `fix(api)`: Use `supabaseAdmin` for all DB operations in POST routes (invoices, OKRs, KPIs, reports) to prevent nested RLS failures
- `fix(api)`: Use admin client for DB operations to bypass nested RLS failures
- `fix(db)`: Update offboarding and onboarding RLS policies to use consolidated role enum (`20260227000002`)

### Changed

- `chore(deps)`: Update package dependencies and extend Tailwind config with new design tokens (semantic colors, animations, sidebar spacing)
- `chore(db)`: Regenerate TypeScript database types reflecting notifications, task_tags, resource_categories, and role_metadata
- `chore(db)`: Renumber `fx_rates` and `bank_registry` migration files from `20260227000006/7` to `20260227000004/5`
- `chore`: Add `.env.example` to `.gitignore`

---

## [0.9.0] — 2026-02-24

### Added

- **Standup Recordings** — `POST /api/standups/upload` with storage and transcription trigger
- **AI Policy Assistant** — RAG-powered chat with Claude, knowledge source CRUD, embedding generation
- **Realtime subscriptions** — 7 hooks for live updates (onboarding approvals, intern logs, tasks, reports, performance, probation, internships)
- **User Management** — invite flow, onboarding approval, employee/intern record assignment
- **Webhook receiver** — `POST /api/webhooks/n8n` with HMAC/Bearer/secret auth

### Changed

- Consolidated role system — added `super_admin` to DB enum, unified role mapping (ADR-001)
- All role-gated routes now use helper functions (`isAnnouncementAdmin`, `isResourceAdmin`, etc.)

---

## [0.8.0] — 2026-02-20

### Added

- **Performance module** — cycles, OKRs, KPIs, reviews with admin and employee views
- **Internship module** — internship management, daily logs, supervisor approval
- **Probation tracker** — `GET /api/probation` with employee details, OKRs, KPIs, document counts

---

## [0.7.0] — 2026-02-17

### Added

- **Announcements** — full lifecycle: create, target, publish, pin, archive, comments, attachments, analytics (10+ endpoints)
- **Resources & Collections** — CRUD, feed, search, bookmarks, featured, bulk upload, download, analytics (20+ endpoints)
- Information Hub pages combining announcements + resources with category browsing

### Fixed

- Resources schema fixes (see `docs/fix-resources-schema-2026-02-16.md`)

---

## [0.6.0] — 2026-02-14

### Added

- **Reports** — weekly report creation, submission, approval workflow with metrics
- **Tasks** — task CRUD, assignment, comments, status transitions
- **Invoices** — invoice creation, submission, approval workflow with line items
- Report analytics and comparison views (admin)
- Optimistic updates for resource featured toggle and task status

---

## [0.5.0] — 2026-02-10

### Added

- **Onboarding** — credential-first 4-step wizard (personal → payment → documents → review)
- Admin onboarding management: profile list, detail view, approval/rejection
- Onboarding document upload with signed preview URLs
- `docs/credentials-first-onboarding-flow.md` — full architecture documentation

---

## [0.4.0] — 2026-02-07

### Added

- **Employee & Document APIs** — CRUD with RLS, document upload to Supabase Storage, signed download URLs
- **Department API** — list and create with pagination
- Skeleton loading and EmptyState fallback patterns across all pages
- PasswordInput primitive with show/hide toggle
- Toast notification primitive

### Changed

- Renamed "My 201 Files" → "My Documents" across the UI

---

## [0.3.0] — 2026-02-03

### Added

- **Database schema** — Phase 1 complete: users, employees, departments, documents, audit_logs
- 26 RLS policies covering all tables
- 8 PostgreSQL helper functions (role checks, manager hierarchy, tenure, soft delete)
- Database enums: user_role (6), user_status (3), employment_type (4), work_arrangement (2), document_type (10)
- Supabase migration infrastructure with `pnpm db:migrate`

---

## [0.2.0] — 2026-01-28

### Added

- **UI component library** — 19 Radix primitives + 80 composite components across 9 domains
- Titanium & Indigo design system (Indigo-600 primary, Zinc palette, Inter font)
- TanStack Query infrastructure with query key factory pattern
- Mock authentication with 4 test accounts (employee, intern, admin, super_admin)
- All 65 UI pages built as frontend shell

---

## [0.1.0] — 2026-01-23

### Added

- Monorepo structure with pnpm workspaces
- Next.js 15 + React 19 setup with App Router
- TypeScript strict mode configuration
- Biome linting and formatting
- CI/CD pipelines (GitHub Actions: ci, deploy, playwright, security)
- Vitest + Playwright test infrastructure
- Capacitor mobile skeleton

---

*Dates are approximate, reconstructed from git history.*
