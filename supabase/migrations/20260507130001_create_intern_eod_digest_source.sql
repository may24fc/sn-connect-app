-- Migration: Intern EOD digest source and run tracking
-- Created: 2026-05-07
-- Description: Adds a normalized RPC for prior-day intern EOD digests plus
--              a durable run-log table used by n8n for idempotency and history.

BEGIN;

CREATE TABLE IF NOT EXISTS public.intern_eod_digest_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_date date NOT NULL,
  channel text NOT NULL DEFAULT 'telegram',
  destination_key text NOT NULL,
  workflow_execution_id text,
  status text NOT NULL DEFAULT 'pending',
  summary_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  error_message text,
  sent_at timestamptz,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT intern_eod_digest_runs_channel_valid CHECK (channel IN ('telegram')),
  CONSTRAINT intern_eod_digest_runs_status_valid CHECK (status IN ('pending', 'sent', 'failed', 'skipped')),
  CONSTRAINT intern_eod_digest_runs_unique_scope UNIQUE (report_date, channel, destination_key)
);

CREATE INDEX IF NOT EXISTS idx_intern_eod_digest_runs_report_date
  ON public.intern_eod_digest_runs(report_date DESC)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_intern_eod_digest_runs_status
  ON public.intern_eod_digest_runs(status)
  WHERE deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_intern_eod_digest_runs_execution_id
  ON public.intern_eod_digest_runs(workflow_execution_id)
  WHERE workflow_execution_id IS NOT NULL;

ALTER TABLE public.intern_eod_digest_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.intern_eod_digest_runs FORCE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS intern_eod_digest_runs_admin_select_policy ON public.intern_eod_digest_runs;
CREATE POLICY intern_eod_digest_runs_admin_select_policy ON public.intern_eod_digest_runs
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
  );

DROP POLICY IF EXISTS intern_eod_digest_runs_admin_insert_policy ON public.intern_eod_digest_runs;
CREATE POLICY intern_eod_digest_runs_admin_insert_policy ON public.intern_eod_digest_runs
  FOR INSERT TO authenticated
  WITH CHECK (
    user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
  );

DROP POLICY IF EXISTS intern_eod_digest_runs_admin_update_policy ON public.intern_eod_digest_runs;
CREATE POLICY intern_eod_digest_runs_admin_update_policy ON public.intern_eod_digest_runs
  FOR UPDATE TO authenticated
  USING (
    user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
  )
  WITH CHECK (
    user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
  );

DROP TRIGGER IF EXISTS trigger_intern_eod_digest_runs_updated_at ON public.intern_eod_digest_runs;
CREATE TRIGGER trigger_intern_eod_digest_runs_updated_at
  BEFORE UPDATE ON public.intern_eod_digest_runs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON TABLE public.intern_eod_digest_runs IS 'Durable run log for the intern next-day EOD Telegram digest workflow.';

CREATE OR REPLACE FUNCTION public.intern_log_text_to_jsonb_array(p_value text)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT COALESCE(
    to_jsonb(
      ARRAY(
        SELECT trimmed_line
        FROM (
          SELECT NULLIF(BTRIM(line), '') AS trimmed_line
          FROM regexp_split_to_table(COALESCE(p_value, ''), E'\\r?\\n') AS line
        ) lines
        WHERE trimmed_line IS NOT NULL
      )
    ),
    '[]'::jsonb
  );
$$;

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
        'actionTaken', BTRIM(entry ->> 'actionTaken'),
        'outcome', BTRIM(entry ->> 'outcome')
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
        'id', 'fallback-' || md5(BTRIM(p_fallback_tasks_completed)),
        'projectFocus', 'General Update',
        'actionTaken', BTRIM(p_fallback_tasks_completed),
        'outcome', 'Completed for the day'
      )
    )
    ELSE '[]'::jsonb
  END
  FROM valid_entries;
$$;

DROP FUNCTION IF EXISTS public.get_intern_eod_digest_source(date);
CREATE OR REPLACE FUNCTION public.get_intern_eod_digest_source(target_date date DEFAULT NULL)
RETURNS TABLE (
  report_date date,
  department text,
  internship_id uuid,
  intern_employee_id uuid,
  intern_user_id uuid,
  intern_name text,
  intern_email text,
  supervisor_user_id uuid,
  supervisor_name text,
  supervisor_email text,
  daily_log_id uuid,
  log_date date,
  log_status text,
  is_approved boolean,
  hours_worked numeric,
  tasks_completed_summary text,
  project_entries jsonb,
  blockers jsonb,
  next_steps jsonb,
  attachments jsonb,
  attachment_count integer,
  has_attachments boolean,
  admin_detail_path text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  resolved_target_date date := COALESCE(target_date, ((now() AT TIME ZONE 'Asia/Manila')::date - 1));
  caller_role text := auth.role();
BEGIN
  IF caller_role IS DISTINCT FROM 'service_role' AND NOT user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[]) THEN
    RAISE EXCEPTION 'Only admins or service-role callers can access the intern EOD digest source'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  SELECT
    resolved_target_date AS report_date,
    COALESCE(NULLIF(BTRIM(intern_directory.department_name), ''), NULLIF(BTRIM(i.department), ''), 'Unassigned') AS department,
    i.id AS internship_id,
    i.employee_id AS intern_employee_id,
    intern_directory.user_id AS intern_user_id,
    COALESCE(NULLIF(BTRIM(intern_directory.full_name), ''), 'Unnamed Intern') AS intern_name,
    intern_directory.email AS intern_email,
    i.supervisor_id AS supervisor_user_id,
    NULLIF(BTRIM(supervisor_directory.full_name), '') AS supervisor_name,
    supervisor_directory.email AS supervisor_email,
    logs.id AS daily_log_id,
    logs.log_date,
    logs.status AS log_status,
    logs.is_approved,
    logs.hours_worked::numeric AS hours_worked,
    logs.tasks_completed AS tasks_completed_summary,
    public.normalize_intern_log_project_entries(logs.project_entries, logs.tasks_completed) AS project_entries,
    public.intern_log_text_to_jsonb_array(logs.challenges) AS blockers,
    public.intern_log_text_to_jsonb_array(logs.learnings) AS next_steps,
    CASE
      WHEN jsonb_typeof(COALESCE(logs.attachments, '[]'::jsonb)) = 'array' THEN COALESCE(logs.attachments, '[]'::jsonb)
      ELSE '[]'::jsonb
    END AS attachments,
    jsonb_array_length(
      CASE
        WHEN jsonb_typeof(COALESCE(logs.attachments, '[]'::jsonb)) = 'array' THEN COALESCE(logs.attachments, '[]'::jsonb)
        ELSE '[]'::jsonb
      END
    )::integer AS attachment_count,
    jsonb_array_length(
      CASE
        WHEN jsonb_typeof(COALESCE(logs.attachments, '[]'::jsonb)) = 'array' THEN COALESCE(logs.attachments, '[]'::jsonb)
        ELSE '[]'::jsonb
      END
    ) > 0 AS has_attachments,
    '/admin/interns/' || i.employee_id::text AS admin_detail_path
  FROM public.intern_daily_logs logs
  JOIN public.internships i ON i.id = logs.internship_id
  LEFT JOIN public.employee_directory intern_directory ON intern_directory.employee_id = i.employee_id
  LEFT JOIN public.employee_directory supervisor_directory ON supervisor_directory.user_id = i.supervisor_id
  WHERE logs.deleted_at IS NULL
    AND logs.log_date = resolved_target_date
    AND logs.status = 'submitted'
  ORDER BY
    COALESCE(NULLIF(BTRIM(intern_directory.department_name), ''), NULLIF(BTRIM(i.department), ''), 'Unassigned'),
    COALESCE(NULLIF(BTRIM(intern_directory.full_name), ''), 'Unnamed Intern'),
    logs.created_at,
    logs.id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_intern_eod_digest_source(date) TO authenticated, service_role;

COMMENT ON FUNCTION public.get_intern_eod_digest_source(date) IS 'Returns normalized prior-day intern EOD rows for n8n department digest workflows.';

COMMIT;