-- Migration: Fix all remaining RLS policies after role consolidation
-- Created: 2026-02-17
-- Description: Update all remaining RLS policies to use consolidated
--   user_role enum values (admin, super_admin) instead of old values
--   (hr, cos, ceo) that were removed in 20260217000005_consolidate_roles.sql
--
-- Affected tables:
--   - internship_programs
--   - internship_applications
--   - performance_cycles
--   - performance_cycle_kpis
--   - performance_evaluations
--   - announcements
--   - resources (categories and files)

BEGIN;

-- ============================================
-- INTERNSHIP TABLES (if they exist)
-- ============================================

-- internship_programs policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'internship_programs') THEN
    DROP POLICY IF EXISTS internship_programs_select_policy ON public.internship_programs;
    DROP POLICY IF EXISTS internship_programs_modify_policy ON public.internship_programs;

    CREATE POLICY internship_programs_select_policy ON public.internship_programs
      FOR SELECT
      TO authenticated
      USING (
        user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
      );

    CREATE POLICY internship_programs_modify_policy ON public.internship_programs
      FOR ALL
      TO authenticated
      USING (
        user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
      )
      WITH CHECK (
        user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
      );
  END IF;
END
$$;

-- internship_applications policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'internship_applications') THEN
    DROP POLICY IF EXISTS internship_applications_select_policy ON public.internship_applications;
    DROP POLICY IF EXISTS internship_applications_insert_policy ON public.internship_applications;
    DROP POLICY IF EXISTS internship_applications_update_own_policy ON public.internship_applications;
    DROP POLICY IF EXISTS internship_applications_update_admin_policy ON public.internship_applications;

    CREATE POLICY internship_applications_select_policy ON public.internship_applications
      FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.onboarding_profiles op
          WHERE op.id = internship_applications.onboarding_profile_id
          AND op.deleted_at IS NULL
          AND (
            op.user_id = auth.uid()
            OR user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
          )
        )
      );

    CREATE POLICY internship_applications_insert_policy ON public.internship_applications
      FOR INSERT
      TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.onboarding_profiles op
          WHERE op.id = internship_applications.onboarding_profile_id
          AND op.deleted_at IS NULL
          AND (
            op.user_id = auth.uid()
            OR user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
          )
        )
      );

    CREATE POLICY internship_applications_update_own_policy ON public.internship_applications
      FOR UPDATE
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.onboarding_profiles op
          WHERE op.id = internship_applications.onboarding_profile_id
          AND op.deleted_at IS NULL
          AND op.user_id = auth.uid()
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.onboarding_profiles op
          WHERE op.id = internship_applications.onboarding_profile_id
          AND op.deleted_at IS NULL
          AND op.user_id = auth.uid()
        )
      );

    CREATE POLICY internship_applications_update_admin_policy ON public.internship_applications
      FOR UPDATE
      TO authenticated
      USING (
        user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
      )
      WITH CHECK (
        user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
      );
  END IF;
END
$$;

-- ============================================
-- PERFORMANCE TABLES (if they exist)
-- ============================================

-- performance_cycles policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'performance_cycles') THEN
    DROP POLICY IF EXISTS performance_cycles_select_policy ON public.performance_cycles;
    DROP POLICY IF EXISTS performance_cycles_admin_all_policy ON public.performance_cycles;

    CREATE POLICY performance_cycles_select_policy ON public.performance_cycles
      FOR SELECT
      TO authenticated
      USING (
        user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
      );

    CREATE POLICY performance_cycles_admin_all_policy ON public.performance_cycles
      FOR ALL
      TO authenticated
      USING (
        user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
      )
      WITH CHECK (
        user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
      );
  END IF;
END
$$;

