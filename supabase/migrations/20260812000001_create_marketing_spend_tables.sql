-- Migration: Create marketing spend tracking tables
-- Created: 2026-08-12
-- Description: Additive-only ad expense tracking domain for direct logging and dashboard summaries.

BEGIN;

CREATE TABLE public.marketing_platforms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  code text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz
);

CREATE TABLE public.marketing_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  platform_id uuid NOT NULL REFERENCES public.marketing_platforms(id),
  name text NOT NULL,
  campaign_month date NOT NULL,
  billing_cycle text NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'weekly', 'custom')),
  cap_amount numeric(12,2) NOT NULL DEFAULT 0 CHECK (cap_amount >= 0),
  currency char(3) NOT NULL DEFAULT 'AUD',
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('draft', 'active', 'closed', 'archived')),
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE TABLE public.marketing_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.marketing_campaigns(id),
  platform_id uuid NOT NULL REFERENCES public.marketing_platforms(id),
  employee_id uuid REFERENCES public.employees(id),
  submitted_by uuid NOT NULL REFERENCES auth.users(id),
  entry_date date NOT NULL,
  transaction_id text,
  payment_method text,
  amount numeric(12,2) NOT NULL CHECK (amount >= 0),
  invoice_reference text,
  currency char(3) NOT NULL DEFAULT 'AUD',
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz
);

CREATE TABLE public.marketing_access_grants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  platform_id uuid REFERENCES public.marketing_platforms(id),
  can_submit boolean NOT NULL DEFAULT false,
  can_view_overview boolean NOT NULL DEFAULT false,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

CREATE INDEX idx_marketing_campaigns_platform_id
  ON public.marketing_campaigns(platform_id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_marketing_campaigns_campaign_month
  ON public.marketing_campaigns(campaign_month)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_marketing_entries_campaign_id
  ON public.marketing_entries(campaign_id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_marketing_entries_platform_id
  ON public.marketing_entries(platform_id)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_marketing_entries_entry_date
  ON public.marketing_entries(entry_date)
  WHERE deleted_at IS NULL;

CREATE INDEX idx_marketing_access_grants_user_id
  ON public.marketing_access_grants(user_id)
  WHERE deleted_at IS NULL;

ALTER TABLE public.marketing_platforms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_platforms FORCE ROW LEVEL SECURITY;

ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_campaigns FORCE ROW LEVEL SECURITY;

ALTER TABLE public.marketing_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_entries FORCE ROW LEVEL SECURITY;

ALTER TABLE public.marketing_access_grants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.marketing_access_grants FORCE ROW LEVEL SECURITY;

CREATE POLICY marketing_platforms_select_policy ON public.marketing_platforms
  FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY marketing_platforms_insert_policy ON public.marketing_platforms
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
    AND deleted_at IS NULL
  );

CREATE POLICY marketing_platforms_update_policy ON public.marketing_platforms
  FOR UPDATE
  TO authenticated
  USING (
    user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
    AND deleted_at IS NULL
  )
  WITH CHECK (
    user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
  );

CREATE POLICY marketing_campaigns_select_policy ON public.marketing_campaigns
  FOR SELECT
  TO authenticated
  USING (deleted_at IS NULL);

CREATE POLICY marketing_campaigns_insert_policy ON public.marketing_campaigns
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
      OR EXISTS (
        SELECT 1
        FROM public.marketing_access_grants mag
        WHERE mag.user_id = auth.uid()
          AND mag.platform_id = marketing_campaigns.platform_id
          AND mag.can_submit = true
          AND mag.deleted_at IS NULL
      )
    )
    AND deleted_at IS NULL
  );

CREATE POLICY marketing_campaigns_update_policy ON public.marketing_campaigns
  FOR UPDATE
  TO authenticated
  USING (
    (
      user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
      OR EXISTS (
        SELECT 1
        FROM public.marketing_access_grants mag
        WHERE mag.user_id = auth.uid()
          AND mag.platform_id = marketing_campaigns.platform_id
          AND mag.can_submit = true
          AND mag.deleted_at IS NULL
      )
    )
    AND deleted_at IS NULL
  )
  WITH CHECK (
    user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
    OR EXISTS (
      SELECT 1
      FROM public.marketing_access_grants mag
      WHERE mag.user_id = auth.uid()
        AND mag.platform_id = marketing_campaigns.platform_id
        AND mag.can_submit = true
        AND mag.deleted_at IS NULL
    )
  );

