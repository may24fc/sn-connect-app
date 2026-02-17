-- Migration: Consolidate User Roles
-- Created: 2026-02-17
-- Description: Simplifies the role system from 7 roles to 4 roles
--              hr + admin -> admin
--              cos + ceo -> super_admin
--              Keeps: employee, intern
--
-- Final roles: employee, intern, admin, super_admin
--
-- IMPORTANT: This migration does NOT use BEGIN/COMMIT because Supabase's
-- migration runner handles transactions automatically. Adding explicit
-- transaction control causes nested transaction issues.
--
-- The correct ordering for enum replacement in PostgreSQL is:
--   1. Drop ALL RLS policies (they reference users.role column)
--   2. Drop helper functions whose signatures use the user_role type
--   3. Drop column defaults referencing the old enum
--   4. Create the new enum type
--   5. Alter the column type to use the new enum
--   6. Drop old enum, rename new enum
--   7. Update data (migrate old role values to new values)
--   8. Restore column defaults
--   9. Recreate helper functions with the new enum type
--  10. Re-enable RLS and recreate all policies

-- ============================================
-- STEP 1: Drop ALL RLS policies on ALL public tables
-- ============================================
-- PostgreSQL will not allow ALTER COLUMN TYPE on a column that is
-- referenced by any policy definition, even indirectly via subqueries.
-- We must drop every policy first.
DO $$
DECLARE
    pol record;
BEGIN
    FOR pol IN
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
            pol.policyname, pol.schemaname, pol.tablename);
    END LOOP;
END$$;

-- ============================================
-- STEP 2: Disable RLS on all public tables temporarily
-- ============================================
DO $$
DECLARE
    tbl record;
BEGIN
    FOR tbl IN
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
    LOOP
        EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', tbl.tablename);
    END LOOP;
END$$;

-- ============================================
-- STEP 3: Drop helper functions that depend on user_role type
-- ============================================
-- These functions have user_role in their parameter or return types,
-- which creates a dependency that prevents DROP TYPE user_role.
-- CASCADE is required to drop any remaining dependent objects.
DROP FUNCTION IF EXISTS public.user_has_role(uuid, user_role) CASCADE;
DROP FUNCTION IF EXISTS public.user_has_any_role(uuid, user_role[]) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_role(uuid) CASCADE;

-- ============================================
-- STEP 4: Drop column default referencing old enum
-- ============================================
ALTER TABLE public.users ALTER COLUMN role DROP DEFAULT;

-- ============================================
-- STEP 5: Create new simplified enum type
-- ============================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_role_new') THEN
        CREATE TYPE user_role_new AS ENUM (
          'employee',
          'intern',
          'admin',
          'super_admin'
        );
    END IF;
END$$;

-- ============================================
-- STEP 6: Alter the column type from old enum to new enum
-- ============================================
-- Map old roles to new roles during the type conversion:
--   hr -> admin (keep as admin)
--   cos -> super_admin
--   ceo -> super_admin
--   admin -> admin
--   super_admin -> super_admin
--   employee -> employee
--   intern -> intern
ALTER TABLE public.users
  ALTER COLUMN role TYPE user_role_new
  USING (
    CASE role::text
      WHEN 'hr' THEN 'admin'
      WHEN 'cos' THEN 'super_admin'
      WHEN 'ceo' THEN 'super_admin'
      ELSE role::text
    END
  )::user_role_new;

-- ============================================
-- STEP 7: Drop old enum and rename new one
-- ============================================
DROP TYPE IF EXISTS user_role;
ALTER TYPE user_role_new RENAME TO user_role;

-- ============================================
-- STEP 8: Restore column default
-- ============================================
ALTER TABLE public.users ALTER COLUMN role SET DEFAULT 'employee'::user_role;

-- ============================================
-- STEP 9: Recreate helper functions with the new user_role type
-- ============================================

CREATE OR REPLACE FUNCTION public.user_has_role(user_id uuid, required_role user_role)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = user_id
    AND role = required_role
    AND deleted_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.user_has_role(uuid, user_role) IS 'Check if a user has a specific role';

CREATE OR REPLACE FUNCTION public.user_has_any_role(user_id uuid, required_roles user_role[])
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = user_id
    AND role = ANY(required_roles)
    AND deleted_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.user_has_any_role(uuid, user_role[]) IS 'Check if a user has any of the specified roles';

CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS user_role AS $$
  SELECT role FROM public.users
  WHERE id = user_id
  AND deleted_at IS NULL;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.get_user_role(uuid) IS 'Get the role of a specific user';

-- ============================================
-- STEP 10: Re-enable RLS on ALL tables
-- ============================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.users FORCE ROW LEVEL SECURITY;

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees FORCE ROW LEVEL SECURITY;

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents FORCE ROW LEVEL SECURITY;

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments FORCE ROW LEVEL SECURITY;

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs FORCE ROW LEVEL SECURITY;

ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reports FORCE ROW LEVEL SECURITY;

ALTER TABLE public.report_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_metrics FORCE ROW LEVEL SECURITY;

ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices FORCE ROW LEVEL SECURITY;

ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_line_items FORCE ROW LEVEL SECURITY;

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks FORCE ROW LEVEL SECURITY;

ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_comments FORCE ROW LEVEL SECURITY;

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements FORCE ROW LEVEL SECURITY;

ALTER TABLE public.announcement_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_attachments FORCE ROW LEVEL SECURITY;

ALTER TABLE public.announcement_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_reads FORCE ROW LEVEL SECURITY;

ALTER TABLE public.announcement_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_comments FORCE ROW LEVEL SECURITY;

ALTER TABLE public.onboarding_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_checklists FORCE ROW LEVEL SECURITY;

ALTER TABLE public.onboarding_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_tasks FORCE ROW LEVEL SECURITY;

ALTER TABLE public.onboarding_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_profiles FORCE ROW LEVEL SECURITY;

ALTER TABLE public.onboarding_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.onboarding_documents FORCE ROW LEVEL SECURITY;

ALTER TABLE public.offboarding ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offboarding FORCE ROW LEVEL SECURITY;

ALTER TABLE public.offboarding_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offboarding_tasks FORCE ROW LEVEL SECURITY;

ALTER TABLE public.review_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.review_cycles FORCE ROW LEVEL SECURITY;

ALTER TABLE public.performance_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.performance_reviews FORCE ROW LEVEL SECURITY;

ALTER TABLE public.okrs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.okrs FORCE ROW LEVEL SECURITY;

ALTER TABLE public.kpis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpis FORCE ROW LEVEL SECURITY;

ALTER TABLE public.internships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.internships FORCE ROW LEVEL SECURITY;

ALTER TABLE public.intern_daily_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intern_daily_logs FORCE ROW LEVEL SECURITY;

ALTER TABLE public.resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resources FORCE ROW LEVEL SECURITY;

ALTER TABLE public.resource_collections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_collections FORCE ROW LEVEL SECURITY;

ALTER TABLE public.collection_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_resources FORCE ROW LEVEL SECURITY;

ALTER TABLE public.resource_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_bookmarks FORCE ROW LEVEL SECURITY;

ALTER TABLE public.resource_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_views FORCE ROW LEVEL SECURITY;

-- ============================================
-- STEP 11: Recreate ALL RLS policies with consolidated roles
-- ============================================

-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- USERS table policies
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

-- Users can view their own record
CREATE POLICY "users_select_self_policy" ON public.users
  FOR SELECT
  TO authenticated
  USING (
    id = auth.uid()
    AND deleted_at IS NULL
  );

-- Admin/super_admin can view all users
CREATE POLICY "users_select_admin_all_policy" ON public.users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'super_admin')
      AND u.deleted_at IS NULL
    )
    AND deleted_at IS NULL
  );

-- Admin/super_admin can insert users
CREATE POLICY "users_insert_admin_policy" ON public.users
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
      AND users.deleted_at IS NULL
    )
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

-- Only super_admin can delete users
CREATE POLICY "users_delete_admin_policy" ON public.users
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
      AND users.deleted_at IS NULL
    )
  );

-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- EMPLOYEES table policies
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

-- Employees can view their own data
CREATE POLICY "employees_select_own_policy" ON public.employees
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() AND deleted_at IS NULL
  );

-- Managers can view their direct reports
CREATE POLICY "employees_select_reports_policy" ON public.employees
  FOR SELECT
  TO authenticated
  USING (
    immediate_head = auth.uid() AND deleted_at IS NULL
  );

-- Admin/super_admin can view all employees
CREATE POLICY "employees_select_admin_policy" ON public.employees
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
      AND users.deleted_at IS NULL
    )
    AND employees.deleted_at IS NULL
  );

