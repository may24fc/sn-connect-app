-- Migration: Fix Christmas Tree role policies after role consolidation
-- Created: 2026-09-15
-- Description: The Christmas Tree policies referenced the removed 'hr' enum label, so
--   user_has_any_role(...) raised "invalid input value for enum user_role" whenever the
--   planner evaluated them. Rebuild them on the consolidated roles with explicit casts.

BEGIN;

DROP POLICY IF EXISTS christmas_tree_events_select_policy ON public.christmas_tree_events;
CREATE POLICY christmas_tree_events_select_policy ON public.christmas_tree_events
  FOR SELECT TO authenticated
  USING (
    deleted_at IS NULL
    AND (
      is_active
      OR user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::public.user_role[])
    )
  );

DROP POLICY IF EXISTS christmas_tree_events_admin_write_policy ON public.christmas_tree_events;
CREATE POLICY christmas_tree_events_admin_write_policy ON public.christmas_tree_events
  FOR ALL TO authenticated
  USING (user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::public.user_role[]))
  WITH CHECK (user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::public.user_role[]));

DROP POLICY IF EXISTS christmas_ornaments_admin_delete_policy ON public.christmas_ornaments;
CREATE POLICY christmas_ornaments_admin_delete_policy ON public.christmas_ornaments
  FOR DELETE TO authenticated
  USING (user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::public.user_role[]));

DROP POLICY IF EXISTS christmas_wishes_admin_delete_policy ON public.christmas_wishes;
CREATE POLICY christmas_wishes_admin_delete_policy ON public.christmas_wishes
  FOR DELETE TO authenticated
  USING (user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::public.user_role[]));

COMMIT;
