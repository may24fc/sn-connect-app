-- Migration: Align legacy intern values with associate terminology
-- Created: 2026-07-13
-- Description:
--   1) Converts legacy enum-backed data values from intern -> associate when present.
--   2) Renames expense processing status awaiting_intern_review -> awaiting_associate_review.
--   3) Updates check constraint to enforce the new processing status value.

BEGIN;

DO $$
DECLARE
  rec RECORD;
  role_type_schema text;
  role_has_intern boolean;
  role_has_associate boolean;
  employment_type_schema text;
  employment_has_intern boolean;
  employment_has_associate boolean;
BEGIN
  -- Resolve and normalize user_role enum values.
  SELECT n.nspname
  INTO role_type_schema
  FROM pg_type t
  JOIN pg_namespace n ON n.oid = t.typnamespace
  WHERE t.typname = 'user_role'
  LIMIT 1;

  IF role_type_schema IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE t.typname = 'user_role'
        AND n.nspname = role_type_schema
        AND e.enumlabel = 'intern'
    ) INTO role_has_intern;

    SELECT EXISTS (
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE t.typname = 'user_role'
        AND n.nspname = role_type_schema
        AND e.enumlabel = 'associate'
    ) INTO role_has_associate;

    IF role_has_intern AND NOT role_has_associate THEN
      EXECUTE format(
        'ALTER TYPE %I.user_role RENAME VALUE ''intern'' TO ''associate''',
        role_type_schema
      );
      role_has_associate := true;
    END IF;

    IF role_has_associate THEN
      FOR rec IN
        SELECT
          c.table_schema,
          c.table_name,
          c.column_name
        FROM information_schema.columns c
        JOIN information_schema.tables t
          ON t.table_schema = c.table_schema
         AND t.table_name = c.table_name
        WHERE c.udt_schema = role_type_schema
          AND c.udt_name = 'user_role'
          AND t.table_type = 'BASE TABLE'
      LOOP
        EXECUTE format(
          'UPDATE %I.%I SET %I = ''associate''::%I.user_role WHERE %I::text = ''intern''',
          rec.table_schema,
          rec.table_name,
          rec.column_name,
          role_type_schema,
          rec.column_name
        );
      END LOOP;
    END IF;
  END IF;

  -- Resolve and normalize employment_type enum values.
  SELECT n.nspname
  INTO employment_type_schema
  FROM pg_type t
  JOIN pg_namespace n ON n.oid = t.typnamespace
  WHERE t.typname = 'employment_type'
  LIMIT 1;

  IF employment_type_schema IS NOT NULL THEN
    SELECT EXISTS (
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE t.typname = 'employment_type'
        AND n.nspname = employment_type_schema
        AND e.enumlabel = 'intern'
    ) INTO employment_has_intern;

    SELECT EXISTS (
      SELECT 1
      FROM pg_enum e
      JOIN pg_type t ON t.oid = e.enumtypid
      JOIN pg_namespace n ON n.oid = t.typnamespace
      WHERE t.typname = 'employment_type'
        AND n.nspname = employment_type_schema
        AND e.enumlabel = 'associate'
    ) INTO employment_has_associate;

    IF employment_has_intern AND NOT employment_has_associate THEN
      EXECUTE format(
        'ALTER TYPE %I.employment_type RENAME VALUE ''intern'' TO ''associate''',
        employment_type_schema
      );
      employment_has_associate := true;
    END IF;

    IF employment_has_associate THEN
      FOR rec IN
        SELECT
          c.table_schema,
          c.table_name,
          c.column_name
        FROM information_schema.columns c
        JOIN information_schema.tables t
          ON t.table_schema = c.table_schema
         AND t.table_name = c.table_name
        WHERE c.udt_schema = employment_type_schema
          AND c.udt_name = 'employment_type'
          AND t.table_type = 'BASE TABLE'
      LOOP
        EXECUTE format(
          'UPDATE %I.%I SET %I = ''associate''::%I.employment_type WHERE %I::text = ''intern''',
          rec.table_schema,
          rec.table_name,
          rec.column_name,
          employment_type_schema,
          rec.column_name
        );
      END LOOP;
    END IF;
  END IF;
END $$;

-- Align expense workflow status value in existing records.
ALTER TABLE public.expense_entries
  DROP CONSTRAINT IF EXISTS expense_entries_processing_status_check;

UPDATE public.expense_entries
SET processing_status = 'awaiting_associate_review'
WHERE processing_status = 'awaiting_intern_review';

-- Enforce the new status set.

ALTER TABLE public.expense_entries
  ADD CONSTRAINT expense_entries_processing_status_check
  CHECK (
    processing_status IN (
      'draft_extracted',
      'awaiting_associate_review',
      'verified',
      'auto_approved',
      'leadership_review_required',
      'approved',
      'rejected'
    )
  );

COMMIT;
