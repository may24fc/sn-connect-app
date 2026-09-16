-- Migration: Enable Christmas Tree realtime updates
-- Created: 2026-09-15
-- Description: Publishes Christmas Tree tables to Realtime so subscribers can refetch the server snapshot.

BEGIN;

-- Realtime applies RLS per subscriber, so DEFAULT replica identity keeps UPDATE/DELETE payloads limited to the primary key.
ALTER TABLE public.christmas_ornaments REPLICA IDENTITY DEFAULT;
ALTER TABLE public.christmas_wishes REPLICA IDENTITY DEFAULT;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    CREATE PUBLICATION supabase_realtime;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'christmas_ornaments'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.christmas_ornaments;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'christmas_wishes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.christmas_wishes;
  END IF;
END
$$;

COMMIT;