-- Admin/super_admin can insert employees
CREATE POLICY "employees_insert_admin_policy" ON public.employees
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
      AND users.deleted_at IS NULL
    )
  );

-- Admin/super_admin can update employees
CREATE POLICY "employees_update_admin_policy" ON public.employees
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
      AND users.deleted_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
      AND users.deleted_at IS NULL
    )
  );

-- Only super_admin can delete employees
CREATE POLICY "employees_delete_admin_policy" ON public.employees
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
      AND users.deleted_at IS NULL
    )
  );

-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- DOCUMENTS table policies
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

-- Employees can view their own documents
CREATE POLICY "documents_select_own_policy" ON public.documents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.employees
      WHERE employees.id = documents.employee_id
      AND employees.user_id = auth.uid()
      AND employees.deleted_at IS NULL
    )
    AND documents.deleted_at IS NULL
  );

-- Admin/super_admin can view all documents
CREATE POLICY "documents_select_admin_policy" ON public.documents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
      AND users.deleted_at IS NULL
    )
    AND documents.deleted_at IS NULL
  );

-- Admin/super_admin can insert documents
CREATE POLICY "documents_insert_admin_policy" ON public.documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
      AND users.deleted_at IS NULL
    )
  );

-- Admin/super_admin can update documents
CREATE POLICY "documents_update_admin_policy" ON public.documents
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
      AND users.deleted_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
      AND users.deleted_at IS NULL
    )
  );

-- Only super_admin can delete documents
CREATE POLICY "documents_delete_admin_policy" ON public.documents
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
      AND users.deleted_at IS NULL
    )
  );

-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- DEPARTMENTS table policies
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

-- All authenticated users can view departments
CREATE POLICY "departments_select_policy" ON public.departments
  FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

-- Admin/super_admin can manage departments
CREATE POLICY "departments_insert_admin_policy" ON public.departments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
      AND users.deleted_at IS NULL
    )
  );

CREATE POLICY "departments_update_admin_policy" ON public.departments
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
      AND users.deleted_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
      AND users.deleted_at IS NULL
    )
  );

CREATE POLICY "departments_delete_admin_policy" ON public.departments
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'super_admin'
      AND users.deleted_at IS NULL
    )
  );

-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- AUDIT_LOGS table policies
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

-- Admin/super_admin can view audit logs
CREATE POLICY "audit_logs_select_admin_policy" ON public.audit_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
      AND users.deleted_at IS NULL
    )
  );

-- Allow system inserts (triggers)
CREATE POLICY "audit_logs_insert_policy" ON public.audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- INVOICES table policies
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

-- Employees can view their own invoices
CREATE POLICY "invoices_select_own_policy" ON public.invoices
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.employees
      WHERE employees.id = invoices.employee_id
      AND employees.user_id = auth.uid()
      AND employees.deleted_at IS NULL
    )
    AND invoices.deleted_at IS NULL
  );

-- Managers can view direct report invoices
CREATE POLICY "invoices_select_reports_policy" ON public.invoices
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.employees
      WHERE employees.id = invoices.employee_id
      AND employees.immediate_head = auth.uid()
      AND employees.deleted_at IS NULL
    )
    AND invoices.deleted_at IS NULL
  );

-- Admin/super_admin can view all invoices
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

-- Employees can create invoices for themselves, admins for anyone
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

-- Employees can update own invoices, admins can update any
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

-- Admin/super_admin can delete invoices
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

-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- INVOICE_LINE_ITEMS table policies
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

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

-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- REPORTS table policies
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

-- Employees can view their own reports
CREATE POLICY "reports_select_own_policy" ON public.reports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.employees
      WHERE employees.id = reports.employee_id
      AND employees.user_id = auth.uid()
      AND employees.deleted_at IS NULL
    )
    AND reports.deleted_at IS NULL
  );

-- Managers can view direct report reports
CREATE POLICY "reports_select_reports_policy" ON public.reports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.employees
      WHERE employees.id = reports.employee_id
      AND employees.immediate_head = auth.uid()
      AND employees.deleted_at IS NULL
    )
    AND reports.deleted_at IS NULL
  );

-- Admin/super_admin can view all reports
CREATE POLICY "reports_select_admin_policy" ON public.reports
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
      AND users.deleted_at IS NULL
    )
    AND reports.deleted_at IS NULL
  );

