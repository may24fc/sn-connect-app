BEGIN;

-- The performance evaluation policies still listed 'hr', 'cos', and 'ceo', which
-- are no longer public.user_role values. user_has_any_role casts its array to
-- user_role[], so any check that reached that branch (an admin reading another
-- user's row) failed with "invalid input value for enum user_role". Recreate
-- the select/insert/update policies with only the valid privileged roles.
-- Access is unchanged: the removed roles cannot be assigned to any user.

DO $$
DECLARE
  target_table text;
BEGIN
  FOREACH target_table IN ARRAY ARRAY[
    'five_percent_reflections',
    'monthly_self_evaluations',
    'monthly_call_feedback',
    'quarterly_temperature_checks',
    'performance_evaluation_drafts'
  ]
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', target_table || '_select_policy', target_table);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', target_table || '_insert_policy', target_table);
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', target_table || '_update_policy', target_table);

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR SELECT TO authenticated USING (
         %I.user_id = auth.uid()
         OR user_has_any_role(auth.uid(), ARRAY[''admin'', ''super_admin''])
       )',
      target_table || '_select_policy', target_table, target_table
    );

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR INSERT TO authenticated WITH CHECK (
         %I.user_id = auth.uid()
         OR user_has_any_role(auth.uid(), ARRAY[''admin'', ''super_admin''])
       )',
      target_table || '_insert_policy', target_table, target_table
    );

    EXECUTE format(
      'CREATE POLICY %I ON public.%I FOR UPDATE TO authenticated USING (
         %I.user_id = auth.uid()
         OR user_has_any_role(auth.uid(), ARRAY[''admin'', ''super_admin''])
       ) WITH CHECK (
         %I.user_id = auth.uid()
         OR user_has_any_role(auth.uid(), ARRAY[''admin'', ''super_admin''])
       )',
      target_table || '_update_policy', target_table, target_table, target_table
    );
  END LOOP;
END$$;

COMMIT;
