BEGIN;

-- Tighten RLS so only users with AI spending access (admin/super_admin, or an
-- active employee/associate holding a grant) can read or write the feature's
-- tables. The API layer enforces this too, but RLS is the final gatekeeper.

DROP POLICY IF EXISTS ai_expense_providers_select_policy ON public.ai_expense_providers;
CREATE POLICY ai_expense_providers_select_policy
  ON public.ai_expense_providers
  FOR SELECT
  USING (public.user_has_ai_spending_access(auth.uid()));

DROP POLICY IF EXISTS ai_expenses_select_policy ON public.ai_expenses;
CREATE POLICY ai_expenses_select_policy
  ON public.ai_expenses
  FOR SELECT
  USING (user_id = auth.uid() AND public.user_has_ai_spending_access(auth.uid()));

DROP POLICY IF EXISTS ai_expenses_insert_policy ON public.ai_expenses;
CREATE POLICY ai_expenses_insert_policy
  ON public.ai_expenses
  FOR INSERT
  WITH CHECK (user_id = auth.uid() AND public.user_has_ai_spending_access(auth.uid()));

DROP POLICY IF EXISTS ai_expenses_update_policy ON public.ai_expenses;
CREATE POLICY ai_expenses_update_policy
  ON public.ai_expenses
  FOR UPDATE
  USING (user_id = auth.uid() AND public.user_has_ai_spending_access(auth.uid()))
  WITH CHECK (user_id = auth.uid() AND public.user_has_ai_spending_access(auth.uid()));

DROP POLICY IF EXISTS ai_expenses_delete_policy ON public.ai_expenses;
CREATE POLICY ai_expenses_delete_policy
  ON public.ai_expenses
  FOR DELETE
  USING (user_id = auth.uid() AND public.user_has_ai_spending_access(auth.uid()));

COMMIT;