-- Employees and admins can insert reports
CREATE POLICY "reports_insert_policy" ON public.reports
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      EXISTS (
        SELECT 1 FROM public.employees
        WHERE employees.id = reports.employee_id
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

-- Employees and admins can update reports
CREATE POLICY "reports_update_policy" ON public.reports
  FOR UPDATE
  TO authenticated
  USING (
    (
      EXISTS (
        SELECT 1 FROM public.employees
        WHERE employees.id = reports.employee_id
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
        WHERE employees.id = reports.employee_id
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

-- Only admins can delete reports
CREATE POLICY "reports_delete_policy" ON public.reports
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

-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- REPORT_METRICS table policies
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

CREATE POLICY "report_metrics_select_policy" ON public.report_metrics
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.reports
      WHERE reports.id = report_metrics.report_id
      AND reports.deleted_at IS NULL
      AND (
        EXISTS (
          SELECT 1 FROM public.employees
          WHERE employees.id = reports.employee_id
          AND employees.user_id = auth.uid()
          AND employees.deleted_at IS NULL
        )
        OR EXISTS (
          SELECT 1 FROM public.employees
          WHERE employees.id = reports.employee_id
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

CREATE POLICY "report_metrics_insert_policy" ON public.report_metrics
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.reports
      WHERE reports.id = report_metrics.report_id
      AND reports.deleted_at IS NULL
      AND (
        EXISTS (
          SELECT 1 FROM public.employees
          WHERE employees.id = reports.employee_id
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

CREATE POLICY "report_metrics_update_policy" ON public.report_metrics
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.reports
      WHERE reports.id = report_metrics.report_id
      AND reports.deleted_at IS NULL
      AND (
        EXISTS (
          SELECT 1 FROM public.employees
          WHERE employees.id = reports.employee_id
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
      SELECT 1 FROM public.reports
      WHERE reports.id = report_metrics.report_id
      AND reports.deleted_at IS NULL
      AND (
        EXISTS (
          SELECT 1 FROM public.employees
          WHERE employees.id = reports.employee_id
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

CREATE POLICY "report_metrics_delete_policy" ON public.report_metrics
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.reports
      JOIN public.users ON users.id = auth.uid()
      WHERE reports.id = report_metrics.report_id
      AND users.role IN ('admin', 'super_admin')
      AND users.deleted_at IS NULL
    )
  );

-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- TASKS table policies
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

-- Users can view tasks assigned to them
CREATE POLICY "tasks_select_own_policy" ON public.tasks
  FOR SELECT
  TO authenticated
  USING (
    (assigned_to = auth.uid() OR created_by = auth.uid())
    AND deleted_at IS NULL
  );

-- Managers can view tasks for their reports
CREATE POLICY "tasks_select_reports_policy" ON public.tasks
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.employees
      WHERE employees.user_id = tasks.assigned_to
      AND employees.immediate_head = auth.uid()
      AND employees.deleted_at IS NULL
    )
    AND tasks.deleted_at IS NULL
  );

-- Admin/super_admin can view all tasks
CREATE POLICY "tasks_select_admin_policy" ON public.tasks
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
      AND users.deleted_at IS NULL
    )
    AND tasks.deleted_at IS NULL
  );

-- Any authenticated user can create tasks
CREATE POLICY "tasks_insert_policy" ON public.tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Task creators/assignees and admins can update
CREATE POLICY "tasks_update_policy" ON public.tasks
  FOR UPDATE
  TO authenticated
  USING (
    (assigned_to = auth.uid() OR created_by = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
      AND users.deleted_at IS NULL
    )
  )
  WITH CHECK (
    (assigned_to = auth.uid() OR created_by = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
      AND users.deleted_at IS NULL
    )
  );

-- Admin/super_admin can delete tasks
CREATE POLICY "tasks_delete_policy" ON public.tasks
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

-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- TASK_COMMENTS table policies
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

-- Users can view comments on tasks they can see
CREATE POLICY "task_comments_select_policy" ON public.task_comments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks
      WHERE tasks.id = task_comments.task_id
      AND tasks.deleted_at IS NULL
      AND (
        tasks.assigned_to = auth.uid()
        OR tasks.created_by = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.users
          WHERE users.id = auth.uid()
          AND users.role IN ('admin', 'super_admin')
          AND users.deleted_at IS NULL
        )
      )
    )
  );

-- Authenticated users can insert comments
CREATE POLICY "task_comments_insert_policy" ON public.task_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- ANNOUNCEMENTS table policies
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

-- All authenticated users can view published announcements
CREATE POLICY "announcements_select_policy" ON public.announcements
  FOR SELECT
  TO authenticated
  USING (
    (status = 'published' AND deleted_at IS NULL)
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
      AND users.deleted_at IS NULL
    )
  );

-- Admin/super_admin can manage announcements
CREATE POLICY "announcements_insert_admin_policy" ON public.announcements
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
      AND users.deleted_at IS NULL
    )
  );

