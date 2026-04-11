BEGIN;

ALTER TABLE public.onboarding_profiles
  ADD COLUMN IF NOT EXISTS invite_probation_mode text NOT NULL DEFAULT 'under_probation',
  ADD COLUMN IF NOT EXISTS invite_probation_auto_90 boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS invite_probation_end_date date;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'onboarding_profiles_invite_probation_mode_check'
  ) THEN
    ALTER TABLE public.onboarding_profiles
      ADD CONSTRAINT onboarding_profiles_invite_probation_mode_check
      CHECK (invite_probation_mode IN ('under_probation', 'no_probation'));
  END IF;
END
$$;

ALTER TABLE public.employees
  ADD COLUMN IF NOT EXISTS manual_probation_status text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'employees_manual_probation_status_check'
  ) THEN
    ALTER TABLE public.employees
      ADD CONSTRAINT employees_manual_probation_status_check
      CHECK (manual_probation_status IS NULL OR manual_probation_status IN ('on-track', 'at-risk'));
  END IF;
END
$$;

COMMENT ON COLUMN public.onboarding_profiles.invite_probation_mode IS 'Invite-time probation intent for employee onboarding: under_probation or no_probation.';
COMMENT ON COLUMN public.onboarding_profiles.invite_probation_auto_90 IS 'If true, probation end date defaults to 90 days from assignment date.';
COMMENT ON COLUMN public.onboarding_profiles.invite_probation_end_date IS 'Optional invite-time manual probation end date override.';
COMMENT ON COLUMN public.employees.manual_probation_status IS 'Admin override for probation status display and filtering; null uses computed status.';

COMMIT;