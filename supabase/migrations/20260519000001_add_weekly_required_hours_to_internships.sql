-- Migration: Add weekly_required_hours to internships table
-- Reason: Support per-week hour target separate from total required hours.
--   Existing required_hours = "Entire Hours" (total for the internship).
--   New weekly_required_hours = hours target per week (resets every Monday).
-- Backward compat: DEFAULT 20 covers existing prod rows safely.

ALTER TABLE public.internships
  ADD COLUMN IF NOT EXISTS weekly_required_hours integer NOT NULL DEFAULT 20;

COMMENT ON COLUMN public.internships.weekly_required_hours IS
  'Weekly hour target for the associate (resets every Monday). Separate from required_hours which is the total for the entire internship.';
