-- ============================================
-- Migration: Restore Missing RLS Policies After Role Consolidation
-- Created: 2026-02-18
-- Description: The consolidation migration (20260217000005) dropped ALL policies
--   on ALL public tables but only recreated policies for:
--     users, invoices, announcements, onboarding_profiles, onboarding_documents,
--     internship_programs, internship_applications, performance_cycles,
--     performance_cycle_kpis, performance_evaluations, resource_categories,
--     resources, resource_accesses
--   This migration restores the missing policies for:
--     employees, departments, documents, audit_logs, internships, intern_daily_logs
--   Also fixes user_is_admin() and drops stale storage policies.
--
-- Consolidated roles: employee, intern, admin, super_admin
-- ============================================

BEGIN;

-- ============================================
-- 1. EMPLOYEES TABLE
-- ============================================

-- Employees can view their own record
CREATE POLICY "employees_select_own_policy" ON public.employees
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND deleted_at IS NULL);

-- Admin and super_admin can view all employees
CREATE POLICY "employees_select_admin_policy" ON public.employees
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role IN ('admin', 'super_admin')
        AND u.deleted_at IS NULL
    )
    AND deleted_at IS NULL
  );

-- Admin and super_admin can insert employees
CREATE POLICY "employees_insert_admin_policy" ON public.employees
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role IN ('admin', 'super_admin')
        AND u.deleted_at IS NULL
    )
  );

-- Admin and super_admin can update employees
CREATE POLICY "employees_update_admin_policy" ON public.employees
  FOR UPDATE TO authenticated
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

-- Employees can update their own non-sensitive fields
CREATE POLICY "employees_update_own_policy" ON public.employees
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND deleted_at IS NULL)
  WITH CHECK (user_id = auth.uid() AND deleted_at IS NULL);

-- Admin and super_admin can delete employees (soft delete)
CREATE POLICY "employees_delete_admin_policy" ON public.employees
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role IN ('admin', 'super_admin')
        AND u.deleted_at IS NULL
    )
  );

-- ============================================
-- 2. DEPARTMENTS TABLE
-- ============================================

-- All authenticated users can view non-deleted departments
CREATE POLICY "departments_select_policy" ON public.departments
  FOR SELECT TO authenticated
  USING (deleted_at IS NULL);

-- Admin/super_admin can insert departments
CREATE POLICY "departments_insert_admin_policy" ON public.departments
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role IN ('admin', 'super_admin')
        AND u.deleted_at IS NULL
    )
  );

-- Admin/super_admin can update departments
CREATE POLICY "departments_update_admin_policy" ON public.departments
  FOR UPDATE TO authenticated
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

-- Admin/super_admin can delete departments
CREATE POLICY "departments_delete_admin_policy" ON public.departments
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role IN ('admin', 'super_admin')
        AND u.deleted_at IS NULL
    )
  );

-- ============================================
-- 3. AUDIT_LOGS TABLE
-- ============================================

-- Admin/super_admin can view all audit logs
CREATE POLICY "audit_logs_select_admin_policy" ON public.audit_logs
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role IN ('admin', 'super_admin')
        AND u.deleted_at IS NULL
    )
  );

-- Authenticated users can insert audit logs (all roles can create audit entries)
CREATE POLICY "audit_logs_insert_policy" ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- ============================================
-- 4. DOCUMENTS TABLE
-- ============================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'documents') THEN
    -- Users can view their own documents
    CREATE POLICY "documents_select_own_policy" ON public.documents
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.employees e
          WHERE e.id = documents.employee_id
            AND e.user_id = auth.uid()
            AND e.deleted_at IS NULL
        )
        AND deleted_at IS NULL
      );

    -- Admin/super_admin can view all documents
    CREATE POLICY "documents_select_admin_policy" ON public.documents
      FOR SELECT TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.users u
          WHERE u.id = auth.uid()
            AND u.role IN ('admin', 'super_admin')
            AND u.deleted_at IS NULL
        )
        AND deleted_at IS NULL
      );

    -- Admin/super_admin can insert documents
    CREATE POLICY "documents_insert_admin_policy" ON public.documents
      FOR INSERT TO authenticated
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.users u
          WHERE u.id = auth.uid()
            AND u.role IN ('admin', 'super_admin')
            AND u.deleted_at IS NULL
        )
      );

    -- Admin/super_admin can update documents
    CREATE POLICY "documents_update_admin_policy" ON public.documents
      FOR UPDATE TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.users u
          WHERE u.id = auth.uid()
            AND u.role IN ('admin', 'super_admin')
            AND u.deleted_at IS NULL
        )
      );

    -- Admin/super_admin can delete documents
    CREATE POLICY "documents_delete_admin_policy" ON public.documents
      FOR DELETE TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.users u
          WHERE u.id = auth.uid()
            AND u.role IN ('admin', 'super_admin')
            AND u.deleted_at IS NULL
        )
      );
  END IF;
