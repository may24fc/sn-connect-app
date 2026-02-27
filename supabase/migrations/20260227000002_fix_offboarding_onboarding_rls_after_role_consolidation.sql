-- Migration: Fix offboarding + onboarding checklist RLS after role consolidation
-- Created: 2026-02-27
-- Description: Update offboarding and onboarding_checklists/onboarding_tasks RLS policies
--   to use the consolidated user_role enum values (admin, super_admin)
--   instead of the old values (hr, cos, ceo) that were removed.
--
-- Context: Migration 20260217000005_consolidate_roles.sql consolidated:
--   - hr -> admin
--   - cos -> super_admin
--   - ceo -> super_admin
--
-- The offboarding tables (20260210000007) and onboarding checklist tables (20260210000006)
-- were never patched for the role consolidation. This migration fixes both.

BEGIN;

-- ============================================
-- OFFBOARDING TABLE POLICIES
-- ============================================

DROP POLICY IF EXISTS offboarding_employee_select_policy ON public.offboarding;
DROP POLICY IF EXISTS offboarding_admin_select_policy ON public.offboarding;
DROP POLICY IF EXISTS offboarding_admin_insert_policy ON public.offboarding;
DROP POLICY IF EXISTS offboarding_admin_update_policy ON public.offboarding;
DROP POLICY IF EXISTS offboarding_admin_delete_policy ON public.offboarding;

-- SELECT: Employees can view their own offboarding records
CREATE POLICY offboarding_employee_select_policy ON public.offboarding
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = offboarding.employee_id
      AND e.user_id = auth.uid()
    )
    AND deleted_at IS NULL
  );

-- SELECT: Admin/Super Admin can view all offboarding records
CREATE POLICY offboarding_admin_select_policy ON public.offboarding
  FOR SELECT
  TO authenticated
  USING (
    user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
    AND deleted_at IS NULL
  );

-- INSERT: Admin/Super Admin can create offboarding records
CREATE POLICY offboarding_admin_insert_policy ON public.offboarding
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
  );

-- UPDATE: Admin/Super Admin can update offboarding records
CREATE POLICY offboarding_admin_update_policy ON public.offboarding
  FOR UPDATE
  TO authenticated
  USING (
    user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
    AND deleted_at IS NULL
  )
  WITH CHECK (
    user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
  );

-- DELETE (soft): Admin/Super Admin can soft-delete offboarding records
CREATE POLICY offboarding_admin_delete_policy ON public.offboarding
  FOR DELETE
  TO authenticated
  USING (
    user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
  );

-- ============================================
-- OFFBOARDING_TASKS TABLE POLICIES
-- ============================================

DROP POLICY IF EXISTS offboarding_tasks_employee_select_policy ON public.offboarding_tasks;
DROP POLICY IF EXISTS offboarding_tasks_employee_update_policy ON public.offboarding_tasks;
DROP POLICY IF EXISTS offboarding_tasks_admin_select_policy ON public.offboarding_tasks;
DROP POLICY IF EXISTS offboarding_tasks_admin_insert_policy ON public.offboarding_tasks;
DROP POLICY IF EXISTS offboarding_tasks_admin_update_policy ON public.offboarding_tasks;
DROP POLICY IF EXISTS offboarding_tasks_admin_delete_policy ON public.offboarding_tasks;

-- SELECT: Employees can view their own offboarding tasks
CREATE POLICY offboarding_tasks_employee_select_policy ON public.offboarding_tasks
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.offboarding o
      JOIN public.employees e ON e.id = o.employee_id
      WHERE o.id = offboarding_tasks.offboarding_id
      AND e.user_id = auth.uid()
    )
    AND deleted_at IS NULL
  );

-- UPDATE: Employees can update their own offboarding tasks (mark as completed)
CREATE POLICY offboarding_tasks_employee_update_policy ON public.offboarding_tasks
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.offboarding o
      JOIN public.employees e ON e.id = o.employee_id
      WHERE o.id = offboarding_tasks.offboarding_id
      AND e.user_id = auth.uid()
    )
    AND deleted_at IS NULL
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.offboarding o
      JOIN public.employees e ON e.id = o.employee_id
      WHERE o.id = offboarding_tasks.offboarding_id
      AND e.user_id = auth.uid()
    )
  );

-- SELECT: Admin/Super Admin can view all offboarding tasks
CREATE POLICY offboarding_tasks_admin_select_policy ON public.offboarding_tasks
  FOR SELECT
  TO authenticated
  USING (
    user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
    AND deleted_at IS NULL
  );

