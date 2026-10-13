BEGIN;

CREATE TABLE public.finance_property_terms (
  property_id uuid NOT NULL REFERENCES public.finance_properties(id) ON DELETE CASCADE,
  effective_month date NOT NULL CHECK (EXTRACT(day FROM effective_month) = 1),
  tenant_name text CHECK (tenant_name IS NULL OR length(tenant_name) <= 180),
  occupancy text NOT NULL CHECK (occupancy IN ('occupied', 'vacant')),
  weekly_rent_aud numeric(12,2) NOT NULL CHECK (weekly_rent_aud >= 0),
  due_day integer NOT NULL CHECK (due_day BETWEEN 1 AND 28),
  changed_by uuid NOT NULL REFERENCES public.users(id),
  changed_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (property_id, effective_month)
);

CREATE INDEX finance_property_terms_effective_idx
  ON public.finance_property_terms(effective_month, property_id);

CREATE TABLE public.finance_property_monthly_expected_rent (
  property_id uuid NOT NULL REFERENCES public.finance_properties(id) ON DELETE CASCADE,
  period_month date NOT NULL CHECK (EXTRACT(day FROM period_month) = 1),
  expected_rent_aud numeric(12,2) NOT NULL CHECK (expected_rent_aud >= 0),
  calculation_note text CHECK (calculation_note IS NULL OR length(calculation_note) <= 500),
  updated_by uuid NOT NULL REFERENCES public.users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (property_id, period_month)
);

INSERT INTO public.finance_property_terms (
  property_id, effective_month, tenant_name, occupancy, weekly_rent_aud, due_day, changed_by, changed_at
)
SELECT id, date_trunc('month', created_at)::date, tenant_name, occupancy,
       weekly_rent_aud, due_day, created_by, created_at
FROM public.finance_properties
ON CONFLICT (property_id, effective_month) DO NOTHING;

CREATE OR REPLACE FUNCTION public.create_initial_finance_property_term()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.finance_property_terms (
    property_id, effective_month, tenant_name, occupancy, weekly_rent_aud, due_day, changed_by, changed_at
  ) VALUES (
    NEW.id, date_trunc('month', NEW.created_at)::date, NEW.tenant_name, NEW.occupancy,
    NEW.weekly_rent_aud, NEW.due_day, NEW.created_by, NEW.created_at
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER finance_property_initial_term
AFTER INSERT ON public.finance_properties
FOR EACH ROW EXECUTE FUNCTION public.create_initial_finance_property_term();

ALTER TABLE public.finance_property_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_property_monthly_expected_rent ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.finance_property_terms, public.finance_property_monthly_expected_rent
  FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.finance_property_terms, public.finance_property_monthly_expected_rent
  TO service_role;

COMMIT;
