BEGIN;

ALTER TABLE public.finance_properties
  ADD COLUMN property_code text,
  ADD COLUMN agent_name text,
  ADD COLUMN receiving_account_label text,
  ADD COLUMN rent_cadence text NOT NULL DEFAULT 'weekly',
  ADD COLUMN rent_amount_aud numeric(12,2);

UPDATE public.finance_properties
SET property_code = 'PROP-' || upper(left(replace(id::text, '-', ''), 8)),
    rent_amount_aud = weekly_rent_aud
WHERE property_code IS NULL OR rent_amount_aud IS NULL;

ALTER TABLE public.finance_properties
  ALTER COLUMN property_code SET NOT NULL,
  ALTER COLUMN rent_amount_aud SET NOT NULL,
  ADD CONSTRAINT finance_properties_code_unique UNIQUE (property_code),
  ADD CONSTRAINT finance_properties_cadence_check CHECK (rent_cadence IN ('weekly','biweekly')),
  ADD CONSTRAINT finance_properties_rent_amount_check CHECK (rent_amount_aud >= 0),
  ADD CONSTRAINT finance_properties_agent_check CHECK (agent_name IS NULL OR length(agent_name) <= 180),
  ADD CONSTRAINT finance_properties_account_label_check CHECK (receiving_account_label IS NULL OR length(receiving_account_label) <= 180);

ALTER TABLE public.finance_property_terms
  ADD COLUMN rent_cadence text NOT NULL DEFAULT 'weekly',
  ADD COLUMN rent_amount_aud numeric(12,2);

UPDATE public.finance_property_terms
SET rent_amount_aud = weekly_rent_aud
WHERE rent_amount_aud IS NULL;

ALTER TABLE public.finance_property_terms
  ALTER COLUMN rent_amount_aud SET NOT NULL,
  ADD CONSTRAINT finance_property_terms_cadence_check CHECK (rent_cadence IN ('weekly','biweekly')),
  ADD CONSTRAINT finance_property_terms_rent_amount_check CHECK (rent_amount_aud >= 0);

CREATE OR REPLACE FUNCTION public.create_initial_finance_property_term()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.finance_property_terms (
    property_id, effective_month, tenant_name, occupancy, weekly_rent_aud, due_day,
    rent_cadence, rent_amount_aud, changed_by, changed_at
  ) VALUES (
    NEW.id, date_trunc('month', NEW.created_at)::date, NEW.tenant_name, NEW.occupancy,
    NEW.weekly_rent_aud, NEW.due_day, NEW.rent_cadence, NEW.rent_amount_aud,
    NEW.created_by, NEW.created_at
  );
  RETURN NEW;
END;
$$;

COMMIT;
