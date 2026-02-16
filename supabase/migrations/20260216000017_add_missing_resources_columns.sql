-- Migration: Add Missing Columns to Resources Table
-- Created: 2026-02-16
-- Description: Adds expires_at and excerpt columns to resources table if missing
-- These columns are required by the resources API endpoints but were missing from the database

BEGIN;

-- ============================================
-- Step 1: Add expires_at column if missing
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'resources'
      AND column_name = 'expires_at'
  ) THEN
    ALTER TABLE public.resources ADD COLUMN expires_at TIMESTAMPTZ;
    RAISE NOTICE 'Added expires_at column to resources table';
  ELSE
    RAISE NOTICE 'expires_at column already exists in resources table';
  END IF;
END $$;

-- ============================================
-- Step 2: Add excerpt column if missing
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'resources'
      AND column_name = 'excerpt'
  ) THEN
    ALTER TABLE public.resources ADD COLUMN excerpt TEXT;
    RAISE NOTICE 'Added excerpt column to resources table';
  ELSE
    RAISE NOTICE 'excerpt column already exists in resources table';
  END IF;
END $$;

-- ============================================
-- Step 3: Backfill excerpt from description for existing rows
-- ============================================

-- Auto-generate excerpts for existing resources that have descriptions but no excerpt
UPDATE public.resources
SET excerpt = CASE
  WHEN length(description) > 200 THEN left(description, 200) || '...'
  ELSE description
END
WHERE excerpt IS NULL AND description IS NOT NULL;

-- ============================================
-- Step 4: Add comments for documentation
-- ============================================

COMMENT ON COLUMN public.resources.expires_at IS 'Optional expiration timestamp - resources expire after this date (NULL = never expires)';
COMMENT ON COLUMN public.resources.excerpt IS 'Short summary (auto-generated from first 200 chars of description if null)';

COMMIT;
