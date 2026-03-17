-- Migration: Schedule Milestone Announcements via pg_cron
-- Created: 2026-03-15
-- Description: Sets up a daily pg_cron job that invokes the
--              milestone-announcements Edge Function every day at 08:00 UTC.
--
-- PREREQUISITES
-- ─────────────
-- Before applying this migration, set the following database-level settings
-- in your Supabase project (Dashboard → Settings → Database → Configuration,
-- or via the Supabase CLI secret management):
--
--   ALTER DATABASE postgres SET app.supabase_url       = 'https://<ref>.supabase.co';
--   ALTER DATABASE postgres SET app.service_role_key   = '<service_role_jwt>';
--
-- These settings are read at cron-job execution time and are NEVER stored
-- in the migration file itself (no secrets in source control).
--
-- ALTERNATIVE: The GitHub Actions workflow `.github/workflows/daily-milestones.yml`
-- provides the same daily trigger and does NOT require pg_cron/pg_net.
-- Use whichever approach fits your deployment environment.

BEGIN;

-- Enable required extensions (safe to run on already-enabled extensions)
CREATE EXTENSION IF NOT EXISTS pg_cron  WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net   WITH SCHEMA extensions;

-- Remove any previously registered job of the same name (idempotent)
SELECT cron.unschedule('milestone-announcements-daily')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'milestone-announcements-daily'
);

-- Schedule the Edge Function to run every day at 08:00 UTC
SELECT cron.schedule(
  'milestone-announcements-daily',
  '0 8 * * *',
  $$
  SELECT extensions.net.http_post(
    url     := current_setting('app.supabase_url') || '/functions/v1/milestone-announcements',
    headers := jsonb_build_object(
      'Content-Type',  'application/json',
      'Authorization', 'Bearer ' || current_setting('app.service_role_key')
    ),
    body    := '{"scheduled": true}'::jsonb
  ) AS request_id;
  $$
);

COMMIT;
