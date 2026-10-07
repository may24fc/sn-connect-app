BEGIN;

CREATE TABLE public.finance_properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 180),
  property_type text NOT NULL CHECK (length(trim(property_type)) BETWEEN 1 AND 100),
  tenant_name text,
  occupancy text NOT NULL DEFAULT 'occupied' CHECK (occupancy IN ('occupied', 'vacant')),
  weekly_rent_aud numeric(12,2) NOT NULL CHECK (weekly_rent_aud >= 0),
  due_day integer NOT NULL CHECK (due_day BETWEEN 1 AND 28),
  created_by uuid NOT NULL REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.finance_property_rent_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.finance_properties(id),
  period_month date NOT NULL CHECK (EXTRACT(day FROM period_month) = 1),
  received_on date NOT NULL,
  amount_aud numeric(12,2) NOT NULL CHECK (amount_aud > 0),
  reference text CHECK (reference IS NULL OR length(reference) <= 255),
  created_by uuid NOT NULL REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX finance_property_rent_month_idx ON public.finance_property_rent_payments(period_month, property_id);

CREATE TABLE public.finance_property_maintenance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  property_id uuid NOT NULL REFERENCES public.finance_properties(id),
  job_date date NOT NULL,
  description text NOT NULL CHECK (length(trim(description)) BETWEEN 1 AND 500),
  contractor text CHECK (contractor IS NULL OR length(contractor) <= 180),
  cost_aud numeric(12,2) NOT NULL CHECK (cost_aud >= 0),
  invoice_reference text CHECK (invoice_reference IS NULL OR length(invoice_reference) <= 255),
  status text NOT NULL CHECK (status IN ('scheduled', 'awaiting_invoice', 'paid')),
  created_by uuid NOT NULL REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX finance_property_maintenance_date_idx ON public.finance_property_maintenance(job_date, property_id);

ALTER TABLE public.finance_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_property_rent_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_property_maintenance ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.finance_properties, public.finance_property_rent_payments,
  public.finance_property_maintenance FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.finance_properties, public.finance_property_rent_payments,
  public.finance_property_maintenance TO service_role;

COMMIT;
