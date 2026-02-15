# Supabase Migrations - HR Portal Phase 1

## Overview
This directory contains the database schema migrations for the HR Portal Phase 1. All migrations follow PostgreSQL best practices with Row Level Security (RLS) as the final gatekeeper for data access.

## Migration Files

### 1. `20260123000001_create_enums_and_extensions.sql`
**Purpose**: Sets up PostgreSQL extensions and custom enum types

**Extensions**:
- `uuid-ossp`: UUID generation
- `pgcrypto`: Cryptographic functions

**Enums**:
- `user_role`: admin, hr, cos, ceo, employee, intern
- `user_status`: active, on_leave, terminated
- `employment_type`: regular, probationary, intern, project_based
- `work_arrangement`: part_time, full_time
- `document_type`: contract, id, certificate, performance_review, etc.

### 2. `20260123000002_create_audit_log_table.sql`
**Purpose**: Creates audit logging infrastructure for sensitive operations

**Features**:
- Tracks all INSERT, UPDATE, DELETE operations
- Stores old and new values as JSONB
- Records user, timestamp, IP address, and user agent
- RLS: Only HR and Admin can view audit logs

### 3. `20260123000003_create_departments_table.sql`
**Purpose**: Organizational department structure

**Key Fields**:
- `name`: Unique department name
- `head_id`: References auth.users (department head)
- Soft delete with `deleted_at`

**RLS Policies**:
- All authenticated users can view departments
- HR, COS, CEO, Admin can create/update
- Only Admin can delete

### 4. `20260123000004_create_users_table.sql`
**Purpose**: Extends Supabase auth.users with HR-specific fields

**Key Fields**:
- `id`: References auth.users(id) - CASCADE delete
- `role`: User role (enum)
- `department_id`: References departments
- `manager_id`: Self-reference for reporting structure
- `status`: Employment status

**RLS Policies**:
- Employees see only their own data
- Managers see their direct reports
- HR, COS, CEO, Admin see all users
- Only HR and Admin can create/update users

**Important**: This table extends auth.users, not replaces it. Authentication is handled by Supabase Auth.

### 5. `20260123000005_create_employees_table.sql`
**Purpose**: Employee 201 file data (comprehensive employee records)

**Key Fields**:
- `user_id`: References public.users
- `employee_number`: Unique identifier
- `immediate_head`: References users (CEO or COS)
- Personal info: names, birthday
- Employment info: hire date, type, position, department
- **SENSITIVE**: Payroll account information
- Contact info: phone, emergency contacts, emails
- Demographics: address details

**RLS Policies**:
- Employees see only their own data
- Managers see their direct reports
- HR, COS, CEO, Admin see all employees
- Only HR and Admin can create/update
- Audit logging enabled

### 6. `20260123000006_create_documents_table.sql`
**Purpose**: Document storage references (201 files)

**Key Fields**:
- `employee_id`: References employees
- `document_type`: Enum (contract, id, certificate, etc.)
- `file_path`: Reference to Supabase Storage
- `is_confidential`: Boolean flag for sensitive documents
- `uploaded_by`: User who uploaded

**RLS Policies**:
- Employees see their own documents
- Managers see direct reports' **non-confidential** documents
- HR and COS see all documents (including confidential)
- CEO sees all **non-confidential** documents
- Admin sees all documents
- Audit logging enabled

**Confidential Documents**: Only visible to HR, COS, and Admin

### 7. `20260123000007_create_triggers.sql`
**Purpose**: Automated triggers for timestamps and audit logging

**Trigger Functions**:
1. `handle_updated_at()`: Auto-updates `updated_at` on every UPDATE
2. `handle_audit_log()`: Logs all operations to audit_logs table

**Applied To**:
- Updated_at: departments, users, employees, documents
- Audit logging: users, employees, documents, departments

### 8. `20260123000008_create_helper_functions.sql`
**Purpose**: Utility functions for common operations

