-- Migration: Create Documents Table
-- Created: 2026-01-23
-- Description: Creates documents table for storing 201 file references

-- UP Migration
BEGIN;

CREATE TABLE public.documents (
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

-- Create indexes for common queries
CREATE INDEX idx_documents_employee_id ON public.documents(employee_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_document_type ON public.documents(document_type) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_uploaded_by ON public.documents(uploaded_by);
CREATE INDEX idx_documents_uploaded_at ON public.documents(uploaded_at DESC);
CREATE INDEX idx_documents_is_confidential ON public.documents(is_confidential) WHERE deleted_at IS NULL;
CREATE INDEX idx_documents_deleted_at ON public.documents(deleted_at);

-- Enable RLS
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents FORCE ROW LEVEL SECURITY;

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
    ) AND deleted_at IS NULL
  );

-- Managers can view their direct reports' non-confidential documents
CREATE POLICY "documents_select_reports_policy" ON public.documents
  FOR SELECT
  TO authenticated
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

-- HR can view all documents (including confidential)
CREATE POLICY "documents_select_hr_policy" ON public.documents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'hr'
      AND users.deleted_at IS NULL
    ) AND deleted_at IS NULL
  );

-- COS can view all documents (including confidential)
CREATE POLICY "documents_select_cos_policy" ON public.documents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'cos'
      AND users.deleted_at IS NULL
    ) AND deleted_at IS NULL
  );

-- CEO can view all non-confidential documents
CREATE POLICY "documents_select_ceo_policy" ON public.documents
  FOR SELECT
  TO authenticated
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

-- Admin can view all documents
CREATE POLICY "documents_select_admin_policy" ON public.documents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
      AND users.deleted_at IS NULL
    ) AND deleted_at IS NULL
  );

-- Only HR and Admin can insert documents
CREATE POLICY "documents_insert_policy" ON public.documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'hr')
      AND users.deleted_at IS NULL
    )
  );

-- HR and Admin can update documents
CREATE POLICY "documents_update_policy" ON public.documents
  FOR UPDATE
  TO authenticated
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

-- Only Admin can delete documents (soft delete)
CREATE POLICY "documents_delete_policy" ON public.documents
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

-- Comments
COMMENT ON TABLE public.documents IS 'Employee documents and 201 files';
COMMENT ON COLUMN public.documents.employee_id IS 'References public.employees';
COMMENT ON COLUMN public.documents.file_path IS 'Path to file in Supabase Storage';
COMMENT ON COLUMN public.documents.is_confidential IS 'Restricts access to HR, COS, and Admin only';
COMMENT ON COLUMN public.documents.uploaded_by IS 'User who uploaded the document';
COMMENT ON COLUMN public.documents.deleted_at IS 'Soft delete timestamp';

COMMIT;

-- DOWN Migration (run manually if rollback needed)
/*
BEGIN;

DROP TABLE IF EXISTS public.documents CASCADE;

COMMIT;
*/
