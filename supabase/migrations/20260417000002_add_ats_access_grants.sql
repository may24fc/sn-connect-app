BEGIN;

CREATE TABLE IF NOT EXISTS public.ats_access_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  access_level text NOT NULL DEFAULT 'full' CHECK (access_level IN ('full')),
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_ats_access_grants_user_active
  ON public.ats_access_grants (user_id)
  WHERE deleted_at IS NULL;

ALTER TABLE public.ats_access_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ats_access_grants FORCE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.user_has_ats_access(target_user_id uuid)
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
    FROM public.ats_access_grants grant_row
    WHERE grant_row.user_id = target_user_id
      AND grant_row.deleted_at IS NULL
  );
$$;

DROP POLICY IF EXISTS ats_access_grants_select_own_policy ON public.ats_access_grants;
CREATE POLICY ats_access_grants_select_own_policy
  ON public.ats_access_grants FOR SELECT
  USING (
    auth.uid() = user_id
    AND deleted_at IS NULL
  );

DROP POLICY IF EXISTS ats_access_grants_select_admin_policy ON public.ats_access_grants;
CREATE POLICY ats_access_grants_select_admin_policy
  ON public.ats_access_grants FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.deleted_at IS NULL
        AND u.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS ats_access_grants_insert_admin_policy ON public.ats_access_grants;
CREATE POLICY ats_access_grants_insert_admin_policy
  ON public.ats_access_grants FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.deleted_at IS NULL
        AND u.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS ats_access_grants_update_admin_policy ON public.ats_access_grants;
CREATE POLICY ats_access_grants_update_admin_policy
  ON public.ats_access_grants FOR UPDATE
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

DROP POLICY IF EXISTS ats_access_grants_delete_admin_policy ON public.ats_access_grants;
CREATE POLICY ats_access_grants_delete_admin_policy
  ON public.ats_access_grants FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.deleted_at IS NULL
        AND u.role IN ('admin', 'super_admin')
    )
  );

DROP POLICY IF EXISTS job_postings_admin_all_policy ON public.job_postings;
CREATE POLICY job_postings_admin_all_policy
  ON public.job_postings FOR ALL
  USING (public.user_has_ats_access(auth.uid()))
  WITH CHECK (public.user_has_ats_access(auth.uid()));

DROP POLICY IF EXISTS job_applications_admin_select_policy ON public.job_applications;
CREATE POLICY job_applications_admin_select_policy
  ON public.job_applications FOR SELECT
  USING (public.user_has_ats_access(auth.uid()));

DROP POLICY IF EXISTS job_applications_admin_update_policy ON public.job_applications;
CREATE POLICY job_applications_admin_update_policy
  ON public.job_applications FOR UPDATE
  USING (public.user_has_ats_access(auth.uid()))
  WITH CHECK (public.user_has_ats_access(auth.uid()));

DROP POLICY IF EXISTS job_applications_super_admin_approve_policy ON public.job_applications;
CREATE POLICY job_applications_super_admin_approve_policy
  ON public.job_applications FOR UPDATE
  USING (public.user_has_ats_access(auth.uid()))
  WITH CHECK (public.user_has_ats_access(auth.uid()));

DROP POLICY IF EXISTS job_requisitions_admin_all_policy ON public.job_requisitions;
CREATE POLICY job_requisitions_admin_all_policy
  ON public.job_requisitions FOR ALL
  USING (public.user_has_ats_access(auth.uid()))
  WITH CHECK (public.user_has_ats_access(auth.uid()));

COMMENT ON TABLE public.ats_access_grants IS 'Feature-level ATS access grants for employee and intern users.';
COMMENT ON FUNCTION public.user_has_ats_access(uuid) IS 'Returns true for admin/super_admin users and users with an active ATS access grant.';

COMMIT;