CREATE POLICY "announcements_update_admin_policy" ON public.announcements
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
      AND users.deleted_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
      AND users.deleted_at IS NULL
    )
  );

CREATE POLICY "announcements_delete_admin_policy" ON public.announcements
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

-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- ANNOUNCEMENT_ATTACHMENTS table policies
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

CREATE POLICY "announcement_attachments_select_policy" ON public.announcement_attachments
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "announcement_attachments_insert_policy" ON public.announcement_attachments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
      AND users.deleted_at IS NULL
    )
  );

-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- ANNOUNCEMENT_READS table policies
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

CREATE POLICY "announcement_reads_select_policy" ON public.announcement_reads
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "announcement_reads_insert_policy" ON public.announcement_reads
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- ANNOUNCEMENT_COMMENTS table policies
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

CREATE POLICY "announcement_comments_select_policy" ON public.announcement_comments
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "announcement_comments_insert_policy" ON public.announcement_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- ONBOARDING tables policies
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

-- Onboarding checklists - admin can manage, employees can view own
CREATE POLICY "onboarding_checklists_select_policy" ON public.onboarding_checklists
  FOR SELECT
  TO authenticated
  USING (
    employee_id IN (
      SELECT id FROM public.employees WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
      AND users.deleted_at IS NULL
    )
  );

CREATE POLICY "onboarding_checklists_insert_policy" ON public.onboarding_checklists
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
      AND users.deleted_at IS NULL
    )
  );

CREATE POLICY "onboarding_checklists_update_policy" ON public.onboarding_checklists
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
      AND users.deleted_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
      AND users.deleted_at IS NULL
    )
  );

-- Onboarding tasks
CREATE POLICY "onboarding_tasks_select_policy" ON public.onboarding_tasks
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "onboarding_tasks_insert_policy" ON public.onboarding_tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
      AND users.deleted_at IS NULL
    )
  );

CREATE POLICY "onboarding_tasks_update_policy" ON public.onboarding_tasks
  FOR UPDATE
  TO authenticated
  USING (
    assigned_to = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
      AND users.deleted_at IS NULL
    )
  )
  WITH CHECK (
    assigned_to = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
      AND users.deleted_at IS NULL
    )
  );

-- Onboarding profiles
CREATE POLICY "onboarding_profiles_select_own_policy" ON public.onboarding_profiles
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "onboarding_profiles_select_admin_policy" ON public.onboarding_profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
      AND users.deleted_at IS NULL
    )
  );

CREATE POLICY "onboarding_profiles_insert_policy" ON public.onboarding_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
      AND users.deleted_at IS NULL
    )
  );

CREATE POLICY "onboarding_profiles_update_policy" ON public.onboarding_profiles
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
      AND users.deleted_at IS NULL
    )
  )
  WITH CHECK (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
      AND users.deleted_at IS NULL
    )
  );

-- Onboarding documents
CREATE POLICY "onboarding_documents_select_own_policy" ON public.onboarding_documents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.onboarding_profiles
      WHERE onboarding_profiles.id = onboarding_documents.profile_id
      AND onboarding_profiles.user_id = auth.uid()
    )
  );

CREATE POLICY "onboarding_documents_select_admin_policy" ON public.onboarding_documents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
      AND users.deleted_at IS NULL
    )
  );

CREATE POLICY "onboarding_documents_insert_policy" ON public.onboarding_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.onboarding_profiles
      WHERE onboarding_profiles.id = onboarding_documents.profile_id
      AND onboarding_profiles.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
      AND users.deleted_at IS NULL
    )
  );

