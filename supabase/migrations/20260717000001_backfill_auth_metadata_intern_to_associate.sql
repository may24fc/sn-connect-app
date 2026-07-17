-- Migration: Backfill auth metadata role claims from intern -> associate
-- Created: 2026-07-17
-- Description:
--   Updates legacy Supabase Auth metadata values so session/JWT role claims
--   align with the renamed role taxonomy.

BEGIN;

-- Normalize app metadata claim used by API/session role checks.
UPDATE auth.users
SET raw_app_meta_data = jsonb_set(
  COALESCE(raw_app_meta_data, '{}'::jsonb),
  '{db_role}',
  '"associate"'::jsonb,
  true
)
WHERE lower(COALESCE(raw_app_meta_data ->> 'db_role', '')) = 'intern';

-- Normalize user metadata role label used by some UI/profile flows.
UPDATE auth.users
SET raw_user_meta_data = jsonb_set(
  COALESCE(raw_user_meta_data, '{}'::jsonb),
  '{role}',
  '"associate"'::jsonb,
  true
)
WHERE lower(COALESCE(raw_user_meta_data ->> 'role', '')) = 'intern';

COMMIT;
