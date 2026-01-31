# Supabase Setup Guide - HR Portal Phase 1

## Prerequisites

1. **Supabase CLI** installed
   ```bash
   npm install -g supabase
   ```

2. **PostgreSQL** (for local development)
   - Docker Desktop (recommended)
   - Or native PostgreSQL installation

3. **Supabase Account** (for production deployment)
   - Sign up at https://supabase.com

## Local Development Setup

### Step 1: Initialize Supabase

```bash
# Navigate to project root
cd "C:\Users\Ceferino Jumao-as V\Programming\Projects\Internship\SN HR Portal\sn-hr-portal"

# Start Supabase locally (requires Docker)
supabase start
```

This will:
- Start a local PostgreSQL database
- Start Supabase services (Auth, Storage, Realtime)
- Output connection strings and credentials

**Save the output!** You'll need:
- API URL
- API Key (anon key)
- Service role key
- Database URL

### Step 2: Apply Migrations

```bash
# Apply all migrations in order
supabase db reset

# Or apply migrations individually
supabase migration up
```

The migrations will be applied in this order:
1. `20260123000001_create_enums_and_extensions.sql` - Enums and extensions
2. `20260123000002_create_audit_log_table.sql` - Audit logging
3. `20260123000003_create_departments_table.sql` - Departments
4. `20260123000004_create_users_table.sql` - Users (extends auth.users)
5. `20260123000005_create_employees_table.sql` - Employees (201 files)
6. `20260123000006_create_documents_table.sql` - Documents
7. `20260123000007_create_triggers.sql` - Triggers
8. `20260123000008_create_helper_functions.sql` - Helper functions

### Step 3: Seed Sample Data (Optional)

```bash
# Load sample data for testing
psql $DATABASE_URL -f supabase/seed/01_sample_data.sql
```

**Note**: Before seeding, you need to create corresponding `auth.users` entries through Supabase Auth. The seed file expects these user IDs:

| User ID | Email | Role |
|---------|-------|------|
| a1111111-1111-1111-1111-111111111111 | ceo@company.com | CEO |
| a2222222-2222-2222-2222-222222222222 | cos@company.com | COS |
| a3333333-3333-3333-3333-333333333333 | hr@company.com | HR |
| a4444444-4444-4444-4444-444444444444 | eng.head@company.com | Employee |
| a7777777-7777-7777-7777-777777777777 | miguel.ramos@company.com | Employee |
| a9999999-9999-9999-9999-999999999999 | isabella.mendoza@company.com | Intern |
| aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa | admin@company.com | Admin |

### Step 4: Configure Environment Variables

Create a `.env.local` file in your Next.js app:

```env
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-service-role-key>
```

## Production Deployment

### Step 1: Create Supabase Project

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Fill in project details
4. Wait for provisioning (~2 minutes)

### Step 2: Link Local Project to Remote

```bash
# Login to Supabase
supabase login

# Link to your project
supabase link --project-ref <your-project-ref>
```

### Step 3: Push Migrations

```bash
# Push all migrations to production
supabase db push

# Verify migration status
supabase migration list
```

### Step 4: Configure Production Environment

Update your production environment variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<your-project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your-production-anon-key>
SUPABASE_SERVICE_ROLE_KEY=<your-production-service-role-key>
```

### Step 5: Enable RLS Policies (Verification)

RLS is automatically enabled by the migrations, but verify:

1. Go to Supabase Dashboard → Database → Tables
2. For each table, verify "RLS enabled" badge is shown
3. Click on a table → Policies to see active policies

## Verification Checklist

After setup, verify everything is working:

### Database Tables
```sql
-- Check all tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Expected: audit_logs, departments, documents, employees, users
```

### RLS Policies
```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public';

-- All should show 't' (true)

-- Check policies exist
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### Triggers
```sql
-- Check triggers exist
SELECT trigger_name, event_object_table, action_timing, event_manipulation
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table;
```

### Functions
```sql
-- Check helper functions exist
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
ORDER BY routine_name;
```

## Common Issues & Solutions

### Issue: "relation does not exist"

**Cause**: Migrations not applied in order

**Solution**:
```bash
# Reset database and reapply all migrations
supabase db reset
```

