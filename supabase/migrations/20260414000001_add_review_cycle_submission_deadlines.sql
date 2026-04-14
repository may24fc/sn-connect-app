BEGIN;

ALTER TABLE public.review_cycles
  ADD COLUMN IF NOT EXISTS okr_submission_deadline date,
  ADD COLUMN IF NOT EXISTS kpi_submission_deadline date;

COMMENT ON COLUMN public.review_cycles.okr_submission_deadline IS 'Deadline for OKR submissions within the review cycle';
COMMENT ON COLUMN public.review_cycles.kpi_submission_deadline IS 'Deadline for KPI submissions within the review cycle';

COMMIT;