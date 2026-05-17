-- Migration: Fix normalize_intern_log_project_entries to preserve challenge field
-- Created: 2026-05-18
-- Description: The original normalizer built project-entry objects without the
--              'challenge' key, causing the n8n digest workflow to always receive
--              entries where entry.challenge is undefined.  This migration adds
--              'challenge' to both the validated-entry path and the fallback path,
--              restoring parity with the app-side ProjectFocusEntry contract.

BEGIN;

CREATE OR REPLACE FUNCTION public.normalize_intern_log_project_entries(
  p_entries jsonb,
  p_fallback_tasks_completed text
)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $$
  WITH raw_entries AS (
    SELECT entry
    FROM jsonb_array_elements(
      CASE
        WHEN jsonb_typeof(COALESCE(p_entries, '[]'::jsonb)) = 'array' THEN COALESCE(p_entries, '[]'::jsonb)
        ELSE '[]'::jsonb
      END
    ) AS entry
  ),
  valid_entries AS (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', COALESCE(
          NULLIF(BTRIM(entry ->> 'id'), ''),
          'entry-' || md5(
            COALESCE(BTRIM(entry ->> 'projectFocus'), '') || '|' ||
            COALESCE(BTRIM(entry ->> 'actionTaken'), '') || '|' ||
            COALESCE(BTRIM(entry ->> 'outcome'), '')
          )
        ),
        'projectFocus', BTRIM(entry ->> 'projectFocus'),
        'challenge',    COALESCE(NULLIF(BTRIM(entry ->> 'challenge'), ''), ''),
        'actionTaken',  BTRIM(entry ->> 'actionTaken'),
        'outcome',      BTRIM(entry ->> 'outcome')
      )
    ) AS normalized_entries
    FROM raw_entries
    WHERE NULLIF(BTRIM(entry ->> 'projectFocus'), '') IS NOT NULL
      AND NULLIF(BTRIM(entry ->> 'actionTaken'), '') IS NOT NULL
      AND NULLIF(BTRIM(entry ->> 'outcome'), '') IS NOT NULL
  )
  SELECT CASE
    WHEN valid_entries.normalized_entries IS NOT NULL THEN valid_entries.normalized_entries
    WHEN NULLIF(BTRIM(p_fallback_tasks_completed), '') IS NOT NULL THEN jsonb_build_array(
      jsonb_build_object(
        'id',           'fallback-' || md5(BTRIM(p_fallback_tasks_completed)),
        'projectFocus', 'General Update',
        'challenge',    '',
        'actionTaken',  BTRIM(p_fallback_tasks_completed),
        'outcome',      'Completed for the day'
      )
    )
    ELSE '[]'::jsonb
  END
  FROM valid_entries;
$$;

COMMIT;
