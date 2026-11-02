BEGIN;

ALTER TABLE public.okrs ADD COLUMN IF NOT EXISTS submitted_at timestamptz;
ALTER TABLE public.kpis ADD COLUMN IF NOT EXISTS submitted_at timestamptz;

UPDATE public.okrs SET submitted_at = updated_at
WHERE submitted_at IS NULL AND status IN ('submitted','completed');
UPDATE public.kpis SET submitted_at = updated_at
WHERE submitted_at IS NULL AND status IN ('submitted','completed');

CREATE OR REPLACE FUNCTION public.capture_performance_submission_timestamp()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF OLD.submitted_at IS NOT NULL THEN
    NEW.submitted_at := OLD.submitted_at;
  ELSIF NEW.status IN ('submitted','completed') AND OLD.status NOT IN ('submitted','completed') THEN
    NEW.submitted_at := now();
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER okrs_capture_submission_timestamp
BEFORE UPDATE OF status,submitted_at ON public.okrs
FOR EACH ROW EXECUTE FUNCTION public.capture_performance_submission_timestamp();
CREATE TRIGGER kpis_capture_submission_timestamp
BEFORE UPDATE OF status,submitted_at ON public.kpis
FOR EACH ROW EXECUTE FUNCTION public.capture_performance_submission_timestamp();

CREATE OR REPLACE FUNCTION public.preserve_form_submission_timestamp()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.submitted_at := OLD.submitted_at;
  RETURN NEW;
END $$;

CREATE TRIGGER monthly_self_evaluations_preserve_submitted_at BEFORE UPDATE OF submitted_at ON public.monthly_self_evaluations FOR EACH ROW EXECUTE FUNCTION public.preserve_form_submission_timestamp();
CREATE TRIGGER monthly_call_feedback_preserve_submitted_at BEFORE UPDATE OF submitted_at ON public.monthly_call_feedback FOR EACH ROW EXECUTE FUNCTION public.preserve_form_submission_timestamp();
CREATE TRIGGER five_percent_reflections_preserve_submitted_at BEFORE UPDATE OF submitted_at ON public.five_percent_reflections FOR EACH ROW EXECUTE FUNCTION public.preserve_form_submission_timestamp();
CREATE TRIGGER quarterly_temperature_checks_preserve_submitted_at BEFORE UPDATE OF submitted_at ON public.quarterly_temperature_checks FOR EACH ROW EXECUTE FUNCTION public.preserve_form_submission_timestamp();

COMMENT ON COLUMN public.okrs.submitted_at IS 'Immutable timestamp of the first submitted/completed status transition.';
COMMENT ON COLUMN public.kpis.submitted_at IS 'Immutable timestamp of the first submitted/completed status transition.';

COMMIT;
