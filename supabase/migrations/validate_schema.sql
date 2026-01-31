-- Schema Validation Script for HR Portal Phase 1
-- Created: 2026-01-23
-- Description: Validates that the database schema is correctly set up

\echo '=================================================='
\echo 'HR Portal Phase 1 - Schema Validation'
\echo '=================================================='
\echo ''

-- ============================================
-- 1. Check Extensions
-- ============================================
\echo '1. Checking Extensions...'
SELECT
  CASE
    WHEN COUNT(*) = 2 THEN '✓ All required extensions installed'
    ELSE '✗ Missing extensions'
  END as status
FROM pg_extension
WHERE extname IN ('uuid-ossp', 'pgcrypto');

SELECT extname as "Extension Name"
FROM pg_extension
WHERE extname IN ('uuid-ossp', 'pgcrypto')
ORDER BY extname;

\echo ''

-- ============================================
-- 2. Check Enum Types
-- ============================================
\echo '2. Checking Enum Types...'
SELECT
  CASE
    WHEN COUNT(*) = 5 THEN '✓ All enum types created'
    ELSE '✗ Missing enum types'
  END as status
FROM pg_type
WHERE typname IN ('user_role', 'user_status', 'employment_type', 'work_arrangement', 'document_type');

SELECT typname as "Enum Type", enumlabel as "Values"
FROM pg_type t
JOIN pg_enum e ON t.oid = e.enumtypid
WHERE t.typname IN ('user_role', 'user_status', 'employment_type', 'work_arrangement', 'document_type')
ORDER BY t.typname, e.enumsortorder;

\echo ''

-- ============================================
-- 3. Check Tables
-- ============================================
\echo '3. Checking Tables...'
SELECT
  CASE
    WHEN COUNT(*) = 5 THEN '✓ All tables created'
    ELSE '✗ Missing tables'
  END as status
FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('audit_logs', 'departments', 'users', 'employees', 'documents');

SELECT
  table_name as "Table Name",
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public'
      AND table_name = t.table_name
      AND column_name = 'deleted_at'
    ) THEN 'Yes'
    ELSE 'No'
  END as "Soft Delete"
FROM information_schema.tables t
WHERE table_schema = 'public'
AND table_name IN ('audit_logs', 'departments', 'users', 'employees', 'documents')
ORDER BY table_name;

\echo ''

-- ============================================
-- 4. Check RLS Status
-- ============================================
\echo '4. Checking Row Level Security (RLS)...'
SELECT
  CASE
    WHEN COUNT(*) = 5 THEN '✓ RLS enabled on all tables'
    ELSE '✗ RLS not enabled on all tables'
  END as status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('audit_logs', 'departments', 'users', 'employees', 'documents')
AND rowsecurity = true;

SELECT
  tablename as "Table Name",
  CASE WHEN rowsecurity THEN 'Enabled' ELSE 'DISABLED' END as "RLS Status"
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('audit_logs', 'departments', 'users', 'employees', 'documents')
ORDER BY tablename;

\echo ''

-- ============================================
-- 5. Check RLS Policies
-- ============================================
\echo '5. Checking RLS Policies...'
SELECT
  CASE
    WHEN COUNT(*) >= 20 THEN '✓ RLS policies created'
    ELSE '✗ Insufficient RLS policies'
  END as status,
  COUNT(*) || ' policies found' as details
FROM pg_policies
WHERE schemaname = 'public';

SELECT
  tablename as "Table",
  COUNT(*) as "Policy Count"
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

\echo ''

-- ============================================
-- 6. Check Indexes
-- ============================================
\echo '6. Checking Indexes...'
SELECT
  CASE
    WHEN COUNT(*) >= 20 THEN '✓ Indexes created'
    ELSE '✗ Insufficient indexes'
  END as status,
  COUNT(*) || ' indexes found' as details
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('audit_logs', 'departments', 'users', 'employees', 'documents');

SELECT
  tablename as "Table",
  indexname as "Index Name",
  indexdef as "Definition"
FROM pg_indexes
WHERE schemaname = 'public'
AND tablename IN ('audit_logs', 'departments', 'users', 'employees', 'documents')
ORDER BY tablename, indexname;

