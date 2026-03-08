-- V2-1.2: Foreign exchange rates table for multi-currency support
-- Rates are cached from Open Exchange Rates API, updated daily via Edge Function

CREATE TABLE public.fx_rates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  base_currency text NOT NULL DEFAULT 'USD',
  rates jsonb NOT NULL, -- { "PHP": 55.5, "EUR": 0.92, "AUD": 1.53, ... }
  fetched_at timestamptz DEFAULT now() NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL
);

-- Index for quick lookup of latest rates
CREATE INDEX idx_fx_rates_fetched_at ON public.fx_rates(fetched_at DESC);

-- RLS: Only admins can insert/update, all authenticated users can read
ALTER TABLE public.fx_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fx_rates FORCE ROW LEVEL SECURITY;

CREATE POLICY fx_rates_select_authenticated ON public.fx_rates
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY fx_rates_insert_admin ON public.fx_rates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.user_has_any_role(auth.uid(), ARRAY['admin'::public.user_role, 'super_admin'::public.user_role])
  );

-- Add multi-currency columns to invoices table
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS source_currency text DEFAULT 'PHP',
  ADD COLUMN IF NOT EXISTS target_currency text DEFAULT 'PHP',
  ADD COLUMN IF NOT EXISTS exchange_rate numeric(12,6),
  ADD COLUMN IF NOT EXISTS converted_amount numeric(12,2);

COMMENT ON TABLE public.fx_rates IS 'Cached foreign exchange rates from Open Exchange Rates API';
COMMENT ON COLUMN public.invoices.source_currency IS 'Currency the invoice was submitted in';
COMMENT ON COLUMN public.invoices.target_currency IS 'Currency for payment/display';
COMMENT ON COLUMN public.invoices.exchange_rate IS 'Exchange rate at time of submission';
COMMENT ON COLUMN public.invoices.converted_amount IS 'Net amount converted to target currency';
