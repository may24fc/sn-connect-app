BEGIN;

CREATE TABLE IF NOT EXISTS public.sfo_revenue_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year integer NOT NULL CHECK (year >= 2000 AND year <= 2100),
  month smallint NOT NULL CHECK (month BETWEEN 1 AND 12),
  actual_revenue_aud numeric(12, 2) NOT NULL CHECK (actual_revenue_aud >= 0),
  notes text,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sfo_revenue_entries_year_month_active
  ON public.sfo_revenue_entries (year, month)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.sfo_revenue_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  year integer NOT NULL CHECK (year >= 2000 AND year <= 2100),
  goal_amount_aud numeric(12, 2) NOT NULL CHECK (goal_amount_aud > 0),
  label text,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_sfo_revenue_goals_year_active
  ON public.sfo_revenue_goals (year, sort_order, created_at)
  WHERE deleted_at IS NULL;

CREATE TABLE IF NOT EXISTS public.revenue_forecast_access_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  access_level text NOT NULL DEFAULT 'full' CHECK (access_level IN ('full')),
  granted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_revenue_forecast_access_grants_user_active
  ON public.revenue_forecast_access_grants (user_id)
  WHERE deleted_at IS NULL;

ALTER TABLE public.sfo_revenue_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sfo_revenue_entries FORCE ROW LEVEL SECURITY;

ALTER TABLE public.sfo_revenue_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sfo_revenue_goals FORCE ROW LEVEL SECURITY;

ALTER TABLE public.revenue_forecast_access_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.revenue_forecast_access_grants FORCE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.user_has_revenue_forecast_access(target_user_id uuid)
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
      AND u.role = 'super_admin'
  )
  OR EXISTS (
    SELECT 1
    FROM public.revenue_forecast_access_grants grant_row
    WHERE grant_row.user_id = target_user_id
      AND grant_row.deleted_at IS NULL
  );
$$;

DROP POLICY IF EXISTS sfo_revenue_entries_select_access_policy ON public.sfo_revenue_entries;
CREATE POLICY sfo_revenue_entries_select_access_policy
  ON public.sfo_revenue_entries FOR SELECT
  USING (
    deleted_at IS NULL
    AND public.user_has_revenue_forecast_access(auth.uid())
  );

DROP POLICY IF EXISTS sfo_revenue_entries_insert_access_policy ON public.sfo_revenue_entries;
CREATE POLICY sfo_revenue_entries_insert_access_policy
  ON public.sfo_revenue_entries FOR INSERT
  WITH CHECK (
    public.user_has_revenue_forecast_access(auth.uid())
  );

DROP POLICY IF EXISTS sfo_revenue_entries_update_super_admin_policy ON public.sfo_revenue_entries;
CREATE POLICY sfo_revenue_entries_update_super_admin_policy
  ON public.sfo_revenue_entries FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.deleted_at IS NULL
        AND u.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.deleted_at IS NULL
        AND u.role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS sfo_revenue_entries_update_grantee_policy ON public.sfo_revenue_entries;
CREATE POLICY sfo_revenue_entries_update_grantee_policy
  ON public.sfo_revenue_entries FOR UPDATE
  USING (
    deleted_at IS NULL
    AND public.user_has_revenue_forecast_access(auth.uid())
  )
  WITH CHECK (
    deleted_at IS NULL
    AND public.user_has_revenue_forecast_access(auth.uid())
  );

DROP POLICY IF EXISTS sfo_revenue_goals_select_access_policy ON public.sfo_revenue_goals;
CREATE POLICY sfo_revenue_goals_select_access_policy
  ON public.sfo_revenue_goals FOR SELECT
  USING (
    deleted_at IS NULL
    AND public.user_has_revenue_forecast_access(auth.uid())
  );

DROP POLICY IF EXISTS sfo_revenue_goals_insert_super_admin_policy ON public.sfo_revenue_goals;
CREATE POLICY sfo_revenue_goals_insert_super_admin_policy
  ON public.sfo_revenue_goals FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.deleted_at IS NULL
        AND u.role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS sfo_revenue_goals_update_super_admin_policy ON public.sfo_revenue_goals;
CREATE POLICY sfo_revenue_goals_update_super_admin_policy
  ON public.sfo_revenue_goals FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.deleted_at IS NULL
        AND u.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.deleted_at IS NULL
        AND u.role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS revenue_forecast_access_grants_select_own_policy ON public.revenue_forecast_access_grants;
CREATE POLICY revenue_forecast_access_grants_select_own_policy
  ON public.revenue_forecast_access_grants FOR SELECT
  USING (
    auth.uid() = user_id
    AND deleted_at IS NULL
  );

DROP POLICY IF EXISTS revenue_forecast_access_grants_select_super_admin_policy ON public.revenue_forecast_access_grants;
CREATE POLICY revenue_forecast_access_grants_select_super_admin_policy
  ON public.revenue_forecast_access_grants FOR SELECT
  USING (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.deleted_at IS NULL
        AND u.role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS revenue_forecast_access_grants_insert_super_admin_policy ON public.revenue_forecast_access_grants;
CREATE POLICY revenue_forecast_access_grants_insert_super_admin_policy
  ON public.revenue_forecast_access_grants FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.deleted_at IS NULL
        AND u.role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS revenue_forecast_access_grants_update_super_admin_policy ON public.revenue_forecast_access_grants;
CREATE POLICY revenue_forecast_access_grants_update_super_admin_policy
  ON public.revenue_forecast_access_grants FOR UPDATE
  USING (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.deleted_at IS NULL
        AND u.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.deleted_at IS NULL
        AND u.role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS revenue_forecast_access_grants_delete_super_admin_policy ON public.revenue_forecast_access_grants;
CREATE POLICY revenue_forecast_access_grants_delete_super_admin_policy
  ON public.revenue_forecast_access_grants FOR DELETE
  USING (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.deleted_at IS NULL
        AND u.role = 'super_admin'
    )
  );

COMMENT ON TABLE public.sfo_revenue_entries IS 'SFO monthly revenue actuals in AUD used for projection and year-over-year forecasting.';
COMMENT ON TABLE public.sfo_revenue_goals IS 'Configurable annual SFO revenue goals used for progress bars in the forecast UI.';
COMMENT ON TABLE public.revenue_forecast_access_grants IS 'Feature-level Revenue Forecast access grants for employee and intern users.';
COMMENT ON FUNCTION public.user_has_revenue_forecast_access(uuid) IS 'Returns true for super_admin users and users with an active Revenue Forecast access grant.';

COMMIT;
