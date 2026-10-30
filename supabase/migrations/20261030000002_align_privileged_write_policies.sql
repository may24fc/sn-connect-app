-- Align legacy admin-only RLS policies with the current privileged role model.
--
-- The application treats admin and super_admin as administrative roles. Several
-- older policies were recreated during schema repair with only the legacy admin
-- role (or removed roles), which made otherwise-authorized super_admin writes
-- fail at the database boundary.

BEGIN;

-- Audit history is part of the administrative write workflow: privileged users
-- need to be able to verify the entries created by their mutations.
DROP POLICY IF EXISTS audit_logs_select_policy ON public.audit_logs;
CREATE POLICY audit_logs_select_policy ON public.audit_logs
  FOR SELECT TO authenticated
  USING (
    public.user_has_any_role(
      auth.uid(),
      ARRAY['admin', 'super_admin']::public.user_role[]
    )
  );

DROP POLICY IF EXISTS departments_insert_policy ON public.departments;
DROP POLICY IF EXISTS departments_update_policy ON public.departments;
DROP POLICY IF EXISTS departments_delete_policy ON public.departments;

CREATE POLICY departments_insert_policy ON public.departments
  FOR INSERT TO authenticated
  WITH CHECK (
    public.user_has_any_role(
      auth.uid(),
      ARRAY['admin', 'super_admin']::public.user_role[]
    )
  );

CREATE POLICY departments_update_policy ON public.departments
  FOR UPDATE TO authenticated
  USING (
    public.user_has_any_role(
      auth.uid(),
      ARRAY['admin', 'super_admin']::public.user_role[]
    )
  )
  WITH CHECK (
    public.user_has_any_role(
      auth.uid(),
      ARRAY['admin', 'super_admin']::public.user_role[]
    )
  );

CREATE POLICY departments_delete_policy ON public.departments
  FOR DELETE TO authenticated
  USING (
    public.user_has_any_role(
      auth.uid(),
      ARRAY['admin', 'super_admin']::public.user_role[]
    )
  );

DROP POLICY IF EXISTS documents_update_policy ON public.documents;
DROP POLICY IF EXISTS documents_delete_policy ON public.documents;

CREATE POLICY documents_update_policy ON public.documents
  FOR UPDATE TO authenticated
  USING (
    public.user_has_any_role(
      auth.uid(),
      ARRAY['admin', 'super_admin']::public.user_role[]
    )
  )
  WITH CHECK (
    public.user_has_any_role(
      auth.uid(),
      ARRAY['admin', 'super_admin']::public.user_role[]
    )
  );

CREATE POLICY documents_delete_policy ON public.documents
  FOR DELETE TO authenticated
  USING (
    public.user_has_any_role(
      auth.uid(),
      ARRAY['admin', 'super_admin']::public.user_role[]
    )
  );

DROP POLICY IF EXISTS knowledge_versions_admin_read_policy ON public.knowledge_source_versions;
DROP POLICY IF EXISTS knowledge_versions_admin_insert_policy ON public.knowledge_source_versions;

CREATE POLICY knowledge_versions_admin_read_policy ON public.knowledge_source_versions
  FOR SELECT
  USING (
    public.user_has_any_role(
      auth.uid(),
      ARRAY['admin', 'super_admin']::public.user_role[]
    )
  );

CREATE POLICY knowledge_versions_admin_insert_policy ON public.knowledge_source_versions
  FOR INSERT
  WITH CHECK (
    public.user_has_any_role(
      auth.uid(),
      ARRAY['admin', 'super_admin']::public.user_role[]
    )
  );

DROP POLICY IF EXISTS reports_select_admin_policy ON public.reports;
DROP POLICY IF EXISTS reports_insert_policy ON public.reports;
DROP POLICY IF EXISTS reports_update_policy ON public.reports;
DROP POLICY IF EXISTS reports_delete_policy ON public.reports;

CREATE POLICY reports_select_admin_policy ON public.reports
  FOR SELECT TO authenticated
  USING (
    reports.deleted_at IS NULL
    AND public.user_has_any_role(
      auth.uid(),
      ARRAY['admin', 'super_admin']::public.user_role[]
    )
  );

CREATE POLICY reports_insert_policy ON public.reports
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.employees
      WHERE employees.id = reports.employee_id
        AND employees.user_id = auth.uid()
        AND employees.deleted_at IS NULL
    )
    OR public.user_has_any_role(
      auth.uid(),
      ARRAY['admin', 'super_admin']::public.user_role[]
    )
  );

CREATE POLICY reports_update_policy ON public.reports
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.employees
      WHERE employees.id = reports.employee_id
        AND employees.user_id = auth.uid()
        AND employees.deleted_at IS NULL
    )
    OR public.user_has_any_role(
      auth.uid(),
      ARRAY['admin', 'super_admin']::public.user_role[]
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.employees
      WHERE employees.id = reports.employee_id
        AND employees.user_id = auth.uid()
        AND employees.deleted_at IS NULL
    )
    OR public.user_has_any_role(
      auth.uid(),
      ARRAY['admin', 'super_admin']::public.user_role[]
    )
  );