CREATE POLICY marketing_entries_select_policy ON public.marketing_entries
  FOR SELECT
  TO authenticated
  USING (
    (
      submitted_by = auth.uid()
      OR EXISTS (
        SELECT 1
        FROM public.marketing_access_grants mag
        WHERE mag.user_id = auth.uid()
          AND mag.platform_id = marketing_entries.platform_id
          AND mag.can_view_overview = true
          AND mag.deleted_at IS NULL
      )
      OR user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
    )
    AND deleted_at IS NULL
  );

CREATE POLICY marketing_entries_insert_policy ON public.marketing_entries
  FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      submitted_by = auth.uid()
      AND (
        EXISTS (
          SELECT 1
          FROM public.marketing_access_grants mag
          WHERE mag.user_id = auth.uid()
            AND mag.platform_id = marketing_entries.platform_id
            AND mag.can_submit = true
            AND mag.deleted_at IS NULL
        )
        OR user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
      )
    )
    AND deleted_at IS NULL
  );

CREATE POLICY marketing_entries_update_policy ON public.marketing_entries
  FOR UPDATE
  TO authenticated
  USING (
    (
      submitted_by = auth.uid()
      OR user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
    )
    AND deleted_at IS NULL
  )
  WITH CHECK (
    submitted_by = auth.uid()
    OR user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
  );

CREATE POLICY marketing_access_grants_select_policy ON public.marketing_access_grants
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
  );

CREATE POLICY marketing_access_grants_insert_policy ON public.marketing_access_grants
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
    AND deleted_at IS NULL
  );

CREATE POLICY marketing_access_grants_update_policy ON public.marketing_access_grants
  FOR UPDATE
  TO authenticated
  USING (
    user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
    AND deleted_at IS NULL
  )
  WITH CHECK (
    user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
  );

CREATE VIEW public.marketing_platform_totals AS
SELECT
  me.platform_id,
  mp.name AS platform_name,
  SUM(me.amount) AS total_spend
FROM public.marketing_entries me
JOIN public.marketing_platforms mp
  ON mp.id = me.platform_id
WHERE me.deleted_at IS NULL
GROUP BY me.platform_id, mp.name;

CREATE VIEW public.marketing_monthly_platform_totals AS
SELECT
  me.platform_id,
  mp.name AS platform_name,
  date_trunc('month', me.entry_date)::date AS campaign_month,
  SUM(me.amount) AS total_spend
FROM public.marketing_entries me
JOIN public.marketing_platforms mp
  ON mp.id = me.platform_id
WHERE me.deleted_at IS NULL
GROUP BY me.platform_id, mp.name, date_trunc('month', me.entry_date)::date;

CREATE TRIGGER trigger_marketing_platforms_updated_at
  BEFORE UPDATE ON public.marketing_platforms
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_marketing_campaigns_updated_at
  BEFORE UPDATE ON public.marketing_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_marketing_entries_updated_at
  BEFORE UPDATE ON public.marketing_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_marketing_access_grants_updated_at
  BEFORE UPDATE ON public.marketing_access_grants
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

CREATE TRIGGER trigger_marketing_platforms_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.marketing_platforms
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_audit_log();

CREATE TRIGGER trigger_marketing_campaigns_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.marketing_campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_audit_log();

CREATE TRIGGER trigger_marketing_entries_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.marketing_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_audit_log();

CREATE TRIGGER trigger_marketing_access_grants_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.marketing_access_grants
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_audit_log();

COMMENT ON TABLE public.marketing_platforms IS 'Lookup table for supported ad and marketing channels.';
COMMENT ON TABLE public.marketing_campaigns IS 'Monthly or recurring campaign buckets used for ad expense aggregation.';
COMMENT ON TABLE public.marketing_entries IS 'Raw ad expense logs submitted by marketing staff.';
COMMENT ON TABLE public.marketing_access_grants IS 'Access permissions for marketing submission and overview visibility.';

COMMENT ON VIEW public.marketing_platform_totals IS 'Total logged spend by platform across all campaign periods.';
COMMENT ON VIEW public.marketing_monthly_platform_totals IS 'Logged spend by platform and month for monthly overview reporting.';

COMMIT;
