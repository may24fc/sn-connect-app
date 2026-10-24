BEGIN;

-- Saved insight answers quote named, sensitive reflection content. Conversations
-- that their owner deleted are kept for 30 days (soft delete), then permanently
-- removed together with their messages (ON DELETE CASCADE).

CREATE OR REPLACE FUNCTION public.purge_deleted_performance_insight_conversations(
  p_retention interval DEFAULT interval '30 days'
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  purged integer;
BEGIN
  IF p_retention < interval '1 day' THEN
    RAISE EXCEPTION 'Retention must be at least one day';
  END IF;

  DELETE FROM public.performance_insight_conversations
  WHERE deleted_at IS NOT NULL
    AND deleted_at < now() - p_retention;

  GET DIAGNOSTICS purged = ROW_COUNT;
  RETURN purged;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_deleted_performance_insight_conversations(interval)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_deleted_performance_insight_conversations(interval)
  TO service_role;

COMMENT ON FUNCTION public.purge_deleted_performance_insight_conversations(interval) IS
  'Permanently deletes insight conversations soft-deleted longer than the retention period (default 30 days); messages cascade.';

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

SELECT cron.unschedule('purge-deleted-performance-insights')
WHERE EXISTS (
  SELECT 1 FROM cron.job WHERE jobname = 'purge-deleted-performance-insights'
);

-- Daily at 03:15 UTC (11:15 Asia/Manila).
SELECT cron.schedule(
  'purge-deleted-performance-insights',
  '15 3 * * *',
  $$ SELECT public.purge_deleted_performance_insight_conversations(); $$
);

COMMIT;
