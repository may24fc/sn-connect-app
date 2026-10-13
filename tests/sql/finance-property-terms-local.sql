-- LOCAL Supabase only; the fixture is rollback-only.
BEGIN;
DO $$
DECLARE
  actor uuid;
  target_property_id uuid;
  initial_month date;
BEGIN
  SELECT id INTO actor FROM public.users ORDER BY id LIMIT 1;
  IF actor IS NULL THEN RAISE EXCEPTION 'Local property checks need a user fixture'; END IF;

  INSERT INTO public.finance_properties
    (name, property_type, tenant_name, occupancy, weekly_rent_aud, due_day, created_by, created_at)
  VALUES
    ('Rollback historical property', 'Residential', 'First tenant', 'occupied', 650, 5,
     actor, '2026-05-12T00:00:00Z')
  RETURNING id INTO target_property_id;

  initial_month := '2026-05-01';
  IF (SELECT count(*) FROM public.finance_property_terms
      WHERE property_id = target_property_id
        AND effective_month = initial_month AND weekly_rent_aud = 650) <> 1 THEN
    RAISE EXCEPTION 'Initial effective-month terms were not captured';
  END IF;

  INSERT INTO public.finance_property_terms
    (property_id, effective_month, tenant_name, occupancy, weekly_rent_aud, due_day, changed_by)
  VALUES
    (target_property_id, '2026-07-01', 'Second tenant', 'occupied', 700, 5, actor);

  IF (SELECT weekly_rent_aud FROM public.finance_property_terms
      WHERE property_id = target_property_id
        AND effective_month <= '2026-06-01'
      ORDER BY effective_month DESC LIMIT 1) <> 650 THEN
    RAISE EXCEPTION 'A later rent term changed an earlier month';
  END IF;
  IF (SELECT weekly_rent_aud FROM public.finance_property_terms
      WHERE property_id = target_property_id
        AND effective_month <= '2026-07-01'
      ORDER BY effective_month DESC LIMIT 1) <> 700 THEN
    RAISE EXCEPTION 'The effective-month rent term was not selected';
  END IF;

  INSERT INTO public.finance_property_monthly_expected_rent
    (property_id, period_month, expected_rent_aud, calculation_note, updated_by)
  VALUES
    (target_property_id, '2026-07-01', 2700, '2 weeks at 650 plus 2 weeks at 700', actor);

  IF (SELECT expected_rent_aud FROM public.finance_property_monthly_expected_rent
      WHERE property_id = target_property_id
        AND period_month = '2026-07-01') <> 2700 THEN
    RAISE EXCEPTION 'Monthly expected-rent override was not retained';
  END IF;
  IF has_table_privilege('authenticated', 'public.finance_property_terms', 'SELECT')
    OR has_table_privilege('authenticated', 'public.finance_property_monthly_expected_rent', 'SELECT') THEN
    RAISE EXCEPTION 'Authenticated role bypasses the Finance property service boundary';
  END IF;
END $$;
ROLLBACK;
