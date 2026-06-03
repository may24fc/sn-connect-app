BEGIN;

-- Allow both 'Meta' and 'Google Ads' as valid platform values.
-- Drop current strict constraint, add a broader one as NOT VALID (safe), then validate.

ALTER TABLE public.crm_sfo_leads
  DROP CONSTRAINT IF EXISTS crm_sfo_leads_platform_check;

ALTER TABLE public.crm_sfo_leads
  ADD CONSTRAINT crm_sfo_leads_platform_check CHECK (platform IN ('Meta','Google Ads')) NOT VALID;

-- No normalization needed: existing rows are 'Meta' after prior migration.

ALTER TABLE public.crm_sfo_leads
  VALIDATE CONSTRAINT crm_sfo_leads_platform_check;

COMMIT;
