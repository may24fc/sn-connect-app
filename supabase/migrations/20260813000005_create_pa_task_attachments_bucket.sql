-- Migration: Create pa-task-attachments storage bucket
-- Created: 2026-08-13
-- Description: Private storage bucket for PA/EA Task Tracker file attachments.
--   Reuses the same size limit / allowed mime types as employee-documents
--   (20260228000012_create_employee_documents_bucket.sql) per decision §8 #4.
--   Files are folder-scoped by pa_task_id: {pa_task_id}/{filename}.
-- Dependencies: public.pa_tasks, public.user_has_pa_task_access()

-- ============================================
-- Create pa-task-attachments bucket
-- ============================================
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pa-task-attachments',
  'pa-task-attachments',
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
-- Storage RLS Policies for pa-task-attachments
-- Folder convention: {pa_task_id}/{filename} — first path segment must be a
-- valid, existing pa_tasks.id, and the requester must pass user_has_pa_task_access().
-- ============================================

DROP POLICY IF EXISTS pa_task_attachments_storage_insert_policy ON storage.objects;
CREATE POLICY pa_task_attachments_storage_insert_policy ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'pa-task-attachments'
    AND public.user_has_pa_task_access(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.pa_tasks t
      WHERE t.id::text = (storage.foldername(name))[1]
        AND t.deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS pa_task_attachments_storage_select_policy ON storage.objects;
CREATE POLICY pa_task_attachments_storage_select_policy ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'pa-task-attachments'
    AND public.user_has_pa_task_access(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.pa_tasks t
      WHERE t.id::text = (storage.foldername(name))[1]
        AND t.deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS pa_task_attachments_storage_delete_policy ON storage.objects;
CREATE POLICY pa_task_attachments_storage_delete_policy ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'pa-task-attachments'
    AND (
      public.user_can_manage_pa_task_lookups(auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.pa_task_attachments a
        WHERE a.storage_path = name
          AND a.created_by = auth.uid()
      )
    )
  );
