-- Migration: Add update_updated_at_column trigger function
-- Created: 2026-04-02
-- Description: This trigger function is referenced by offboarding tables (20260210000007)
--   but was only defined much later (20260306000001). Create it early as an alias to
--   handle_updated_at() so the offboarding triggers can resolve it.

BEGIN;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.update_updated_at_column() IS 'Alias for handle_updated_at - updates updated_at on row change';

COMMIT;
