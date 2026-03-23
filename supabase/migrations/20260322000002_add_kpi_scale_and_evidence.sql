-- KPI Scale-Based Rating System with Evidence
-- Adds rubric-based 1-4 scale rating to KPIs (dual mode: numeric + scale)
-- Creates kpi_evidence table for attaching evidence to KPI scores

-- Step 1: Add scale columns to kpis table
ALTER TABLE public.kpis
  ADD COLUMN IF NOT EXISTS kpi_type text NOT NULL DEFAULT 'numeric',
  ADD COLUMN IF NOT EXISTS rubric_1 text,
  ADD COLUMN IF NOT EXISTS rubric_2 text,
  ADD COLUMN IF NOT EXISTS rubric_3 text,
  ADD COLUMN IF NOT EXISTS rubric_4 text,
  ADD COLUMN IF NOT EXISTS self_rating integer;

-- Add check constraints
ALTER TABLE public.kpis
  ADD CONSTRAINT kpis_kpi_type_check CHECK (kpi_type IN ('numeric', 'scale')),
  ADD CONSTRAINT kpis_self_rating_range CHECK (self_rating IS NULL OR (self_rating >= 1 AND self_rating <= 4));

-- Constraint: scale KPIs must have all 4 rubrics
ALTER TABLE public.kpis
  ADD CONSTRAINT kpis_scale_rubrics_required CHECK (
    kpi_type = 'numeric' OR (
      rubric_1 IS NOT NULL AND
      rubric_2 IS NOT NULL AND
      rubric_3 IS NOT NULL AND
      rubric_4 IS NOT NULL
    )
  );

-- Step 2: Drop and recreate progress_pct generated column to support dual mode
ALTER TABLE public.kpis DROP COLUMN IF EXISTS progress_pct;

ALTER TABLE public.kpis
  ADD COLUMN progress_pct numeric(5,2)
  GENERATED ALWAYS AS (
    CASE
      WHEN kpi_type = 'scale' THEN
        ROUND(COALESCE(self_rating, 0) / 4.0 * 100, 2)
      WHEN target_value > 0 THEN
        ROUND((current_value / target_value) * 100, 2)
      ELSE 0
    END
  ) STORED;

-- Step 3: Create kpi_evidence table
CREATE TABLE IF NOT EXISTS public.kpi_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  kpi_id uuid NOT NULL REFERENCES public.kpis(id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_kpi_evidence_kpi_id
  ON public.kpi_evidence(kpi_id) WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_kpi_evidence_submitted_by
  ON public.kpi_evidence(submitted_by) WHERE deleted_at IS NULL;

-- Step 4: RLS for kpi_evidence
ALTER TABLE public.kpi_evidence ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.kpi_evidence FORCE ROW LEVEL SECURITY;

-- SELECT: KPI owner (via kpis join) or admin roles
CREATE POLICY kpi_evidence_select_policy ON public.kpi_evidence
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.kpis k
      JOIN public.employees e ON e.id = k.employee_id
      WHERE k.id = kpi_evidence.kpi_id
        AND e.user_id = auth.uid()
    )
    OR
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role IN ('admin', 'super_admin', 'hr', 'cos', 'ceo')
        AND u.deleted_at IS NULL
    )
  );

-- INSERT: only KPI owner can add evidence
CREATE POLICY kpi_evidence_insert_policy ON public.kpi_evidence
  FOR INSERT WITH CHECK (
    submitted_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.kpis k
      JOIN public.employees e ON e.id = k.employee_id
      WHERE k.id = kpi_evidence.kpi_id
        AND e.user_id = auth.uid()
    )
  );

-- UPDATE: only evidence submitter
CREATE POLICY kpi_evidence_update_policy ON public.kpi_evidence
  FOR UPDATE USING (submitted_by = auth.uid());

-- DELETE: only evidence submitter (soft delete)
CREATE POLICY kpi_evidence_delete_policy ON public.kpi_evidence
  FOR DELETE USING (submitted_by = auth.uid());

-- Step 5: Create storage bucket for KPI evidence files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'kpi-evidence',
  'kpi-evidence',
  false,
  10485760, -- 10MB
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
) ON CONFLICT (id) DO NOTHING;

-- Storage RLS: owner can upload to their own folder
CREATE POLICY kpi_evidence_storage_insert ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'kpi-evidence'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

-- Storage RLS: owner and admins can read
CREATE POLICY kpi_evidence_storage_select ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'kpi-evidence'
    AND (
      (storage.foldername(name))[1] = auth.uid()::text
      OR EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid()
          AND u.role IN ('admin', 'super_admin', 'hr', 'cos', 'ceo')
          AND u.deleted_at IS NULL
      )
    )
  );

-- Storage RLS: owner can delete their own files
CREATE POLICY kpi_evidence_storage_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'kpi-evidence'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );
