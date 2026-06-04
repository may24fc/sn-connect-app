-- ============================================================
-- Migration: get_intern_weekly_projects_digest RPC
-- Purpose  : Returns active intern project snapshots for the
--            weekly n8n projects digest workflow.
-- Called by: intern-weekly-projects-digest n8n workflow
--            (service_role key via PostgREST /rpc)
-- ============================================================

DROP FUNCTION IF EXISTS public.get_intern_weekly_projects_digest(date);

CREATE OR REPLACE FUNCTION public.get_intern_weekly_projects_digest(
  week_start date DEFAULT NULL
)
RETURNS TABLE (
  week_start_date   date,
  department        text,
  internship_id     uuid,
  intern_employee_id uuid,
  intern_user_id    uuid,
  intern_name       text,
  intern_email      text,
  total_projects    integer,
  projects          jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  -- Default to the ISO Monday of the current Manila week
  resolved_week_start date := COALESCE(
    week_start,
    date_trunc('week', (now() AT TIME ZONE 'Asia/Manila')::date)::date
  );
  caller_role text := auth.role();
BEGIN
  -- Restrict to service_role or admin / super_admin callers
  IF caller_role IS DISTINCT FROM 'service_role'
     AND NOT user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
  THEN
    RAISE EXCEPTION 'Only admins or service-role callers can access the intern weekly projects digest'
      USING ERRCODE = '42501';
  END IF;

  RETURN QUERY
  WITH active_interns AS (
    -- One row per active internship, enriched with directory data
    SELECT
      i.id                                                          AS internship_id,
      i.employee_id                                                 AS intern_employee_id,
      ed.user_id                                                    AS intern_user_id,
      COALESCE(NULLIF(BTRIM(ed.full_name),        ''), 'Unnamed Intern') AS intern_name,
      ed.email                                                      AS intern_email,
      COALESCE(
        NULLIF(BTRIM(ed.department_name), ''),
        NULLIF(BTRIM(i.department),       ''),
        'Unassigned'
      )                                                             AS department
    FROM public.internships i
    JOIN public.employee_directory ed ON ed.employee_id = i.employee_id
    WHERE i.status  = 'active'
      AND i.deleted_at IS NULL
  ),
  intern_projects AS (
    -- Active/planning projects where the intern is the lead
    SELECT
      ai.internship_id,
      ai.intern_employee_id,
      ai.intern_user_id,
      ai.intern_name,
      ai.intern_email,
      ai.department,
      p.id           AS project_id,
      p.name         AS project_name,
      p.status       AS project_status,
      p.health       AS project_health,
      p.progress_pct AS project_progress_pct,
      p.points_total AS project_points_total
    FROM active_interns ai
    JOIN public.projects p ON p.lead_user_id = ai.intern_user_id
    WHERE p.deleted_at IS NULL
      AND p.status IN ('planning', 'active')
  ),
  latest_monthly_milestones AS (
    -- Latest monthly milestone per project (most recent period_start)
    SELECT DISTINCT ON (pm.project_id)
      pm.project_id,
      pm.title        AS milestone_title,
      pm.status       AS milestone_status,
      pm.progress_pct AS milestone_progress_pct
    FROM public.project_milestones pm
    WHERE pm.period_type = 'month'
      AND pm.deleted_at IS NULL
    ORDER BY pm.project_id, pm.period_start DESC
  )
  SELECT
    resolved_week_start                           AS week_start_date,
    ip.department,
    ip.internship_id,
    ip.intern_employee_id,
    ip.intern_user_id,
    ip.intern_name,
    ip.intern_email,
    COUNT(ip.project_id)::integer                 AS total_projects,
    COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'id',            ip.project_id,
          'name',          ip.project_name,
          'status',        ip.project_status,
          'health',        ip.project_health,
          'progress_pct',  ip.project_progress_pct,
          'points_total',  ip.project_points_total,
          'monthly_milestone', CASE
            WHEN lmm.project_id IS NOT NULL THEN jsonb_build_object(
              'title',        lmm.milestone_title,
              'status',       lmm.milestone_status,
              'progress_pct', lmm.milestone_progress_pct
            )
            ELSE NULL
          END
        )
        ORDER BY ip.project_name
      ) FILTER (WHERE ip.project_id IS NOT NULL),
      '[]'::jsonb
    )                                             AS projects
  FROM intern_projects ip
  LEFT JOIN latest_monthly_milestones lmm ON lmm.project_id = ip.project_id
  GROUP BY
    ip.internship_id,
    ip.intern_employee_id,
    ip.intern_user_id,
    ip.intern_name,
    ip.intern_email,
    ip.department
  HAVING COUNT(ip.project_id) > 0
  ORDER BY
    ip.department,
    ip.intern_name;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_intern_weekly_projects_digest(date)
  TO authenticated, service_role;

COMMENT ON FUNCTION public.get_intern_weekly_projects_digest(date) IS
  'Returns one row per active intern (who has at least one active/planning project) '
  'for the weekly n8n Telegram projects digest. Each row includes project details '
  'and the latest monthly milestone overview per project.';
