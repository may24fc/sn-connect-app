-- Migration: Create signup trigger for auto-provisioning public.users rows
-- Created: 2026-02-16
-- Description: When a new user signs up via Supabase Auth (auth.users INSERT),
--   automatically create a corresponding row in public.users with the default
--   'employee' role. Uses SECURITY DEFINER to bypass RLS, which is safe here
--   because the trigger only fires on auth.users INSERT (controlled by Supabase Auth).

BEGIN;

-- ============================================
-- Function: Auto-create public.users row on signup
-- ============================================
-- SECURITY DEFINER: This function executes with the privileges of the owner
-- (postgres), which allows it to INSERT into public.users even though the
-- current RLS INSERT policy restricts inserts to admin/hr roles. This is
-- intentional and safe because:
--   1. This trigger ONLY fires on auth.users INSERT, which is controlled by
--      Supabase Auth's own email/password signup flow.
--   2. The function does NOT accept arbitrary input from the user; it reads
--      from the NEW row that Supabase Auth has already validated.
--   3. The role is hardcoded to 'employee' -- new signups cannot self-assign
--      elevated roles.
CREATE OR REPLACE FUNCTION public.handle_new_user_signup()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.users (id, role, status, created_at, updated_at)
  VALUES (
    NEW.id,
    'employee',
    'active',
    now(),
    now()
  );
  RETURN NEW;
EXCEPTION
  WHEN unique_violation THEN
    -- Row already exists (e.g. user was pre-provisioned by admin). Skip.
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.handle_new_user_signup() IS
  'Auto-creates a public.users row with default employee role when a new auth.users row is inserted via signup';

-- ============================================
-- Trigger: Fire on auth.users INSERT
-- ============================================
DROP TRIGGER IF EXISTS trigger_on_auth_user_created ON auth.users;

CREATE TRIGGER trigger_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_signup();

COMMIT;

-- DOWN Migration (run manually if rollback needed)
/*
BEGIN;

DROP TRIGGER IF EXISTS trigger_on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user_signup() CASCADE;

COMMIT;
*/
