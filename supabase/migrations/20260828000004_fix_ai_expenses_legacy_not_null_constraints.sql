BEGIN;

-- Compatibility fix for environments that previously had the old
-- category/subcategory schema applied. Provider-first inserts do not send
-- category_id/subcategory_id anymore, so legacy NOT NULL constraints must be
-- removed when those columns still exist.
DO $$
BEGIN
  IF to_regclass('public.ai_expenses') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'ai_expenses'
        AND column_name = 'category_id'
        AND is_nullable = 'NO'
    ) THEN
      ALTER TABLE public.ai_expenses
        ALTER COLUMN category_id DROP NOT NULL;
    END IF;

    IF EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'ai_expenses'
        AND column_name = 'subcategory_id'
        AND is_nullable = 'NO'
    ) THEN
      ALTER TABLE public.ai_expenses
        ALTER COLUMN subcategory_id DROP NOT NULL;
    END IF;
  END IF;
END $$;

COMMIT;
