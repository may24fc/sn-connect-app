-- Migration: OKR Targets Redesign
-- Created: 2026-02-28
-- Purpose: Create okr_targets table to replace JSONB key_results and standalone KPIs.
-- OKRs become "Objectives" with proper relational targets underneath.
-- Supports 4 metric types: number, boolean, currency, tasks
-- Weighted progress rolls up from targets → objective → overall score

BEGIN;

-- ============================================
-- 1. Create metric_type enum
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'target_metric_type') THEN
    CREATE TYPE target_metric_type AS ENUM ('number', 'boolean', 'currency', 'tasks');
  END IF;
END $$;

-- ============================================
-- 2. Add weight column to okrs (objective weight for overall score)
-- ============================================
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'okrs' AND column_name = 'weight'
  ) THEN
    ALTER TABLE public.okrs ADD COLUMN weight numeric(5,2) DEFAULT 1 CHECK (weight >= 0);
  END IF;
END $$;

-- Add description column to okrs if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'okrs' AND column_name = 'description'
  ) THEN
    ALTER TABLE public.okrs ADD COLUMN description text;
  END IF;
END $$;

-- ============================================
-- 3. Create okr_targets table
-- ============================================
CREATE TABLE IF NOT EXISTS public.okr_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  okr_id uuid NOT NULL REFERENCES public.okrs(id) ON DELETE CASCADE,
  employee_id uuid NOT NULL REFERENCES public.employees(id),
  cycle_id uuid REFERENCES public.review_cycles(id),
  name text NOT NULL,
  description text,
  metric_type target_metric_type NOT NULL DEFAULT 'number',
  start_value numeric DEFAULT 0,
  target_value numeric NOT NULL,
  current_value numeric DEFAULT 0,
  unit text,
  weight numeric(5,2) DEFAULT 1 CHECK (weight >= 0),
  sort_order integer DEFAULT 0,
  admin_rating text CHECK (admin_rating IN ('exceptional', 'exceeds', 'meets', 'needs_improvement', 'unsatisfactory')),
  admin_comments text,
  evaluated_by uuid REFERENCES auth.users(id),
  evaluated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- ============================================
-- 4. Create indexes for okr_targets
-- ============================================
CREATE INDEX IF NOT EXISTS idx_okr_targets_okr_id ON public.okr_targets(okr_id);
CREATE INDEX IF NOT EXISTS idx_okr_targets_employee_id ON public.okr_targets(employee_id);
CREATE INDEX IF NOT EXISTS idx_okr_targets_cycle_id ON public.okr_targets(cycle_id);
CREATE INDEX IF NOT EXISTS idx_okr_targets_metric_type ON public.okr_targets(metric_type);

-- ============================================
-- 5. Enable RLS on okr_targets
-- ============================================
ALTER TABLE public.okr_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.okr_targets FORCE ROW LEVEL SECURITY;

-- ============================================
-- 6. Create RLS policies for okr_targets
-- (Same pattern as okrs: own employee + manager + admin roles)
-- ============================================
DROP POLICY IF EXISTS okr_targets_select_policy ON public.okr_targets;
CREATE POLICY okr_targets_select_policy ON public.okr_targets
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = okr_targets.employee_id
      AND e.user_id = auth.uid()
      AND e.deleted_at IS NULL
    )
    OR EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = okr_targets.employee_id
      AND e.immediate_head = auth.uid()
      AND e.deleted_at IS NULL
    )
    OR user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
  );

DROP POLICY IF EXISTS okr_targets_insert_policy ON public.okr_targets;
CREATE POLICY okr_targets_insert_policy ON public.okr_targets
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = okr_targets.employee_id
      AND e.user_id = auth.uid()
      AND e.deleted_at IS NULL
    )
    OR user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
  );

DROP POLICY IF EXISTS okr_targets_update_policy ON public.okr_targets;
CREATE POLICY okr_targets_update_policy ON public.okr_targets
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = okr_targets.employee_id
      AND e.user_id = auth.uid()
      AND e.deleted_at IS NULL
    )
    OR EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = okr_targets.employee_id
      AND e.immediate_head = auth.uid()
      AND e.deleted_at IS NULL
    )
    OR user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = okr_targets.employee_id
      AND e.user_id = auth.uid()
      AND e.deleted_at IS NULL
    )
    OR EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = okr_targets.employee_id
      AND e.immediate_head = auth.uid()
      AND e.deleted_at IS NULL
    )
    OR user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
  );

DROP POLICY IF EXISTS okr_targets_delete_policy ON public.okr_targets;
CREATE POLICY okr_targets_delete_policy ON public.okr_targets
  FOR DELETE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.employees e
      WHERE e.id = okr_targets.employee_id
      AND e.user_id = auth.uid()
      AND e.deleted_at IS NULL
    )
    OR user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
  );

-- ============================================
-- 7. Create trigger for updated_at on okr_targets
-- ============================================
DROP TRIGGER IF EXISTS trigger_okr_targets_updated_at ON public.okr_targets;
CREATE TRIGGER trigger_okr_targets_updated_at
  BEFORE UPDATE ON public.okr_targets
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

DROP TRIGGER IF EXISTS trigger_okr_targets_audit ON public.okr_targets;
CREATE TRIGGER trigger_okr_targets_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.okr_targets
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_audit_log();

-- ============================================
-- 8. Function to calculate weighted OKR progress from targets
-- Replaces the old JSONB-based calculate_okr_progress
-- ============================================
CREATE OR REPLACE FUNCTION calculate_okr_progress_from_targets(p_okr_id uuid)
RETURNS numeric AS $$
DECLARE
  total_weighted_progress numeric := 0;
  total_weight numeric := 0;
  target_record record;
  target_progress numeric;
