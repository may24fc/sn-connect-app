-- LOCAL Supabase only; the fixture is rollback-only.
BEGIN;
DO $$
DECLARE
  actor uuid;
  property_id uuid;
  payment_id uuid;
  job_id uuid;
BEGIN
  SELECT id INTO actor FROM public.users ORDER BY id LIMIT 1;
  IF actor IS NULL THEN RAISE EXCEPTION 'Local property checks need a user fixture'; END IF;
  INSERT INTO public.finance_properties
    (name, property_type, occupancy, weekly_rent_aud, due_day, created_by)
  VALUES ('Rollback property', 'Residential', 'occupied', 300, 10, actor)
  RETURNING id INTO property_id;
  INSERT INTO public.finance_property_rent_payments
    (property_id, period_month, received_on, amount_aud, created_by)
  VALUES (property_id, '2026-06-01', '2026-06-10', 100, actor)
  RETURNING id INTO payment_id;
  INSERT INTO public.finance_property_maintenance
    (property_id, job_date, description, cost_aud, status, created_by)
  VALUES (property_id, '2026-06-10', 'Rollback fixture', 80, 'scheduled', actor)
  RETURNING id INTO job_id;

  IF NOT public.void_finance_rent_payment(payment_id, actor, 'Duplicate payment record') THEN
    RAISE EXCEPTION 'Payment correction was not recorded';
  END IF;
  IF public.void_finance_rent_payment(payment_id, actor, 'Duplicate payment record') THEN
    RAISE EXCEPTION 'A voided payment was corrected twice';
  END IF;
  IF (SELECT amount_aud FROM public.finance_property_rent_payments WHERE id = payment_id) <> 100
    OR (SELECT voided_by FROM public.finance_property_rent_payments WHERE id = payment_id) <> actor
    OR (SELECT void_reason FROM public.finance_property_rent_payments WHERE id = payment_id)
      <> 'Duplicate payment record' THEN
    RAISE EXCEPTION 'Original payment or correction evidence was lost';
  END IF;
  IF NOT public.update_finance_maintenance_status(job_id, actor, 'scheduled', 'paid') THEN
    RAISE EXCEPTION 'Maintenance status was not updated';
  END IF;
  IF public.update_finance_maintenance_status(job_id, actor, 'scheduled', 'paid') THEN
    RAISE EXCEPTION 'Stale maintenance status was accepted';
  END IF;
  IF (SELECT count(*) FROM public.finance_property_maintenance_status_events
      WHERE maintenance_id = job_id AND previous_status = 'scheduled'
        AND next_status = 'paid' AND changed_by = actor) <> 1 THEN
    RAISE EXCEPTION 'Maintenance change history was not retained';
  END IF;
  IF has_table_privilege('authenticated', 'public.finance_property_maintenance_status_events', 'SELECT')
    OR has_function_privilege('authenticated', 'public.void_finance_rent_payment(uuid,uuid,text)', 'EXECUTE')
    OR has_function_privilege('authenticated', 'public.update_finance_maintenance_status(uuid,uuid,text,text)', 'EXECUTE') THEN
    RAISE EXCEPTION 'Authenticated role bypasses the Finance property correction boundary';
  END IF;
END $$;
ROLLBACK;
