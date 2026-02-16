-- Migration: Comprehensive Schema Verification and Repair
-- Created: 2026-02-16
-- Purpose: Diagnose and fix missing tables, columns, and RLS policies

BEGIN;

-- ============================================
-- DIAGNOSTIC: Check what exists
-- ============================================

-- This migration will create missing tables if they don't exist
-- and add missing columns to existing tables

-- ============================================
-- 1. Ensure employees table exists
-- ============================================

CREATE TABLE IF NOT EXISTS public.employees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  employee_number text NOT NULL UNIQUE,
  immediate_head uuid REFERENCES public.users(id) ON DELETE SET NULL,

  -- Personal Information
  first_name text NOT NULL,
  middle_name text,
  last_name text NOT NULL,
  birthday date,

  -- Employment Information
  date_hired date NOT NULL,
  employment_type employment_type NOT NULL,
  work_arrangement work_arrangement NOT NULL,
  position text NOT NULL,
  department text NOT NULL,
  probation_end_date date,

  -- Payroll Information (sensitive)
  payroll_account_name text,
  payroll_account_number text,

  -- Contact Information
  phone text,
  emergency_contact_name text,
  emergency_contact_number text,
  personal_email text,
  company_email text,

  -- Demographics
  address text,
  city text,
  province text,
  postal_code text,

  -- Standard columns
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz
);

-- ============================================
-- 2. Ensure documents table exists
-- ============================================

CREATE TABLE IF NOT EXISTS public.documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) ON DELETE CASCADE,
  document_type document_type NOT NULL,
  file_path text NOT NULL,
  file_name text NOT NULL,
  file_size bigint,
  mime_type text,
  is_confidential boolean NOT NULL DEFAULT false,
  uploaded_by uuid NOT NULL REFERENCES auth.users(id),
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz
);

-- ============================================
-- 3. Ensure resource_bookmarks table exists
-- ============================================

CREATE TABLE IF NOT EXISTS public.resource_bookmarks (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  resource_id uuid NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(resource_id, user_id)
);

-- ============================================
-- 4. Ensure resource_views table exists
-- ============================================

CREATE TABLE IF NOT EXISTS public.resource_views (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  resource_id uuid NOT NULL REFERENCES public.resources(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  viewed_at timestamptz DEFAULT now() NOT NULL,
  duration_seconds integer,
  completed boolean DEFAULT false
);

-- ============================================
-- 5. Add missing column to resources table
-- ============================================

-- Check if published_at column exists, add if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'resources'
      AND column_name = 'published_at'
  ) THEN
    ALTER TABLE public.resources ADD COLUMN published_at timestamptz;
  END IF;
END $$;

-- ============================================
-- 6. Create indexes for employees table (if table was just created)
-- ============================================

CREATE UNIQUE INDEX IF NOT EXISTS idx_employees_employee_number ON public.employees(employee_number) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_employees_user_id ON public.employees(user_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_employees_immediate_head ON public.employees(immediate_head) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_employees_department ON public.employees(department) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_employees_employment_type ON public.employees(employment_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_employees_date_hired ON public.employees(date_hired) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_employees_deleted_at ON public.employees(deleted_at);
CREATE INDEX IF NOT EXISTS idx_employees_full_name ON public.employees(last_name, first_name) WHERE deleted_at IS NULL;

-- ============================================
-- 7. Create indexes for documents table
-- ============================================

CREATE INDEX IF NOT EXISTS idx_documents_employee_id ON public.documents(employee_id) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_documents_document_type ON public.documents(document_type) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON public.documents(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_at ON public.documents(uploaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_documents_is_confidential ON public.documents(is_confidential) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_documents_deleted_at ON public.documents(deleted_at);

-- ============================================
-- 8. Create indexes for resource tables
-- ============================================

CREATE INDEX IF NOT EXISTS idx_resource_bookmarks_user_id ON public.resource_bookmarks(user_id);
CREATE INDEX IF NOT EXISTS idx_resource_bookmarks_resource_id ON public.resource_bookmarks(resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_views_user_id ON public.resource_views(user_id);
CREATE INDEX IF NOT EXISTS idx_resource_views_resource_id ON public.resource_views(resource_id);
CREATE INDEX IF NOT EXISTS idx_resource_views_viewed_at ON public.resource_views(viewed_at DESC);

-- ============================================
-- 9. Enable RLS on all tables
-- ============================================

ALTER TABLE public.employees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employees FORCE ROW LEVEL SECURITY;

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents FORCE ROW LEVEL SECURITY;

ALTER TABLE public.resource_bookmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_bookmarks FORCE ROW LEVEL SECURITY;

ALTER TABLE public.resource_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_views FORCE ROW LEVEL SECURITY;

-- ============================================
-- 10. Create RLS policies for employees table
-- ============================================

-- Drop existing policies first to avoid conflicts
DROP POLICY IF EXISTS employees_select_own_policy ON public.employees;
DROP POLICY IF EXISTS employees_select_reports_policy ON public.employees;
DROP POLICY IF EXISTS employees_select_hr_policy ON public.employees;
DROP POLICY IF EXISTS employees_select_cos_policy ON public.employees;
DROP POLICY IF EXISTS employees_select_ceo_policy ON public.employees;
DROP POLICY IF EXISTS employees_select_admin_policy ON public.employees;
DROP POLICY IF EXISTS employees_insert_policy ON public.employees;
DROP POLICY IF EXISTS employees_update_policy ON public.employees;
DROP POLICY IF EXISTS employees_delete_policy ON public.employees;

-- Recreate policies
CREATE POLICY employees_select_own_policy ON public.employees
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() AND deleted_at IS NULL);

CREATE POLICY employees_select_reports_policy ON public.employees
  FOR SELECT TO authenticated
  USING (immediate_head = auth.uid() AND deleted_at IS NULL);

CREATE POLICY employees_select_hr_policy ON public.employees
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'hr'
      AND users.deleted_at IS NULL
    ) AND deleted_at IS NULL
  );

CREATE POLICY employees_select_cos_policy ON public.employees
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'cos'
      AND users.deleted_at IS NULL
    ) AND deleted_at IS NULL
  );

