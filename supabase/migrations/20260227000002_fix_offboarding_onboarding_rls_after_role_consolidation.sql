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
-- OFFBOARDING TABLE POLICIES (only if table exists)
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'offboarding') THEN
    DROP POLICY IF EXISTS offboarding_employee_select_policy ON public.offboarding;
    DROP POLICY IF EXISTS offboarding_admin_select_policy ON public.offboarding;
    DROP POLICY IF EXISTS offboarding_admin_insert_policy ON public.offboarding;
    DROP POLICY IF EXISTS offboarding_admin_update_policy ON public.offboarding;
    DROP POLICY IF EXISTS offboarding_admin_delete_policy ON public.offboarding;

    CREATE POLICY offboarding_employee_select_policy ON public.offboarding
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.employees e
          WHERE e.id = offboarding.employee_id AND e.user_id = auth.uid()
        ) AND deleted_at IS NULL
      );

    CREATE POLICY offboarding_admin_select_policy ON public.offboarding
      FOR SELECT TO authenticated
      USING (
        user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
        AND deleted_at IS NULL
      );

    CREATE POLICY offboarding_admin_insert_policy ON public.offboarding
      FOR INSERT TO authenticated
      WITH CHECK (
        user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
      );

    CREATE POLICY offboarding_admin_update_policy ON public.offboarding
      FOR UPDATE TO authenticated
      USING (
        user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
        AND deleted_at IS NULL
      )
      WITH CHECK (
        user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
      );

    CREATE POLICY offboarding_admin_delete_policy ON public.offboarding
      FOR DELETE TO authenticated
      USING (
        user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
      );
  END IF;
END$$;

-- ============================================
-- OFFBOARDING_TASKS TABLE POLICIES (only if table exists)
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'offboarding_tasks') THEN
    DROP POLICY IF EXISTS offboarding_tasks_employee_select_policy ON public.offboarding_tasks;
    DROP POLICY IF EXISTS offboarding_tasks_employee_update_policy ON public.offboarding_tasks;
    DROP POLICY IF EXISTS offboarding_tasks_admin_select_policy ON public.offboarding_tasks;
    DROP POLICY IF EXISTS offboarding_tasks_admin_insert_policy ON public.offboarding_tasks;
    DROP POLICY IF EXISTS offboarding_tasks_admin_update_policy ON public.offboarding_tasks;
    DROP POLICY IF EXISTS offboarding_tasks_admin_delete_policy ON public.offboarding_tasks;

    CREATE POLICY offboarding_tasks_employee_select_policy ON public.offboarding_tasks
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.offboarding o
          JOIN public.employees e ON e.id = o.employee_id
          WHERE o.id = offboarding_tasks.offboarding_id AND e.user_id = auth.uid()
        ) AND deleted_at IS NULL
      );

    CREATE POLICY offboarding_tasks_employee_update_policy ON public.offboarding_tasks
      FOR UPDATE TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.offboarding o
          JOIN public.employees e ON e.id = o.employee_id
          WHERE o.id = offboarding_tasks.offboarding_id AND e.user_id = auth.uid()
        ) AND deleted_at IS NULL
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.offboarding o
          JOIN public.employees e ON e.id = o.employee_id
          WHERE o.id = offboarding_tasks.offboarding_id AND e.user_id = auth.uid()
        )
      );

    CREATE POLICY offboarding_tasks_admin_select_policy ON public.offboarding_tasks
      FOR SELECT TO authenticated
      USING (
        user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
        AND deleted_at IS NULL
      );

    CREATE POLICY offboarding_tasks_admin_insert_policy ON public.offboarding_tasks
      FOR INSERT TO authenticated
      WITH CHECK (
        user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
      );

    CREATE POLICY offboarding_tasks_admin_update_policy ON public.offboarding_tasks
      FOR UPDATE TO authenticated
      USING (
        user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
        AND deleted_at IS NULL
      )
      WITH CHECK (
        user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
      );

    CREATE POLICY offboarding_tasks_admin_delete_policy ON public.offboarding_tasks
      FOR DELETE TO authenticated
      USING (
        user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
      );
  END IF;
END$$;

-- ============================================
-- ONBOARDING_CHECKLISTS TABLE POLICIES (only if table exists)
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'onboarding_checklists') THEN
    DROP POLICY IF EXISTS onboarding_checklists_select_policy ON public.onboarding_checklists;
    DROP POLICY IF EXISTS onboarding_checklists_insert_policy ON public.onboarding_checklists;
    DROP POLICY IF EXISTS onboarding_checklists_update_policy ON public.onboarding_checklists;
    DROP POLICY IF EXISTS onboarding_checklists_delete_policy ON public.onboarding_checklists;

    CREATE POLICY onboarding_checklists_select_policy ON public.onboarding_checklists
      FOR SELECT TO authenticated
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

    CREATE POLICY onboarding_checklists_insert_policy ON public.onboarding_checklists
      FOR INSERT TO authenticated
      WITH CHECK (
        user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
        OR EXISTS (
          SELECT 1 FROM public.employees e
          WHERE e.id = onboarding_checklists.employee_id
          AND e.user_id = auth.uid()
          AND e.deleted_at IS NULL
        )
      );

    CREATE POLICY onboarding_checklists_update_policy ON public.onboarding_checklists
      FOR UPDATE TO authenticated
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
  END IF;
END$$;

-- ============================================
-- ONBOARDING_TASKS TABLE POLICIES (only if table exists)
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'onboarding_tasks') THEN
    DROP POLICY IF EXISTS onboarding_tasks_select_policy ON public.onboarding_tasks;
    DROP POLICY IF EXISTS onboarding_tasks_insert_policy ON public.onboarding_tasks;
    DROP POLICY IF EXISTS onboarding_tasks_update_policy ON public.onboarding_tasks;
    DROP POLICY IF EXISTS onboarding_tasks_delete_policy ON public.onboarding_tasks;

    CREATE POLICY onboarding_tasks_select_policy ON public.onboarding_tasks
      FOR SELECT TO authenticated
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

    CREATE POLICY onboarding_tasks_insert_policy ON public.onboarding_tasks
      FOR INSERT TO authenticated
      WITH CHECK (
        user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
      );

    CREATE POLICY onboarding_tasks_update_policy ON public.onboarding_tasks
      FOR UPDATE TO authenticated
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
  END IF;
END$$;

COMMIT;

-- DOWN Migration (run manually if rollback needed)
/*
-- Cannot easily roll back to old role values since they no longer exist in the enum.
-- The old policies referenced 'hr', 'cos', 'ceo' which are no longer valid.
*/
