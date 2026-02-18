-- Migration: Fix invoices INSERT RLS for employee users
-- Created: 2026-02-18
-- Description: The `invoices_insert_policy` used a sub-SELECT from `employees`
--   inside its WITH CHECK clause. Because the employees table itself has RLS
--   FORCED, that sub-SELECT is filtered by the employees SELECT policies in the
--   same security context — and if those policies haven't been restored (e.g.
--   after the role consolidation) the sub-SELECT returns zero rows, causing
--   every employee-side invoice creation to fail with code 42501.
--
--   Fix strategy (belt-and-suspenders):
--   1. Create a SECURITY DEFINER helper function that checks employee ownership
--      without being subject to employees RLS. This is the standard Supabase
--      pattern for cross-table RLS checks.
--   2. Drop and recreate `invoices_insert_policy` and `invoices_update_policy`
--      using the helper so the employee branch never depends on employees RLS.
--   3. Re-create the employees SELECT policies with DROP IF EXISTS + CREATE
--      (idempotent), so the employees table is guaranteed to have them even if
--      migration 20260218100001 failed or was never applied.

BEGIN;

-- ============================================
-- 1. SECURITY DEFINER helper: employee ownership check
-- ============================================

CREATE OR REPLACE FUNCTION public.invoice_employee_is_owner(p_employee_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER   -- runs as DB owner, bypasses employees RLS
STABLE
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.employees
    WHERE id          = p_employee_id
      AND user_id     = auth.uid()
      AND deleted_at IS NULL
  );
END;
$$;

-- Revoke public execute, grant only to authenticated role
REVOKE ALL ON FUNCTION public.invoice_employee_is_owner(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.invoice_employee_is_owner(uuid) TO authenticated;

-- ============================================
-- 2. Fix invoices INSERT policy
-- ============================================

DROP POLICY IF EXISTS "invoices_insert_policy" ON public.invoices;

CREATE POLICY "invoices_insert_policy" ON public.invoices
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Employees inserting their own invoices (ownership check via SECURITY DEFINER)
    public.invoice_employee_is_owner(invoices.employee_id)
    OR
    -- Admin / super_admin can insert invoices for any employee
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.id         = auth.uid()
        AND users.role       IN ('admin', 'super_admin')
        AND users.deleted_at IS NULL
    )
  );

-- ============================================
-- 3. Fix invoices UPDATE policy (same pattern)
-- ============================================

DROP POLICY IF EXISTS "invoices_update_policy" ON public.invoices;

CREATE POLICY "invoices_update_policy" ON public.invoices
  FOR UPDATE
  TO authenticated
  USING (
    public.invoice_employee_is_owner(invoices.employee_id)
    OR
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.id         = auth.uid()
        AND users.role       IN ('admin', 'super_admin')
        AND users.deleted_at IS NULL
    )
  )
  WITH CHECK (
    public.invoice_employee_is_owner(invoices.employee_id)
    OR
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.id         = auth.uid()
        AND users.role       IN ('admin', 'super_admin')
        AND users.deleted_at IS NULL
    )
  );

-- ============================================
-- 4. Ensure employees SELECT policies exist (idempotent)
--    These may be missing if migration 20260218100001 failed.
-- ============================================

DROP POLICY IF EXISTS "employees_select_own_policy"   ON public.employees;
DROP POLICY IF EXISTS "employees_select_admin_policy" ON public.employees;

-- Employees can always view their own record
CREATE POLICY "employees_select_own_policy" ON public.employees
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND deleted_at IS NULL);

-- Admin and super_admin can view all employee records
CREATE POLICY "employees_select_admin_policy" ON public.employees
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id         = auth.uid()
        AND u.role       IN ('admin', 'super_admin')
        AND u.deleted_at IS NULL
    )
    AND deleted_at IS NULL
  );

-- Validate
-- SELECT COUNT(*) FROM pg_policies WHERE tablename = 'invoices' AND policyname = 'invoices_insert_policy';
-- SELECT COUNT(*) FROM pg_policies WHERE tablename = 'employees' AND policyname = 'employees_select_own_policy';

COMMIT;
