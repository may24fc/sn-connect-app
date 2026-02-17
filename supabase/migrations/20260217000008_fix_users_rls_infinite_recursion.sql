-- Migration: Fix Users RLS Infinite Recursion (Post-Consolidation)
-- Created: 2026-02-17
-- Description: The role consolidation migration (20260217000005) recreated
--   the users table policies using direct subqueries on public.users:
--
--     EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN (...))
--
--   This causes infinite recursion because the subquery triggers the same
--   RLS policies, which trigger the same subquery, etc.
--
--   The fix is to use SECURITY DEFINER helper functions (user_has_any_role,
--   user_has_role) which bypass RLS when querying public.users internally.
--
-- Root Cause: PostgreSQL evaluates ALL policies (OR'd together) for a given
--   operation. Even if users_select_self_policy would succeed, PostgreSQL still
--   evaluates users_select_admin_all_policy which contains the recursive subquery.

-- ============================================
-- STEP 1: Drop broken policies on public.users
-- ============================================

DROP POLICY IF EXISTS "users_select_self_policy" ON public.users;
DROP POLICY IF EXISTS "users_select_admin_all_policy" ON public.users;
DROP POLICY IF EXISTS "users_insert_admin_policy" ON public.users;
DROP POLICY IF EXISTS "users_update_self_policy" ON public.users;
DROP POLICY IF EXISTS "users_update_admin_policy" ON public.users;
DROP POLICY IF EXISTS "users_delete_admin_policy" ON public.users;

-- Also drop any leftover policies from earlier migrations
DROP POLICY IF EXISTS "users_select_privileged_policy" ON public.users;
DROP POLICY IF EXISTS "users_insert_policy" ON public.users;
DROP POLICY IF EXISTS "users_update_privileged_policy" ON public.users;
DROP POLICY IF EXISTS "users_delete_policy" ON public.users;

-- ============================================
-- STEP 2: Recreate policies using SECURITY DEFINER helpers
-- ============================================
-- user_has_any_role() and user_has_role() are SECURITY DEFINER functions
-- that query public.users as the function owner (postgres), bypassing RLS.
-- This breaks the infinite recursion cycle.

-- Users can view their own record (no subquery needed - direct comparison)
CREATE POLICY "users_select_self_policy" ON public.users
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    AND deleted_at IS NULL
  );

-- Admin/super_admin can view all users
-- Uses SECURITY DEFINER helper to avoid recursion
CREATE POLICY "users_select_admin_all_policy" ON public.users
  FOR SELECT
  TO authenticated
  USING (
    user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
    AND deleted_at IS NULL
  );

-- Admin/super_admin can insert users
CREATE POLICY "users_insert_admin_policy" ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
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
    user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
  )
  WITH CHECK (
    user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
  );

-- Only super_admin can delete users
CREATE POLICY "users_delete_admin_policy" ON public.users
  FOR DELETE
  TO authenticated
  USING (
    user_has_role(auth.uid(), 'super_admin'::user_role)
  );
