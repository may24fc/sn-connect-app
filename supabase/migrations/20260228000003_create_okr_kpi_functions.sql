-- V2-2.3: Automated OKR/KPI Score Calculation
-- Implements database-level automatic calculation of OKR progress and KPI percentages.

-- Function to recalculate OKR progress from key results
CREATE OR REPLACE FUNCTION calculate_okr_progress(p_okr_id uuid)
RETURNS numeric AS $$
DECLARE
  kr_data jsonb;
  total_progress numeric := 0;
  kr_count integer := 0;
  kr record;
BEGIN
  SELECT key_results INTO kr_data FROM public.okrs WHERE id = p_okr_id;

  IF kr_data IS NULL THEN
    RETURN 0;
  END IF;

  FOR kr IN SELECT * FROM jsonb_array_elements(kr_data)
  LOOP
    total_progress := total_progress + COALESCE((kr.value->>'progress')::numeric, 0);
    kr_count := kr_count + 1;
  END LOOP;

  IF kr_count > 0 THEN
    RETURN ROUND(total_progress / kr_count, 2);
  END IF;

  RETURN 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger function to auto-update OKR progress when key_results changes
CREATE OR REPLACE FUNCTION trigger_update_okr_progress()
RETURNS TRIGGER AS $$
BEGIN
  NEW.progress := calculate_okr_progress(NEW.id);
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Only create trigger if it doesn't already exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'okr_progress_auto_update'
  ) THEN
    CREATE TRIGGER okr_progress_auto_update
      BEFORE UPDATE OF key_results ON public.okrs
      FOR EACH ROW
      EXECUTE FUNCTION trigger_update_okr_progress();
  END IF;
END;
$$;

-- Add KPI progress percentage column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'kpis'
    AND column_name = 'progress_pct'
  ) THEN
    ALTER TABLE public.kpis
      ADD COLUMN progress_pct numeric(5,2)
      GENERATED ALWAYS AS (
        CASE WHEN target_value > 0
          THEN ROUND((current_value / target_value) * 100, 2)
          ELSE 0
        END
      ) STORED;
  END IF;
END;
$$;

COMMENT ON FUNCTION calculate_okr_progress(uuid) IS 'Calculates average progress across all key results for an OKR';
COMMENT ON FUNCTION trigger_update_okr_progress() IS 'Trigger function that auto-updates OKR progress when key_results are modified';