-- INSERT: Admin/Super Admin can create offboarding tasks
CREATE POLICY offboarding_tasks_admin_insert_policy ON public.offboarding_tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
  );

-- UPDATE: Admin/Super Admin can update offboarding tasks
CREATE POLICY offboarding_tasks_admin_update_policy ON public.offboarding_tasks
  FOR UPDATE
  TO authenticated
  USING (
    user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
    AND deleted_at IS NULL
  )
  WITH CHECK (
    user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
  );

-- DELETE (soft): Admin/Super Admin can soft-delete offboarding tasks
CREATE POLICY offboarding_tasks_admin_delete_policy ON public.offboarding_tasks
  FOR DELETE
  TO authenticated
  USING (
    user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
  );

-- ============================================
-- ONBOARDING_CHECKLISTS TABLE POLICIES
-- ============================================

DROP POLICY IF EXISTS onboarding_checklists_select_policy ON public.onboarding_checklists;
DROP POLICY IF EXISTS onboarding_checklists_insert_policy ON public.onboarding_checklists;
DROP POLICY IF EXISTS onboarding_checklists_update_policy ON public.onboarding_checklists;
DROP POLICY IF EXISTS onboarding_checklists_delete_policy ON public.onboarding_checklists;

-- SELECT: Employees can view their own onboarding checklists, admins can view all
CREATE POLICY onboarding_checklists_select_policy ON public.onboarding_checklists
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = onboarding_checklists.employee_id
      AND e.deleted_at IS NULL
      AND (
        e.user_id = auth.uid()
        OR user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
      )
    )
  );

-- INSERT: Admins can create checklists, or employees for themselves
CREATE POLICY onboarding_checklists_insert_policy ON public.onboarding_checklists
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
    OR EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = onboarding_checklists.employee_id
      AND e.user_id = auth.uid()
      AND e.deleted_at IS NULL
    )
  );

-- UPDATE: Admins can update any, employees can update their own
CREATE POLICY onboarding_checklists_update_policy ON public.onboarding_checklists
  FOR UPDATE
  TO authenticated
  USING (
    user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
    OR EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = onboarding_checklists.employee_id
      AND e.user_id = auth.uid()
      AND e.deleted_at IS NULL
    )
  )
  WITH CHECK (
    user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
    OR EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = onboarding_checklists.employee_id
      AND e.user_id = auth.uid()
      AND e.deleted_at IS NULL
    )
  );

-- ============================================
-- ONBOARDING_TASKS TABLE POLICIES
-- ============================================

DROP POLICY IF EXISTS onboarding_tasks_select_policy ON public.onboarding_tasks;
DROP POLICY IF EXISTS onboarding_tasks_insert_policy ON public.onboarding_tasks;
DROP POLICY IF EXISTS onboarding_tasks_update_policy ON public.onboarding_tasks;
DROP POLICY IF EXISTS onboarding_tasks_delete_policy ON public.onboarding_tasks;

-- SELECT: Users can view tasks for their checklists, admins can view all
CREATE POLICY onboarding_tasks_select_policy ON public.onboarding_tasks
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.onboarding_checklists oc
      JOIN public.employees e ON e.id = oc.employee_id
      WHERE oc.id = onboarding_tasks.checklist_id
      AND e.deleted_at IS NULL
      AND (
        e.user_id = auth.uid()
        OR user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
      )
    )
  );

-- INSERT: Admins can create tasks
CREATE POLICY onboarding_tasks_insert_policy ON public.onboarding_tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
  );

-- UPDATE: Admins can update any task, assignees can update assigned tasks
CREATE POLICY onboarding_tasks_update_policy ON public.onboarding_tasks
  FOR UPDATE
  TO authenticated
  USING (
    user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
    OR assigned_to = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.onboarding_checklists oc
      JOIN public.employees e ON e.id = oc.employee_id
      WHERE oc.id = onboarding_tasks.checklist_id
      AND e.user_id = auth.uid()
      AND e.deleted_at IS NULL
    )
  )
  WITH CHECK (
    user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
    OR assigned_to = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.onboarding_checklists oc
      JOIN public.employees e ON e.id = oc.employee_id
      WHERE oc.id = onboarding_tasks.checklist_id
      AND e.user_id = auth.uid()
      AND e.deleted_at IS NULL
    )
  );

COMMIT;

-- DOWN Migration (run manually if rollback needed)
/*
-- Cannot easily roll back to old role values since they no longer exist in the enum.
-- The old policies referenced 'hr', 'cos', 'ceo' which are no longer valid.
*/
