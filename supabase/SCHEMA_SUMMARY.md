# SN Connect — Schema Summary

> Audience: Developers, DevOps

Database schema shared by the Control Hub portal (`apps/web`) and the public SN Group site (`apps/www`).

**194 timestamped migrations** (`20260123` → `20260916`) · **~123 tables** · **51 enums** · **5 views** · **~748 RLS policies** · **~76 functions** · **~470 indexes**

Counts are derived from the migration files. Regenerate TypeScript types with `pnpm db:generate` after any schema change.

---

## Table of Contents

- [Migration Phases](#migration-phases)
- [Core Tables](#core-tables)
- [Feature Tables](#feature-tables)
- [Views](#views)
- [Enums](#enums)
- [Helper Functions](#helper-functions)
- [Access Control](#access-control)
- [Storage Buckets](#storage-buckets)
- [Conventions](#conventions)
- [Known Limitations](#known-limitations)

---

## Migration Phases

| Period | Files | Theme |
|--------|-------|-------|
| `202601` | 10 | Core: enums, users, employees, departments, documents, audit_logs, triggers, helper functions |
| `202602` | 60 | Feature build-out and repairs: reports, tasks, invoices, announcements, onboarding, offboarding, performance, internships, resources; role consolidation; storage buckets; knowledge/pgvector; standups; notifications; FX and bank registry; directory and performance views; OKR/KPI automation |
| `202603` | 29 | Corporate website tables, AI conversations, query cache, company events, task proofs, Wise payments, ticketing, checklist templates, job requisitions, KPI evidence |
| `202604` | 12 | Calendar notification sync, ticket submission hardening, divisions and org placement, OKR target evidence, ATS access grants |
| `202605` | 23 | Projects (contributors, milestones, checklists, backlog), gamification, intern EOD digest, monthly self-evaluations, quarterly temperature checks, evaluation drafts |
| `202606` | 19 | CRM pipeline, project documentations, monthly call feedback, evaluation summaries, resource folders, weekly commitments, expense entries, expense RBAC hardening |
| `202607` | 18 | Badge system, domain mastery, revenue forecast, wellness bingo, public inquiry abuse controls, expense payment matching |
| `202608` | 14 | Marketing spend tracking, PA task tracker, AI spending controls, associate evaluations |
| `202609` | 9 | Virtual Christmas wish tree, marketing schema preservation, policy hardening |

Supporting files in the folder that are **not** migrations: `README.md`, `validate_schema.sql`, `verify_associate_rename.sql`, `verify_resources_schema.sql`, and one `.backup`.

Migrations are **append-only** — never edit a migration that has shipped.

---

## Core Tables

### users

Extends `auth.users` with HR-specific fields.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | References `auth.users(id)` |
| `role` | user_role | employee, associate, admin, super_admin, hr, cos, ceo |
| `department_id` | FK departments | |
| `division_id` | FK divisions | Added `20260411000003` |
| `manager_id` | FK users (self) | Direct manager |
| `status` | user_status | active, on_leave, terminated |
| `avatar_url` | text | Profile image |
| `created_at`, `updated_at` | timestamptz | Standard timestamps |
| `deleted_at` | timestamptz | Soft delete |

### employees

201 file data (Philippine HR term). Contains PII and payroll info.

| Column Group | Fields |
|-------------|--------|
| **Identity** | `id`, `user_id` (FK users), `employee_number` (unique) |
| **Personal** | `first_name`, `last_name`, `middle_name`, `birthday`, `gender`, `civil_status`, `nationality` |
| **Employment** | `position`, `department`, `employment_type`, `work_arrangement`, `date_hired`, `probation_end_date` |
| **Contact** | `phone`, `phone_country_code`, `personal_email`, `address` fields |
| **Payroll** ⚠️ | `sss_number`, `tin_number`, `philhealth_number`, `pagibig_number`, `bank_name`, `bank_account_number` |
| **Hierarchy** | `immediate_head` (FK users) |
| **Standard** | `created_at`, `updated_at`, `created_by`, `deleted_at` |

### departments / divisions

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | |
| `name` | text UNIQUE | |
| `description` | text | |
| `head_id` | FK users | Department/division head |

`divisions` sits above `departments` for org placement (`20260411000003`).

### documents

File references for 201 files and uploaded documents.

| Column | Type | Description |
|--------|------|-------------|
| `employee_id` | FK employees | |
| `document_type` | document_type enum | 10 categories |
| `file_path` | text | Supabase Storage path |
| `is_confidential` | boolean | |
| `uploaded_by` | FK users | |

### audit_logs

Tracks sensitive operations. Insert-only (no update/delete).

| Column | Type | Description |
|--------|------|-------------|
| `table_name` | text | Affected table |
| `record_id` | uuid | Affected record |
| `action` | text | Operation/action identifier (added for Edge Functions) |
| `old_values` | jsonb | Before state |
| `new_values` | jsonb | After state |
| `user_id` | uuid | Who performed it |
| `details` | jsonb | Additional context |
| `metadata` | jsonb | Edge Function metadata (DEFAULT `'{}'`) |

### notifications

In-app notification system with deep-link support.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | |
| `user_id` | FK users | Target user |
| `type` | notification_type | 24-value enum |
| `title` | text | Notification title |
| `message` | text | Optional body |
| `link` | text | Deep link path (e.g. `/tasks/abc`) |
| `is_read` | boolean | DEFAULT false |
| `read_at` | timestamptz | When read |
| `metadata` | jsonb | Additional context |
| `created_at` | timestamptz | |
| `expires_at` | timestamptz | Optional TTL |

---

## Feature Tables

### Onboarding / Offboarding
| Table | Description |
|-------|-------------|
| `onboarding_profiles` | Per-user onboarding state and step data, incl. country-code fields |
| `onboarding_documents` | Documents uploaded during onboarding |
| `onboarding_checklists` / `onboarding_tasks` | Admin-created checklists and their items (with submission fields) |
| `checklist_templates` | Reusable checklist definitions, scoped by flow and audience |
| `offboarding` / `offboarding_tasks` | Exit process state and task list |

### Tasks
| Table | Description |
|-------|-------------|
| `tasks` | Core task records with `category` and `tags` |
| `task_comments` | Threaded comments |
| `task_proofs` | Proof-of-completion attachments |
| `pa_tasks` | Personal-assistant task tracker |
| `pa_task_attachments` | PA task file attachments |
| `pa_task_statuses` / `pa_task_priorities` / `pa_task_categories` | PA lookup tables |
| `pa_task_access_grants` | Per-user access to the PA module |

### Projects
| Table | Description |
|-------|-------------|
| `projects` | Project records with status and health |
| `project_contributors` | Membership with contributor roles |
| `project_milestones` | Milestones with period type and complexity tier |
| `project_checklist_items` | Milestone checklist items |
| `project_backlog` | Claimable backlog pool |
| `project_documentations` | Attached project documentation |

### Reports
| Table | Description |
|-------|-------------|
| `reports` | Hierarchical reports (`parent_report_id`, `report_group`, `hierarchy_path`) |
| `report_metrics` | Metric rows attached to a report |

### Invoices & Payouts
| Table | Description |
|-------|-------------|
| `invoices` / `invoice_line_items` | Invoice submission and approval |
| `wise_payments` | Wise transfer records and status |
| `employee_banking_info` | Payout details and Wise recipient IDs |
| `fx_rates` | Daily exchange rates (`update-fx-rates` Edge Function) |
| `bank_registry` | Supported banks per country |

### Expenses & Spend
| Table | Description |
|-------|-------------|
| `expense_entries` | General expense ledger (partitioned RBAC, `expense_type`) |
| `marketing_platforms` / `marketing_campaigns` / `marketing_entries` | Marketing ad-spend tracking |
| `marketing_entry_receipts` | Receipt uploads for marketing entries |
| `marketing_access_grants` | Per-user access to marketing spend |
| `ai_expense_providers` / `ai_expenses` | AI tooling spend by provider |
| `ai_spending_access_grants` | Per-user access to AI spend |

### Announcements
| Table | Description |
|-------|-------------|
| `announcements` | Announcement records with status, priority, targeting |
| `announcement_reads` / `announcement_stars` | Per-user read and star state |
| `announcement_comments` / `announcement_attachments` | Discussion and files |

### Resources (Information Hub)
| Table | Description |
|-------|-------------|
| `resources` | Library items with `category_id` and `access_level` |
| `resource_categories` / `resource_folders` | Hierarchical organisation |
| `resource_views` / `resource_bookmarks` | Engagement tracking |
| `resource_collections` / `collection_resources` | Curated collections |

### Performance
| Table | Description |
|-------|-------------|
| `review_cycles` / `performance_reviews` | Review cycle management |
| `okrs` / `okr_targets` / `okr_target_evidence` | OKRs with auto-progress and evidence |
| `kpis` / `kpi_evidence` | KPIs with generated `progress_pct`, scale and evidence |
| `monthly_self_evaluations` | Monthly self-assessment |
| `quarterly_temperature_checks` | Quarterly pulse |
| `five_percent_reflections` | Five-percent reflection submissions |
| `monthly_call_feedback` | Call feedback records |
| `performance_evaluation_drafts` / `performance_evaluation_summaries` | Draft and finalised evaluations |
| `associate_evaluations` | Associate-specific evaluations |
| `weekly_commitments` / `weekly_commitment_items` | Weekly commitment tracking |
| `user_role_metadata` / `role_kpi_entries` | Role-specific metadata and KPI definitions |

### Internships
| Table | Description |
|-------|-------------|
| `internships` | Internship records and status |
| `intern_daily_logs` | Daily EOD logs |
| `intern_eod_digest_runs` | Digest delivery bookkeeping (n8n) |

### Tickets
| Table | Description |
|-------|-------------|
| `tickets` | Support tickets with team, category, feature area, priority, status |
| `ticket_comments` / `ticket_attachments` | Discussion and files |
| `ticket_handlers` | Who handles which team's tickets |

### ATS & Recruiting
| Table | Description |
|-------|-------------|
| `job_postings` | Public job listings (surfaced on `apps/www`) |
| `job_requisitions` | Internal hiring requests |
| `job_applications` | Applications with parsed/evaluated resume data |
| `ats_access_grants` | Per-user access to the ATS |

### CRM & Revenue
| Table | Description |
|-------|-------------|
| `crm_sfo_leads` / `crm_tech_inquiries` | Pipeline records |
| `crm_access_grants` | Per-user CRM access |
| `sfo_revenue_entries` / `sfo_revenue_goals` | Revenue forecasting |
| `revenue_forecast_access_grants` | Per-user forecast access |

### Public Website
| Table | Description |
|-------|-------------|
| `business_units` | SN Group business units |
| `website_content` | Editable marketing content |
| `public_inquiries` | Contact-form submissions |
| `inquiry_rate_limit_buckets` / `inquiry_deduplication_keys` | Abuse controls (HMAC via `INQUIRY_ABUSE_SECRET`) |

### Calendar & Standups
| Table | Description |
|-------|-------------|
| `company_events` | Company calendar events by `event_category` |
| `company_calendar_event_sync` / `company_calendar_sync_state` | Google Calendar sync bookkeeping |
| `standup_recordings` / `standup_topics` | Recordings (Mux) and agenda topics |

### AI
| Table | Description |
|-------|-------------|
| `knowledge_sources` | Versioned knowledge documents |
| `knowledge_embeddings` | pgvector embeddings for RAG |
| `knowledge_source_versions` | Auto-snapshot version history |
| `ai_conversations` / `ai_messages` | Saved chat sessions |
| `query_cache` | Cached query results |

### Gamification & Culture
| Table | Description |
|-------|-------------|
| `points_events` / `user_gamification` / `leaderboard_snapshots` | Points and leaderboards |
| `badge_definitions` / `user_badges` | Badge system |
| `user_domain_mastery` | Domain mastery progression |
| `wellness_bingo_cycles` / `_boards` / `_partnerships` / `_weekly_recordings` | Wellness bingo |
| `christmas_tree_events` / `christmas_ornaments` / `christmas_wishes` | Virtual Christmas wish tree |

### Misc
| Table | Description |
|-------|-------------|
| `profile_change_requests` | Employee-initiated profile edits pending approval |

---

## Views

| View | Description |
|------|-------------|
| `employee_directory` | Joins users + employees + active internships. Columns: user_id, employee_id, avatar_url, full_name, role, department, position, status, employment_type, start_date, email, contact_number, birthday, internship fields |
| `individual_performance_summary` | Aggregates per-employee KPIs (count, avg progress, completed), OKRs (count, avg progress, completed), and reviews (latest rating, date, total count) |
| `root_reports` | Top-level reports (`parent_report_id IS NULL`) with computed `child_count` |
| `marketing_platform_totals` | Spend totals per marketing platform |
| `marketing_monthly_platform_totals` | Spend totals per platform per month |

---

## Enums

51 enum types. The most frequently referenced:

### Core
| Enum | Values |
|------|--------|
| `user_role` | `admin`, `hr`, `cos`, `ceo`, `employee`, `associate`, `super_admin` |
| `user_status` | `active`, `on_leave`, `terminated` |
| `employment_type` | `regular`, `probationary`, `associate`, `project_based` |
| `work_arrangement` | `part_time`, `full_time` |
| `document_type` | `contract`, `id`, `certificate`, `performance_review`, `tax`, `medical`, `training`, `disciplinary`, `leave`, `other` |

### Feature
| Enum | Values |
|------|--------|
| `task_status` | `todo`, `in_progress`, `completed`, `on_hold`, `cancelled` |
| `task_priority` | `low`, `medium`, `high`, `urgent` |
| `invoice_status` | `draft`, `submitted`, `approved`, `rejected` |
| `announcement_status` | `draft`, `published`, `archived` |
| `announcement_priority` | `normal`, `important`, `urgent` |
| `resource_type` | `document`, `link`, `video`, `image`, `other` |
| `resource_access_level` | `full`, `view_only` |
| `onboarding_status` | `not_started`, `in_progress`, `completed`, `approved`, `rejected` |
| `internship_status` | `active`, `completed`, `withdrawn`, `extended` |
| `review_status` | `draft`, `submitted`, `acknowledged` |
| `knowledge_source_type` | `pdf`, `docx`, `url`, `manual` |
| `notification_type` | 24 values — task/report/invoice/intern-log/onboarding/announcement/resource lifecycle, plus `project_assigned`, `project_claimable`, `reminder`, `probation_update`, `system` |

### Others by domain
`offboarding_status`, `exit_type`, `checklist_template_flow`, `checklist_template_scope`, `ticket_team`, `ticket_priority`, `ticket_status`, `ticket_category`, `ticket_feature_area`, `project_status`, `project_health`, `project_contributor_role`, `milestone_period_type`, `milestone_status`, `milestone_complexity_tier`, `checklist_item_status`, `target_metric_type`, `payment_method`, `payment_status`, `expense_type`, `expense_source_type`, `expense_match_status`, `ai_spend_type`, `profile_change_status`, `event_category`, `christmas_ornament_asset`, `christmas_wish_category`, `review_cycle_status`, `onboarding_step`, `onboarding_document_type`, `resource_category`, `resource_status`, `announcement_category`.

> `user_role` retains `hr`, `cos`, and `ceo` as legacy values; the UI maps all three to `admin`. See `docs/adr/ADR-001-role-mapping.md`.

---

## Helper Functions

~76 functions. Key ones:

### Core
| Function | Signature | Description |
|----------|-----------|-------------|
| `user_has_role` | `(user_id uuid, role text) → boolean` | Check single role |
| `user_has_any_role` | `(user_id uuid, roles text[]) → boolean` | Check multiple roles |
| `get_user_role` | `(user_id uuid) → text` | Get user's role |
| `is_manager_of` | `(manager_id uuid, employee_id uuid) → boolean` | Manager check |
| `get_direct_reports` | `(manager_id uuid) → setof uuid` | List reports |
| `is_on_probation` | `(employee_id uuid) → boolean` | Probation check |
| `calculate_tenure_days` | `(employee_id uuid) → integer` | Tenure calculation |
| `soft_delete` | `(table_name text, record_id uuid) → void` | Generic soft delete |
| `get_employee_by_user_id` | `(user_id uuid) → record` | Employee from user ID |
| `handle_updated_at` | `() → trigger` | Auto-update `updated_at` |
| `handle_audit_log` | `() → trigger` | Auto-create audit_log entry |

### AI & Knowledge
| Function | Description |
|----------|-------------|
| `match_knowledge_embeddings` | Cosine similarity search over `knowledge_embeddings` |
| `snapshot_knowledge_source_version` | Trigger — snapshot before update |
| `get_knowledge_source_versions` | Version history with editor names |
| `restore_knowledge_source_version` | Restore a previous version |

### Reports & Resources
| Function | Description |
|----------|-------------|
| `get_report_children` | Direct child reports |
| `get_report_tree` | Recursive tree traversal with depth |
| `get_resource_category_tree` | Hierarchical categories with resource counts |

### Performance & Digests
| Function | Description |
|----------|-------------|
| `calculate_okr_progress` | Average progress across an OKR's targets |
| `trigger_update_okr_progress` | Trigger — recalculate on change |
| `get_intern_eod_digest_source` | Prior-day intern logs grouped by department (consumed by n8n) |

---

## Access Control

RLS is the security boundary — application checks and middleware are secondary.

| Role | Own Data | Team Data | All Data | Edit Employees | Edit Users | Confidential Docs | Audit Logs | Admin Features |
|------|----------|-----------|----------|----------------|------------|-------------------|------------|----------------|
| employee | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| associate | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Manager | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| ceo | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| cos | ✓ | ✓ | ✓ | ✗ | ✗ | ✓ | ✗ | ✗ |
| hr | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| admin | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| super_admin | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

### Grant tables

Several modules are gated by explicit per-user grants rather than role alone. A user needs a matching row to see the module at all:

`ats_access_grants` · `crm_access_grants` · `marketing_access_grants` · `pa_task_access_grants` · `ai_spending_access_grants` · `revenue_forecast_access_grants`

**~748 `CREATE POLICY` statements** across the migration set. Later migrations frequently drop and recreate earlier policies, so the number of *live* policies is lower than the statement count.

---

## Storage Buckets

| Bucket | Contents |
|--------|----------|
| `employee-documents` | 201 file documents |
| `onboarding-documents` | Onboarding uploads |
| `avatars` | Profile images |
| `resources-library` | Information Hub files |
| `resource-thumbnails` | Resource preview images |
| `announcement-attachments` | Announcement files (legacy `announcements-attachments` also referenced) |
| `standup-recordings` | Audio/video, 500 MB limit |
| `applications` | ATS resumes and CVs |
| `ai-knowledge` | Knowledge base source files |
| `kpi-evidence` / `okr-target-evidence` | Performance evidence uploads |
| `marketing-ad-receipts` | Marketing spend receipts |
| `pa-task-attachments` | PA task files |
| `project-documentations` | Project docs |

All buckets are private with RLS policies on `storage.objects`.

---

## Conventions

### Standard Columns

```sql
id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
created_at timestamptz DEFAULT now() NOT NULL,
updated_at timestamptz DEFAULT now() NOT NULL,
created_by uuid REFERENCES auth.users(id),
deleted_at timestamptz  -- soft delete
```

### Naming

- Tables: `snake_case` plural
- Columns: `snake_case`
- Indexes: `idx_tablename_columnname`
- Policies: `tablename_operation_context_policy`
- Enums and functions: `snake_case`, functions with a verb prefix
- Migrations: `YYYYMMDDHHMMSS_description.sql`

### RLS

```sql
ALTER TABLE table_name ENABLE ROW LEVEL SECURITY;
ALTER TABLE table_name FORCE ROW LEVEL SECURITY;
```

### Triggers

Tables with `updated_at` have a `BEFORE UPDATE` trigger calling `handle_updated_at()`. Core tables additionally have `handle_audit_log()` triggers.

### Indexes

~470 `CREATE INDEX` statements. Notable patterns: GIN on `reports.hierarchy_path`, `tasks.tags`, and `user_role_metadata.metadata`; IVFFlat on `knowledge_embeddings`; partial indexes on `deleted_at IS NULL`, `is_active = true`, and `is_read = false`.

---

## Known Limitations

1. **Recursive hierarchies** — manager/employee supports one level. Reports support full recursion via `get_report_tree()`.
2. **Payroll encryption** — payroll and banking fields are NOT encrypted at rest. Consider `pgcrypto` for field-level encryption.
3. **Audit log retention** — no automatic cleanup beyond `cleanup-old-notifications`. A retention policy is still needed for `audit_logs`.
4. **Repair migrations** — several `*_repair_*` and `ensure_*` migrations recreate earlier objects with `IF NOT EXISTS`, so table and policy counts derived by grepping overstate the live schema.
5. **Types lag the schema** — new tables do not appear in `database.types.ts` until `pnpm db:generate` runs against the live database.

---

**Last Updated**: 2026-09-19
**Migration Range**: `20260123000001` → `20260916000001`
**Migration Files**: 194
**Tables**: ~123
**Views**: 5
**Enums**: 51
**Policy Statements**: ~748
**Functions**: ~76
**Index Statements**: ~470
