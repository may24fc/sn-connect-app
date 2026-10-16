-- Privileged human accounts keep their authorization role while remaining
-- outside the official workforce population and people-derived reporting.

ALTER TYPE public.account_kind ADD VALUE IF NOT EXISTS 'privileged';

ALTER TABLE public.users
  DROP CONSTRAINT IF EXISTS users_privileged_identity_check;
ALTER TABLE public.users
  ADD CONSTRAINT users_privileged_identity_check CHECK (
    account_kind::text <> 'privileged'
    OR (
      role::text IN ('admin', 'super_admin')
      AND NULLIF(BTRIM(account_purpose), '') IS NOT NULL
    )
  );

COMMENT ON COLUMN public.users.account_kind IS
  'Identity population, separate from authorization role: workforce, privileged human admin, reviewer, test, or service.';
