BEGIN;

CREATE TABLE public.uhp_vp_standard_targets (
  category text PRIMARY KEY CHECK (
    category IN ('personal', 'repeat_customer', 'new_client', 'old_client', 'distributor')
  ),
  effective_from date NOT NULL DEFAULT '2026-11-01'
    CHECK (date_trunc('month', effective_from)::date = effective_from),
  target_vp numeric(12,2) NOT NULL DEFAULT 0 CHECK (target_vp >= 0),
  forecast_vp numeric(12,2) NOT NULL DEFAULT 0 CHECK (forecast_vp >= 0),
  updated_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.uhp_vp_standard_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.uhp_vp_standard_targets FORCE ROW LEVEL SECURITY;

CREATE POLICY uhp_vp_standard_targets_read ON public.uhp_vp_standard_targets
  FOR SELECT TO authenticated
  USING (
    public.user_has_uhp_module_access(auth.uid(), 'volume_points')
    OR public.user_has_workspace_access(auth.uid(), 'uhp')
  );

CREATE POLICY uhp_vp_standard_targets_write ON public.uhp_vp_standard_targets
  FOR ALL TO authenticated
  USING (
    public.user_has_uhp_module_access(auth.uid(), 'volume_points')
    OR public.user_can_write_workspace(auth.uid(), 'uhp')
  )
  WITH CHECK (
    public.user_has_uhp_module_access(auth.uid(), 'volume_points')
    OR public.user_can_write_workspace(auth.uid(), 'uhp')
  );

CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.uhp_vp_standard_targets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.uhp_vp_standard_targets (category, target_vp, forecast_vp, updated_by)
SELECT category, target_vp, forecast_vp, updated_by
FROM public.uhp_vp_month_targets
WHERE reporting_month = '2026-11-01';

COMMENT ON TABLE public.uhp_vp_standard_targets IS
  'Reusable monthly VP goals from November 2026 onward; explicit month rows, including zero, take precedence.';

COMMIT;