-- performance_cycle_kpis policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'performance_cycle_kpis') THEN
    DROP POLICY IF EXISTS performance_cycle_kpis_select_policy ON public.performance_cycle_kpis;
    DROP POLICY IF EXISTS performance_cycle_kpis_insert_policy ON public.performance_cycle_kpis;
    DROP POLICY IF EXISTS performance_cycle_kpis_update_policy ON public.performance_cycle_kpis;
    DROP POLICY IF EXISTS performance_cycle_kpis_delete_policy ON public.performance_cycle_kpis;

    CREATE POLICY performance_cycle_kpis_select_policy ON public.performance_cycle_kpis
      FOR SELECT
      TO authenticated
      USING (
        employee_id = auth.uid()
        OR user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
      );

    CREATE POLICY performance_cycle_kpis_insert_policy ON public.performance_cycle_kpis
      FOR INSERT
      TO authenticated
      WITH CHECK (
        user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
      );

    CREATE POLICY performance_cycle_kpis_update_policy ON public.performance_cycle_kpis
      FOR UPDATE
      TO authenticated
      USING (
        employee_id = auth.uid()
        OR user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
      )
      WITH CHECK (
        employee_id = auth.uid()
        OR user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
      );

    CREATE POLICY performance_cycle_kpis_delete_policy ON public.performance_cycle_kpis
      FOR DELETE
      TO authenticated
      USING (
        user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
      );
  END IF;
END
$$;

-- performance_evaluations policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'performance_evaluations') THEN
    DROP POLICY IF EXISTS performance_evaluations_select_policy ON public.performance_evaluations;
    DROP POLICY IF EXISTS performance_evaluations_insert_policy ON public.performance_evaluations;
    DROP POLICY IF EXISTS performance_evaluations_update_policy ON public.performance_evaluations;
    DROP POLICY IF EXISTS performance_evaluations_delete_policy ON public.performance_evaluations;

    CREATE POLICY performance_evaluations_select_policy ON public.performance_evaluations
      FOR SELECT
      TO authenticated
      USING (
        employee_id = auth.uid()
        OR user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
      );

    CREATE POLICY performance_evaluations_insert_policy ON public.performance_evaluations
      FOR INSERT
      TO authenticated
      WITH CHECK (
        employee_id = auth.uid()
        OR user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
      );

    CREATE POLICY performance_evaluations_update_policy ON public.performance_evaluations
      FOR UPDATE
      TO authenticated
      USING (
        employee_id = auth.uid()
        OR user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
      )
      WITH CHECK (
        employee_id = auth.uid()
        OR user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
      );

    CREATE POLICY performance_evaluations_delete_policy ON public.performance_evaluations
      FOR DELETE
      TO authenticated
      USING (
        user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
      );
  END IF;
END
$$;

-- ============================================
-- RESOURCES TABLES (if they exist)
-- ============================================

-- resource_categories policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'resource_categories') THEN
    DROP POLICY IF EXISTS resource_categories_select_policy ON public.resource_categories;
    DROP POLICY IF EXISTS resource_categories_modify_policy ON public.resource_categories;

    CREATE POLICY resource_categories_select_policy ON public.resource_categories
      FOR SELECT
      TO authenticated
      USING (true);

    CREATE POLICY resource_categories_modify_policy ON public.resource_categories
      FOR ALL
      TO authenticated
      USING (
        user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
      )
      WITH CHECK (
        user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
      );
  END IF;
END
$$;

-- resources policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'resources') THEN
    DROP POLICY IF EXISTS resources_select_policy ON public.resources;
    DROP POLICY IF EXISTS resources_admin_all_policy ON public.resources;

    CREATE POLICY resources_select_policy ON public.resources
      FOR SELECT
      TO authenticated
      USING (
        status = 'published'
        OR user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
      );

    CREATE POLICY resources_admin_all_policy ON public.resources
      FOR ALL
      TO authenticated
      USING (
        user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
      )
      WITH CHECK (
        user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
      );
  END IF;
END
$$;

-- ============================================
-- RESOURCE_ACCESSES (If exists)
-- ============================================
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'resource_accesses') THEN
    DROP POLICY IF EXISTS resource_accesses_select_policy ON public.resource_accesses;
    DROP POLICY IF EXISTS resource_accesses_insert_policy ON public.resource_accesses;

    CREATE POLICY resource_accesses_select_policy ON public.resource_accesses
      FOR SELECT
      TO authenticated
      USING (
        user_id = auth.uid()
        OR user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
      );

    CREATE POLICY resource_accesses_insert_policy ON public.resource_accesses
      FOR INSERT
      TO authenticated
      WITH CHECK (
        user_id = auth.uid()
        OR user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
      );
  END IF;
END
$$;

COMMIT;

-- DOWN Migration (run manually if rollback needed)
/*
BEGIN;

-- Restore old policies with old role names
-- (This would fail because hr, cos, ceo no longer exist in user_role enum)

COMMIT;
*/
