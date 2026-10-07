BEGIN;

ALTER TABLE public.finance_property_rent_payments
  ADD COLUMN voided_at timestamptz,
  ADD COLUMN voided_by uuid REFERENCES public.users(id),
  ADD COLUMN void_reason text,
  ADD CONSTRAINT finance_rent_void_complete CHECK (
    (voided_at IS NULL AND voided_by IS NULL AND void_reason IS NULL)
    OR (voided_at IS NOT NULL AND voided_by IS NOT NULL
      AND void_reason IS NOT NULL AND length(trim(void_reason)) BETWEEN 10 AND 500)
  );

CREATE TABLE public.finance_property_maintenance_status_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  maintenance_id uuid NOT NULL REFERENCES public.finance_property_maintenance(id),
  previous_status text NOT NULL CHECK (previous_status IN ('scheduled', 'awaiting_invoice', 'paid')),
  next_status text NOT NULL CHECK (next_status IN ('scheduled', 'awaiting_invoice', 'paid')),
  changed_by uuid NOT NULL REFERENCES public.users(id),
  changed_at timestamptz NOT NULL DEFAULT now(),
  CHECK (previous_status <> next_status)
);
CREATE INDEX finance_maintenance_events_job_idx
  ON public.finance_property_maintenance_status_events(maintenance_id, changed_at);

ALTER TABLE public.finance_property_maintenance_status_events ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.finance_property_maintenance_status_events FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.finance_property_maintenance_status_events TO service_role;

CREATE FUNCTION public.void_finance_rent_payment(
  payment_id uuid, actor_id uuid, correction_reason text
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF length(trim(coalesce(correction_reason, ''))) NOT BETWEEN 10 AND 500 THEN
    RAISE EXCEPTION 'A correction reason of 10 to 500 characters is required';
  END IF;
  UPDATE public.finance_property_rent_payments
  SET voided_at = now(), voided_by = actor_id, void_reason = trim(correction_reason)
  WHERE id = payment_id AND voided_at IS NULL;
  RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION public.void_finance_rent_payment(uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.void_finance_rent_payment(uuid, uuid, text) TO service_role;

CREATE FUNCTION public.update_finance_maintenance_status(
  job_id uuid, actor_id uuid, expected_status text, next_status text
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF expected_status NOT IN ('scheduled', 'awaiting_invoice', 'paid')
    OR next_status NOT IN ('scheduled', 'awaiting_invoice', 'paid')
    OR expected_status = next_status THEN
    RAISE EXCEPTION 'Invalid maintenance status change';
  END IF;
  UPDATE public.finance_property_maintenance
  SET status = next_status
  WHERE id = job_id AND status = expected_status;
  IF NOT FOUND THEN RETURN false; END IF;
  INSERT INTO public.finance_property_maintenance_status_events
    (maintenance_id, previous_status, next_status, changed_by)
  VALUES (job_id, expected_status, next_status, actor_id);
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.update_finance_maintenance_status(uuid, uuid, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.update_finance_maintenance_status(uuid, uuid, text, text)
  TO service_role;

COMMIT;
