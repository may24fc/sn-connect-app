# Quick Reference Guide - HR Portal Database

## Table of Contents

- [User Management](#user-management)
- [Employee Management](#employee-management)
- [Department Management](#department-management)
- [Manager/Reports Relationships](#managerreports-relationships)
- [Document Management](#document-management)
- [Notifications](#notifications)
- [Resource Categories](#resource-categories)
- [Reports & Hierarchy](#reports--hierarchy)
- [Knowledge Base & Versioning](#knowledge-base--versioning)
- [Performance](#performance)
- [Tasks](#tasks)
- [Directory & Views](#directory--views)
- [Role Metadata & KPI Entries](#role-metadata--kpi-entries)
- [Audit Log Queries](#audit-log-queries)
- [Soft Delete Operations](#soft-delete-operations)
- [TypeScript/JavaScript Usage](#typescriptjavascript-usage-supabase-client)

## Common SQL Queries

### User Management

```sql
-- Get user with full details
SELECT
  u.*,
  d.name as department_name,
  m.id as manager_user_id
FROM public.users u
LEFT JOIN public.departments d ON u.department_id = d.id
LEFT JOIN public.users m ON u.manager_id = m.id
WHERE u.id = '<user-id>'
AND u.deleted_at IS NULL;

-- Get all users by role
SELECT u.*, e.first_name, e.last_name
FROM public.users u
LEFT JOIN public.employees e ON u.id = e.user_id
WHERE u.role = 'employee'
AND u.deleted_at IS NULL;

-- Check if user has specific role
SELECT public.user_has_role('<user-id>', 'hr');

-- Get user's role
SELECT public.get_user_role('<user-id>');
```

### Employee Management

```sql
-- Get employee full details
SELECT
  e.*,
  u.role,
  u.status,
  d.name as department_name
FROM public.employees e
JOIN public.users u ON e.user_id = u.id
LEFT JOIN public.departments d ON u.department_id = d.id
WHERE e.id = '<employee-id>'
AND e.deleted_at IS NULL;

-- Search employees by name
SELECT
  e.id,
  e.employee_number,
  CONCAT(e.first_name, ' ', e.last_name) as full_name,
  e.position,
  e.department
FROM public.employees e
WHERE (
  e.first_name ILIKE '%search%'
  OR e.last_name ILIKE '%search%'
)
AND e.deleted_at IS NULL
ORDER BY e.last_name, e.first_name;

-- Get employees by department
SELECT * FROM public.get_employees_by_department('Engineering');

-- Get employees on probation
SELECT
  e.id,
  e.employee_number,
  CONCAT(e.first_name, ' ', e.last_name) as full_name,
  e.probation_end_date,
  (e.probation_end_date - CURRENT_DATE) as days_remaining
FROM public.employees e
WHERE e.probation_end_date IS NOT NULL
AND e.probation_end_date >= CURRENT_DATE
AND e.deleted_at IS NULL
ORDER BY e.probation_end_date;

-- Calculate employee tenure
SELECT
  e.employee_number,
  CONCAT(e.first_name, ' ', e.last_name) as full_name,
  e.date_hired,
  public.calculate_tenure_days(e.id) as tenure_days,
  (public.calculate_tenure_days(e.id) / 365.25)::numeric(10,1) as tenure_years
FROM public.employees e
WHERE e.deleted_at IS NULL;
```

### Department Management

```sql
-- Get department with employee count
SELECT
  d.id,
  d.name,
  d.description,
  CONCAT(e.first_name, ' ', e.last_name) as head_name,
  COUNT(u.id) as employee_count
FROM public.departments d
LEFT JOIN public.users u ON d.id = u.department_id AND u.deleted_at IS NULL
LEFT JOIN public.employees e ON d.head_id = e.user_id AND e.deleted_at IS NULL
WHERE d.deleted_at IS NULL
GROUP BY d.id, d.name, d.description, e.first_name, e.last_name
ORDER BY d.name;

-- Get all employees in a department
SELECT
  e.employee_number,
  CONCAT(e.first_name, ' ', e.last_name) as full_name,
  e.position,
  e.employment_type,
  u.status
FROM public.employees e
JOIN public.users u ON e.user_id = u.id
JOIN public.departments d ON u.department_id = d.id
WHERE d.name = 'Engineering'
AND e.deleted_at IS NULL
AND u.deleted_at IS NULL;
```

### Manager/Reports Relationships

```sql
-- Get direct reports for a manager
SELECT * FROM public.get_direct_reports('<manager-user-id>');

-- Check if user is manager of another user
SELECT public.is_manager_of('<manager-id>', '<employee-id>');

-- Get organizational hierarchy
WITH RECURSIVE org_chart AS (
  -- Start with CEO (no manager)
  SELECT
    e.id,
    e.user_id,
    e.employee_number,
    CONCAT(e.first_name, ' ', e.last_name) as full_name,
    e.position,
    u.manager_id,
    0 as level,
    ARRAY[e.id] as path
  FROM public.employees e
  JOIN public.users u ON e.user_id = u.id
  WHERE u.manager_id IS NULL
  AND e.deleted_at IS NULL

  UNION ALL

  -- Recursively get reports
  SELECT
    e.id,
    e.user_id,
    e.employee_number,
    CONCAT(e.first_name, ' ', e.last_name) as full_name,
    e.position,
    u.manager_id,
    oc.level + 1,
    oc.path || e.id
  FROM public.employees e
  JOIN public.users u ON e.user_id = u.id
  JOIN org_chart oc ON u.manager_id = oc.user_id
  WHERE e.deleted_at IS NULL
)
SELECT
  REPEAT('  ', level) || full_name as org_structure,
  position,
  level
FROM org_chart
ORDER BY path;
```

### Document Management

```sql
-- Get all documents for an employee
SELECT
  d.id,
  d.document_type,
  d.file_name,
  d.is_confidential,
  d.uploaded_at,
  CONCAT(uploader.first_name, ' ', uploader.last_name) as uploaded_by_name
FROM public.documents d
JOIN public.employees uploader ON d.uploaded_by = uploader.user_id
WHERE d.employee_id = '<employee-id>'
AND d.deleted_at IS NULL
ORDER BY d.uploaded_at DESC;

-- Get confidential documents (HR/COS/Admin only)
SELECT
  d.*,
  CONCAT(e.first_name, ' ', e.last_name) as employee_name,
  e.employee_number
FROM public.documents d
JOIN public.employees e ON d.employee_id = e.id
WHERE d.is_confidential = true
AND d.deleted_at IS NULL
ORDER BY d.uploaded_at DESC;

-- Get documents by type
SELECT
  d.file_name,
  CONCAT(e.first_name, ' ', e.last_name) as employee_name,
  d.uploaded_at
FROM public.documents d
JOIN public.employees e ON d.employee_id = e.id
WHERE d.document_type = 'contract'
AND d.deleted_at IS NULL;
```

### Audit Log Queries

```sql
-- Recent audit activity
SELECT
  al.table_name,
  al.operation,
  al.performed_at,
  CONCAT(e.first_name, ' ', e.last_name) as performed_by_name
FROM public.audit_logs al
LEFT JOIN public.employees e ON al.performed_by = e.user_id
ORDER BY al.performed_at DESC
LIMIT 50;

-- Audit logs for specific employee
SELECT
  al.operation,
  al.performed_at,
  CONCAT(performer.first_name, ' ', performer.last_name) as performed_by,
  al.old_values,
  al.new_values
FROM public.audit_logs al
LEFT JOIN public.employees performer ON al.performed_by = performer.user_id
WHERE al.table_name = 'employees'
AND al.record_id = '<employee-id>'
ORDER BY al.performed_at DESC;

-- Sensitive field changes (payroll)
SELECT
  al.performed_at,
  CONCAT(e.first_name, ' ', e.last_name) as employee_name,
  CONCAT(performer.first_name, ' ', performer.last_name) as changed_by,
  al.old_values->>'payroll_account_number' as old_account,
  al.new_values->>'payroll_account_number' as new_account
FROM public.audit_logs al
JOIN public.employees e ON al.record_id = e.id
LEFT JOIN public.employees performer ON al.performed_by = performer.user_id
WHERE al.table_name = 'employees'
AND al.operation = 'UPDATE'
AND (
  al.old_values->>'payroll_account_number' IS DISTINCT FROM
  al.new_values->>'payroll_account_number'
)
ORDER BY al.performed_at DESC;
```

### Soft Delete Operations

```sql
-- Soft delete a record
UPDATE public.employees
SET deleted_at = now()
WHERE id = '<employee-id>';

-- Or use helper function
SELECT public.soft_delete('employees', '<employee-id>');

-- Restore soft-deleted record
UPDATE public.employees
SET deleted_at = NULL
WHERE id = '<employee-id>';

-- View all soft-deleted records
SELECT
  'employees' as table_name,
  COUNT(*) as deleted_count
FROM public.employees
WHERE deleted_at IS NOT NULL
UNION ALL
SELECT 'users', COUNT(*)
FROM public.users
WHERE deleted_at IS NOT NULL
UNION ALL
SELECT 'departments', COUNT(*)
FROM public.departments
WHERE deleted_at IS NOT NULL
UNION ALL
SELECT 'documents', COUNT(*)
FROM public.documents
WHERE deleted_at IS NOT NULL;

-- Permanently delete old soft-deleted records (DANGER!)
-- Only run after business approval
DELETE FROM public.documents
WHERE deleted_at < now() - INTERVAL '7 years'
AND deleted_at IS NOT NULL;
```

### Notifications

```sql
-- Get unread notifications for a user
SELECT id, type, title, message, link, created_at
FROM public.notifications
WHERE user_id = '<user-id>'
  AND is_read = false
  AND (expires_at IS NULL OR expires_at > now())
ORDER BY created_at DESC;

-- Mark notification as read
UPDATE public.notifications
SET is_read = true, read_at = now()
WHERE id = '<notification-id>'
  AND user_id = '<user-id>';

-- Mark all as read for a user
UPDATE public.notifications
SET is_read = true, read_at = now()
WHERE user_id = '<user-id>'
  AND is_read = false;

-- Get notification counts by type
SELECT type, COUNT(*) as count
FROM public.notifications
WHERE user_id = '<user-id>'
  AND is_read = false
GROUP BY type;
```

### Resource Categories

```sql
-- Get full category tree with resource counts
SELECT * FROM public.get_resource_category_tree();

-- Get active top-level categories
SELECT id, name, slug, icon, display_order
FROM public.resource_categories
WHERE parent_id IS NULL
  AND is_active = true
ORDER BY display_order;

-- Get resources by category
SELECT r.id, r.title, r.description, r.access_level, rc.name as category_name
FROM public.resources r
JOIN public.resource_categories rc ON r.category_id = rc.id
WHERE rc.slug = 'onboarding'
  AND r.deleted_at IS NULL
ORDER BY r.created_at DESC;
```

### Reports & Hierarchy

```sql
-- Get child reports
SELECT * FROM public.get_report_children('<report-id>');

-- Get full report tree from a root
SELECT * FROM public.get_report_tree('<root-report-id>');

-- Get all root (top-level) reports with child counts
SELECT * FROM public.root_reports
ORDER BY created_at DESC;

-- Get reports by group
SELECT id, report_group, hierarchy_path, status, period_start, period_end
FROM public.reports
WHERE report_group = 'campaign'
  AND deleted_at IS NULL
ORDER BY created_at DESC;
```

### Knowledge Base & Versioning

```sql
-- Get version history for a knowledge source
SELECT * FROM public.get_knowledge_source_versions('<source-id>');

-- Restore a knowledge source to a previous version
SELECT * FROM public.restore_knowledge_source_version('<source-id>', 3);

-- Semantic search across knowledge embeddings
SELECT * FROM public.match_knowledge_embeddings(
  '<query-embedding-vector>'::vector,
  0.7,  -- match threshold
  10    -- max results
);

-- Get knowledge sources with version info
SELECT id, title, source_type, current_version, created_at, updated_at
FROM public.knowledge_sources
WHERE deleted_at IS NULL
ORDER BY updated_at DESC;
```

### Performance

```sql
-- Get individual performance summary (aggregated view)
SELECT *
FROM public.individual_performance_summary
WHERE department = 'Engineering';

-- Get KPIs with auto-calculated progress
SELECT id, employee_id, name, target_value, current_value, progress_pct
FROM public.kpis
WHERE employee_id = '<employee-id>'
  AND deleted_at IS NULL;

-- Get OKRs (progress auto-updates on key_results change)
SELECT id, employee_id, title, progress, key_results
FROM public.okrs
WHERE employee_id = '<employee-id>'
  AND deleted_at IS NULL;
```

### Tasks

```sql
-- Get tasks with tags
SELECT id, title, status, priority, category, tags
FROM public.tasks
WHERE assignee_id = '<user-id>'
  AND deleted_at IS NULL
ORDER BY due_date;

-- Search tasks by tag
SELECT id, title, status, tags
FROM public.tasks
WHERE tags @> ARRAY['marketing']
  AND deleted_at IS NULL;

-- Get tasks by category
SELECT id, title, status, category
FROM public.tasks
WHERE category = 'launch'
  AND deleted_at IS NULL;
```

### Directory & Views

```sql
-- Query the employee directory view
SELECT user_id, full_name, role, department, position, status
FROM public.employee_directory
WHERE status = 'active'
ORDER BY full_name;

-- Search directory by name
SELECT *
FROM public.employee_directory
WHERE full_name ILIKE '%search%';

-- Get directory filtered by department
SELECT user_id, full_name, position, avatar_url
FROM public.employee_directory
WHERE department = 'Engineering'
  AND status = 'active';
```

### Role Metadata & KPI Entries

```sql
-- Get role metadata for a user
SELECT role_type, metadata
FROM public.user_role_metadata
WHERE user_id = '<user-id>';

-- Upsert role metadata (e.g., Google Ads specialist config)
INSERT INTO public.user_role_metadata (user_id, role_type, metadata)
VALUES (
  '<user-id>',
  'google_ads_specialist',
  '{"accounts": ["acc-123"], "certifications": ["search", "display"]}'::jsonb
)
ON CONFLICT (user_id, role_type)
DO UPDATE SET metadata = EXCLUDED.metadata, updated_at = now();

-- Log a daily KPI entry
INSERT INTO public.role_kpi_entries (user_id, role_type, kpi_name, kpi_value, kpi_unit, notes)
VALUES ('<user-id>', 'developer', 'lines_of_code', 450, 'lines', 'Feature X implementation');

-- Get KPI entries for a date range
SELECT entry_date, kpi_name, kpi_value, kpi_unit, notes
FROM public.role_kpi_entries
WHERE user_id = '<user-id>'
  AND role_type = 'developer'
  AND entry_date BETWEEN '2026-02-01' AND '2026-02-28'
ORDER BY entry_date DESC, kpi_name;
```

## TypeScript/JavaScript Usage (Supabase Client)

### Authentication & User Setup

```typescript
import { createClient } from '@supabase/supabase-js';
import type { Database } from '@hr-portal/database';

const supabase = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Sign up and create user profile
async function signUpUser(email: string, password: string, role: UserRole) {
  // 1. Create auth user
  const { data: authData, error: authError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (authError) throw authError;

  // 2. Create public.users profile (requires service role)
  const { data: userData, error: userError } = await supabase
    .from('users')
    .insert({
      id: authData.user!.id,
      role,
      status: 'active',
    });

  if (userError) throw userError;

  return userData;
}
```

### Query Examples

```typescript
// Get current user's employee data
const { data: employee } = await supabase
  .from('employees')
  .select(`
    *,
    user:users(*)
  `)
  .eq('user_id', session.user.id)
  .single();

// Get employees with department info
const { data: employees } = await supabase
  .from('employees')
  .select(`
    *,
    user:users(
      *,
      department:departments(*)
    )
  `)
  .is('deleted_at', null)
  .order('last_name');

// Get direct reports
const { data: reports } = await supabase
  .rpc('get_direct_reports', {
    manager_user_id: session.user.id
  });

// Check if user has role
const { data: hasRole } = await supabase
  .rpc('user_has_role', {
    user_id: session.user.id,
    required_role: 'hr'
  });
```

### Insert Operations

```typescript
// Create new employee
const { data: newEmployee, error } = await supabase
  .from('employees')
  .insert({
    user_id: userId,
    employee_number: 'EMP-123',
    first_name: 'John',
    last_name: 'Doe',
    date_hired: '2026-01-01',
    employment_type: 'regular',
    work_arrangement: 'full_time',
    position: 'Software Engineer',
    department: 'Engineering',
  })
  .select()
  .single();

// Upload document
const { data: newDoc, error: docError } = await supabase
  .from('documents')
  .insert({
    employee_id: employeeId,
    document_type: 'contract',
    file_path: 'documents/contracts/contract_123.pdf',
    file_name: 'Employment Contract.pdf',
    is_confidential: false,
    uploaded_by: session.user.id,
  });
```

### Update Operations

```typescript
// Update employee info (only non-sensitive fields)
const { data, error } = await supabase
  .from('employees')
  .update({
    phone: '+63-917-123-4567',
    address: '123 New St',
  })
  .eq('id', employeeId);

// Soft delete
const { error } = await supabase
  .from('employees')
  .update({ deleted_at: new Date().toISOString() })
  .eq('id', employeeId);
```

## Performance Tips

1. **Always filter by deleted_at**
   ```sql
   WHERE deleted_at IS NULL
   ```

2. **Use indexed columns in WHERE clauses**
   - employee_number, user_id, department_id, manager_id

3. **Limit result sets**
   ```typescript
   .range(0, 99) // First 100 records
   ```

4. **Use select() to only fetch needed columns**
   ```typescript
   .select('id, first_name, last_name, position')
   ```

5. **Use RPC for complex queries**
   ```typescript
   .rpc('get_direct_reports', { manager_user_id })
   ```

## Security Reminders

- Never expose `payroll_account_number` to unauthorized users
- Always verify RLS policies are working
- Use audit logs to track sensitive operations
- Never use service role key in client-side code
- Validate all inputs at database level

---
**Last Updated**: 2026-02-27
