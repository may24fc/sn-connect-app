# Database Schema Reference

> Audience: Developers, DevOps

Supabase PostgreSQL database schema for SN Connect. 57 migration files, 20+ tables, 26+ RLS policies.

---

## Core Tables

### users

Extends `auth.users` with HR-specific fields. Every authenticated user has a row.

| Column | Type | Description |
|--------|------|-------------|
| `id` | uuid PK | References `auth.users(id)` |
| `role` | user_role | employee, intern, admin, super_admin |
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
| `standups` | Standup meeting recordings |
| `standup_topics` | Discussion topics |

### AI Knowledge

| Table | Description |
|-------|-------------|
| `knowledge_sources` | Source documents for RAG |
| `knowledge_embeddings` | Vector chunks (pgvector) |

---

## Enums

| Enum | Values |
|------|--------|
| `user_role` | admin, hr, cos, ceo, employee, intern |
| `user_status` | active, on_leave, terminated |
| `employment_type` | regular, probationary, intern, project_based |
| `work_arrangement` | part_time, full_time |
| `document_type` | contract, id, certificate, performance_review, tax, medical, training, disciplinary, leave, other |
| `task_status` | todo, in_progress, completed, on_hold, cancelled |
| `task_priority` | low, medium, high, urgent |
| `invoice_status` | draft, submitted, approved, rejected |

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

57 migration files from `20260123` to `20260228`. Key phases:

1. **20260123** — Core schema: enums, users, employees, departments, documents, audit_logs, triggers, helper functions
2. **20260210** — Feature tables: reports, tasks, invoices, announcements, onboarding, offboarding, performance, internships
3. **20260211** — Resources hub, onboarding profiles
4. **20260216-20260217** — Schema repairs, RLS fixes, role consolidation, super_admin support
5. **20260218** — Storage buckets and storage RLS policies
6. **20260221-20260222** — AI knowledge tables, standup tables
7. **20260227-20260228** — FX rates, bank registry, directory view, performance views/functions

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

*Last updated: 2026-02-27*
