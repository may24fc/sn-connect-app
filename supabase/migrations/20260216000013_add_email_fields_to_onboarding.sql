-- Migration: Add email fields to onboarding_profiles table
-- Created: 2026-02-16
-- Purpose: Add personal_email, company_email, and emergency_contact_email fields to support enhanced onboarding

BEGIN;

-- Add new email fields to onboarding_profiles table
ALTER TABLE public.onboarding_profiles
  ADD COLUMN IF NOT EXISTS personal_email text,
  ADD COLUMN IF NOT EXISTS company_email text,
  ADD COLUMN IF NOT EXISTS emergency_contact_email text;

-- Create indexes for the new email fields for better query performance
CREATE INDEX IF NOT EXISTS idx_onboarding_profiles_personal_email
  ON public.onboarding_profiles(personal_email)
  WHERE deleted_at IS NULL AND personal_email IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_onboarding_profiles_company_email
  ON public.onboarding_profiles(company_email)
  WHERE deleted_at IS NULL AND company_email IS NOT NULL;

COMMIT;
