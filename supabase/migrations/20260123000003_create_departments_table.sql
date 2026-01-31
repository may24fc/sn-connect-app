-- Migration: Create Departments Table
-- Created: 2026-01-23
-- Description: Creates departments table for organizational structure

-- UP Migration
BEGIN;

CREATE TABLE public.departments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  description text,
  head_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz
);

-- Create indexes
CREATE INDEX idx_departments_head_id ON public.departments(head_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_departments_name ON public.departments(name) WHERE deleted_at IS NULL;
CREATE INDEX idx_departments_deleted_at ON public.departments(deleted_at);

-- Enable RLS
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.departments FORCE ROW LEVEL SECURITY;

-- All authenticated users can view non-deleted departments
CREATE POLICY "departments_select_policy" ON public.departments
  FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

-- Only HR, COS, CEO, and Admin can insert departments
CREATE POLICY "departments_insert_policy" ON public.departments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'hr', 'cos', 'ceo')
      AND users.deleted_at IS NULL
    )
  );

-- Only HR, COS, CEO, and Admin can update departments
CREATE POLICY "departments_update_policy" ON public.departments
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'hr', 'cos', 'ceo')
      AND users.deleted_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'hr', 'cos', 'ceo')
      AND users.deleted_at IS NULL
    )
  );

-- Only Admin can delete (soft delete)
CREATE POLICY "departments_delete_policy" ON public.departments
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.deleted_at IS NULL
    )
  );

-- Comment on table
COMMENT ON TABLE public.departments IS 'Organizational departments within the company';
COMMENT ON COLUMN public.departments.head_id IS 'Department head (references auth.users)';
COMMENT ON COLUMN public.departments.deleted_at IS 'Soft delete timestamp';

COMMIT;

-- DOWN Migration (run manually if rollback needed)
/*
BEGIN;

DROP TABLE IF EXISTS public.departments CASCADE;

COMMIT;
*/
