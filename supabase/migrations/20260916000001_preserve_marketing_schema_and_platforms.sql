-- Migration: Preserve marketing schema and platform reference data
-- Created: 2026-09-16
-- Description: The invoice_file_name column and the meta/google/email platform rows were
--   previously defined only inside 20260817133900_import_marketing_ads_data.sql. That file has
--   moved to supabase/seed/ because it also carries real ad-spend records, so the schema and
--   reference data are restated here to keep fresh environments correct.

BEGIN;

ALTER TABLE public.marketing_entries
  ADD COLUMN IF NOT EXISTS invoice_file_name text;

INSERT INTO public.marketing_platforms (name, code, is_active, deleted_at)
VALUES
  ('Meta Ads', 'meta', true, NULL),
  ('Google Ads', 'google', true, NULL),
  ('Email Marketing', 'email', true, NULL)
ON CONFLICT (code) DO UPDATE
SET
  name = EXCLUDED.name,
  is_active = true,
  deleted_at = NULL,
  updated_at = now();

COMMIT;