CREATE POLICY employees_select_ceo_policy ON public.employees
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'ceo'
      AND users.deleted_at IS NULL
    ) AND deleted_at IS NULL
  );

CREATE POLICY employees_select_admin_policy ON public.employees
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.deleted_at IS NULL
    ) AND deleted_at IS NULL
  );

CREATE POLICY employees_insert_policy ON public.employees
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'hr')
      AND users.deleted_at IS NULL
    )
  );

CREATE POLICY employees_update_policy ON public.employees
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'hr')
      AND users.deleted_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'hr')
      AND users.deleted_at IS NULL
    )
  );

CREATE POLICY employees_delete_policy ON public.employees
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.deleted_at IS NULL
    )
  );

-- ============================================
-- 11. Create RLS policies for documents table
-- ============================================

DROP POLICY IF EXISTS documents_select_own_policy ON public.documents;
DROP POLICY IF EXISTS documents_select_reports_policy ON public.documents;
DROP POLICY IF EXISTS documents_select_hr_policy ON public.documents;
DROP POLICY IF EXISTS documents_select_cos_policy ON public.documents;
DROP POLICY IF EXISTS documents_select_ceo_policy ON public.documents;
DROP POLICY IF EXISTS documents_select_admin_policy ON public.documents;
DROP POLICY IF EXISTS documents_insert_policy ON public.documents;
DROP POLICY IF EXISTS documents_update_policy ON public.documents;
DROP POLICY IF EXISTS documents_delete_policy ON public.documents;

CREATE POLICY documents_select_own_policy ON public.documents
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.employees
      WHERE employees.id = documents.employee_id
      AND employees.user_id = auth.uid()
      AND employees.deleted_at IS NULL
    ) AND deleted_at IS NULL
  );

CREATE POLICY documents_select_reports_policy ON public.documents
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.employees
      WHERE employees.id = documents.employee_id
      AND employees.immediate_head = auth.uid()
      AND employees.deleted_at IS NULL
    )
    AND is_confidential = false
    AND deleted_at IS NULL
  );

CREATE POLICY documents_select_hr_policy ON public.documents
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'hr'
      AND users.deleted_at IS NULL
    ) AND deleted_at IS NULL
  );

CREATE POLICY documents_select_cos_policy ON public.documents
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'cos'
      AND users.deleted_at IS NULL
    ) AND deleted_at IS NULL
  );

CREATE POLICY documents_select_ceo_policy ON public.documents
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'ceo'
      AND users.deleted_at IS NULL
    )
    AND is_confidential = false
    AND deleted_at IS NULL
  );

CREATE POLICY documents_select_admin_policy ON public.documents
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.deleted_at IS NULL
    ) AND deleted_at IS NULL
  );

CREATE POLICY documents_insert_policy ON public.documents
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'hr')
      AND users.deleted_at IS NULL
    )
  );

CREATE POLICY documents_update_policy ON public.documents
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'hr')
      AND users.deleted_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'hr')
      AND users.deleted_at IS NULL
    )
  );

CREATE POLICY documents_delete_policy ON public.documents
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.deleted_at IS NULL
    )
  );

-- ============================================
-- 12. Create RLS policies for resource_bookmarks
-- ============================================

DROP POLICY IF EXISTS bookmarks_self_policy ON public.resource_bookmarks;
DROP POLICY IF EXISTS bookmarks_admin_select_policy ON public.resource_bookmarks;

CREATE POLICY bookmarks_self_policy ON public.resource_bookmarks
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY bookmarks_admin_select_policy ON public.resource_bookmarks
  FOR SELECT TO authenticated
  USING (user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'super_admin']::user_role[]));

-- ============================================
-- 13. Create RLS policies for resource_views
-- ============================================

DROP POLICY IF EXISTS views_self_policy ON public.resource_views;
DROP POLICY IF EXISTS views_admin_select_policy ON public.resource_views;

CREATE POLICY views_self_policy ON public.resource_views
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY views_admin_select_policy ON public.resource_views
  FOR SELECT TO authenticated
  USING (user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'super_admin']::user_role[]));

COMMIT;
