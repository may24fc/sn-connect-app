BEGIN;

-- Drop any existing constraint first to avoid conflicts.
ALTER TABLE public.crm_sfo_leads
  DROP CONSTRAINT IF EXISTS crm_sfo_leads_platform_check;

-- Add the stricter CHECK but mark it NOT VALID so the DB won't validate existing rows yet.
ALTER TABLE public.crm_sfo_leads
  ADD CONSTRAINT crm_sfo_leads_platform_check CHECK (platform = 'Meta') NOT VALID;

-- Normalize existing `platform` values to 'Meta' for any non-conforming rows.
UPDATE public.crm_sfo_leads
SET platform = 'Meta'
WHERE platform IS DISTINCT FROM 'Meta';

-- Now validate the constraint against existing rows (should pass after the update).
ALTER TABLE public.crm_sfo_leads
  VALIDATE CONSTRAINT crm_sfo_leads_platform_check;

COMMIT;
