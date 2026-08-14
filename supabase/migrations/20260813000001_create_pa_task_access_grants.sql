-- Migration: Create pa_task_access_grants
-- Created: 2026-08-13
-- Description: Feature-level access grants for the PA/EA Task Tracker module.
--   Modeled on ats_access_grants (20260417000002_add_ats_access_grants.sql).
--   Three-tier access_level: 'member' (normal tracker access), 'manager'
--   (manage lookup lists), and 'admin' (manage lookup lists + grant access).
--   admin/super_admin always pass both checks regardless of grant rows.
-- Dependencies: public.users

BEGIN;

CREATE TABLE public.pa_task_access_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  access_level text NOT NULL DEFAULT 'member' CHECK (access_level IN ('member', 'manager', 'admin')),
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX idx_pa_task_access_grants_user_active
  ON public.pa_task_access_grants (user_id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_pa_task_access_grants_access_level
  ON public.pa_task_access_grants (access_level)
  WHERE deleted_at IS NULL;

ALTER TABLE public.pa_task_access_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pa_task_access_grants FORCE ROW LEVEL SECURITY;

CREATE TRIGGER trigger_pa_task_access_grants_updated_at
  BEFORE UPDATE ON public.pa_task_access_grants
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- Helper functions
-- ============================================

-- Module entry gate: admin/super_admin, or any active grant (any tier)
CREATE OR REPLACE FUNCTION public.user_has_pa_task_access(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = target_user_id
      AND u.deleted_at IS NULL
      AND u.role IN ('admin', 'super_admin')
  )
  OR EXISTS (
    SELECT 1
    FROM public.pa_task_access_grants grant_row
    WHERE grant_row.user_id = target_user_id
      AND grant_row.deleted_at IS NULL
  );
$$;

-- Management gate: admin/super_admin, or an active 'manager' or 'admin' grant.
-- Gates writes on the lookup tables and the access-grants table itself.
CREATE OR REPLACE FUNCTION public.user_can_manage_pa_task_lookups(target_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = target_user_id
      AND u.deleted_at IS NULL
      AND u.role IN ('admin', 'super_admin')
  )
  OR EXISTS (
    SELECT 1
    FROM public.pa_task_access_grants grant_row
    WHERE grant_row.user_id = target_user_id
      AND grant_row.deleted_at IS NULL
      AND grant_row.access_level IN ('manager', 'admin')
  );
$$;

-- ============================================
-- RLS Policies
-- ============================================

-- Any authenticated user can see their own grant row (so the UI can show their tier)
DROP POLICY IF EXISTS pa_task_access_grants_select_own_policy ON public.pa_task_access_grants;
CREATE POLICY pa_task_access_grants_select_own_policy
  ON public.pa_task_access_grants FOR SELECT
  USING (
    auth.uid() = user_id
    AND deleted_at IS NULL
  );

-- Admin/super_admin, or manager-tier grantees, can see all grant rows
DROP POLICY IF EXISTS pa_task_access_grants_select_manager_policy ON public.pa_task_access_grants;
CREATE POLICY pa_task_access_grants_select_manager_policy
  ON public.pa_task_access_grants FOR SELECT
  USING (public.user_can_manage_pa_task_lookups(auth.uid()));

DROP POLICY IF EXISTS pa_task_access_grants_insert_manager_policy ON public.pa_task_access_grants;
CREATE POLICY pa_task_access_grants_insert_manager_policy
  ON public.pa_task_access_grants FOR INSERT
  WITH CHECK (public.user_can_manage_pa_task_lookups(auth.uid()));

DROP POLICY IF EXISTS pa_task_access_grants_update_manager_policy ON public.pa_task_access_grants;
CREATE POLICY pa_task_access_grants_update_manager_policy
  ON public.pa_task_access_grants FOR UPDATE
  USING (public.user_can_manage_pa_task_lookups(auth.uid()))
  WITH CHECK (public.user_can_manage_pa_task_lookups(auth.uid()));

DROP POLICY IF EXISTS pa_task_access_grants_delete_manager_policy ON public.pa_task_access_grants;
CREATE POLICY pa_task_access_grants_delete_manager_policy
  ON public.pa_task_access_grants FOR DELETE
  USING (public.user_can_manage_pa_task_lookups(auth.uid()));

COMMENT ON TABLE public.pa_task_access_grants IS 'Feature-level access grants for the PA/EA Task Tracker module (employee/associate users). access_level: member (use tracker), manager (manage categories), admin (manage categories + grant access).';
COMMENT ON FUNCTION public.user_has_pa_task_access(uuid) IS 'Returns true for admin/super_admin users and users with an active PA/EA task tracker grant (member, manager, or admin).';
COMMENT ON FUNCTION public.user_can_manage_pa_task_lookups(uuid) IS 'Returns true for admin/super_admin users and users with an active manager/admin PA/EA task tracker grant.';

COMMIT;

-- DOWN Migration (run manually if rollback needed)
/*
BEGIN;

DROP POLICY IF EXISTS pa_task_access_grants_delete_manager_policy ON public.pa_task_access_grants;
DROP POLICY IF EXISTS pa_task_access_grants_update_manager_policy ON public.pa_task_access_grants;
DROP POLICY IF EXISTS pa_task_access_grants_insert_manager_policy ON public.pa_task_access_grants;
DROP POLICY IF EXISTS pa_task_access_grants_select_manager_policy ON public.pa_task_access_grants;
DROP POLICY IF EXISTS pa_task_access_grants_select_own_policy ON public.pa_task_access_grants;

DROP FUNCTION IF EXISTS public.user_can_manage_pa_task_lookups(uuid);
DROP FUNCTION IF EXISTS public.user_has_pa_task_access(uuid);

DROP TRIGGER IF EXISTS trigger_pa_task_access_grants_updated_at ON public.pa_task_access_grants;

DROP TABLE IF EXISTS public.pa_task_access_grants;

COMMIT;
*/
