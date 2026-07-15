BEGIN;

CREATE TABLE IF NOT EXISTS public.crm_access_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  tracker text NOT NULL CHECK (tracker IN ('meta_leads', 'google_ads_leads', 'sn_tech_inquiries')),
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_crm_access_grants_user_tracker_active
  ON public.crm_access_grants (user_id, tracker)
  WHERE deleted_at IS NULL;

ALTER TABLE public.crm_access_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_access_grants FORCE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.user_has_crm_tracker_access(target_user_id uuid, target_tracker text)
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
    FROM public.crm_access_grants grant_row
    WHERE grant_row.user_id = target_user_id
      AND grant_row.tracker = target_tracker
      AND grant_row.deleted_at IS NULL
  );
$$;

DROP POLICY IF EXISTS crm_access_grants_select_own_policy ON public.crm_access_grants;
CREATE POLICY crm_access_grants_select_own_policy
  ON public.crm_access_grants FOR SELECT
  USING (
    auth.uid() = user_id
    AND deleted_at IS NULL
  );

DROP POLICY IF EXISTS crm_access_grants_select_admin_policy ON public.crm_access_grants;
CREATE POLICY crm_access_grants_select_admin_policy
  ON public.crm_access_grants FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.deleted_at IS NULL
        AND u.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS crm_access_grants_insert_admin_policy ON public.crm_access_grants;
CREATE POLICY crm_access_grants_insert_admin_policy
  ON public.crm_access_grants FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.deleted_at IS NULL
        AND u.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS crm_access_grants_update_admin_policy ON public.crm_access_grants;
CREATE POLICY crm_access_grants_update_admin_policy
  ON public.crm_access_grants FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.deleted_at IS NULL
        AND u.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.deleted_at IS NULL
        AND u.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS crm_access_grants_delete_admin_policy ON public.crm_access_grants;
CREATE POLICY crm_access_grants_delete_admin_policy
  ON public.crm_access_grants FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.deleted_at IS NULL
        AND u.role IN ('admin', 'super_admin')
    )
  );

COMMENT ON TABLE public.crm_access_grants IS 'Tracker-specific CRM access grants for employee and associate users.';
COMMENT ON FUNCTION public.user_has_crm_tracker_access(uuid, text) IS 'Returns true for admin/super_admin users and users with an active CRM grant for the requested tracker.';

COMMIT;
