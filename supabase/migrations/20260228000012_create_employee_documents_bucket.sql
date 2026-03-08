-- Migration: Create employee-documents storage bucket
-- Description: Create storage bucket for employee 201 file documents (PDFs, images, etc.)
-- Dependencies: None

-- ============================================
-- Create employee-documents bucket
-- ============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'employee-documents',
  'employee-documents',
  false, -- Private bucket - requires signed URLs
  10485760, -- 10MB in bytes
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- ============================================
-- Storage RLS Policies for employee-documents
-- ============================================

-- Policy: Employees can upload to their own folder
DROP POLICY IF EXISTS employee_documents_insert_own_policy ON storage.objects;
CREATE POLICY employee_documents_insert_own_policy ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'employee-documents'
    AND (
      -- User uploads to their own employee folder
      EXISTS (
        SELECT 1 FROM public.employees
        WHERE employees.user_id = auth.uid()
        AND employees.deleted_at IS NULL
        AND (storage.foldername(name))[1] = employees.id::text
      )
      OR
      -- Admin/super_admin can upload to any folder
      EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'super_admin')
        AND users.deleted_at IS NULL
      )
    )
  );

-- Policy: Employees can view their own documents
DROP POLICY IF EXISTS employee_documents_select_own_policy ON storage.objects;
CREATE POLICY employee_documents_select_own_policy ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'employee-documents'
    AND (
      -- User views their own documents
      EXISTS (
        SELECT 1 FROM public.employees
        WHERE employees.user_id = auth.uid()
        AND employees.deleted_at IS NULL
        AND (storage.foldername(name))[1] = employees.id::text
      )
      OR
      -- Admin/super_admin can view all documents
      EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'super_admin')
        AND users.deleted_at IS NULL
      )
    )
  );

-- Policy: Employees can update their own documents
DROP POLICY IF EXISTS employee_documents_update_own_policy ON storage.objects;
CREATE POLICY employee_documents_update_own_policy ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'employee-documents'
    AND (
      EXISTS (
        SELECT 1 FROM public.employees
        WHERE employees.user_id = auth.uid()
        AND employees.deleted_at IS NULL
        AND (storage.foldername(name))[1] = employees.id::text
      )
      OR
      EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'super_admin')
        AND users.deleted_at IS NULL
      )
    )
  )
  WITH CHECK (
    bucket_id = 'employee-documents'
    AND (
      EXISTS (
        SELECT 1 FROM public.employees
        WHERE employees.user_id = auth.uid()
        AND employees.deleted_at IS NULL
        AND (storage.foldername(name))[1] = employees.id::text
      )
      OR
      EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'super_admin')
        AND users.deleted_at IS NULL
      )
    )
  );

-- Policy: Employees can delete their own documents (soft delete in app, but allow storage removal)
DROP POLICY IF EXISTS employee_documents_delete_own_policy ON storage.objects;
CREATE POLICY employee_documents_delete_own_policy ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'employee-documents'
    AND (
      EXISTS (
        SELECT 1 FROM public.employees
        WHERE employees.user_id = auth.uid()
        AND employees.deleted_at IS NULL
        AND (storage.foldername(name))[1] = employees.id::text
      )
      OR
      EXISTS (
        SELECT 1 FROM public.users
        WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'super_admin')
        AND users.deleted_at IS NULL
      )
    )
  );