BEGIN
  FOR target_record IN
    SELECT metric_type, start_value, target_value, current_value, weight
    FROM public.okr_targets
    WHERE okr_id = p_okr_id AND deleted_at IS NULL
  LOOP
    -- Calculate progress based on metric type
    CASE target_record.metric_type
      WHEN 'boolean' THEN
        target_progress := CASE WHEN target_record.current_value >= 1 THEN 100 ELSE 0 END;
      WHEN 'number', 'currency' THEN
        IF target_record.target_value > COALESCE(target_record.start_value, 0) THEN
          target_progress := LEAST(
            ROUND(
              ((COALESCE(target_record.current_value, 0) - COALESCE(target_record.start_value, 0))
               / (target_record.target_value - COALESCE(target_record.start_value, 0))) * 100,
              2
            ),
            100
          );
        ELSE
          target_progress := CASE WHEN target_record.current_value >= target_record.target_value THEN 100 ELSE 0 END;
        END IF;
      WHEN 'tasks' THEN
        IF target_record.target_value > 0 THEN
          target_progress := LEAST(
            ROUND((COALESCE(target_record.current_value, 0) / target_record.target_value) * 100, 2),
            100
          );
        ELSE
          target_progress := 0;
        END IF;
    END CASE;

    -- Ensure progress is not negative
    target_progress := GREATEST(target_progress, 0);

    total_weighted_progress := total_weighted_progress + (target_progress * COALESCE(target_record.weight, 1));
    total_weight := total_weight + COALESCE(target_record.weight, 1);
  END LOOP;

  IF total_weight > 0 THEN
    RETURN ROUND(total_weighted_progress / total_weight, 2);
  END IF;

  RETURN 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 9. Trigger to auto-update OKR progress when targets change
-- ============================================
CREATE OR REPLACE FUNCTION trigger_update_okr_progress_from_targets()
RETURNS TRIGGER AS $$
DECLARE
  v_okr_id uuid;
BEGIN
  -- Determine which OKR to update
  IF TG_OP = 'DELETE' THEN
    v_okr_id := OLD.okr_id;
  ELSE
    v_okr_id := NEW.okr_id;
  END IF;

  -- Update the OKR's progress
  UPDATE public.okrs
  SET progress = calculate_okr_progress_from_targets(v_okr_id)
  WHERE id = v_okr_id;

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS okr_targets_progress_update ON public.okr_targets;
CREATE TRIGGER okr_targets_progress_update
  AFTER INSERT OR UPDATE OR DELETE ON public.okr_targets
  FOR EACH ROW
  EXECUTE FUNCTION trigger_update_okr_progress_from_targets();

-- ============================================
-- 10. Function to calculate overall weighted score across all objectives
-- ============================================
CREATE OR REPLACE FUNCTION calculate_overall_okr_score(p_employee_id uuid, p_cycle_id uuid DEFAULT NULL)
RETURNS numeric AS $$
DECLARE
  total_weighted_progress numeric := 0;
  total_weight numeric := 0;
  okr_record record;
BEGIN
  FOR okr_record IN
    SELECT progress, weight
    FROM public.okrs
    WHERE employee_id = p_employee_id
      AND (p_cycle_id IS NULL OR cycle_id = p_cycle_id)
      AND status != 'draft'
  LOOP
    total_weighted_progress := total_weighted_progress + (COALESCE(okr_record.progress, 0) * COALESCE(okr_record.weight, 1));
    total_weight := total_weight + COALESCE(okr_record.weight, 1);
  END LOOP;

  IF total_weight > 0 THEN
    RETURN ROUND(total_weighted_progress / total_weight, 2);
  END IF;

  RETURN 0;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- 11. Migrate existing JSONB key_results to okr_targets
-- ============================================
DO $$
DECLARE
  okr_record record;
  kr_element jsonb;
  kr_index integer;
BEGIN
  FOR okr_record IN
    SELECT id, employee_id, cycle_id, key_results
    FROM public.okrs
    WHERE key_results IS NOT NULL
      AND jsonb_array_length(key_results) > 0
  LOOP
    kr_index := 0;
    FOR kr_element IN SELECT * FROM jsonb_array_elements(okr_record.key_results)
    LOOP
      INSERT INTO public.okr_targets (
        okr_id, employee_id, cycle_id, name, metric_type,
        start_value, target_value, current_value, unit, weight, sort_order
      ) VALUES (
        okr_record.id,
        okr_record.employee_id,
        okr_record.cycle_id,
        COALESCE(kr_element->>'description', 'Key Result ' || kr_index),
        'number',
        0,
        COALESCE((kr_element->>'targetValue')::numeric, 100),
        COALESCE((kr_element->>'currentValue')::numeric, 0),
        COALESCE(kr_element->>'unit', '%'),
        COALESCE((kr_element->>'weight')::numeric, 1),
        kr_index
      )
      ON CONFLICT DO NOTHING;

      kr_index := kr_index + 1;
    END LOOP;
  END LOOP;
END;
$$;

COMMENT ON TABLE public.okr_targets IS 'Targets/KPIs under an OKR objective. Supports number, boolean, currency, and task metric types.';
COMMENT ON FUNCTION calculate_okr_progress_from_targets(uuid) IS 'Calculates weighted average progress across all targets for an OKR';
COMMENT ON FUNCTION calculate_overall_okr_score(uuid, uuid) IS 'Calculates weighted average progress across all objectives for an employee in a cycle';

COMMIT;
