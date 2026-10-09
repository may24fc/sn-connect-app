-- Re-issue purge_directory_user so the name-only stub also drops the termination comment.
--
-- Same behavior as 20261006000002 (see that file for the full rationale); the only change is
-- `termination_reason = NULL` in the employees stub update. A comment such as "AWOL" is
-- personal information about the purged person and should not survive the purge.

BEGIN;

CREATE OR REPLACE FUNCTION public.purge_directory_user(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_employee_id uuid;
  v_document_ids uuid[];
  v_evaluation_ids uuid[];
  v_grant_ids uuid[];
BEGIN
  PERFORM 1
  FROM public.users
  WHERE id = p_user_id
    AND status = 'terminated'
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User % is not a terminated, active directory account', p_user_id
      USING ERRCODE = 'P0002';
  END IF;

  SELECT id INTO v_employee_id FROM public.employees WHERE user_id = p_user_id;

  -- Personal data keyed by user.
  DELETE FROM public.notifications WHERE user_id = p_user_id;
  DELETE FROM public.announcement_reads WHERE user_id = p_user_id;
  DELETE FROM public.announcement_stars WHERE user_id = p_user_id;
  DELETE FROM public.resource_bookmarks WHERE user_id = p_user_id;
  DELETE FROM public.resource_views WHERE user_id = p_user_id;
  DELETE FROM public.onboarding_profiles WHERE user_id = p_user_id;
  DELETE FROM public.user_role_metadata WHERE user_id = p_user_id;
  DELETE FROM public.role_kpi_entries WHERE user_id = p_user_id;
  DELETE FROM public.ticket_handlers WHERE user_id = p_user_id;
  DELETE FROM public.points_events WHERE user_id = p_user_id;
  DELETE FROM public.user_gamification WHERE user_id = p_user_id;
  DELETE FROM public.user_domain_mastery WHERE user_id = p_user_id;
  DELETE FROM public.user_badges WHERE user_id = p_user_id;
  DELETE FROM public.monthly_self_evaluations WHERE user_id = p_user_id;
  DELETE FROM public.quarterly_temperature_checks WHERE user_id = p_user_id;
  DELETE FROM public.five_percent_reflections WHERE user_id = p_user_id;
  DELETE FROM public.performance_evaluation_drafts WHERE user_id = p_user_id;
  DELETE FROM public.monthly_call_feedback WHERE user_id = p_user_id;
  DELETE FROM public.weekly_commitments WHERE user_id = p_user_id;
  DELETE FROM public.wellness_bingo_boards WHERE user_id = p_user_id;
  DELETE FROM public.wellness_bingo_partnerships WHERE user_a_id = p_user_id OR user_b_id = p_user_id;
  DELETE FROM public.christmas_ornaments WHERE user_id = p_user_id;
  DELETE FROM public.ai_conversations WHERE user_id = p_user_id;
  DELETE FROM public.hub_usage_daily WHERE user_id = p_user_id;
  DELETE FROM public.hub_usage_session_windows WHERE user_id = p_user_id;

  -- Access grants.
  DELETE FROM public.ats_access_grants WHERE user_id = p_user_id;
  DELETE FROM public.crm_access_grants WHERE user_id = p_user_id;
  DELETE FROM public.revenue_forecast_access_grants WHERE user_id = p_user_id;
  DELETE FROM public.pa_task_access_grants WHERE user_id = p_user_id;
  DELETE FROM public.ai_spending_access_grants WHERE user_id = p_user_id;
  DELETE FROM public.uhp_access_grants WHERE user_id = p_user_id;
  WITH deleted AS (
    DELETE FROM public.marketing_access_grants WHERE user_id = p_user_id RETURNING id
  )
  SELECT array_agg(id) INTO v_grant_ids FROM deleted;

  IF v_employee_id IS NOT NULL THEN
    -- Personal data keyed by employee.
    DELETE FROM public.employee_banking_info WHERE employee_id = v_employee_id;
    DELETE FROM public.profile_change_requests WHERE employee_id = v_employee_id;
    DELETE FROM public.onboarding_checklists WHERE employee_id = v_employee_id;
    DELETE FROM public.marketing_deliverables_reminder_recipients WHERE employee_id = v_employee_id;

    WITH deleted AS (
      DELETE FROM public.associate_evaluations WHERE employee_id = v_employee_id RETURNING id
    )
    SELECT array_agg(id) INTO v_evaluation_ids FROM deleted;

    -- Personal documents go; documents used as expense receipts stay with the expense.
    WITH deleted AS (
      DELETE FROM public.documents d
      WHERE d.employee_id = v_employee_id
        AND NOT EXISTS (
          SELECT 1 FROM public.expense_entries ee WHERE ee.receipt_document_id = d.id
        )
      RETURNING d.id
    )
    SELECT array_agg(id) INTO v_document_ids FROM deleted;

    -- Name-only stub: keeps shared records attributed, drops contact, identity and payment data.
    UPDATE public.employees
    SET birthday = NULL,
        phone = NULL,
        phone_country_code = NULL,
        personal_email = NULL,
        company_email = NULL,
        address = NULL,
        city = NULL,
        province = NULL,
        postal_code = NULL,
        nationality = NULL,
        education = NULL,
        linkedin_profile_url = NULL,
        emergency_contact_name = NULL,
        emergency_contact_number = NULL,
        emergency_contact_country_code = NULL,
        emergency_contact_relationship = NULL,
        payroll_account_name = NULL,
        payroll_account_number = NULL,
        payment_account_name = NULL,
        payment_account_number = NULL,
        payment_email = NULL,
        payment_phone_number = NULL,
        payment_address = NULL,
        payment_city = NULL,
        payment_province = NULL,
        payment_zipcode = NULL,
        nicknames = '{}',
        termination_reason = NULL
    WHERE id = v_employee_id;
  END IF;

  UPDATE public.users
  SET avatar_url = NULL,
      deleted_at = now()
  WHERE id = p_user_id;

  -- handle_audit_log() snapshots whole rows, so earlier edits and the deletes above left
  -- copies of the personal data in audit_logs. Keep who/when/what-operation; drop the snapshots.
  UPDATE public.audit_logs
  SET old_values = NULL,
      new_values = NULL
  WHERE (table_name = 'users' AND record_id = p_user_id)
     OR (table_name = 'employees' AND record_id = v_employee_id)
     OR (table_name = 'documents' AND record_id = ANY (coalesce(v_document_ids, '{}')))
     OR (table_name = 'associate_evaluations' AND record_id = ANY (coalesce(v_evaluation_ids, '{}')))
     OR (table_name = 'marketing_access_grants' AND record_id = ANY (coalesce(v_grant_ids, '{}')));
END;
$$;

REVOKE ALL ON FUNCTION public.purge_directory_user(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_directory_user(uuid) TO service_role;

COMMENT ON FUNCTION public.purge_directory_user(uuid) IS
  'Purges a terminated directory account: deletes personal data, keeps shared records attributed by name. Service role only; called by DELETE /api/users/[id]/permanent.';

COMMIT;
