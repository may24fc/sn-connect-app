# SN Connect HR Portal — Schema Summary

> Audience: Developers, DevOps

Complete database schema for SN Connect HR Portal. 62 migration files across 8 phases, 30+ tables, 3 views, 70+ RLS policies, 20+ functions.

---

## Table of Contents

- [Migration Phases](#migration-phases)
- [Core Tables](#core-tables)
- [Feature Tables](#feature-tables)
- [Views](#views)
- [Enums](#enums)
- [Helper Functions](#helper-functions)
- [Access Control Matrix](#access-control-matrix)
- [RLS Policy Summary](#rls-policy-summary)
- [Index Summary](#index-summary)
- [Conventions](#conventions)

---

## Migration Phases

| Phase | Date Range | Files | Description |
|-------|-----------|-------|-------------|
| 1 — Core | `20260123` | 8 | Enums, users, employees, departments, documents, audit_logs, triggers, helper functions |
| 2 — Roles | `20260210` | 1 | `super_admin` role addition |
| 3 — Features | `20260210-20260211` | 9 | Reports, tasks, invoices, announcements, onboarding, offboarding, performance, internships, resources |
| 4 — Repairs | `20260216-20260217` | 11 | Schema repairs, RLS fixes, role consolidation |
| 5 — Storage | `20260218` | 4 | Storage buckets and storage RLS policies |
| 6 — AI & Standups | `20260221-20260222` | 2 | Knowledge tables (pgvector), standup recordings |
| 7 — Edge Functions | `20260227` | 6 | Notifications, phone codes, FX rates, bank registry, report hierarchy, knowledge versioning, resource categories, intern self-init |
| 8 — Views & Metadata | `20260228` | 6 | Directory view, performance view, OKR/KPI automation, user role metadata, task tags, resource access levels |

---

## Core Tables

### users

Extends `auth.users` with HR-specific fields.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | References `auth.users(id)` |
| `role` | user_role | employee, intern, admin, super_admin, hr, cos, ceo |
| `department_id` | FK departments | |
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

### departments

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | |
| `name` | text UNIQUE | |
| `description` | text | |
| `head_id` | FK users | Department head |

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
| `type` | notification_type | 11-value enum |
| `title` | text | Notification title |
| `message` | text | Optional body |
| `link` | text | Deep link path (e.g., `/tasks/abc`) |
| `is_read` | boolean | DEFAULT false |
| `read_at` | timestamptz | When read |
| `metadata` | jsonb | Additional context |
| `created_at` | timestamptz | |
| `expires_at` | timestamptz | Optional TTL |

---

## Feature Tables

### Onboarding

| Table | Description |
|-------|-------------|
| `onboarding_profiles` | User onboarding state (step data, completion). Includes `contact_country_code`, `emergency_contact_country_code`, `payment_phone_country_code` |
| `onboarding_documents` | Uploaded documents during onboarding |
| `onboarding_checklists` | Admin-created task checklists |
| `onboarding_tasks` | Individual checklist items |

### Tasks

| Table | Description |
|-------|-------------|
| `tasks` | Task records with priority, status, due date, `category` (text), `tags` (text[] with GIN index) |
| `task_comments` | Comments on tasks |

### Reports

| Table | Description |
|-------|-------------|
| `reports` | Weekly report submissions. Supports hierarchy via `parent_report_id` (self FK), `report_group`, `hierarchy_path` (text[]) |
| `report_metrics` | Individual metrics per report |

### Invoices

| Table | Description |
|-------|-------------|
| `invoices` | Invoice submissions with multi-currency support |
| `invoice_line_items` | Line items per invoice |

### Announcements

| Table | Description |
|-------|-------------|
| `announcements` | Admin announcements (publish, pin, archive) |
| `announcement_reads` | Read tracking per user |
| `announcement_comments` | User comments |
| `announcement_attachments` | File attachments |

### Resources

| Table | Description |
|-------|-------------|
| `resources` | Resource library entries. Has `category_id` (FK resource_categories), `access_level` (resource_access_level enum) |
| `resource_categories` | Dynamic category management replacing static enum. Hierarchical via `parent_id`, slugged, orderable, admin-managed |
| `resource_views` | View tracking |
| `resource_bookmarks` | User bookmarks |
| `resource_collections` | Curated collections |
| `collection_resources` | Junction table |

### Performance

| Table | Description |
|-------|-------------|
| `review_cycles` | Performance review periods |
| `performance_reviews` | Individual reviews (self + manager) |
| `okrs` | Objectives and Key Results. Auto-calculates `progress` via trigger on `key_results` update |
| `kpis` | Key Performance Indicators. Generated `progress_pct` column |

### Internships

| Table | Description |
|-------|-------------|
| `internships` | Internship records with hours tracking. Interns can INSERT/UPDATE their own records |
| `internship_daily_logs` | Daily log entries (intern EOD reports) |

### Standups

| Table | Description |
|-------|-------------|
| `standup_recordings` | Standup meeting audio/video recordings (500MB bucket limit) |
| `standup_topics` | Discussion topics |

### AI Knowledge

| Table | Description |
|-------|-------------|
| `knowledge_sources` | Source documents for RAG chat. Has `current_version` integer for versioning |
| `knowledge_embeddings` | Vector chunks (pgvector, 1536-dim, IVFFlat cosine index) |
| `knowledge_source_versions` | Auto-snapshotted version history. Triggered BEFORE UPDATE on `knowledge_sources` |

### Multi-Currency

| Table | Description |
|-------|-------------|
| `fx_rates` | Daily foreign exchange rates (synced by Edge Function) |
| `bank_registry` | Bank information for international payments |

### Role Metadata

| Table | Description |
|-------|-------------|
| `user_role_metadata` | Role-specific configuration per user (JSONB). Unique on `(user_id, role_type)` |
| `role_kpi_entries` | Role-specific KPI tracking entries. Unique on `(user_id, role_type, entry_date, kpi_name)` |

---

## Views

| View | Description |
|------|-------------|
| `employee_directory` | Joins users + employees + active internships. Columns: user_id, employee_id, avatar_url, full_name, role, department, position, status, employment_type, start_date, email, contact_number, birthday, internship fields |
| `individual_performance_summary` | Aggregates per-employee KPIs (count, avg progress, completed), OKRs (count, avg progress, completed), and reviews (latest rating, date, total count) |
| `root_reports` | Top-level reports (`parent_report_id IS NULL`), with computed `child_count` |

---

## Enums

### Core Enums

| Enum | Values |
|------|--------|
| `user_role` | `admin`, `hr`, `cos`, `ceo`, `employee`, `intern`, `super_admin` |
| `user_status` | `active`, `on_leave`, `terminated` |
| `employment_type` | `regular`, `probationary`, `intern`, `project_based` |
| `work_arrangement` | `part_time`, `full_time` |
| `document_type` | `contract`, `id`, `certificate`, `performance_review`, `tax`, `medical`, `training`, `disciplinary`, `leave`, `other` |

### Feature Enums

| Enum | Values |
|------|--------|
| `task_status` | `todo`, `in_progress`, `completed`, `on_hold`, `cancelled` |
| `task_priority` | `low`, `medium`, `high`, `urgent` |
| `invoice_status` | `draft`, `submitted`, `approved`, `rejected` |
| `announcement_status` | `draft`, `published`, `archived` |
| `announcement_priority` | `normal`, `important`, `urgent` |
| `announcement_target_type` | `all`, `role`, `department` |
| `resource_type` | `document`, `link`, `video`, `image`, `other` |
| `resource_access_level` | `full`, `view_only` |
| `onboarding_status` | `not_started`, `in_progress`, `completed`, `approved`, `rejected` |
| `internship_status` | `active`, `completed`, `withdrawn`, `extended` |
| `review_status` | `draft`, `submitted`, `acknowledged` |
| `notification_type` | `task_assigned`, `task_due`, `report_submitted`, `report_approved`, `report_rejected`, `announcement_new`, `resource_new`, `reminder`, `onboarding_step`, `probation_update`, `system` |
| `knowledge_source_type` | `pdf`, `docx`, `url`, `manual` |

---

## Helper Functions

### Core Functions

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
| `get_employee_by_user_id` | `(user_id uuid) → record` | Get employee from user ID |
| `get_employees_by_department` | `(dept text) → setof record` | Get by department |
| `handle_updated_at` | `() → trigger` | Auto-update `updated_at` |
| `handle_audit_log` | `() → trigger` | Auto-create audit_log entry |

### AI & Knowledge Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `match_knowledge_embeddings` | `(query_embedding vector, match_threshold float, match_count int) → setof record` | Cosine similarity search |
| `snapshot_knowledge_source_version` | `() → trigger` | Auto-snapshot before update |
| `get_knowledge_source_versions` | `(p_source_id uuid) → table` | Version history with editor names |
| `restore_knowledge_source_version` | `(p_source_id uuid, p_version_number int) → knowledge_sources` | Restore to previous version |

### Report Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `get_report_children` | `(parent_id uuid) → setof reports` | Direct child reports |
| `get_report_tree` | `(root_id uuid) → table` | Recursive tree traversal with depth |

### Resource Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `get_resource_category_tree` | `() → table` | Hierarchical categories with resource counts |

### Performance Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `calculate_okr_progress` | `(p_okr_id uuid) → numeric` | Average progress from key_results JSONB |
| `trigger_update_okr_progress` | `() → trigger` | Auto-recalculate on `key_results` update |

**Total**: 20+ functions (12 core + 4 AI + 2 report + 1 resource + 2 performance)

---

## Access Control Matrix

| Role | Own Data | Team Data | All Data | Edit Employees | Edit Users | Confidential Docs | Audit Logs | Admin Features |
|------|----------|-----------|----------|----------------|------------|--------------------|------------|----------------|
| employee | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| intern | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Manager | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| ceo | ✓ | ✓ | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ |
| cos | ✓ | ✓ | ✓ | ✗ | ✗ | ✓ | ✗ | ✗ |
| hr | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✗ |
| admin | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| super_admin | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

---

## RLS Policy Summary

| Table / Area | Policy Count |
|-------------|-------------|
| users | 5 |
| employees | 7 |
| departments | 4 |
| documents | 8 |
| audit_logs | 2 |
| notifications | 5 |
| announcements (4 tables) | ~12 |
| resources (+ categories) | ~10 |
| reports | ~4 |
| tasks | ~4 |
| invoices | ~4 |
| onboarding (4 tables) | ~8 |
| internships | ~6 |
| performance (4 tables) | ~8 |
| knowledge (2 tables + versions) | ~12 |
| standups (2 tables + storage) | ~11 |
| user_role_metadata | 6 |
| role_kpi_entries | 5 |

**Total**: 70+ RLS policies

---

## Index Summary

| Area | Count | Notable |
|------|-------|---------|
| Core tables | 26 | FKs, status, role, department |
| Feature tables | 30+ | Composite indexes, partial indexes |
| GIN indexes | 5+ | `reports.hierarchy_path`, `tasks.tags`, `user_role_metadata.metadata`, `knowledge_embeddings` (IVFFlat) |
| Partial indexes | 5+ | `deleted_at IS NULL`, `is_active = true`, `is_read = false` |

**Total**: 60+ indexes (not counting primary keys)

---

## Conventions

### Standard Columns

Every table includes:
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
- Enums: `snake_case`
- Functions: `snake_case` with verb prefix

### Triggers

All tables with `updated_at` have a `BEFORE UPDATE` trigger calling `handle_updated_at()`. Core tables additionally have `handle_audit_log()` triggers.

---

## Storage Buckets

| Bucket | Max Size | MIME Types |
|--------|----------|------------|
| `documents` | — | Documents (PDF, images, etc.) |
| `onboarding-documents` | — | Onboarding uploads |
| `standup-recordings` | 500MB | Audio/video |

---

## Known Limitations

1. **Recursive hierarchies**: Manager-employee supports one level. Reports support full recursion via `get_report_tree()`.
2. **Payroll encryption**: Payroll fields are NOT encrypted at rest. Consider `pgcrypto` for field-level encryption.
3. **Document storage**: Large files may require CDN integration.
4. **Audit log retention**: No automatic cleanup. Implement retention policy for production.
5. **Database types lag**: New tables may not appear in `database.types.ts` until `pnpm db:generate` is run against the live schema.

---

**Schema Version**: Phase 8 (Unreleased)
**Last Updated**: 2026-02-27
**Migration Files**: 62
**Total Tables**: 30+
**Total Views**: 3
**Total RLS Policies**: 70+
**Total Functions**: 20+
**Total Indexes**: 60+
