BEGIN;

CREATE OR REPLACE FUNCTION public.capture_performance_submission_timestamp()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.submitted_at IS NULL AND NEW.status IN ('submitted','completed') THEN NEW.submitted_at := now(); END IF;
    RETURN NEW;
  END IF;
  IF OLD.submitted_at IS NOT NULL THEN
    NEW.submitted_at := OLD.submitted_at;
  ELSIF NEW.status IN ('submitted','completed') AND OLD.status NOT IN ('submitted','completed') THEN
    NEW.submitted_at := now();
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS okrs_capture_submission_timestamp ON public.okrs;
CREATE TRIGGER okrs_capture_submission_timestamp
BEFORE INSERT OR UPDATE OF status,submitted_at ON public.okrs
FOR EACH ROW EXECUTE FUNCTION public.capture_performance_submission_timestamp();
DROP TRIGGER IF EXISTS kpis_capture_submission_timestamp ON public.kpis;
CREATE TRIGGER kpis_capture_submission_timestamp
BEFORE INSERT OR UPDATE OF status,submitted_at ON public.kpis
FOR EACH ROW EXECUTE FUNCTION public.capture_performance_submission_timestamp();

COMMIT;
