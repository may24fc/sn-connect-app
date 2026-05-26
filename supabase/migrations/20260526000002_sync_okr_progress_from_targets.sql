-- Migration: Sync OKR progress from okr_targets
-- Created: 2026-05-26
-- Purpose: Make okrs.progress a database-derived value based on okr_targets,
-- aligned with the current application math for objective progress.

BEGIN;

CREATE OR REPLACE FUNCTION public.calculate_okr_progress_from_targets(p_okr_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  total_weighted_progress numeric := 0;
  total_weight numeric := 0;
  total_progress numeric := 0;
  target_count integer := 0;
  target_progress numeric := 0;
  target_record record;
BEGIN
  FOR target_record IN
    SELECT metric_type, current_value, target_value, weight, self_rating
    FROM public.okr_targets
    WHERE okr_id = p_okr_id
      AND deleted_at IS NULL
  LOOP
    CASE target_record.metric_type::text
      WHEN 'boolean' THEN
        target_progress := CASE
          WHEN COALESCE(target_record.current_value, 0) >= 1 THEN 100
          ELSE 0
        END;
      WHEN 'scale' THEN
        target_progress := CASE
          WHEN COALESCE(target_record.self_rating, 0) > 0
            THEN ROUND((COALESCE(target_record.self_rating, 0) / 4.0) * 100, 2)
          ELSE 0
        END;
      ELSE
        target_progress := CASE
          WHEN COALESCE(target_record.target_value, 0) > 0
            THEN LEAST(
              ROUND(
                (COALESCE(target_record.current_value, 0) / target_record.target_value) * 100,
                2
              ),
              100
            )
          ELSE 0
        END;
    END CASE;

    target_progress := GREATEST(target_progress, 0);
    total_progress := total_progress + target_progress;
    total_weighted_progress := total_weighted_progress + (target_progress * COALESCE(target_record.weight, 0));
    total_weight := total_weight + COALESCE(target_record.weight, 0);
    target_count := target_count + 1;
  END LOOP;

  IF total_weight > 0 THEN
    RETURN ROUND(total_weighted_progress / total_weight, 2);
  END IF;

  IF target_count > 0 THEN
    RETURN ROUND(total_progress / target_count, 2);
  END IF;

  RETURN 0;
END;
$$;

CREATE OR REPLACE FUNCTION public.calculate_okr_progress(p_okr_id uuid)
RETURNS numeric
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.calculate_okr_progress_from_targets(p_okr_id);
$$;

CREATE OR REPLACE FUNCTION public.trigger_update_okr_progress_from_targets()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  old_okr_id uuid := NULL;
  new_okr_id uuid := NULL;
BEGIN
  IF TG_OP IN ('UPDATE', 'DELETE') THEN
    old_okr_id := OLD.okr_id;
  END IF;

  IF TG_OP IN ('INSERT', 'UPDATE') THEN
    new_okr_id := NEW.okr_id;
  END IF;

  IF old_okr_id IS NOT NULL THEN
    UPDATE public.okrs
    SET progress = public.calculate_okr_progress_from_targets(old_okr_id)
    WHERE id = old_okr_id;
  END IF;

  IF new_okr_id IS NOT NULL AND new_okr_id IS DISTINCT FROM old_okr_id THEN
    UPDATE public.okrs
    SET progress = public.calculate_okr_progress_from_targets(new_okr_id)
    WHERE id = new_okr_id;
  END IF;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS okr_targets_progress_update ON public.okr_targets;
CREATE TRIGGER okr_targets_progress_update
  AFTER INSERT OR UPDATE OR DELETE ON public.okr_targets
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_update_okr_progress_from_targets();

UPDATE public.okrs
SET progress = public.calculate_okr_progress_from_targets(id);

COMMENT ON FUNCTION public.calculate_okr_progress(uuid) IS 'Calculates OKR progress from live okr_targets rows.';
COMMENT ON FUNCTION public.calculate_okr_progress_from_targets(uuid) IS 'Calculates weighted objective progress from live okr_targets rows using current UI math.';
COMMENT ON FUNCTION public.trigger_update_okr_progress_from_targets() IS 'Keeps okrs.progress synchronized whenever okr_targets rows change.';

COMMIT;