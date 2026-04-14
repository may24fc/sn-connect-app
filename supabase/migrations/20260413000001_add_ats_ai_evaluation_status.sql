ALTER TABLE public.job_applications
  ADD COLUMN IF NOT EXISTS ai_evaluation_status text NOT NULL DEFAULT 'idle'
    CHECK (ai_evaluation_status IN ('idle', 'queued', 'parsing', 'evaluating', 'completed', 'failed'));

COMMENT ON COLUMN public.job_applications.ai_evaluation_status IS
  'Tracks ATS AI processing lifecycle: idle, queued, parsing, evaluating, completed, or failed.';

UPDATE public.job_applications
SET ai_evaluation_status = CASE
  WHEN ai_match_score IS NOT NULL THEN 'completed'
  ELSE 'idle'
END
WHERE ai_evaluation_status IS DISTINCT FROM CASE
  WHEN ai_match_score IS NOT NULL THEN 'completed'
  ELSE 'idle'
END;

CREATE INDEX IF NOT EXISTS idx_job_applications_ai_evaluation_status
  ON public.job_applications (ai_evaluation_status)
  WHERE deleted_at IS NULL;