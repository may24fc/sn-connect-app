-- Existing contributors labeled "lead" become project co-leads. The primary lead
-- remains in projects.lead_user_id for compatibility and initial department selection.

CREATE OR REPLACE FUNCTION public.user_leads_project(p_project_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.projects p
    JOIN public.users actor ON actor.id = p_user_id
    WHERE p.id = p_project_id
      AND p.deleted_at IS NULL
      AND actor.deleted_at IS NULL
      AND actor.status::text <> 'terminated'
      AND (
        p.lead_user_id = p_user_id
        OR p.supervisor_id = p_user_id
        OR EXISTS (
          SELECT 1
          FROM public.project_contributors c
          WHERE c.project_id = p.id
            AND c.user_id = p_user_id
            AND c.role = 'lead'
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.current_user_can_assign_project_lead(p_target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users target
    WHERE target.id = p_target_user_id
      AND target.deleted_at IS NULL
      AND target.status::text <> 'terminated'
      AND (
        target.id = auth.uid()
        OR public.user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::public.user_role[])
        OR (
          target.role::text IN ('employee', 'associate')
          AND EXISTS (
            SELECT 1
            FROM public.department_leads dl
            JOIN public.users actor ON actor.id = dl.user_id
            WHERE dl.user_id = auth.uid()
              AND dl.department_id = target.department_id
              AND dl.revoked_at IS NULL
              AND actor.deleted_at IS NULL
              AND actor.status::text <> 'terminated'
          )
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.current_user_can_assign_project_lead(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.current_user_can_assign_project_lead(uuid)
  TO authenticated, service_role;

DROP POLICY IF EXISTS projects_insert_self_policy ON public.projects;
CREATE POLICY projects_insert_self_policy ON public.projects
  FOR INSERT TO authenticated
  WITH CHECK (
    lead_user_id = auth.uid()
    AND (created_by = auth.uid() OR created_by IS NULL)
    AND supervisor_id IS NULL
    AND public.current_user_can_assign_project_lead(lead_user_id)
  );

DROP POLICY IF EXISTS projects_update_lead_policy ON public.projects;
CREATE POLICY projects_update_lead_policy ON public.projects
  FOR UPDATE TO authenticated
  USING (public.user_leads_project(id, auth.uid()))
  WITH CHECK (public.user_leads_project(id, auth.uid()));

DROP POLICY IF EXISTS project_contributors_modify_lead_policy ON public.project_contributors;
CREATE POLICY project_contributors_modify_lead_policy ON public.project_contributors
  FOR ALL TO authenticated
  USING (
    public.user_leads_project(project_id, auth.uid())
    OR public.user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::public.user_role[])
  )
  WITH CHECK (
    (
      public.user_leads_project(project_id, auth.uid())
      OR public.user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::public.user_role[])
    )
    AND (role <> 'lead' OR public.current_user_can_assign_project_lead(user_id))
  );

CREATE OR REPLACE FUNCTION public.protect_project_management_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF auth.role() = 'authenticated'
     AND NOT public.user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::public.user_role[])
     AND (
       NEW.lead_user_id IS DISTINCT FROM OLD.lead_user_id
       OR NEW.supervisor_id IS DISTINCT FROM OLD.supervisor_id
       OR NEW.created_by IS DISTINCT FROM OLD.created_by
     ) THEN
    RAISE EXCEPTION 'Project leadership changes must be made through the project API'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS projects_protect_management_fields ON public.projects;
CREATE TRIGGER projects_protect_management_fields
  BEFORE UPDATE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.protect_project_management_fields();

CREATE OR REPLACE FUNCTION public.ensure_primary_project_lead_is_contributor()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  INSERT INTO public.project_contributors (project_id, user_id, role)
  VALUES (NEW.id, NEW.lead_user_id, 'lead')
  ON CONFLICT (project_id, user_id) DO UPDATE SET role = 'lead'
    WHERE public.project_contributors.role <> 'lead';
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS projects_ensure_primary_lead_contributor ON public.projects;
CREATE TRIGGER projects_ensure_primary_lead_contributor
  AFTER INSERT OR UPDATE OF lead_user_id ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.ensure_primary_project_lead_is_contributor();

CREATE OR REPLACE FUNCTION public.protect_primary_project_lead()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = OLD.project_id
      AND p.deleted_at IS NULL
      AND p.lead_user_id = OLD.user_id
  ) THEN
    IF TG_OP = 'DELETE' THEN
      RAISE EXCEPTION 'The primary project lead cannot be removed'
        USING ERRCODE = '23514';
    END IF;
    IF NEW.project_id IS DISTINCT FROM OLD.project_id
       OR NEW.user_id IS DISTINCT FROM OLD.user_id
       OR NEW.role <> 'lead' THEN
      RAISE EXCEPTION 'The primary project lead cannot be demoted'
        USING ERRCODE = '23514';
    END IF;
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS project_contributors_protect_primary_lead ON public.project_contributors;
CREATE TRIGGER project_contributors_protect_primary_lead
  BEFORE UPDATE OR DELETE ON public.project_contributors
  FOR EACH ROW EXECUTE FUNCTION public.protect_primary_project_lead();

INSERT INTO public.project_contributors (project_id, user_id, role)
SELECT id, lead_user_id, 'lead'
FROM public.projects
WHERE deleted_at IS NULL
ON CONFLICT (project_id, user_id) DO UPDATE SET role = 'lead'
  WHERE public.project_contributors.role <> 'lead';

REVOKE ALL ON FUNCTION public.protect_project_management_fields() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ensure_primary_project_lead_is_contributor() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.protect_primary_project_lead() FROM PUBLIC, anon, authenticated;

COMMENT ON FUNCTION public.user_leads_project(uuid, uuid) IS
  'RLS helper: primary leads, supervisors, and active lead-role contributors manage the project.';
COMMENT ON TABLE public.project_contributors IS
  'Project membership. Lead-role contributors are project co-leads with management access.';
