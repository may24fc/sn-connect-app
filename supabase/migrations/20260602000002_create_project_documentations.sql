-- Migration: Create project_documentations table
-- Purpose: allow project members/admins to attach documentation links/files to projects.

CREATE TABLE IF NOT EXISTS public.project_documentations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  submitted_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  documentation_type text NOT NULL CHECK (documentation_type IN ('link', 'file')),
  content text NOT NULL,
  label text,
  file_name text,
  file_size bigint CHECK (file_size IS NULL OR file_size >= 0),
  mime_type text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_project_documentations_project_id
  ON public.project_documentations(project_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_project_documentations_submitted_by
  ON public.project_documentations(submitted_by)
  WHERE deleted_at IS NULL;

ALTER TABLE public.project_documentations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_documentations FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS project_documentations_select_policy ON public.project_documentations;
CREATE POLICY project_documentations_select_policy ON public.project_documentations
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND (
      submitted_by = auth.uid()
      OR EXISTS (
        SELECT 1
        FROM public.projects p
        WHERE p.id = project_documentations.project_id
          AND p.deleted_at IS NULL
          AND (
            p.lead_user_id = auth.uid()
            OR p.supervisor_id = auth.uid()
            OR p.created_by = auth.uid()
          )
      )
      OR EXISTS (
        SELECT 1
        FROM public.project_contributors pc
        WHERE pc.project_id = project_documentations.project_id
          AND pc.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.id = auth.uid()
          AND u.deleted_at IS NULL
          AND u.role::text IN ('admin', 'super_admin', 'hr', 'cos', 'ceo')
      )
    )
  );

DROP POLICY IF EXISTS project_documentations_insert_policy ON public.project_documentations;
CREATE POLICY project_documentations_insert_policy ON public.project_documentations
  FOR INSERT
  WITH CHECK (
    submitted_by = auth.uid()
    AND (
      EXISTS (
        SELECT 1
        FROM public.projects p
        WHERE p.id = project_documentations.project_id
          AND p.deleted_at IS NULL
          AND (
            p.lead_user_id = auth.uid()
            OR p.supervisor_id = auth.uid()
            OR p.created_by = auth.uid()
          )
      )
      OR EXISTS (
        SELECT 1
        FROM public.project_contributors pc
        WHERE pc.project_id = project_documentations.project_id
          AND pc.user_id = auth.uid()
      )
      OR EXISTS (
        SELECT 1
        FROM public.users u
        WHERE u.id = auth.uid()
          AND u.deleted_at IS NULL
          AND u.role::text IN ('admin', 'super_admin', 'hr', 'cos', 'ceo')
      )
    )
  );

DROP POLICY IF EXISTS project_documentations_update_policy ON public.project_documentations;
CREATE POLICY project_documentations_update_policy ON public.project_documentations
  FOR UPDATE
  USING (
    submitted_by = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.deleted_at IS NULL
        AND u.role::text IN ('admin', 'super_admin', 'hr', 'cos', 'ceo')
    )
  )
  WITH CHECK (
    submitted_by = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.deleted_at IS NULL
        AND u.role::text IN ('admin', 'super_admin', 'hr', 'cos', 'ceo')
    )
  );

DROP POLICY IF EXISTS project_documentations_delete_policy ON public.project_documentations;
CREATE POLICY project_documentations_delete_policy ON public.project_documentations
  FOR DELETE
  USING (
    submitted_by = auth.uid()
    OR EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.deleted_at IS NULL
        AND u.role::text IN ('admin', 'super_admin', 'hr', 'cos', 'ceo')
    )
  );

DROP TRIGGER IF EXISTS set_updated_at ON public.project_documentations;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.project_documentations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO storage.buckets (id, name, public)
VALUES ('project-documentations', 'project-documentations', false)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS project_documentations_storage_insert ON storage.objects;
CREATE POLICY project_documentations_storage_insert ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'project-documentations');

DROP POLICY IF EXISTS project_documentations_storage_select ON storage.objects;
CREATE POLICY project_documentations_storage_select ON storage.objects
  FOR SELECT
  TO authenticated
  USING (bucket_id = 'project-documentations');

DROP POLICY IF EXISTS project_documentations_storage_delete ON storage.objects;
CREATE POLICY project_documentations_storage_delete ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'project-documentations');
