# Database Schema Reference

> Audience: Developers, DevOps

Supabase PostgreSQL database schema for Control Hub. 62 migration files, 30+ tables, 70+ RLS policies.

---

## Core Tables

### users

Extends `auth.users` with HR-specific fields. Every authenticated user has a row.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | References `auth.users(id)` |
| `role` | user_role | employee, associate, admin, super_admin |
| `department_id` | FK departments | |
| `manager_id` | FK users (self) | Direct manager |
| `status` | user_status | active, on_leave, terminated |
| `avatar_url` | text | Profile image |
| `created_at`, `updated_at` | timestamptz | Standard timestamps |
| `deleted_at` | timestamptz | Soft delete |

### employees

201 file (Philippine HR term) — comprehensive employee records. Contains PII.

| Column Group | Fields |
|-------------|--------|
| **Identity** | `id`, `user_id` (FK users), `employee_number` (unique) |
| **Personal** | `first_name`, `last_name`, `middle_name`, `birthday`, `gender`, `civil_status`, `nationality` |
| **Employment** | `position`, `department`, `employment_type`, `work_arrangement`, `date_hired`, `probation_end_date` |
| **Contact** | `phone`, `phone_country_code`, `personal_email`, `address` fields |
| **Payroll** | `sss_number`, `tin_number`, `philhealth_number`, `pagibig_number`, `bank_name`, `bank_account_number` |
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
| `action` | text | Operation description |
| `old_values` | jsonb | Before state |
| `new_values` | jsonb | After state |
| `user_id` | uuid | Who performed it |
| `details` | jsonb | Additional context |

---

## Feature Tables

### Onboarding

| Table | Description |
|-------|-------------|
| `onboarding_profiles` | User onboarding state (step data, completion status) |
| `onboarding_documents` | Uploaded documents during onboarding |
| `onboarding_checklists` | Admin-created task checklists |
| `onboarding_tasks` | Individual checklist items |

### Tasks

| Table | Description |
|-------|-------------|
| `tasks` | Task records with priority, status, due date |
| `task_comments` | Comments on tasks |

### Reports

| Table | Description |
|-------|-------------|
| `reports` | Weekly report submissions |
| `report_metrics` | Individual metrics per report |

### Invoices

| Table | Description |
|-------|-------------|
| `invoices` | Invoice submissions with currency |
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
| `resources` | Resource library entries |
| `resource_views` | View tracking |
| `resource_bookmarks` | User bookmarks |
| `resource_collections` | Curated collections |
| `collection_resources` | Junction table |

### Performance

| Table | Description |
|-------|-------------|
| `review_cycles` | Performance review periods |
| `performance_reviews` | Individual reviews (self + manager) |
| `okrs` | Objectives and Key Results |
| `kpis` | Key Performance Indicators |

### Internships

| Table | Description |
|-------|-------------|
| `internships` | Internship records with hours tracking |
| `internship_daily_logs` | Daily log entries |

### Standups

| Table | Description |
|-------|-------------|
| `standup_recordings` | Standup meeting recordings |
| `standup_topics` | Discussion topics |

### AI Knowledge

| Table | Description |
|-------|-------------|
| `knowledge_sources` | Source documents for RAG. Has `current_version` integer for auto-versioning |
| `knowledge_embeddings` | Vector chunks (pgvector, 1536-dim) |
| `knowledge_source_versions` | Auto-snapshotted version history (trigger on `knowledge_sources` update). See [ADR-006](../../../adr/ADR-006-knowledge-versioning.md) |

### Notifications

| Table | Description |
|-------|-------------|
| `notifications` | In-app notifications with `notification_type` enum (11 types), deep-link support, read tracking, optional expiry |

### Multi-Currency

| Table | Description |
|-------|-------------|
| `fx_rates` | Daily FX rates (synced by Edge Function cron) |
| `bank_registry` | Bank information for international payments |

### Resource Categories

| Table | Description |
|-------|-------------|
| `resource_categories` | Dynamic hierarchical categories replacing static enum. Admin-managed with slugs, icons, display ordering. See [ADR-005](../../../adr/ADR-005-resource-categories-table.md) |

### Role Metadata

| Table | Description |
|-------|-------------|
| `user_role_metadata` | Role-specific configuration per user (JSONB). Unique on `(user_id, role_type)` |
| `role_kpi_entries` | Role-specific daily KPI tracking. Unique on `(user_id, role_type, entry_date, kpi_name)` |

---

## Views

