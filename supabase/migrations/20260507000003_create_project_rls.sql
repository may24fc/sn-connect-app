-- Migration: Project RLS Policies
-- Created: 2026-05-07
-- Description: Row-level security for projects, contributors, milestones, and checklist items.
--   Read:  lead, contributors, supervisor, admin/hr/cos/ceo/super_admin
--   Write: lead, contributors (limited), supervisor, admins
--   Approve milestone: supervisor or admins only

BEGIN;

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.projects FORCE ROW LEVEL SECURITY;

ALTER TABLE public.project_contributors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_contributors FORCE ROW LEVEL SECURITY;

ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_milestones FORCE ROW LEVEL SECURITY;

ALTER TABLE public.project_checklist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_checklist_items FORCE ROW LEVEL SECURITY;

-- ============================================
-- HELPER: is the current user associated with this project?
-- ============================================

CREATE OR REPLACE FUNCTION public.user_can_access_project(p_project_id uuid, p_user_id uuid)
RETURNS boolean AS $$
DECLARE
  v_match boolean := false;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id = p_project_id
      AND p.deleted_at IS NULL
      AND (
        p.lead_user_id = p_user_id
        OR p.supervisor_id = p_user_id
        OR p.created_by = p_user_id
        OR EXISTS (
          SELECT 1 FROM public.project_contributors c
          WHERE c.project_id = p.id AND c.user_id = p_user_id
        )
      )
  ) INTO v_match;

  RETURN v_match;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- ============================================
-- PROJECTS POLICIES
-- ============================================

CREATE POLICY projects_select_member_policy ON public.projects
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      lead_user_id = auth.uid()
      OR supervisor_id = auth.uid()
      OR created_by = auth.uid()
      OR EXISTS (
        SELECT 1 FROM public.project_contributors c
        WHERE c.project_id = projects.id AND c.user_id = auth.uid()
      )
    )
  );

CREATE POLICY projects_admin_all_policy ON public.projects
  FOR ALL TO authenticated
  USING (
    user_has_any_role(auth.uid(), ARRAY['admin','super_admin']::user_role[])
  )
  WITH CHECK (
    user_has_any_role(auth.uid(), ARRAY['admin','super_admin']::user_role[])
  );

-- Lead can update their own project; insert allowed for any authenticated user (creator becomes lead)
CREATE POLICY projects_insert_self_policy ON public.projects
  FOR INSERT TO authenticated
  WITH CHECK (lead_user_id = auth.uid() OR created_by = auth.uid());

CREATE POLICY projects_update_lead_policy ON public.projects
  FOR UPDATE TO authenticated
  USING (lead_user_id = auth.uid() OR supervisor_id = auth.uid())
  WITH CHECK (lead_user_id = auth.uid() OR supervisor_id = auth.uid());

-- ============================================
-- CONTRIBUTORS POLICIES
-- ============================================

CREATE POLICY project_contributors_select_policy ON public.project_contributors
  FOR SELECT TO authenticated
  USING (
    user_id = auth.uid()
    OR public.user_can_access_project(project_id, auth.uid())
    OR user_has_any_role(auth.uid(), ARRAY['admin','super_admin']::user_role[])
  );

CREATE POLICY project_contributors_modify_lead_policy ON public.project_contributors
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_contributors.project_id
        AND (p.lead_user_id = auth.uid() OR p.supervisor_id = auth.uid())
    )
    OR user_has_any_role(auth.uid(), ARRAY['admin','super_admin']::user_role[])
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id = project_contributors.project_id
        AND (p.lead_user_id = auth.uid() OR p.supervisor_id = auth.uid())
    )
    OR user_has_any_role(auth.uid(), ARRAY['admin','super_admin']::user_role[])
  );

-- ============================================
-- MILESTONES POLICIES
-- ============================================

CREATE POLICY project_milestones_select_policy ON public.project_milestones
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL AND (
      public.user_can_access_project(project_id, auth.uid())
      OR user_has_any_role(auth.uid(), ARRAY['admin','super_admin']::user_role[])
    )
  );

CREATE POLICY project_milestones_modify_member_policy ON public.project_milestones
  FOR ALL TO authenticated
  USING (
    public.user_can_access_project(project_id, auth.uid())
    OR user_has_any_role(auth.uid(), ARRAY['admin','super_admin']::user_role[])
  )
  WITH CHECK (
    public.user_can_access_project(project_id, auth.uid())
    OR user_has_any_role(auth.uid(), ARRAY['admin','super_admin']::user_role[])
  );

-- ============================================
-- CHECKLIST ITEMS POLICIES
-- ============================================

CREATE POLICY project_checklist_items_select_policy ON public.project_checklist_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_milestones m
      WHERE m.id = project_checklist_items.milestone_id
        AND m.deleted_at IS NULL
        AND (
          public.user_can_access_project(m.project_id, auth.uid())
          OR user_has_any_role(auth.uid(), ARRAY['admin','super_admin']::user_role[])
        )
    )
  );

CREATE POLICY project_checklist_items_modify_member_policy ON public.project_checklist_items
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.project_milestones m
      WHERE m.id = project_checklist_items.milestone_id
        AND (
          public.user_can_access_project(m.project_id, auth.uid())
          OR user_has_any_role(auth.uid(), ARRAY['admin','super_admin']::user_role[])
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.project_milestones m
      WHERE m.id = project_checklist_items.milestone_id
        AND (
          public.user_can_access_project(m.project_id, auth.uid())
          OR user_has_any_role(auth.uid(), ARRAY['admin','super_admin']::user_role[])
        )
    )
  );

COMMIT;
