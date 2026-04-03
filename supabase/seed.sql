-- Safe baseline seed for Supabase branches and fresh environments.
--
-- Intentionally minimal:
-- - no demo employees
-- - no fake auth-linked rows
-- - no sample announcements, reports, tasks, or invoices
--
-- Development-only sample data lives in:
--   supabase/seed/01_sample_data.sql
--   supabase/seed/02_corporate_website.sql
--
-- Apply those files manually in non-production environments only.

BEGIN;

-- No-op baseline seed.
SELECT 'safe_baseline_seed' AS status;

COMMIT;