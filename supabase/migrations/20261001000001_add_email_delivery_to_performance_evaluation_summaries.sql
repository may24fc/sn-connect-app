BEGIN;

-- Track email delivery of an evaluation summary so each period is emailed
-- automatically at most once (used by the 5% Reflection supervisor digest).
-- Admins can still send or resend manually from Control Hub.
ALTER TABLE public.performance_evaluation_summaries
  ADD COLUMN IF NOT EXISTS emailed_at timestamptz,
  ADD COLUMN IF NOT EXISTS email_trigger text CHECK (
    email_trigger IS NULL OR email_trigger IN ('all_submitted', 'deadline', 'manual')
  ),
  ADD COLUMN IF NOT EXISTS email_recipient_count integer CHECK (
    email_recipient_count IS NULL OR email_recipient_count >= 0
  ),
  ADD COLUMN IF NOT EXISTS emailed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.performance_evaluation_summaries.emailed_at IS
  'When the summary was last emailed. NULL means it has not been delivered yet.';
COMMENT ON COLUMN public.performance_evaluation_summaries.email_trigger IS
  'What caused the email: every expected member submitted, the period deadline passed, or an admin sent it manually.';
COMMENT ON COLUMN public.performance_evaluation_summaries.email_recipient_count IS
  'Number of recipients the email was sent to.';
COMMENT ON COLUMN public.performance_evaluation_summaries.emailed_by IS
  'Admin who sent the email manually. NULL for automated sends.';

COMMIT;
