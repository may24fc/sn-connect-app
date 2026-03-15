-- Harden legacy JSONB OKR progress calculation against malformed key_results payloads.

BEGIN;

CREATE OR REPLACE FUNCTION calculate_okr_progress(p_okr_id uuid)
RETURNS numeric AS $$
DECLARE
  kr_data jsonb;
  total_progress numeric := 0;
  kr_count integer := 0;
  kr record;
  progress_text text;
BEGIN
  SELECT key_results INTO kr_data FROM public.okrs WHERE id = p_okr_id;

  IF kr_data IS NULL OR jsonb_typeof(kr_data) <> 'array' THEN
    RETURN 0;
  END IF;

  FOR kr IN SELECT value FROM jsonb_array_elements(kr_data)
  LOOP
    IF jsonb_typeof(kr.value) <> 'object' THEN
      CONTINUE;
    END IF;

    progress_text := kr.value->>'progress';

    total_progress := total_progress + CASE
      WHEN progress_text IS NULL OR btrim(progress_text) = '' THEN 0
      WHEN btrim(progress_text) ~ '^-?[0-9]+(\.[0-9]+)?$' THEN progress_text::numeric
      ELSE 0
    END;
    kr_count := kr_count + 1;
  END LOOP;

  IF kr_count > 0 THEN
    RETURN ROUND(total_progress / kr_count, 2);
  END IF;

  RETURN 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION calculate_okr_progress(uuid) IS 'Calculates average progress across JSONB key results while tolerating malformed payloads';

COMMIT;