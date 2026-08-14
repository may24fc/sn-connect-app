-- Migration: Create pa_task_attachments
-- Created: 2026-08-13
-- Description: File or link attachments (with title) for PA/EA Task Tracker entries.
--   Files are stored in the pa-task-attachments storage bucket
--   (20260813000005_create_pa_task_attachments_bucket.sql).
-- Dependencies: public.pa_tasks

BEGIN;

CREATE TABLE public.pa_task_attachments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pa_task_id uuid NOT NULL REFERENCES public.pa_tasks(id) ON DELETE CASCADE,
  attachment_type text NOT NULL CHECK (attachment_type IN ('file', 'link')),
  title text NOT NULL,
  url text,
  storage_path text,
  file_size_bytes bigint,
  mime_type text,
  created_by uuid NOT NULL REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT pa_task_attachments_type_payload_check CHECK (
    (attachment_type = 'link' AND url IS NOT NULL AND storage_path IS NULL)
    OR (attachment_type = 'file' AND storage_path IS NOT NULL AND url IS NULL)
  )
);

CREATE INDEX idx_pa_task_attachments_pa_task_id
  ON public.pa_task_attachments(pa_task_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_pa_task_attachments_created_by
  ON public.pa_task_attachments(created_by) WHERE deleted_at IS NULL;

ALTER TABLE public.pa_task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pa_task_attachments FORCE ROW LEVEL SECURITY;

-- SELECT: anyone with module access can view attachments (matches pa_tasks visibility)
CREATE POLICY pa_task_attachments_select_policy ON public.pa_task_attachments
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND public.user_has_pa_task_access(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.pa_tasks t
      WHERE t.id = pa_task_attachments.pa_task_id
        AND t.deleted_at IS NULL
    )
  );

-- INSERT: anyone with module access can attach to any visible entry
CREATE POLICY pa_task_attachments_insert_policy ON public.pa_task_attachments
  FOR INSERT
  WITH CHECK (
    public.user_has_pa_task_access(auth.uid())
    AND created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.pa_tasks t
      WHERE t.id = pa_task_attachments.pa_task_id
        AND t.deleted_at IS NULL
    )
  );

-- DELETE (soft): uploader, or admin/super_admin
CREATE POLICY pa_task_attachments_delete_policy ON public.pa_task_attachments
  FOR DELETE
  USING (
    created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role IN ('admin', 'super_admin')
        AND u.deleted_at IS NULL
    )
  );

COMMENT ON TABLE public.pa_task_attachments IS 'File or link attachments (with title) for PA/EA Task Tracker entries.';
COMMENT ON COLUMN public.pa_task_attachments.url IS 'Set when attachment_type = link.';
COMMENT ON COLUMN public.pa_task_attachments.storage_path IS 'Set when attachment_type = file; path within the pa-task-attachments bucket.';

COMMIT;

-- DOWN Migration (run manually if rollback needed)
/*
BEGIN;

DROP TABLE IF EXISTS public.pa_task_attachments CASCADE;

COMMIT;
*/