| View | Description |
|------|-------------|
| `employee_directory` | Joins users + employees + active internships. Full-name, role, department, position, contact, internship fields |
| `individual_performance_summary` | Aggregated KPIs (count, avg progress, completed), OKRs, reviews per employee |
| `root_reports` | Top-level reports (`parent_report_id IS NULL`) with computed `child_count` |

---

## Enums

| Enum | Values |
|------|--------|
| `user_role` | super_admin, admin, hr, cos, ceo, employee, associate |
| `user_status` | active, on_leave, terminated |
| `employment_type` | regular, probationary, associate, project_based |
| `work_arrangement` | part_time, full_time |
| `document_type` | contract, id, certificate, performance_review, tax, medical, training, disciplinary, leave, other |
| `task_status` | todo, in_progress, completed, on_hold, cancelled |
| `task_priority` | low, medium, high, urgent |
| `invoice_status` | draft, submitted, approved, rejected |
| `notification_type` | task_assigned, task_due, report_submitted, report_approved, report_rejected, announcement_new, resource_new, reminder, onboarding_step, probation_update, system |
| `resource_access_level` | full, view_only |
| `knowledge_source_type` | pdf, docx, url, manual |
| `announcement_status` | draft, published, archived |
| `announcement_priority` | normal, important, urgent |
| `internship_status` | active, completed, withdrawn, extended |
| `onboarding_status` | not_started, in_progress, completed, approved, rejected |
| `review_status` | draft, submitted, acknowledged |

---

## Helper Functions

| Function | Signature | Description |
|----------|-----------|-------------|
| `user_has_role` | `(user_id uuid, role text) → boolean` | Check single role |
| `user_has_any_role` | `(user_id uuid, roles text[]) → boolean` | Check multiple roles |
| `get_user_role` | `(user_id uuid) → text` | Get role |
| `is_manager_of` | `(manager_id uuid, employee_id uuid) → boolean` | Manager check |
| `get_direct_reports` | `(manager_id uuid) → setof uuid` | List reports |
| `is_on_probation` | `(employee_id uuid) → boolean` | Probation check |
| `calculate_tenure_days` | `(employee_id uuid) → integer` | Tenure |
| `soft_delete` | `(table_name text, record_id uuid) → void` | Generic soft delete |
| `match_knowledge_embeddings` | `(query_embedding vector, match_threshold float, match_count int) → setof record` | Vector search |
| `get_report_children` | `(parent_id uuid) → setof reports` | Direct child reports |
| `get_report_tree` | `(root_id uuid) → table` | Recursive tree traversal with depth |
| `snapshot_knowledge_source_version` | `() → trigger` | Auto-snapshot before update |
| `get_knowledge_source_versions` | `(p_source_id uuid) → table` | Version history with editor names |
| `restore_knowledge_source_version` | `(p_source_id uuid, p_version int) → knowledge_sources` | Restore to previous version |
| `get_resource_category_tree` | `() → table` | Hierarchical categories with resource counts |
| `calculate_okr_progress` | `(p_okr_id uuid) → numeric` | Average progress from key_results JSONB |
| `trigger_update_okr_progress` | `() → trigger` | Auto-recalculate on key_results update |

---

## RLS Policy Naming Convention

```
{table_name}_{operation}_{context}_policy
```

Examples:
- `employees_select_own_policy` — Employees can read their own record
- `employees_select_admin_policy` — Admins can read all employees
- `documents_insert_auth_policy` — Authenticated users can insert documents

---

## Migration History

62 migration files from `20260123` to `20260228` (plus subsequent fixes and additions). Key phases:

1. **20260123** — Core schema: enums, users, employees, departments, documents, audit_logs, triggers, helper functions
2. **20260210** — Feature tables: reports, tasks, invoices, announcements, onboarding, offboarding, performance, internships
3. **20260211** — Resources hub, onboarding profiles
4. **20260216-20260217** — Schema repairs, RLS fixes, role consolidation, super_admin support
5. **20260218** — Storage buckets and storage RLS policies
6. **20260221-20260222** — AI knowledge tables (pgvector), standup tables
7. **20260227** — Notifications, audit log normalization, phone country codes, FX rates, bank registry, report hierarchy, knowledge versioning, resource categories, associate self-init policies
8. **20260228** — Directory view, performance summary view, OKR/KPI automation, user role metadata, task tags, resource access levels

### Running Migrations

```bash
pnpm db:migrate    # Apply all pending migrations
pnpm db:generate   # Regenerate TypeScript types
```

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

---

*Last updated: 2026-07-20*
