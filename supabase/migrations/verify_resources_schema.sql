-- Verification query: Check resources table columns
-- Run this manually in Supabase SQL Editor to verify the fix

SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'resources'
  AND column_name IN ('expires_at', 'excerpt', 'published_at', 'description', 'title')
ORDER BY column_name;