\echo ''

-- ============================================
-- 7. Check Triggers
-- ============================================
\echo '7. Checking Triggers...'
SELECT
  CASE
    WHEN COUNT(*) >= 8 THEN '✓ All triggers created'
    ELSE '✗ Missing triggers'
  END as status,
  COUNT(*) || ' triggers found' as details
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND event_object_table IN ('departments', 'users', 'employees', 'documents');

SELECT
  event_object_table as "Table",
  trigger_name as "Trigger Name",
  action_timing || ' ' || event_manipulation as "When"
FROM information_schema.triggers
WHERE trigger_schema = 'public'
AND event_object_table IN ('departments', 'users', 'employees', 'documents')
ORDER BY event_object_table, trigger_name;

\echo ''

-- ============================================
-- 8. Check Helper Functions
-- ============================================
\echo '8. Checking Helper Functions...'
SELECT
  CASE
    WHEN COUNT(*) >= 10 THEN '✓ All helper functions created'
    ELSE '✗ Missing helper functions'
  END as status,
  COUNT(*) || ' functions found' as details
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_type = 'FUNCTION';

SELECT
  routine_name as "Function Name",
  routine_type as "Type"
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_type = 'FUNCTION'
ORDER BY routine_name;

\echo ''

-- ============================================
-- 9. Check Foreign Key Relationships
-- ============================================
\echo '9. Checking Foreign Key Relationships...'
SELECT
  CASE
    WHEN COUNT(*) >= 8 THEN '✓ Foreign keys defined'
    ELSE '✗ Missing foreign keys'
  END as status,
  COUNT(*) || ' foreign keys found' as details
FROM information_schema.table_constraints
WHERE constraint_schema = 'public'
AND constraint_type = 'FOREIGN KEY';

SELECT
  tc.table_name as "Table",
  tc.constraint_name as "Constraint",
  kcu.column_name as "Column",
  ccu.table_name as "References Table",
  ccu.column_name as "References Column"
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_schema = 'public'
AND tc.table_name IN ('departments', 'users', 'employees', 'documents')
ORDER BY tc.table_name, tc.constraint_name;

\echo ''

-- ============================================
-- 10. Check Standard Columns
-- ============================================
\echo '10. Checking Standard Columns...'
WITH table_list AS (
  SELECT unnest(ARRAY['departments', 'users', 'employees', 'documents']) as table_name
),
required_columns AS (
  SELECT unnest(ARRAY['id', 'created_at', 'updated_at', 'created_by']) as column_name
)
SELECT
  CASE
    WHEN COUNT(DISTINCT t.table_name || c.column_name) = 16 THEN '✓ All standard columns present'
    ELSE '✗ Missing standard columns'
  END as status
FROM table_list t
CROSS JOIN required_columns c
WHERE EXISTS (
  SELECT 1
  FROM information_schema.columns
  WHERE table_schema = 'public'
  AND table_name = t.table_name
  AND column_name = c.column_name
);

SELECT
  t.table_name as "Table",
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t.table_name AND column_name = 'id') THEN '✓' ELSE '✗' END as "id",
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t.table_name AND column_name = 'created_at') THEN '✓' ELSE '✗' END as "created_at",
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t.table_name AND column_name = 'updated_at') THEN '✓' ELSE '✗' END as "updated_at",
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t.table_name AND column_name = 'created_by') THEN '✓' ELSE '✗' END as "created_by",
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = t.table_name AND column_name = 'deleted_at') THEN '✓' ELSE 'N/A' END as "deleted_at"
FROM information_schema.tables t
WHERE t.table_schema = 'public'
AND t.table_name IN ('departments', 'users', 'employees', 'documents')
ORDER BY t.table_name;

\echo ''

-- ============================================
-- Summary
-- ============================================
\echo '=================================================='
\echo 'Validation Complete!'
\echo '=================================================='
\echo ''
\echo 'If all checks show ✓, the schema is correctly set up.'
\echo 'If any checks show ✗, review the migration files and rerun.'
\echo ''
