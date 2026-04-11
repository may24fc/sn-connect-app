BEGIN;

ALTER TABLE public.onboarding_profiles
  ADD COLUMN IF NOT EXISTS review_state text,
  ADD COLUMN IF NOT EXISTS rejection_notes text,
  ADD COLUMN IF NOT EXISTS rejected_at timestamptz,
  ADD COLUMN IF NOT EXISTS rejected_by uuid,
  ADD COLUMN IF NOT EXISTS rejection_count integer NOT NULL DEFAULT 0;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'onboarding_profiles_review_state_check'
  ) THEN
    ALTER TABLE public.onboarding_profiles
      ADD CONSTRAINT onboarding_profiles_review_state_check
      CHECK (review_state IS NULL OR review_state IN ('pending_review', 'rejected'));
  END IF;
END
$$;

COMMENT ON COLUMN public.onboarding_profiles.review_state IS 'Admin review state for completed onboarding submissions: pending_review or rejected. Active users are treated as approved via users.status.';
COMMENT ON COLUMN public.onboarding_profiles.rejection_notes IS 'Latest rejection feedback left by an admin or super admin.';
COMMENT ON COLUMN public.onboarding_profiles.rejected_at IS 'Timestamp of the latest rejection event.';
COMMENT ON COLUMN public.onboarding_profiles.rejected_by IS 'User id of the admin or super admin who last rejected the onboarding submission.';
COMMENT ON COLUMN public.onboarding_profiles.rejection_count IS 'How many times the onboarding submission has been rejected.';

COMMIT;
