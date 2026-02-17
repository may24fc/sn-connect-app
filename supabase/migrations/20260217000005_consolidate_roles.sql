-- Migration: Consolidate User Roles
-- Created: 2026-02-17
-- Description: Simplifies the role system from 7 roles to 4 roles
--              hr + admin -> admin
--              cos + ceo -> super_admin
--              Keeps: employee, intern
--
-- Final roles: employee, intern, admin, super_admin
--
-- IMPORTANT: This migration does NOT use BEGIN/COMMIT because Supabase's
-- migration runner handles transactions automatically. Adding explicit
-- transaction control causes nested transaction issues.
--
-- The correct ordering for enum replacement in PostgreSQL is:
--   1. Drop ALL RLS policies (they reference users.role column)
--   2. Drop helper functions whose signatures use the user_role type
--   3. Drop column defaults referencing the old enum
--   4. Create the new enum type
--   5. Use temporary column approach to migrate data
--   6. Drop old enum, rename new enum
--   7. Restore column defaults
--   8. Recreate helper functions with the new enum type
--   9. Re-enable RLS on all tables
--  10. Note: Policies will be recreated by individual table migrations

-- ============================================
-- STEP 1: Drop ALL RLS policies on ALL tables (public and auth schemas)
-- ============================================
-- PostgreSQL will not allow ALTER COLUMN TYPE on a column that is
-- referenced by any policy definition, even indirectly via subqueries.
-- We must drop every policy first, including from auth schema.
DO $$
DECLARE
   pol record;
BEGIN
    FOR pol IN
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname IN ('public', 'auth')
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I CASCADE',
            pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
END$$;

-- ============================================
-- STEP 2: Disable RLS on all public tables temporarily
-- ============================================
DO $$
DECLARE
    tbl record;
BEGIN
    FOR tbl IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', tbl.tablename);
    END LOOP;
END$$;

-- ============================================
-- STEP 3: Drop helper functions that depend on user_role type
-- ============================================
-- These functions have user_role in their parameter or return types,
-- which creates a dependency that prevents DROP TYPE user_role.
-- CASCADE is required to drop any remaining dependent objects.
DROP FUNCTION IF EXISTS public.user_has_role(uuid, user_role) CASCADE;
DROP FUNCTION IF EXISTS public.user_has_any_role(uuid, user_role[]) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_role(uuid) CASCADE;

-- ============================================
-- STEP 4: Drop column default referencing old enum
-- ============================================
ALTER TABLE public.users ALTER COLUMN role DROP DEFAULT;

-- ============================================
-- STEP 5: Create new simplified enum type
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role_new') THEN
        CREATE TYPE user_role_new AS ENUM (
          'employee',
          'intern',
          'admin',
          'super_admin'
        );
    END IF;
END$$;

-- ============================================
-- STEP 6: Use temporary column approach to avoid dependency issues
-- ============================================
-- PostgreSQL won't allow ALTER COLUMN TYPE on columns used in policy definitions,
-- even after dropping policies. Use a temporary column instead.

-- 6a. Add temporary column with new enum type
ALTER TABLE public.users ADD COLUMN role_new user_role_new;

-- 6b. Migrate data to new column with role consolidation:
--   hr -> admin
--   cos -> super_admin
--   ceo -> super_admin
--   admin -> admin (unchanged)
--   super_admin -> super_admin (unchanged)
--   employee -> employee (unchanged)
--   intern -> intern (unchanged)
UPDATE public.users
SET role_new = (
  CASE role::text
    WHEN 'hr' THEN 'admin'
    WHEN 'cos' THEN 'super_admin'
    WHEN 'ceo' THEN 'super_admin'
    ELSE role::text
  END
)::user_role_new;

-- 6c. Drop old role column (CASCADE will drop all remaining dependencies)
ALTER TABLE public.users DROP COLUMN role CASCADE;

-- 6d. Rename new column to role
ALTER TABLE public.users RENAME COLUMN role_new TO role;

