-- V2-1.3: Bank registry for structured bank selection during onboarding
-- Replaces freeform bank name text input with a searchable dropdown

CREATE TABLE public.bank_registry (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  bank_name text NOT NULL,
  bank_code text,
  swift_code text,
  country_code text NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Indexes
CREATE INDEX idx_bank_registry_country ON public.bank_registry(country_code) WHERE is_active = true;
CREATE INDEX idx_bank_registry_name ON public.bank_registry(bank_name);

-- RLS: All authenticated users can read, only admins can manage
ALTER TABLE public.bank_registry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bank_registry FORCE ROW LEVEL SECURITY;

CREATE POLICY bank_registry_select_authenticated ON public.bank_registry
  FOR SELECT
  TO authenticated
  USING (is_active = true);

CREATE POLICY bank_registry_manage_admin ON public.bank_registry
  FOR ALL
  TO authenticated
  USING (
    public.user_has_any_role(auth.uid(), ARRAY['admin'::public.user_role, 'super_admin'::public.user_role])
  )
  WITH CHECK (
    public.user_has_any_role(auth.uid(), ARRAY['admin'::public.user_role, 'super_admin'::public.user_role])
  );

-- Seed with common banks across supported countries
INSERT INTO public.bank_registry (bank_name, bank_code, swift_code, country_code) VALUES
  -- Philippines
  ('BDO Unibank', 'BDO', 'BNORPHMM', 'PH'),
  ('BPI (Bank of the Philippine Islands)', 'BPI', 'BABORUPH', 'PH'),
  ('Metrobank', 'MBTC', 'MABORUPH', 'PH'),
  ('UnionBank', 'UBP', 'UBORPHMM', 'PH'),
  ('Security Bank', 'SB', 'SETCPHMU', 'PH'),
  ('China Banking Corporation', 'CBC', 'CHBKPHMU', 'PH'),
  ('RCBC (Rizal Commercial Banking Corp)', 'RCBC', 'RCBCPHMU', 'PH'),
  ('Landbank of the Philippines', 'LBP', 'TLBPPHMU', 'PH'),
  ('PNB (Philippine National Bank)', 'PNB', 'PNBMPHMU', 'PH'),
  ('GCash', 'GCASH', NULL, 'PH'),
  ('PayMaya / Maya', 'MAYA', NULL, 'PH'),
  -- Italy
  ('UniCredit', 'UCG', 'UNCRITMM', 'IT'),
  ('Intesa Sanpaolo', 'ISP', 'BCITITMM', 'IT'),
  ('Banca Monte dei Paschi di Siena', 'MPS', 'PASCITMM', 'IT'),
  ('Banco BPM', 'BPM', 'BAPUIT2B', 'IT'),
  -- Australia
  ('Commonwealth Bank', 'CBA', 'CTBAAU2S', 'AU'),
  ('Westpac', 'WBC', 'WPACAU2S', 'AU'),
  ('ANZ', 'ANZ', 'ANZBAU3M', 'AU'),
  ('NAB (National Australia Bank)', 'NAB', 'NATAAU33', 'AU'),
  -- United States
  ('Bank of America', 'BOFA', 'BOFAUS3N', 'US'),
  ('JPMorgan Chase', 'CHASE', 'CHASUS33', 'US'),
  ('Wells Fargo', 'WF', 'WFBIUS6S', 'US'),
  ('Citibank', 'CITI', 'CITIUS33', 'US'),
  -- United Kingdom
  ('HSBC', 'HSBC', 'MIDLGB2L', 'GB'),
  ('Barclays', 'BARC', 'BARCGB22', 'GB'),
  ('Lloyds Bank', 'LLOYDS', 'LOYDGB2L', 'GB'),
  ('NatWest', 'NATWEST', 'NWBKGB2L', 'GB'),
  -- Singapore
  ('DBS Bank', 'DBS', 'DBSSSGSG', 'SG'),
  ('OCBC', 'OCBC', 'OCBCSGSG', 'SG'),
  ('UOB', 'UOB', 'UOVBSGSG', 'SG'),
  -- Germany
  ('Deutsche Bank', 'DB', 'DEUTDEFF', 'DE'),
  ('Commerzbank', 'CBK', 'COBADEFF', 'DE'),
  -- Global / Digital
  ('Wise (TransferWise)', 'WISE', 'TRWIGB2L', 'GLOBAL'),
  ('Revolut', 'REVOLUT', 'REVOGB21', 'GLOBAL'),
  ('PayPal', 'PAYPAL', NULL, 'GLOBAL');

COMMENT ON TABLE public.bank_registry IS 'Registry of banks for selection during onboarding and payment setup';

-- Add bank_id reference to onboarding_profiles table
ALTER TABLE public.onboarding_profiles
  ADD COLUMN IF NOT EXISTS payment_bank_id uuid REFERENCES public.bank_registry(id),
  ADD COLUMN IF NOT EXISTS payment_bank_name text,
  ADD COLUMN IF NOT EXISTS payment_country_code text DEFAULT 'PH';

COMMENT ON COLUMN public.onboarding_profiles.payment_bank_id IS 'Selected bank from registry';
COMMENT ON COLUMN public.onboarding_profiles.payment_bank_name IS 'Custom bank name when "Other" is selected';
COMMENT ON COLUMN public.onboarding_profiles.payment_country_code IS 'Country for bank/payment filtering';
