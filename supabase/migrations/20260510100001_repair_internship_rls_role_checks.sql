-- Migration: Repair internship RLS role checks after role consolidation drift
-- Description: Rewrites internship and associate daily log admin-role policies to compare
-- roles via text instead of casting enum arrays. This keeps the policies valid whether
-- the environment still has the legacy hr/cos/ceo roles or has already consolidated to
-- admin/super_admin.

DROP POLICY IF EXISTS internships_select_self_policy ON public.internships;
DROP POLICY IF EXISTS internships_select_supervisor_policy ON public.internships;
DROP POLICY IF EXISTS internships_select_own_policy ON public.internships;
DROP POLICY IF EXISTS internships_admin_all_policy ON public.internships;

CREATE POLICY internships_select_self_policy ON public.internships
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.employees e
      WHERE e.id = internships.employee_id
        AND e.user_id = auth.uid()
        AND e.deleted_at IS NULL
    )
  );

CREATE POLICY internships_select_supervisor_policy ON public.internships
  FOR SELECT
  TO authenticated
  USING (internships.supervisor_id = auth.uid());

CREATE POLICY internships_admin_all_policy ON public.internships
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.deleted_at IS NULL
        AND u.role::text IN ('admin', 'super_admin', 'hr', 'cos', 'ceo')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.users u
      WHERE u.id = auth.uid()
        AND u.deleted_at IS NULL
        AND u.role::text IN ('admin', 'super_admin', 'hr', 'cos', 'ceo')
    )
  );

DROP POLICY IF EXISTS intern_daily_logs_select_policy ON public.intern_daily_logs;
DROP POLICY IF EXISTS intern_daily_logs_insert_policy ON public.intern_daily_logs;
DROP POLICY IF EXISTS intern_daily_logs_update_policy ON public.intern_daily_logs;

CREATE POLICY intern_daily_logs_select_policy ON public.intern_daily_logs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.internships i
      JOIN public.employees e ON e.id = i.employee_id
      WHERE i.id = intern_daily_logs.internship_id
        AND e.deleted_at IS NULL
        AND (
          e.user_id = auth.uid()
          OR i.supervisor_id = auth.uid()
          OR EXISTS (
            SELECT 1
            FROM public.users u
            WHERE u.id = auth.uid()
              AND u.deleted_at IS NULL
              AND u.role::text IN ('admin', 'super_admin', 'hr', 'cos', 'ceo')
          )
        )
    )
  );

CREATE POLICY intern_daily_logs_insert_policy ON public.intern_daily_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.internships i
      JOIN public.employees e ON e.id = i.employee_id
      WHERE i.id = intern_daily_logs.internship_id
        AND e.deleted_at IS NULL
        AND (
          e.user_id = auth.uid()
          OR EXISTS (
            SELECT 1
            FROM public.users u
            WHERE u.id = auth.uid()
              AND u.deleted_at IS NULL
              AND u.role::text IN ('admin', 'super_admin', 'hr', 'cos', 'ceo')
          )
        )
    )
  );

CREATE POLICY intern_daily_logs_update_policy ON public.intern_daily_logs
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.internships i
      WHERE i.id = intern_daily_logs.internship_id
        AND (
          i.supervisor_id = auth.uid()
          OR EXISTS (
            SELECT 1
            FROM public.users u
            WHERE u.id = auth.uid()
              AND u.deleted_at IS NULL
              AND u.role::text IN ('admin', 'super_admin', 'hr', 'cos', 'ceo')
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.internships i
      WHERE i.id = intern_daily_logs.internship_id
        AND (
          i.supervisor_id = auth.uid()
          OR EXISTS (
            SELECT 1
            FROM public.users u
            WHERE u.id = auth.uid()
              AND u.deleted_at IS NULL
              AND u.role::text IN ('admin', 'super_admin', 'hr', 'cos', 'ceo')
          )
        )
    )
  );
