-- Migration: Harden Christmas ornament event ownership
-- Created: 2026-09-12

BEGIN;

DROP POLICY IF EXISTS christmas_ornaments_insert_self_policy ON public.christmas_ornaments;
DROP POLICY IF EXISTS christmas_ornaments_update_self_policy ON public.christmas_ornaments;

CREATE POLICY christmas_ornaments_insert_self_policy ON public.christmas_ornaments
  FOR INSERT TO authenticated
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

CREATE POLICY christmas_ornaments_update_self_policy ON public.christmas_ornaments
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid() AND deleted_at IS NULL)
  WITH CHECK (
    user_id = auth.uid()
    AND event_id = (SELECT existing.event_id FROM public.christmas_ornaments existing WHERE existing.id = christmas_ornaments.id)
    AND deleted_at IS NULL
  );

COMMIT;