-- Migration: Add major field to onboarding_profiles
-- Created: 2026-02-16
-- Purpose: Add major/field of study column

BEGIN;

ALTER TABLE public.onboarding_profiles
  ADD COLUMN IF NOT EXISTS major text;

COMMIT;
