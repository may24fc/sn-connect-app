-- Add internal requisitions and an atomic hire workflow for job applications.

BEGIN;

CREATE TABLE IF NOT EXISTS public.job_requisitions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  job_posting_id uuid REFERENCES public.job_postings(id) ON DELETE CASCADE,
  total_headcount integer NOT NULL CHECK (total_headcount > 0),
  filled_headcount integer NOT NULL DEFAULT 0 CHECK (filled_headcount >= 0),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'filled')),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  deleted_at timestamptz,
  CHECK (filled_headcount <= total_headcount)
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_job_requisitions_active_posting
  ON public.job_requisitions (job_posting_id)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_job_requisitions_status
  ON public.job_requisitions (status)
  WHERE deleted_at IS NULL;

ALTER TABLE public.job_requisitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_requisitions FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS job_requisitions_admin_all_policy ON public.job_requisitions;
CREATE POLICY job_requisitions_admin_all_policy
  ON public.job_requisitions FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role = 'admin'
        AND u.deleted_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role = 'admin'
        AND u.deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS job_postings_admin_all_policy ON public.job_postings;
CREATE POLICY job_postings_admin_all_policy
  ON public.job_postings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role = 'admin'
        AND u.deleted_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role = 'admin'
        AND u.deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS job_applications_admin_select_policy ON public.job_applications;
CREATE POLICY job_applications_admin_select_policy
  ON public.job_applications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role = 'admin'
        AND u.deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS job_applications_admin_update_policy ON public.job_applications;
CREATE POLICY job_applications_admin_update_policy
  ON public.job_applications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role = 'admin'
        AND u.deleted_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role = 'admin'
        AND u.deleted_at IS NULL
    )
  );

DROP POLICY IF EXISTS job_applications_super_admin_approve_policy ON public.job_applications;

DROP TRIGGER IF EXISTS set_updated_at ON public.job_requisitions;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.job_requisitions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

INSERT INTO public.job_requisitions (
  job_posting_id,
  total_headcount,
  filled_headcount,
  status,
  created_at,
  updated_at,
  created_by
)
SELECT
  jp.id,
  GREATEST(COALESCE(hired_application_counts.hired_count, 0), 1),
  COALESCE(hired_application_counts.hired_count, 0),
  CASE
    WHEN COALESCE(hired_application_counts.hired_count, 0) >= GREATEST(COALESCE(hired_application_counts.hired_count, 0), 1)
      THEN 'filled'
    ELSE 'open'
  END,
  jp.created_at,
  jp.updated_at,
  jp.created_by
FROM public.job_postings jp
LEFT JOIN LATERAL (
  SELECT count(*)::integer AS hired_count
  FROM public.job_applications ja
  WHERE ja.job_posting_id = jp.id
    AND ja.deleted_at IS NULL
    AND ja.status = 'hired'
) AS hired_application_counts ON TRUE
WHERE jp.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1
    FROM public.job_requisitions jr
    WHERE jr.job_posting_id = jp.id
      AND jr.deleted_at IS NULL
  );

UPDATE public.job_postings jp
SET
  is_active = FALSE,
  closes_at = COALESCE(jp.closes_at, now())
FROM public.job_requisitions jr
WHERE jr.job_posting_id = jp.id
  AND jr.deleted_at IS NULL
  AND jr.status = 'filled'
  AND jp.deleted_at IS NULL
  AND jp.is_active = TRUE;

CREATE OR REPLACE FUNCTION public.hire_job_application_transaction(application_uuid uuid)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  application_record public.job_applications%ROWTYPE;
  requisition_record public.job_requisitions%ROWTYPE;
  updated_requisition public.job_requisitions%ROWTYPE;
  auto_closed boolean := false;
BEGIN
  SELECT *
  INTO application_record
  FROM public.job_applications
  WHERE id = application_uuid
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Application not found';
  END IF;

  IF application_record.status = 'hired' THEN
    RAISE EXCEPTION 'Application is already hired';
  END IF;

  IF application_record.status <> 'approved' THEN
    RAISE EXCEPTION 'Application must be approved before hiring';
  END IF;

  IF application_record.job_posting_id IS NULL THEN
    RAISE EXCEPTION 'Application is not linked to a job posting';
  END IF;

  SELECT *
  INTO requisition_record
  FROM public.job_requisitions
  WHERE job_posting_id = application_record.job_posting_id
    AND deleted_at IS NULL
  ORDER BY created_at DESC
  LIMIT 1
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job requisition not found for posting';
  END IF;

  IF requisition_record.status = 'filled' OR requisition_record.filled_headcount >= requisition_record.total_headcount THEN
    RAISE EXCEPTION 'No remaining headcount on this requisition';
  END IF;

  UPDATE public.job_applications
  SET
    status = 'hired',
    reviewed_at = COALESCE(reviewed_at, now())
  WHERE id = application_uuid;

  UPDATE public.job_requisitions
  SET
    filled_headcount = filled_headcount + 1,
    status = CASE
      WHEN filled_headcount + 1 >= total_headcount THEN 'filled'
      ELSE 'open'
    END
  WHERE id = requisition_record.id
  RETURNING * INTO updated_requisition;

  auto_closed := updated_requisition.status = 'filled';

  IF auto_closed THEN
    UPDATE public.job_postings
    SET
      is_active = FALSE,
      closes_at = COALESCE(closes_at, now())
    WHERE id = application_record.job_posting_id
      AND deleted_at IS NULL;
  END IF;

  RETURN jsonb_build_object(
    'applicationId', application_record.id,
    'jobPostingId', application_record.job_posting_id,
    'requisitionId', updated_requisition.id,
    'applicationStatus', 'hired',
    'filledHeadcount', updated_requisition.filled_headcount,
    'totalHeadcount', updated_requisition.total_headcount,
    'requisitionStatus', updated_requisition.status,
    'postingIsActive', NOT auto_closed,
    'autoClosed', auto_closed
  );
END;
$$;

COMMIT;