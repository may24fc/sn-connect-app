-- Migration: Fix recursive Christmas ornament update policy
-- Created: 2026-09-15
-- Description: The hardening policy compared event_id against a subquery on christmas_ornaments
--   from inside a policy on that same table, so every UPDATE raised 42P17 "infinite recursion
--   detected in policy". Ownership immutability now lives in a trigger, which can read OLD
--   without re-entering RLS.

BEGIN;

CREATE OR REPLACE FUNCTION public.enforce_christmas_ornament_immutable()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.event_id <> OLD.event_id OR NEW.user_id <> OLD.user_id THEN
    RAISE EXCEPTION 'Ornament ownership and event cannot be changed';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_christmas_ornaments_immutable ON public.christmas_ornaments;
CREATE TRIGGER trigger_christmas_ornaments_immutable
  BEFORE UPDATE ON public.christmas_ornaments
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_christmas_ornament_immutable();

DROP POLICY IF EXISTS christmas_ornaments_update_self_policy ON public.christmas_ornaments;
CREATE POLICY christmas_ornaments_update_self_policy ON public.christmas_ornaments
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND deleted_at IS NULL)
  WITH CHECK (
    user_id = auth.uid()
    AND deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.christmas_tree_events event
      WHERE event.id = christmas_ornaments.event_id
      AND event.is_active = true
      AND event.deleted_at IS NULL
    )
  );

COMMIT;
