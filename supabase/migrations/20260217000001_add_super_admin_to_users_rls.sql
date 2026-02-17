-- Migration: Add super_admin to users and employees table RLS policies
-- Created: 2026-02-17
-- Description: Updates users and employees table RLS policies to include super_admin role

BEGIN;

-- Drop existing policies
DROP POLICY IF EXISTS "users_select_privileged_policy" ON public.users;
DROP POLICY IF EXISTS "users_insert_policy" ON public.users;
DROP POLICY IF EXISTS "users_update_privileged_policy" ON public.users;
DROP POLICY IF EXISTS "users_delete_policy" ON public.users;

-- HR, COS, CEO, Admin, and Super Admin can view all users
CREATE POLICY "users_select_privileged_policy" ON public.users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'hr', 'cos', 'ceo', 'super_admin')
      AND u.deleted_at IS NULL
    ) AND deleted_at IS NULL
  );

-- HR, Admin, and Super Admin can insert users
CREATE POLICY "users_insert_policy" ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'hr', 'super_admin')
      AND users.deleted_at IS NULL
    )
  );

-- HR, Admin, and Super Admin can update users
CREATE POLICY "users_update_privileged_policy" ON public.users
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'hr', 'super_admin')
      AND u.deleted_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'hr', 'super_admin')
      AND u.deleted_at IS NULL
    )
  );

-- Admin and Super Admin can delete users (soft delete)
CREATE POLICY "users_delete_policy" ON public.users
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
      AND users.deleted_at IS NULL
    )
  );

-- ============================================
-- Employees Table RLS Updates
-- ============================================

-- Add Super Admin can view all employee data
CREATE POLICY "employees_select_super_admin_policy" ON public.employees
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
      AND users.deleted_at IS NULL
    ) AND deleted_at IS NULL
  );

-- Drop and recreate employees insert/update/delete policies to include super_admin
DROP POLICY IF EXISTS "employees_insert_policy" ON public.employees;
DROP POLICY IF EXISTS "employees_update_policy" ON public.employees;
DROP POLICY IF EXISTS "employees_delete_policy" ON public.employees;

-- HR, Admin, and Super Admin can insert employees
CREATE POLICY "employees_insert_policy" ON public.employees
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'hr', 'super_admin')
      AND users.deleted_at IS NULL
    )
  );

-- HR, Admin, and Super Admin can update employee data
CREATE POLICY "employees_update_policy" ON public.employees
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'hr', 'super_admin')
      AND users.deleted_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'hr', 'super_admin')
      AND users.deleted_at IS NULL
    )
  );

-- Admin and Super Admin can delete employees (soft delete)
CREATE POLICY "employees_delete_policy" ON public.employees
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
      AND users.deleted_at IS NULL
    )
  );

COMMIT;
