BEGIN;

-- projects_select_member_policy queried project_contributors, whose
-- project_contributors_modify_lead_policy (FOR ALL, so it also applies to
-- SELECT) queried projects. Expanding either table's policies therefore
-- recursed into the other, and every RLS-scoped read of projects,
-- project_contributors, or tables whose policies read them (for example
-- project_documentations) failed with "infinite recursion detected in policy".
--
-- Membership checks now go through SECURITY DEFINER helpers that read the base
-- tables without re-entering RLS, following user_can_access_project. The
-- access rules themselves are unchanged.

CREATE OR REPLACE FUNCTION public.user_is_project_contributor(p_project_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.project_contributors c
    WHERE c.project_id = p_project_id
      AND c.user_id = p_user_id
  );
$$;

CREATE OR REPLACE FUNCTION public.user_leads_project(p_project_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.projects p
    WHERE p.id = p_project_id
      AND (p.lead_user_id = p_user_id OR p.supervisor_id = p_user_id)
  );
$$;

REVOKE ALL ON FUNCTION public.user_is_project_contributor(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.user_leads_project(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.user_is_project_contributor(uuid, uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.user_leads_project(uuid, uuid) TO authenticated, service_role;

DROP POLICY IF EXISTS projects_select_member_policy ON public.projects;
CREATE POLICY projects_select_member_policy ON public.projects
  FOR SELECT
  TO authenticated
  USING (
    projects.deleted_at IS NULL
    AND (
      projects.lead_user_id = auth.uid()
      OR projects.supervisor_id = auth.uid()
      OR projects.created_by = auth.uid()
      OR public.user_is_project_contributor(projects.id, auth.uid())
    )
  );

DROP POLICY IF EXISTS project_contributors_modify_lead_policy ON public.project_contributors;
CREATE POLICY project_contributors_modify_lead_policy ON public.project_contributors
  FOR ALL
  TO authenticated
  USING (
    public.user_leads_project(project_contributors.project_id, auth.uid())
    OR user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::public.user_role[])
  )
  WITH CHECK (
    public.user_leads_project(project_contributors.project_id, auth.uid())
    OR user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::public.user_role[])
  );

COMMENT ON FUNCTION public.user_is_project_contributor(uuid, uuid) IS
  'RLS helper: whether a user is a contributor on a project, without re-entering project_contributors policies.';
COMMENT ON FUNCTION public.user_leads_project(uuid, uuid) IS
  'RLS helper: whether a user leads or supervises a project, without re-entering projects policies.';

COMMIT;
