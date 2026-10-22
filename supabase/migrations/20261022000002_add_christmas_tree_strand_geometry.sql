BEGIN;

CREATE TABLE public.christmas_tree_strands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES public.christmas_tree_events(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('garland', 'lights')),
  start_x numeric NOT NULL CHECK (start_x BETWEEN 6 AND 94),
  start_y numeric NOT NULL CHECK (start_y BETWEEN 10 AND 80),
  end_x numeric NOT NULL CHECK (end_x BETWEEN 6 AND 94),
  end_y numeric NOT NULL CHECK (end_y BETWEEN 10 AND 80),
  created_by uuid REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT christmas_tree_strands_min_span CHECK (end_x - start_x >= 12)
);

CREATE INDEX christmas_tree_strands_event_idx ON public.christmas_tree_strands(event_id, created_at);

ALTER TABLE public.christmas_tree_strands ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.christmas_tree_strands FORCE ROW LEVEL SECURITY;

CREATE POLICY christmas_tree_strands_select_policy ON public.christmas_tree_strands
  FOR SELECT TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.christmas_tree_events event
      WHERE event.id = event_id AND event.is_active AND event.deleted_at IS NULL
    )
  );

CREATE TRIGGER trigger_christmas_tree_strands_updated_at
  BEFORE UPDATE ON public.christmas_tree_strands
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.christmas_tree_strands;

COMMENT ON TABLE public.christmas_tree_strands IS
  'Individually positioned Garland and Lights strands with tree-relative anchor points.';

COMMIT;