CREATE POLICY "onboarding_documents_update_policy" ON public.onboarding_documents
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.onboarding_profiles
      WHERE onboarding_profiles.id = onboarding_documents.profile_id
      AND onboarding_profiles.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
      AND users.deleted_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.onboarding_profiles
      WHERE onboarding_profiles.id = onboarding_documents.profile_id
      AND onboarding_profiles.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
      AND users.deleted_at IS NULL
    )
  );

-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- OFFBOARDING tables policies
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

CREATE POLICY "offboarding_select_policy" ON public.offboarding
  FOR SELECT
  TO authenticated
  USING (
    employee_id IN (
      SELECT id FROM public.employees WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
      AND users.deleted_at IS NULL
    )
  );

CREATE POLICY "offboarding_insert_policy" ON public.offboarding
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
      AND users.deleted_at IS NULL
    )
  );

CREATE POLICY "offboarding_update_policy" ON public.offboarding
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
      AND users.deleted_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
      AND users.deleted_at IS NULL
    )
  );

CREATE POLICY "offboarding_tasks_select_policy" ON public.offboarding_tasks
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "offboarding_tasks_insert_policy" ON public.offboarding_tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
      AND users.deleted_at IS NULL
    )
  );

CREATE POLICY "offboarding_tasks_update_policy" ON public.offboarding_tasks
  FOR UPDATE
  TO authenticated
  USING (
    assigned_to = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
      AND users.deleted_at IS NULL
    )
  )
  WITH CHECK (
    assigned_to = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
      AND users.deleted_at IS NULL
    )
  );

-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- PERFORMANCE tables policies
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

-- Review cycles - viewable by all, managed by admins
CREATE POLICY "review_cycles_select_policy" ON public.review_cycles
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "review_cycles_insert_policy" ON public.review_cycles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
      AND users.deleted_at IS NULL
    )
  );

CREATE POLICY "review_cycles_update_policy" ON public.review_cycles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
      AND users.deleted_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
      AND users.deleted_at IS NULL
    )
  );

-- Performance reviews
CREATE POLICY "performance_reviews_select_own_policy" ON public.performance_reviews
  FOR SELECT
  TO authenticated
  USING (
    employee_id IN (
      SELECT id FROM public.employees WHERE user_id = auth.uid()
    )
    OR reviewer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
      AND users.deleted_at IS NULL
    )
  );

CREATE POLICY "performance_reviews_insert_policy" ON public.performance_reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
      AND users.deleted_at IS NULL
    )
  );

CREATE POLICY "performance_reviews_update_policy" ON public.performance_reviews
  FOR UPDATE
  TO authenticated
  USING (
    reviewer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
      AND users.deleted_at IS NULL
    )
  )
  WITH CHECK (
    reviewer_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
      AND users.deleted_at IS NULL
    )
  );

-- OKRs
CREATE POLICY "okrs_select_policy" ON public.okrs
  FOR SELECT
  TO authenticated
  USING (
    employee_id IN (
      SELECT id FROM public.employees WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
      AND users.deleted_at IS NULL
    )
  );

CREATE POLICY "okrs_insert_policy" ON public.okrs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id IN (
      SELECT id FROM public.employees WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
      AND users.deleted_at IS NULL
    )
  );

CREATE POLICY "okrs_update_policy" ON public.okrs
  FOR UPDATE
  TO authenticated
  USING (
    employee_id IN (
      SELECT id FROM public.employees WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
      AND users.deleted_at IS NULL
    )
  )
  WITH CHECK (
    employee_id IN (
      SELECT id FROM public.employees WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
      AND users.deleted_at IS NULL
    )
  );

-- KPIs
CREATE POLICY "kpis_select_policy" ON public.kpis
  FOR SELECT
  TO authenticated
  USING (
    employee_id IN (
      SELECT id FROM public.employees WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
      AND users.deleted_at IS NULL
    )
  );

CREATE POLICY "kpis_insert_policy" ON public.kpis
  FOR INSERT
  TO authenticated
  WITH CHECK (
    employee_id IN (
      SELECT id FROM public.employees WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
      AND users.deleted_at IS NULL
    )
  );

CREATE POLICY "kpis_update_policy" ON public.kpis
  FOR UPDATE
  TO authenticated
  USING (
    employee_id IN (
      SELECT id FROM public.employees WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
      AND users.deleted_at IS NULL
    )
  )
  WITH CHECK (
    employee_id IN (
      SELECT id FROM public.employees WHERE user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
      AND users.deleted_at IS NULL
    )
  );

