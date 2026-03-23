-- Migration: Add 'scale' metric type to okr_targets
-- Purpose: Allow OKR targets to use the 1-4 rubric scale rating system.
-- Adds 'scale' to target_metric_type enum and adds rubric/self_rating columns.

-- 1. Add 'scale' value to target_metric_type enum
ALTER TYPE target_metric_type ADD VALUE IF NOT EXISTS 'scale';

-- 2. Add rubric description columns (one per rating level 1–4)
ALTER TABLE public.okr_targets ADD COLUMN IF NOT EXISTS rubric_1 text;
ALTER TABLE public.okr_targets ADD COLUMN IF NOT EXISTS rubric_2 text;
ALTER TABLE public.okr_targets ADD COLUMN IF NOT EXISTS rubric_3 text;
ALTER TABLE public.okr_targets ADD COLUMN IF NOT EXISTS rubric_4 text;

-- 3. Add self-rating column (1–4 scale, nullable until employee rates)
ALTER TABLE public.okr_targets ADD COLUMN IF NOT EXISTS self_rating smallint
  CHECK (self_rating IS NULL OR (self_rating >= 1 AND self_rating <= 4));
