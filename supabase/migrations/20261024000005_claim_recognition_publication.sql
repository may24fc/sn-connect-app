BEGIN;

ALTER TABLE public.recognition_periods DROP CONSTRAINT recognition_periods_status_check;
ALTER TABLE public.recognition_periods ADD CONSTRAINT recognition_periods_status_check
  CHECK (status IN ('draft','approved','rejected','publishing','published','skipped','failed'));

COMMIT;
