-- OKR target evidence support
-- Adds a dedicated evidence table and private storage bucket for OKR target proof uploads.

CREATE TABLE IF NOT EXISTS public.okr_target_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  okr_target_id uuid NOT NULL REFERENCES public.okr_targets(id) ON DELETE CASCADE,
  submitted_by uuid NOT NULL REFERENCES public.users(id),
  evidence_type text NOT NULL CHECK (evidence_type IN ('link', 'note', 'file')),
  content text NOT NULL,
  label text,
  file_name text,
  file_size integer,
  mime_type text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_okr_target_evidence_target_id
  ON public.okr_target_evidence(okr_target_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_okr_target_evidence_submitted_by
  ON public.okr_target_evidence(submitted_by) WHERE deleted_at IS NULL;

ALTER TABLE public.okr_target_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.okr_target_evidence FORCE ROW LEVEL SECURITY;

CREATE POLICY okr_target_evidence_select_policy ON public.okr_target_evidence
  FOR SELECT USING (
    EXISTS (
      SELECT 1
      FROM public.okr_targets target
      JOIN public.employees employee ON employee.id = target.employee_id
      WHERE target.id = okr_target_evidence.okr_target_id
        AND employee.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1
      FROM public.users user_row
      WHERE user_row.id = auth.uid()
        AND user_row.role IN ('admin', 'super_admin')
        AND user_row.deleted_at IS NULL
    )
  );

CREATE POLICY okr_target_evidence_insert_policy ON public.okr_target_evidence
  FOR INSERT WITH CHECK (
    submitted_by = auth.uid()
    AND EXISTS (
      SELECT 1
      FROM public.okr_targets target
      JOIN public.employees employee ON employee.id = target.employee_id
      WHERE target.id = okr_target_evidence.okr_target_id
        AND employee.user_id = auth.uid()
    )
  );

CREATE POLICY okr_target_evidence_update_policy ON public.okr_target_evidence
  FOR UPDATE USING (submitted_by = auth.uid());

CREATE POLICY okr_target_evidence_delete_policy ON public.okr_target_evidence
  FOR DELETE USING (submitted_by = auth.uid());

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'okr-target-evidence',
  'okr-target-evidence',
  false,
  10485760,
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation'
  ]
) ON CONFLICT (id) DO NOTHING;

CREATE POLICY okr_target_evidence_storage_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'okr-target-evidence'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY okr_target_evidence_storage_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'okr-target-evidence'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1
        FROM public.users user_row
        WHERE user_row.id = auth.uid()
          AND user_row.role IN ('admin', 'super_admin')
          AND user_row.deleted_at IS NULL
      )
    )
  );

CREATE POLICY okr_target_evidence_storage_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'okr-target-evidence'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );