-- Migration: Fix RLS Infinite Recursion
-- Created: 2026-02-17
-- Description: Fixes infinite recursion in users and employees RLS policies by using helper functions

BEGIN;

-- ============================================
-- Users Table RLS Fixes
-- ============================================

-- Drop policies that cause infinite recursion
DROP POLICY IF EXISTS "users_select_privileged_policy" ON public.users;
DROP POLICY IF EXISTS "users_insert_policy" ON public.users;
DROP POLICY IF EXISTS "users_update_privileged_policy" ON public.users;
DROP POLICY IF EXISTS "users_delete_policy" ON public.users;

-- HR, COS, CEO, Admin, and Super Admin can view all users
-- Uses helper function to avoid infinite recursion
CREATE POLICY "users_select_privileged_policy" ON public.users
  FOR SELECT
  TO authenticated
  USING (
    user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'cos', 'ceo', 'super_admin']::user_role[])
    AND deleted_at IS NULL
  );

-- HR, Admin, and Super Admin can insert users
CREATE POLICY "users_insert_policy" ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'super_admin']::user_role[])
  );

-- HR, Admin, and Super Admin can update users
CREATE POLICY "users_update_privileged_policy" ON public.users
  FOR UPDATE
  TO authenticated
  USING (
    user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'super_admin']::user_role[])
  )
  WITH CHECK (
    user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'super_admin']::user_role[])
  );

-- Admin and Super Admin can delete users (soft delete)
CREATE POLICY "users_delete_policy" ON public.users
  FOR DELETE
  TO authenticated
  USING (
    user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
  );

-- ============================================
-- Employees Table RLS Fixes
-- ============================================

-- Drop policies that cause infinite recursion
DROP POLICY IF EXISTS "employees_select_super_admin_policy" ON public.employees;
DROP POLICY IF EXISTS "employees_insert_policy" ON public.employees;
DROP POLICY IF EXISTS "employees_update_policy" ON public.employees;
DROP POLICY IF EXISTS "employees_delete_policy" ON public.employees;

-- Add Super Admin can view all employee data
CREATE POLICY "employees_select_super_admin_policy" ON public.employees
  FOR SELECT
  TO authenticated
  USING (
    user_has_role(auth.uid(), 'super_admin'::user_role)
    AND deleted_at IS NULL
  );

-- HR, Admin, and Super Admin can insert employees
CREATE POLICY "employees_insert_policy" ON public.employees
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'super_admin']::user_role[])
  );

-- HR, Admin, and Super Admin can update employee data
CREATE POLICY "employees_update_policy" ON public.employees
  FOR UPDATE
  TO authenticated
  USING (
    user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'super_admin']::user_role[])
  )
  WITH CHECK (
    user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'super_admin']::user_role[])
  );

-- Admin and Super Admin can delete employees (soft delete)
CREATE POLICY "employees_delete_policy" ON public.employees
  FOR DELETE
  TO authenticated
  USING (
    user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
  );

COMMIT;
