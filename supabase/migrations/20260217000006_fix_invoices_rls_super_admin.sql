-- Migration: Fix invoices RLS policies to include super_admin role
-- Created: 2026-02-17
-- Description: Adds super_admin to invoices and invoice_line_items RLS SELECT,
--   UPDATE, INSERT, and DELETE policies so that super_admin users can see and
--   manage all invoices on the payroll approvals page.
--
-- Root cause: The original invoices RLS policies (from 20260216000018) only
--   allowed roles ('admin', 'hr', 'cos', 'ceo') but never included 'super_admin'.
--   Since super_admin was added to the user_role enum (20260210000001) and users
--   are assigned that role, they were silently blocked by RLS from seeing any
--   invoice data.
--
-- This migration is safe to run both before and after the full role consolidation
-- (20260217000005). If consolidation has already run, these DROP IF EXISTS
-- statements will be no-ops and the CREATE will apply cleanly.

BEGIN;

-- ============================================
-- 1. Fix invoices SELECT admin policy
-- ============================================

DROP POLICY IF EXISTS "invoices_select_admin_policy" ON public.invoices;

CREATE POLICY "invoices_select_admin_policy" ON public.invoices
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
      AND users.deleted_at IS NULL
    )
    AND invoices.deleted_at IS NULL
  );

-- ============================================
-- 2. Fix invoices INSERT policy
-- ============================================

DROP POLICY IF EXISTS "invoices_insert_policy" ON public.invoices;

CREATE POLICY "invoices_insert_policy" ON public.invoices
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      EXISTS (
        SELECT 1 FROM public.employees
        WHERE employees.id = invoices.employee_id
        AND employees.user_id = auth.uid()
        AND employees.deleted_at IS NULL
      )
    )
    OR
    (
      EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'super_admin')
        AND users.deleted_at IS NULL
      )
    )
  );

-- ============================================
-- 3. Fix invoices UPDATE policy
-- ============================================

DROP POLICY IF EXISTS "invoices_update_policy" ON public.invoices;

CREATE POLICY "invoices_update_policy" ON public.invoices
  FOR UPDATE
  TO authenticated
  USING (
    (
      EXISTS (
        SELECT 1 FROM public.employees
        WHERE employees.id = invoices.employee_id
        AND employees.user_id = auth.uid()
        AND employees.deleted_at IS NULL
      )
    )
    OR
    (
      EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'super_admin')
        AND users.deleted_at IS NULL
      )
    )
  )
  WITH CHECK (
    (
      EXISTS (
        SELECT 1 FROM public.employees
        WHERE employees.id = invoices.employee_id
        AND employees.user_id = auth.uid()
        AND employees.deleted_at IS NULL
      )
    )
    OR
    (
      EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'super_admin')
        AND users.deleted_at IS NULL
      )
    )
  );

-- ============================================
-- 4. Fix invoices DELETE policy
-- ============================================

DROP POLICY IF EXISTS "invoices_delete_policy" ON public.invoices;

CREATE POLICY "invoices_delete_policy" ON public.invoices
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
-- 5. Fix invoice_line_items SELECT policy
-- ============================================

DROP POLICY IF EXISTS "invoice_line_items_select_policy" ON public.invoice_line_items;

CREATE POLICY "invoice_line_items_select_policy" ON public.invoice_line_items
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices
      WHERE invoices.id = invoice_line_items.invoice_id
      AND invoices.deleted_at IS NULL
      AND (
        EXISTS (
          SELECT 1 FROM public.employees
          WHERE employees.id = invoices.employee_id
          AND employees.user_id = auth.uid()
          AND employees.deleted_at IS NULL
        )
        OR EXISTS (
          SELECT 1 FROM public.employees
          WHERE employees.id = invoices.employee_id
          AND employees.immediate_head = auth.uid()
          AND employees.deleted_at IS NULL
        )
        OR EXISTS (
          SELECT 1 FROM public.users
          WHERE users.id = auth.uid()
          AND users.role IN ('admin', 'super_admin')
          AND users.deleted_at IS NULL
        )
      )
    )
  );

-- ============================================
-- 6. Fix invoice_line_items INSERT policy
-- ============================================

DROP POLICY IF EXISTS "invoice_line_items_insert_policy" ON public.invoice_line_items;

CREATE POLICY "invoice_line_items_insert_policy" ON public.invoice_line_items
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invoices
      WHERE invoices.id = invoice_line_items.invoice_id
      AND invoices.deleted_at IS NULL
      AND (
        EXISTS (
          SELECT 1 FROM public.employees
          WHERE employees.id = invoices.employee_id
          AND employees.user_id = auth.uid()
          AND employees.deleted_at IS NULL
        )
        OR EXISTS (
          SELECT 1 FROM public.users
          WHERE users.id = auth.uid()
          AND users.role IN ('admin', 'super_admin')
          AND users.deleted_at IS NULL
        )
      )
    )
  );

-- ============================================
-- 7. Fix invoice_line_items UPDATE policy
-- ============================================

DROP POLICY IF EXISTS "invoice_line_items_update_policy" ON public.invoice_line_items;

CREATE POLICY "invoice_line_items_update_policy" ON public.invoice_line_items
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices
      WHERE invoices.id = invoice_line_items.invoice_id
      AND invoices.deleted_at IS NULL
      AND (
        EXISTS (
          SELECT 1 FROM public.employees
          WHERE employees.id = invoices.employee_id
          AND employees.user_id = auth.uid()
          AND employees.deleted_at IS NULL
        )
        OR EXISTS (
          SELECT 1 FROM public.users
          WHERE users.id = auth.uid()
          AND users.role IN ('admin', 'super_admin')
          AND users.deleted_at IS NULL
        )
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.invoices
      WHERE invoices.id = invoice_line_items.invoice_id
      AND invoices.deleted_at IS NULL
      AND (
        EXISTS (
          SELECT 1 FROM public.employees
          WHERE employees.id = invoices.employee_id
          AND employees.user_id = auth.uid()
          AND employees.deleted_at IS NULL
        )
        OR EXISTS (
          SELECT 1 FROM public.users
          WHERE users.id = auth.uid()
          AND users.role IN ('admin', 'super_admin')
          AND users.deleted_at IS NULL
        )
      )
    )
  );

-- ============================================
-- 8. Fix invoice_line_items DELETE policy
-- ============================================

DROP POLICY IF EXISTS "invoice_line_items_delete_policy" ON public.invoice_line_items;

CREATE POLICY "invoice_line_items_delete_policy" ON public.invoice_line_items
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.invoices
      JOIN public.users ON users.id = auth.uid()
      WHERE invoices.id = invoice_line_items.invoice_id
      AND users.role IN ('admin', 'super_admin')
      AND users.deleted_at IS NULL
    )
  );

COMMIT;