-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- INTERNSHIPS tables policies
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

CREATE POLICY "internships_select_own_policy" ON public.internships
  FOR SELECT
  TO authenticated
  USING (
    intern_id IN (
      SELECT id FROM public.employees WHERE user_id = auth.uid()
    )
    OR supervisor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
      AND users.deleted_at IS NULL
    )
  );

CREATE POLICY "internships_insert_policy" ON public.internships
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
      AND users.deleted_at IS NULL
    )
  );

CREATE POLICY "internships_update_policy" ON public.internships
  FOR UPDATE
  TO authenticated
  USING (
    supervisor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
      AND users.deleted_at IS NULL
    )
  )
  WITH CHECK (
    supervisor_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
      AND users.deleted_at IS NULL
    )
  );

CREATE POLICY "intern_daily_logs_select_policy" ON public.intern_daily_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.internships
      WHERE internships.id = intern_daily_logs.internship_id
      AND (
        internships.intern_id IN (
          SELECT id FROM public.employees WHERE user_id = auth.uid()
        )
        OR internships.supervisor_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.users
          WHERE users.id = auth.uid()
          AND users.role IN ('admin', 'super_admin')
          AND users.deleted_at IS NULL
        )
      )
    )
  );

CREATE POLICY "intern_daily_logs_insert_policy" ON public.intern_daily_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.internships
      WHERE internships.id = intern_daily_logs.internship_id
      AND internships.intern_id IN (
        SELECT id FROM public.employees WHERE user_id = auth.uid()
      )
    )
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
      AND users.deleted_at IS NULL
    )
  );

CREATE POLICY "intern_daily_logs_update_policy" ON public.intern_daily_logs
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.internships
      WHERE internships.id = intern_daily_logs.internship_id
      AND internships.intern_id IN (
        SELECT id FROM public.employees WHERE user_id = auth.uid()
      )
    )
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
      AND users.deleted_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.internships
      WHERE internships.id = intern_daily_logs.internship_id
      AND internships.intern_id IN (
        SELECT id FROM public.employees WHERE user_id = auth.uid()
      )
    )
    OR EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
      AND users.deleted_at IS NULL
    )
  );

-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
-- RESOURCES tables policies
-- ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

-- All authenticated users can view resources
CREATE POLICY "resources_select_policy" ON public.resources
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "resources_insert_policy" ON public.resources
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
      AND users.deleted_at IS NULL
    )
  );

CREATE POLICY "resources_update_policy" ON public.resources
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
      AND users.deleted_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
      AND users.deleted_at IS NULL
    )
  );

CREATE POLICY "resources_delete_policy" ON public.resources
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

-- Resource collections
CREATE POLICY "resource_collections_select_policy" ON public.resource_collections
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "resource_collections_insert_policy" ON public.resource_collections
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
      AND users.deleted_at IS NULL
    )
  );

CREATE POLICY "resource_collections_update_policy" ON public.resource_collections
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
      AND users.deleted_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
      AND users.deleted_at IS NULL
    )
  );

-- Collection resources (join table)
CREATE POLICY "collection_resources_select_policy" ON public.collection_resources
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "collection_resources_insert_policy" ON public.collection_resources
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
      AND users.deleted_at IS NULL
    )
  );

-- Resource bookmarks (per user)
CREATE POLICY "resource_bookmarks_select_policy" ON public.resource_bookmarks
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "resource_bookmarks_insert_policy" ON public.resource_bookmarks
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "resource_bookmarks_delete_policy" ON public.resource_bookmarks
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Resource views
CREATE POLICY "resource_views_select_policy" ON public.resource_views
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "resource_views_insert_policy" ON public.resource_views
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ============================================
-- Verification
-- ============================================
-- This migration consolidates 7 roles into 4:
--   employee, intern, admin (was admin+hr), super_admin (was cos+ceo+super_admin)
--
-- All RLS policies now only reference:
--   - 'admin', 'super_admin' for admin-level access
--   - 'super_admin' for super-admin-only operations
--   - No more references to 'hr', 'cos', 'ceo'
--
-- CRITICAL: RLS is re-enabled on ALL tables after policy recreation.
-- Self-select policies are restored for employees, invoices, reports, etc.
--
-- Helper functions (user_has_role, user_has_any_role, get_user_role)
-- have been recreated with the new user_role enum type.
