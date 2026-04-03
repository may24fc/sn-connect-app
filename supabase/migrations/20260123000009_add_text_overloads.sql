-- Migration: Add text[] overloads for role-check functions
-- Created: 2026-04-02
-- Description: PG17 is stricter about implicit text[] -> user_role[] casts.
--   Add a text[] overload so ARRAY['admin','hr',...] literals resolve correctly.

BEGIN;

CREATE OR REPLACE FUNCTION public.user_has_any_role(user_id uuid, required_roles text[])
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = user_id
    AND role = ANY(required_roles::user_role[])
    AND deleted_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.user_has_any_role(uuid, text[]) IS 'Check if a user has any of the specified roles (text overload for PG17)';

COMMIT;