### Issue: "RLS policy violation"

**Cause**: User doesn't have proper role or policy is too restrictive

**Solution**:
```sql
-- Check user's role
SELECT id, role FROM public.users WHERE id = auth.uid();

-- Check if user exists in public.users
-- Every auth.users entry MUST have a corresponding public.users entry
```

### Issue: "Could not find the public.users table"

**Cause**: User authenticated but no public.users record exists

**Solution**:
```sql
-- Create public.users record for authenticated user
INSERT INTO public.users (id, role, status)
VALUES (auth.uid(), 'employee', 'active');
```

### Issue: Trigger not firing

**Cause**: Trigger might be disabled or function has errors

**Solution**:
```sql
-- Check trigger status
SELECT tgname, tgenabled FROM pg_trigger WHERE tgname LIKE '%your_trigger%';

-- Test trigger function manually
SELECT public.handle_updated_at();
```

### Issue: Audit logs not being created

**Cause**: Trigger not attached or function error

**Solution**:
```sql
-- Check audit trigger exists
SELECT * FROM pg_trigger WHERE tgname LIKE '%audit%';

-- Check recent audit logs
SELECT * FROM public.audit_logs ORDER BY performed_at DESC LIMIT 5;
```

## Database Maintenance

### Backup

```bash
# Backup entire database
supabase db dump -f backup_$(date +%Y%m%d).sql

# Backup specific schema
pg_dump -h localhost -U postgres -n public -f backup_public.sql
```

### Restore

```bash
# Restore from backup
psql $DATABASE_URL -f backup_20260123.sql
```

### View Audit Logs

```sql
-- Recent operations
SELECT
  table_name,
  operation,
  performed_at,
  performed_by
FROM public.audit_logs
ORDER BY performed_at DESC
LIMIT 20;

-- Operations on specific table
SELECT *
FROM public.audit_logs
WHERE table_name = 'employees'
ORDER BY performed_at DESC;
```

### Soft Delete Management

```sql
-- Find all soft-deleted records
SELECT 'departments' as table, COUNT(*) FROM public.departments WHERE deleted_at IS NOT NULL
UNION ALL
SELECT 'users', COUNT(*) FROM public.users WHERE deleted_at IS NOT NULL
UNION ALL
SELECT 'employees', COUNT(*) FROM public.employees WHERE deleted_at IS NOT NULL
UNION ALL
SELECT 'documents', COUNT(*) FROM public.documents WHERE deleted_at IS NOT NULL;

-- Restore soft-deleted record
UPDATE public.employees
SET deleted_at = NULL
WHERE id = '<employee-id>';
```

## Performance Optimization

### Analyze Query Performance

```sql
-- Enable query timing
EXPLAIN ANALYZE
SELECT * FROM public.employees
WHERE department = 'Engineering'
AND deleted_at IS NULL;
```

### Index Usage

```sql
-- Check index usage
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans
FROM pg_stat_user_indexes
WHERE schemaname = 'public'
ORDER BY idx_scan DESC;
```

### Vacuum and Analyze

```sql
-- Update statistics for query planner
ANALYZE;

-- Reclaim space from deleted rows
VACUUM;

-- Full vacuum (requires downtime)
VACUUM FULL;
```

## Security Best Practices

1. **Never expose service role key** in client-side code
2. **Always use anon key** for client-side authentication
3. **Validate all inputs** at database level (CHECK constraints)
4. **Review RLS policies** regularly for security gaps
5. **Monitor audit logs** for suspicious activity
6. **Rotate credentials** periodically
7. **Use environment variables** for all secrets

## Next Steps

After successful setup:

1. Create test users through Supabase Auth Dashboard
2. Test RLS policies with different user roles
3. Verify audit logging is working
4. Set up automated backups
5. Configure monitoring and alerts
6. Document custom policies or modifications

## Support

For issues or questions:
- Check Supabase documentation: https://supabase.com/docs
- Review migration files: `supabase/migrations/README.md`
- Check project guidelines: `CLAUDE.md`

---
**Last Updated**: 2026-01-23
**Schema Version**: Phase 1 (v1.0.0)
