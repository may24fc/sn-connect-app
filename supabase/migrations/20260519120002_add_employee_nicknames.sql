-- Migration: Add nicknames column to employees (intake name resolution)
-- Created: 2026-05-19
-- Description:
--   The Telegram intake pipeline needs to map informal names ("Cef", "Kazz") to
--   Supabase user IDs. We store an array of lowercased nicknames per employee and
--   seed it for the current associate roster. New nicknames can later be edited via
--   an admin UI.

BEGIN;

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS nicknames text[] NOT NULL DEFAULT ARRAY[]::text[];

CREATE INDEX IF NOT EXISTS idx_employees_nicknames ON public.employees USING GIN (nicknames);

COMMENT ON COLUMN public.employees.nicknames IS 'Lowercased informal names/aliases used to resolve free-text CEO messages to user IDs.';

-- Seed known associate nicknames. Idempotent: only updates rows whose nicknames
-- array does not already include the alias. Match by case-insensitive first
-- name so we do not depend on employee_number being known here.
UPDATE public.employees
SET nicknames = ARRAY(SELECT DISTINCT lower(x) FROM unnest(nicknames || ARRAY['cef','cefe','ceferino']::text[]) AS x)
WHERE lower(first_name) IN ('ceferino', 'cef');

UPDATE public.employees
SET nicknames = ARRAY(SELECT DISTINCT lower(x) FROM unnest(nicknames || ARRAY['franz']::text[]) AS x)
WHERE lower(first_name) = 'franz';

UPDATE public.employees
SET nicknames = ARRAY(SELECT DISTINCT lower(x) FROM unnest(nicknames || ARRAY['kazz']::text[]) AS x)
WHERE lower(first_name) IN ('kazz', 'kasz');

UPDATE public.employees
SET nicknames = ARRAY(SELECT DISTINCT lower(x) FROM unnest(nicknames || ARRAY['norman']::text[]) AS x)
WHERE lower(first_name) = 'norman';

UPDATE public.employees
SET nicknames = ARRAY(SELECT DISTINCT lower(x) FROM unnest(nicknames || ARRAY['naima']::text[]) AS x)
WHERE lower(first_name) = 'naima';

COMMIT;
