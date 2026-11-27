BEGIN;

ALTER TABLE public.christmas_tree_strands
  DROP CONSTRAINT christmas_tree_strands_min_span;

ALTER TABLE public.christmas_tree_strands
  ADD CONSTRAINT christmas_tree_strands_garland_min_span
  CHECK (kind <> 'garland' OR end_x - start_x >= 12);

COMMENT ON TABLE public.christmas_tree_strands IS
  'Garland strands with two anchors and individual Lights with a single point stored in both anchors.';

COMMIT;
