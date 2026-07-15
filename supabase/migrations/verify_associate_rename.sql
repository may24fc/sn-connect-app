-- One-time verification script: intern -> associate normalization
-- Run manually in Supabase SQL Editor after deploying migrations.
-- The script raises an exception if any legacy enum/data/status values remain.

DO $$
DECLARE
  rec RECORD;
  value_count bigint;
  failures text[] := ARRAY[]::text[];
  has_user_role_associate boolean := false;
  has_user_role_intern boolean := false;
  has_employment_associate boolean := false;
  has_employment_intern boolean := false;
  status_constraint text;
BEGIN
  -- Verify enum labels for user_role.
  SELECT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'user_role'
      AND e.enumlabel = 'associate'
  ) INTO has_user_role_associate;

  SELECT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'user_role'
      AND e.enumlabel = 'intern'
  ) INTO has_user_role_intern;

  IF NOT has_user_role_associate THEN
    failures := array_append(failures, 'public.user_role enum is missing value associate');
  END IF;

  IF has_user_role_intern THEN
    failures := array_append(failures, 'public.user_role enum still contains legacy value intern');
  END IF;

  -- Verify enum labels for employment_type.
  SELECT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'employment_type'
      AND e.enumlabel = 'associate'
  ) INTO has_employment_associate;

  SELECT EXISTS (
    SELECT 1
    FROM pg_enum e
    JOIN pg_type t ON t.oid = e.enumtypid
    JOIN pg_namespace n ON n.oid = t.typnamespace
    WHERE n.nspname = 'public'
      AND t.typname = 'employment_type'
      AND e.enumlabel = 'intern'
  ) INTO has_employment_intern;

  IF NOT has_employment_associate THEN
    failures := array_append(failures, 'public.employment_type enum is missing value associate');
  END IF;

  IF has_employment_intern THEN
    failures := array_append(failures, 'public.employment_type enum still contains legacy value intern');
  END IF;

  -- Verify no enum-typed column still stores intern as text.
  FOR rec IN
    SELECT table_schema, table_name, column_name, udt_name
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND udt_name IN ('user_role', 'employment_type')
  LOOP
    EXECUTE format(
      'SELECT count(*) FROM %I.%I WHERE %I::text = ''intern''',
      rec.table_schema,
      rec.table_name,
      rec.column_name
    ) INTO value_count;

    IF value_count > 0 THEN
      failures := array_append(
        failures,
        format(
          '%I.%I.%I (%s) still has %s legacy intern value(s)',
          rec.table_schema,
          rec.table_name,
          rec.column_name,
          rec.udt_name,
          value_count
        )
      );
    END IF;
  END LOOP;

  -- Verify expense processing status conversion if table exists.
  IF to_regclass('public.expense_entries') IS NOT NULL THEN
    SELECT count(*)
    INTO value_count
    FROM public.expense_entries
    WHERE processing_status = 'awaiting_intern_review';

    IF value_count > 0 THEN
      failures := array_append(
        failures,
        format('public.expense_entries.processing_status still has %s awaiting_intern_review value(s)', value_count)
      );
    END IF;

    SELECT pg_get_constraintdef(c.oid)
    INTO status_constraint
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'expense_entries'
      AND c.conname = 'expense_entries_processing_status_check'
    LIMIT 1;

    IF status_constraint IS NULL THEN
      failures := array_append(
        failures,
        'public.expense_entries is missing constraint expense_entries_processing_status_check'
      );
    ELSE
      IF position('awaiting_intern_review' IN status_constraint) > 0 THEN
        failures := array_append(
          failures,
          'expense_entries_processing_status_check still references awaiting_intern_review'
        );
      END IF;

      IF position('awaiting_associate_review' IN status_constraint) = 0 THEN
        failures := array_append(
          failures,
          'expense_entries_processing_status_check is missing awaiting_associate_review'
        );
      END IF;
    END IF;
  END IF;

  IF coalesce(array_length(failures, 1), 0) > 0 THEN
    RAISE EXCEPTION E'Associate rename verification failed:\n - %', array_to_string(failures, E'\n - ');
  END IF;

  RAISE NOTICE 'Associate rename verification passed. No legacy intern enum/data/status values found.';
END $$;

-- Optional human-readable snapshot
SELECT
  t.typname AS enum_type,
  e.enumlabel AS enum_value
FROM pg_type t
JOIN pg_enum e ON e.enumtypid = t.oid
JOIN pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public'
  AND t.typname IN ('user_role', 'employment_type')
ORDER BY t.typname, e.enumsortorder;
