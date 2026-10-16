-- A former employee belongs to a historical performance roster only when that
-- employee has persisted performance data in the exact selected cycle.

CREATE OR REPLACE FUNCTION public.is_quarter_workforce_eligible(
  target_user_id uuid,
  period_start date,
  period_end date
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    WHERE u.id = target_user_id
      AND u.account_kind = 'workforce'
      AND u.created_at < (period_end + 1)::timestamptz
      AND (
        u.status::text <> 'terminated'
        OR EXISTS (
          SELECT 1
          FROM public.employees e
          WHERE e.user_id = u.id
            AND (
              EXISTS (
                SELECT 1
                FROM public.okrs o
                JOIN public.review_cycles c ON c.id = o.cycle_id
                WHERE o.employee_id = e.id
                  AND c.start_date = period_start
                  AND c.end_date = period_end
              )
              OR EXISTS (
                SELECT 1
                FROM public.kpis k
                JOIN public.review_cycles c ON c.id = k.cycle_id
                WHERE k.employee_id = e.id
                  AND c.start_date = period_start
                  AND c.end_date = period_end
              )
              OR EXISTS (
                SELECT 1
                FROM public.performance_reviews pr
                JOIN public.review_cycles c ON c.id = pr.cycle_id
                WHERE pr.employee_id = e.id
                  AND c.start_date = period_start
                  AND c.end_date = period_end
              )
            )
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.is_performance_cycle_workforce_eligible(
  target_user_id uuid,
  target_cycle_id uuid
)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.users u
    JOIN public.review_cycles c ON c.id = target_cycle_id
    WHERE u.id = target_user_id
      AND u.account_kind = 'workforce'
      AND u.created_at < (c.end_date + 1)::timestamptz
      AND (
        u.status::text <> 'terminated'
        OR EXISTS (
          SELECT 1
          FROM public.employees e
          WHERE e.user_id = u.id
            AND (
              EXISTS (
                SELECT 1 FROM public.okrs o
                WHERE o.employee_id = e.id AND o.cycle_id = target_cycle_id
              )
              OR EXISTS (
                SELECT 1 FROM public.kpis k
                WHERE k.employee_id = e.id AND k.cycle_id = target_cycle_id
              )
              OR EXISTS (
                SELECT 1 FROM public.performance_reviews pr
                WHERE pr.employee_id = e.id AND pr.cycle_id = target_cycle_id
              )
            )
        )
      )
  );
$$;

CREATE OR REPLACE FUNCTION public.quarter_workforce_eligible_user_ids(
  target_cycle_id uuid
)
RETURNS TABLE(user_id uuid)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT u.id
  FROM public.users u
  WHERE public.is_performance_cycle_workforce_eligible(u.id, target_cycle_id)
    AND public.user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::text[]);
$$;

REVOKE ALL ON FUNCTION public.quarter_workforce_eligible_user_ids(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.quarter_workforce_eligible_user_ids(uuid) TO authenticated;

COMMENT ON FUNCTION public.is_quarter_workforce_eligible(uuid, date, date) IS
  'Quarter membership for workforce accounts: active staff created by period end, plus former staff only when exact-cycle OKR, KPI, or review data exists.';
COMMENT ON FUNCTION public.is_performance_cycle_workforce_eligible(uuid, uuid) IS
  'Exact-cycle membership for workforce accounts: current staff created by cycle end, plus former staff only when OKR, KPI, or review data exists in that cycle.';
COMMENT ON FUNCTION public.quarter_workforce_eligible_user_ids(uuid) IS
  'Admin-only roster policy for a performance cycle, applied before directory pagination.';