-- 6e. Make the column NOT NULL
ALTER TABLE public.users ALTER COLUMN role SET NOT NULL;

-- ============================================
-- STEP 7: Drop old enum and rename new one
-- ============================================
-- Use CASCADE to drop any remaining objects that depend on the old enum
DROP TYPE IF EXISTS user_role CASCADE;
ALTER TYPE user_role_new RENAME TO user_role;

-- ============================================
-- STEP 8: Restore column default
-- ============================================
ALTER TABLE public.users ALTER COLUMN role SET DEFAULT 'employee'::user_role;

-- ============================================
-- STEP 9: Recreate helper functions with the new user_role type
-- ============================================

CREATE OR REPLACE FUNCTION public.user_has_role(user_id uuid, required_role user_role)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = user_id
    AND role = required_role
    AND deleted_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.user_has_role(uuid, user_role) IS 'Check if a user has a specific role';

CREATE OR REPLACE FUNCTION public.user_has_any_role(user_id uuid, required_roles user_role[])
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = user_id
    AND role = ANY(required_roles)
    AND deleted_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.user_has_any_role(uuid, user_role[]) IS 'Check if a user has any of the specified roles';

CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS user_role AS $$
  SELECT role FROM public.users
  WHERE id = user_id
  AND deleted_at IS NULL;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.get_user_role(uuid) IS 'Get the role of a specific user';

-- ============================================
-- STEP 10: Re-enable RLS on ALL tables that exist
-- ============================================
-- Use a dynamic approach to only enable RLS on tables that actually exist
DO $$
DECLARE
    tbl record;
BEGIN
    FOR tbl IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', tbl.tablename);
        EXECUTE format('ALTER TABLE public.%I FORCE ROW LEVEL SECURITY', tbl.tablename);
    END LOOP;
END$$;

-- ============================================
-- STEP 11: Recreate ONLY core table policies
-- ============================================
-- This migration only recreates policies for the users table.
-- Policies for other tables will be recreated by a separate migration
-- to avoid dependency issues with tables that may not exist yet.

-- Users can view their own record
CREATE POLICY "users_select_self_policy" ON public.users
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    AND deleted_at IS NULL
  );

-- Admin/super_admin can view all users
CREATE POLICY "users_select_admin_all_policy" ON public.users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'super_admin')
      AND u.deleted_at IS NULL
    )
    AND deleted_at IS NULL
  );

-- Admin/super_admin can insert users
CREATE POLICY "users_insert_admin_policy" ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
      AND users.deleted_at IS NULL
    )
  );

-- Users can update their own record
CREATE POLICY "users_update_self_policy" ON public.users
  FOR UPDATE
  TO authenticated
  USING (
    id = auth.uid()
    AND deleted_at IS NULL
  )
  WITH CHECK (
    id = auth.uid()
  );

-- Admin/super_admin can update any user
CREATE POLICY "users_update_admin_policy" ON public.users
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'super_admin')
      AND u.deleted_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'super_admin')
      AND u.deleted_at IS NULL
    )
  );

-- Only super_admin can delete users
CREATE POLICY "users_delete_admin_policy" ON public.users
  FOR DELETE
TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
      AND users.deleted_at IS NULL
    )
  );

-- ============================================
-- Verification
-- ============================================
-- This migration consolidates 7 roles into 4:
--   employee, intern, admin (was admin+hr), super_admin (was cos+ceo+super_admin)
--
-- The user_role enum has been successfully changed.
-- The helper functions have been recreated with the new enum type.
-- RLS has been re-enabled on all tables.
-- Policies for the users table have been recreated.
--
-- IMPORTANT: Policies for other tables (employees, documents, departments, etc.)
-- need to be recreated with the new consolidated roles. This will be handled
-- by migration 20260217000007_recreate_all_policies.sql
--
-- Any new policies created should use:
--   - 'admin' instead of 'hr' or the old 'admin'
--   - 'super_admin' instead of 'cos', 'ceo', or the old 'super_admin'