END$$;

-- ============================================
-- 5. INTERNSHIPS TABLE - re-create if missing
-- ============================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'internships') THEN
    -- Check if policies are missing (consolidation may have dropped them)
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'internships'
    ) THEN
      -- Interns can view their own internship
      CREATE POLICY "internships_select_own_policy" ON public.internships
        FOR SELECT TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM public.employees e
            WHERE e.id = internships.employee_id
              AND e.user_id = auth.uid()
              AND e.deleted_at IS NULL
          )
        );

      -- Admin/super_admin can do everything with internships
      CREATE POLICY "internships_admin_all_policy" ON public.internships
        FOR ALL TO authenticated
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
    END IF;
  END IF;
END$$;

-- ============================================
-- 6. INTERN_DAILY_LOGS TABLE - re-create if missing
-- ============================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'intern_daily_logs') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'intern_daily_logs'
    ) THEN
      -- Interns can view and insert their own logs
      CREATE POLICY "intern_daily_logs_own_policy" ON public.intern_daily_logs
        FOR ALL TO authenticated
        USING (
          EXISTS (
            SELECT 1 FROM public.internships i
            JOIN public.employees e ON e.id = i.employee_id
            WHERE i.id = intern_daily_logs.internship_id
              AND e.user_id = auth.uid()
              AND e.deleted_at IS NULL
          )
        )
        WITH CHECK (
          EXISTS (
            SELECT 1 FROM public.internships i
            JOIN public.employees e ON e.id = i.employee_id
            WHERE i.id = intern_daily_logs.internship_id
              AND e.user_id = auth.uid()
              AND e.deleted_at IS NULL
          )
        );

      -- Admin/super_admin can do everything with intern logs
      CREATE POLICY "intern_daily_logs_admin_policy" ON public.intern_daily_logs
        FOR ALL TO authenticated
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
    END IF;
  END IF;
END$$;

-- ============================================
-- 7. Fix user_is_admin() to include super_admin
-- ============================================

CREATE OR REPLACE FUNCTION public.user_is_admin(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = user_id
      AND role IN ('admin', 'super_admin')
      AND status = 'active'
  );
END;
$$;

-- ============================================
-- 8. Drop OLD storage policies that reference invalid enum values
--    These survived the consolidation (only public+auth schemas were cleaned)
-- ============================================
-- Old policies from 20260211000002 use names like '*_storage_*' whereas
-- new policies from 20260218000002 use names without '_storage_'

DROP POLICY IF EXISTS "resources_library_storage_select_policy" ON storage.objects;
DROP POLICY IF EXISTS "resources_library_storage_insert_policy" ON storage.objects;
DROP POLICY IF EXISTS "resources_library_storage_update_policy" ON storage.objects;
DROP POLICY IF EXISTS "resources_library_storage_delete_policy" ON storage.objects;
DROP POLICY IF EXISTS "resource_thumbnails_storage_select_policy" ON storage.objects;
DROP POLICY IF EXISTS "resource_thumbnails_storage_insert_policy" ON storage.objects;
DROP POLICY IF EXISTS "resource_thumbnails_storage_update_policy" ON storage.objects;
DROP POLICY IF EXISTS "resource_thumbnails_storage_delete_policy" ON storage.objects;

COMMIT;
