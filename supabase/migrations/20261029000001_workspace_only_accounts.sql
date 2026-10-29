-- Workspace-only identities are external/non-workforce users whose production
-- access is limited to explicitly granted Control Hub workspaces.

ALTER TYPE public.user_role ADD VALUE IF NOT EXISTS 'workspace_user';
ALTER TYPE public.account_kind ADD VALUE IF NOT EXISTS 'workspace';

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_workspace_identity_check;
ALTER TABLE public.users
  ADD CONSTRAINT users_workspace_identity_check CHECK (
    account_kind::text <> 'workspace'
    OR (
      role::text = 'workspace_user'
      AND NULLIF(BTRIM(account_purpose), '') IS NOT NULL
      AND department_id IS NULL
      AND division_id IS NULL
    )
  );

CREATE TABLE IF NOT EXISTS public.workspace_access_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  workspace text NOT NULL CHECK (workspace IN ('internal', 'pa', 'sfo', 'uhp', 'property')),
  access_level text NOT NULL CHECK (access_level IN ('read', 'write')),
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_workspace_access_grants_user_workspace_active
  ON public.workspace_access_grants (user_id, workspace)
  WHERE deleted_at IS NULL;

ALTER TABLE public.workspace_access_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workspace_access_grants FORCE ROW LEVEL SECURITY;

CREATE POLICY workspace_access_grants_select_own
  ON public.workspace_access_grants FOR SELECT
  USING (auth.uid() = user_id AND deleted_at IS NULL);

CREATE POLICY workspace_access_grants_super_admin_manage
  ON public.workspace_access_grants FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role::text = 'super_admin'
        AND u.deleted_at IS NULL
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
        AND u.role::text = 'super_admin'
        AND u.deleted_at IS NULL
    )
  );

CREATE OR REPLACE FUNCTION public.user_has_workspace_access(
  target_user_id uuid,
  target_workspace text
) RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    JOIN public.workspace_access_grants grant_row ON grant_row.user_id = u.id
    WHERE u.id = target_user_id
      AND u.role::text = 'workspace_user'
      AND u.account_kind::text = 'workspace'
      AND u.status::text = 'active'
      AND u.deleted_at IS NULL
      AND grant_row.workspace = target_workspace
      AND grant_row.deleted_at IS NULL
  );
$$;

CREATE OR REPLACE FUNCTION public.user_can_write_workspace(
  target_user_id uuid,
  target_workspace text
) RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    JOIN public.workspace_access_grants grant_row ON grant_row.user_id = u.id
    WHERE u.id = target_user_id
      AND u.role::text = 'workspace_user'
      AND u.account_kind::text = 'workspace'
      AND u.status::text = 'active'
      AND u.deleted_at IS NULL
      AND grant_row.workspace = target_workspace
      AND grant_row.access_level = 'write'
      AND grant_row.deleted_at IS NULL
  );
$$;

COMMENT ON TABLE public.workspace_access_grants IS
  'Auditable, per-workspace production access for non-workforce identities.';
COMMENT ON COLUMN public.workspace_access_grants.access_level IS
  'read permits GET/HEAD access; write additionally permits workspace mutations.';
COMMENT ON COLUMN public.users.account_kind IS
  'Identity population: workforce, privileged human admin, workspace-only user, reviewer, test, or service.';