CREATE POLICY reports_delete_policy ON public.reports
  FOR DELETE TO authenticated
  USING (
    public.user_has_any_role(
      auth.uid(),
      ARRAY['admin', 'super_admin']::public.user_role[]
    )
  );

DROP POLICY IF EXISTS report_metrics_select_policy ON public.report_metrics;
DROP POLICY IF EXISTS report_metrics_insert_policy ON public.report_metrics;
DROP POLICY IF EXISTS report_metrics_update_policy ON public.report_metrics;
DROP POLICY IF EXISTS report_metrics_delete_policy ON public.report_metrics;

CREATE POLICY report_metrics_select_policy ON public.report_metrics
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.reports
      WHERE reports.id = report_metrics.report_id
        AND reports.deleted_at IS NULL
        AND (
          EXISTS (
            SELECT 1
            FROM public.employees
            WHERE employees.id = reports.employee_id
              AND employees.user_id = auth.uid()
              AND employees.deleted_at IS NULL
          )
          OR EXISTS (
            SELECT 1
            FROM public.employees
            WHERE employees.id = reports.employee_id
              AND employees.immediate_head = auth.uid()
              AND employees.deleted_at IS NULL
          )
          OR public.user_has_any_role(
            auth.uid(),
            ARRAY['admin', 'super_admin']::public.user_role[]
          )
        )
    )
  );

CREATE POLICY report_metrics_insert_policy ON public.report_metrics
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.reports
      WHERE reports.id = report_metrics.report_id
        AND reports.deleted_at IS NULL
        AND (
          EXISTS (
            SELECT 1
            FROM public.employees
            WHERE employees.id = reports.employee_id
              AND employees.user_id = auth.uid()
              AND employees.deleted_at IS NULL
          )
          OR public.user_has_any_role(
            auth.uid(),
            ARRAY['admin', 'super_admin']::public.user_role[]
          )
        )
    )
  );

CREATE POLICY report_metrics_update_policy ON public.report_metrics
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.reports
      WHERE reports.id = report_metrics.report_id
        AND reports.deleted_at IS NULL
        AND (
          EXISTS (
            SELECT 1
            FROM public.employees
            WHERE employees.id = reports.employee_id
              AND employees.user_id = auth.uid()
              AND employees.deleted_at IS NULL
          )
          OR public.user_has_any_role(
            auth.uid(),
            ARRAY['admin', 'super_admin']::public.user_role[]
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.reports
      WHERE reports.id = report_metrics.report_id
        AND reports.deleted_at IS NULL
        AND (
          EXISTS (
            SELECT 1
            FROM public.employees
            WHERE employees.id = reports.employee_id
              AND employees.user_id = auth.uid()
              AND employees.deleted_at IS NULL
          )
          OR public.user_has_any_role(
            auth.uid(),
            ARRAY['admin', 'super_admin']::public.user_role[]
          )
        )
    )
  );

CREATE POLICY report_metrics_delete_policy ON public.report_metrics
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.reports
      WHERE reports.id = report_metrics.report_id
    )
    AND public.user_has_any_role(
      auth.uid(),
      ARRAY['admin', 'super_admin']::public.user_role[]
    )
  );

DROP POLICY IF EXISTS resource_categories_read_policy ON public.resource_categories;
DROP POLICY IF EXISTS resource_categories_insert_policy ON public.resource_categories;
DROP POLICY IF EXISTS resource_categories_update_policy ON public.resource_categories;
DROP POLICY IF EXISTS resource_categories_delete_policy ON public.resource_categories;

CREATE POLICY resource_categories_read_policy ON public.resource_categories
  FOR SELECT
  USING (
    is_active = true
    OR public.user_has_any_role(
      auth.uid(),
      ARRAY['admin', 'super_admin']::public.user_role[]
    )
  );

CREATE POLICY resource_categories_insert_policy ON public.resource_categories
  FOR INSERT
  WITH CHECK (
    public.user_has_any_role(
      auth.uid(),
      ARRAY['admin', 'super_admin']::public.user_role[]
    )
  );

CREATE POLICY resource_categories_update_policy ON public.resource_categories
  FOR UPDATE
  USING (
    public.user_has_any_role(
      auth.uid(),
      ARRAY['admin', 'super_admin']::public.user_role[]
    )
  )
  WITH CHECK (
    public.user_has_any_role(
      auth.uid(),
      ARRAY['admin', 'super_admin']::public.user_role[]
    )
  );

CREATE POLICY resource_categories_delete_policy ON public.resource_categories
  FOR DELETE
  USING (
    public.user_has_any_role(
      auth.uid(),
      ARRAY['admin', 'super_admin']::public.user_role[]
    )
  );

DROP POLICY IF EXISTS standup_recordings_delete_admin_policy ON public.standup_recordings;
CREATE POLICY standup_recordings_delete_admin_policy ON public.standup_recordings
  FOR DELETE TO authenticated
  USING (
    public.user_has_any_role(
      auth.uid(),
      ARRAY['admin', 'super_admin']::public.user_role[]
    )
  );

COMMIT;