**Functions**:
- `user_has_role()`: Check if user has specific role
- `user_has_any_role()`: Check if user has any of specified roles
- `get_user_role()`: Get user's role
- `is_manager_of()`: Check if user is manager of another user
- `get_employee_by_user_id()`: Get employee ID from user ID
- `soft_delete()`: Soft delete helper
- `get_direct_reports()`: Get manager's direct reports
- `is_on_probation()`: Check if employee is on probation
- `calculate_tenure_days()`: Calculate employee tenure
- `get_employees_by_department()`: Get employees by department

## Running Migrations

### Local Development
```bash
# Apply all migrations
supabase db reset

# Apply specific migration
supabase migration up --file 20260123000001_create_enums_and_extensions.sql
```

### Production
```bash
# Apply pending migrations
supabase db push

# Or apply specific migration
psql $DATABASE_URL < migrations/20260123000001_create_enums_and_extensions.sql
```

## Rollback Instructions

Each migration file includes a commented DOWN migration section. To rollback:

1. Copy the DOWN migration from the file
2. Uncomment the SQL
3. Run it manually via `psql` or Supabase SQL Editor

**Example**:
```bash
# Rollback last migration
psql $DATABASE_URL < down_migration.sql
```

## Security Architecture

### Access Hierarchy (from highest to lowest privilege)

1. **Admin**: System-wide access for technical operations
2. **COS (Chief of Staff)**: Access to all data including confidential invoice details
3. **HR**: Access to all employee data including sensitive information
4. **CEO**: Access to all data except highly confidential items
5. **Managers**: Access to direct reports' data
6. **Employees/Interns**: Access only to their own data

### Row Level Security (RLS)

**ALL tables have RLS enabled with FORCE ROW LEVEL SECURITY**.

This means:
- Even table owners cannot bypass RLS
- Every query is filtered by RLS policies
- RLS is the final gatekeeper for all data access
- No trust in client-side data or application logic

### Sensitive Data Handling

**Sensitive columns** (marked in comments):
- `employees.payroll_account_name`
- `employees.payroll_account_number`
- Any `documents` with `is_confidential = true`

**Audit logging is enabled for**:
- All operations on `employees` table
- All operations on `documents` table
- Role changes in `users` table
- Department changes

## Standard Columns

All tables include:
- `id`: uuid PRIMARY KEY DEFAULT gen_random_uuid()
- `created_at`: timestamptz NOT NULL DEFAULT now()
- `updated_at`: timestamptz NOT NULL DEFAULT now()
- `created_by`: uuid REFERENCES auth.users(id)
- `deleted_at`: timestamptz (for soft delete)

## Indexes

Indexes are created for:
- All foreign key columns
- Columns used in WHERE clauses (with `deleted_at IS NULL` filter)
- Columns used in ORDER BY
- Columns used in JOIN conditions
- Unique constraints (employee_number, department name)

## Best Practices

1. **Never trust client-side data**: All validation happens at database level
2. **Use soft delete**: Set `deleted_at` instead of hard deleting records
3. **Query optimization**: Use `WHERE deleted_at IS NULL` in all queries
4. **Audit logging**: Review audit logs regularly for suspicious activity
5. **RLS policies**: Never bypass RLS policies in application code
6. **Type safety**: Use branded types in TypeScript (see database.types.ts)

## Troubleshooting

### Common Issues

**Issue**: RLS policy prevents data access
```sql
-- Check policies
SELECT * FROM pg_policies WHERE tablename = 'employees';

-- Check user role
SELECT * FROM public.users WHERE id = auth.uid();
```

**Issue**: Trigger not firing
```sql
-- Check triggers
SELECT * FROM pg_trigger WHERE tgname LIKE '%employees%';

-- Manually test trigger function
SELECT public.handle_updated_at();
```

**Issue**: Audit log not recording
```sql
-- Check audit logs
SELECT * FROM public.audit_logs ORDER BY performed_at DESC LIMIT 10;

-- Check trigger
SELECT * FROM pg_trigger WHERE tgname LIKE '%audit%';
```

## Future Enhancements

Planned for Phase 2:
- Salary and compensation tables
- Performance review tables
- Training and certification tables
- Attendance tracking tables

## Contact

For questions or issues with the database schema, contact the development team.

---
**Last Updated**: 2026-01-23
**Schema Version**: Phase 1 (v1.0.0)
