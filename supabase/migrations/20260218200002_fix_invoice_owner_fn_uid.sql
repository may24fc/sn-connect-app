-- Migration: Fix invoice_employee_is_owner to not call auth.uid() internally
-- Created: 2026-02-18
-- Description: The previous migration's SECURITY DEFINER function called
--   auth.uid() INSIDE the function body. Because SECURITY DEFINER functions run
--   as the DB owner (postgres), auth.uid() -- which reads from the PostgREST
--   JWT session GUC -- is not reliably available in that context and can return
--   NULL, making the ownership check always fail.
--
--   The correct pattern used throughout this codebase (user_has_role,
--   user_has_any_role) is to accept user_id as a PARAMETER and call auth.uid()
--   from the POLICY's SQL context (authenticated role), then pass the resolved
--   UUID into the SECURITY DEFINER function.
--
--   Fix:
--   1. Replace invoice_employee_is_owner(uuid) with
--      invoice_employee_is_owner(p_employee_id uuid, p_user_id uuid)
--   2. Recreate invoices INSERT and UPDATE policies using the new signature

BEGIN;

-- ============================================
-- 1. Drop the policies that reference the old 1-arg function first,
--    then drop the function itself with CASCADE.
-- ============================================

DROP POLICY IF EXISTS "invoices_insert_policy" ON public.invoices;
DROP POLICY IF EXISTS "invoices_update_policy" ON public.invoices;

DROP FUNCTION IF EXISTS public.invoice_employee_is_owner(uuid) CASCADE;

-- ============================================
-- 2. Recreate with correct 2-argument signature
--    (same pattern as user_has_role, user_has_any_role)
-- ============================================

CREATE OR REPLACE FUNCTION public.invoice_employee_is_owner(
  p_employee_id uuid,
  p_user_id     uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER   -- bypasses RLS on employees table
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.employees
    WHERE id          = p_employee_id
      AND user_id     = p_user_id     -- p_user_id = auth.uid() supplied by caller
      AND deleted_at IS NULL
  );
END;
$$;

REVOKE ALL   ON FUNCTION public.invoice_employee_is_owner(uuid, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.invoice_employee_is_owner(uuid, uuid) TO authenticated;

-- ============================================
-- 3. Recreate invoices INSERT policy
-- ============================================

DROP POLICY IF EXISTS "invoices_insert_policy" ON public.invoices;

CREATE POLICY "invoices_insert_policy" ON public.invoices
  FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Employee inserting their own invoice:
    -- auth.uid() is evaluated here (policy context = authenticated role) and
    -- passed to the SECURITY DEFINER function which can then safely bypass
    -- the employees RLS to do the ownership JOIN.
    public.invoice_employee_is_owner(invoices.employee_id, auth.uid())
    OR
    -- Admin / super_admin can create invoices for any employee
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.id         = auth.uid()
        AND users.role       IN ('admin', 'super_admin')
        AND users.deleted_at IS NULL
    )
  );

-- ============================================
-- 4. Recreate invoices UPDATE policy (same pattern)
-- ============================================

DROP POLICY IF EXISTS "invoices_update_policy" ON public.invoices;

CREATE POLICY "invoices_update_policy" ON public.invoices
  FOR UPDATE
  TO authenticated
  USING (
    public.invoice_employee_is_owner(invoices.employee_id, auth.uid())
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
    public.invoice_employee_is_owner(invoices.employee_id, auth.uid())
    OR
    EXISTS (
      SELECT 1
      FROM public.users
      WHERE users.id         = auth.uid()
        AND users.role       IN ('admin', 'super_admin')
        AND users.deleted_at IS NULL
    )
  );

COMMIT;
