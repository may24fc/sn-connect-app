-- Migration: Fix onboarding RLS policies after role consolidation
-- Created: 2026-02-17
-- Description: Update onboarding_profiles and onboarding_documents RLS policies
--   to use the consolidated user_role enum values (admin, super_admin)
--   instead of the old values (hr, cos, ceo) that were removed.
--
-- Context: Migration 20260217000005_consolidate_roles.sql consolidated:
--   - hr -> admin
--   - cos -> super_admin
--   - ceo -> super_admin
--
-- The repair_onboarding_schema migration (20260216000011) was created before
-- role consolidation and still references the old enum values, causing
-- type errors when the policies are evaluated.

BEGIN;

-- ============================================
-- ONBOARDING_PROFILES POLICIES
-- ============================================

DROP POLICY IF EXISTS onboarding_profiles_select_policy ON public.onboarding_profiles;
DROP POLICY IF EXISTS onboarding_profiles_insert_policy ON public.onboarding_profiles;
DROP POLICY IF EXISTS onboarding_profiles_update_policy ON public.onboarding_profiles;

-- SELECT: Users can view their own profile OR admins can view all
CREATE POLICY onboarding_profiles_select_policy ON public.onboarding_profiles
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
  );

-- INSERT: Users can create their own profile OR admins can create for others
CREATE POLICY onboarding_profiles_insert_policy ON public.onboarding_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    OR user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
  );

-- UPDATE: Users can update their own profile OR admins can update any
CREATE POLICY onboarding_profiles_update_policy ON public.onboarding_profiles
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid()
    OR user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
  )
  WITH CHECK (
    user_id = auth.uid()
    OR user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
  );

-- ============================================
-- ONBOARDING_DOCUMENTS POLICIES
-- ============================================

DROP POLICY IF EXISTS onboarding_documents_select_policy ON public.onboarding_documents;
DROP POLICY IF EXISTS onboarding_documents_insert_policy ON public.onboarding_documents;
DROP POLICY IF EXISTS onboarding_documents_update_policy ON public.onboarding_documents;
DROP POLICY IF EXISTS onboarding_documents_delete_policy ON public.onboarding_documents;

-- SELECT: Users can view documents for their own profile OR admins can view all
CREATE POLICY onboarding_documents_select_policy ON public.onboarding_documents
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.onboarding_profiles op
      WHERE op.id = onboarding_documents.onboarding_profile_id
      AND op.deleted_at IS NULL
      AND (
        op.user_id = auth.uid()
        OR user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
      )
    )
  );

-- INSERT: Users can upload documents for their own profile OR admins can upload for any
CREATE POLICY onboarding_documents_insert_policy ON public.onboarding_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.onboarding_profiles op
      WHERE op.id = onboarding_documents.onboarding_profile_id
      AND op.deleted_at IS NULL
      AND (
        op.user_id = auth.uid()
        OR user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
      )
    )
  );

-- UPDATE: Users can update documents for their own profile OR admins can update any
CREATE POLICY onboarding_documents_update_policy ON public.onboarding_documents
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.onboarding_profiles op
      WHERE op.id = onboarding_documents.onboarding_profile_id
      AND op.deleted_at IS NULL
      AND (
        op.user_id = auth.uid()
        OR user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
      )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM public.onboarding_profiles op
      WHERE op.id = onboarding_documents.onboarding_profile_id
      AND op.deleted_at IS NULL
      AND (
        op.user_id = auth.uid()
        OR user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
      )
    )
  );

-- DELETE: Users can delete documents for their own profile OR admins can delete any
CREATE POLICY onboarding_documents_delete_policy ON public.onboarding_documents
  FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.onboarding_profiles op
      WHERE op.id = onboarding_documents.onboarding_profile_id
      AND op.deleted_at IS NULL
      AND (
        op.user_id = auth.uid()
        OR user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
      )
    )
  );

COMMIT;

-- DOWN Migration (run manually if rollback needed)
/*
BEGIN;

-- Restore old policies with old role names (will fail if user_role enum doesn't contain them)
DROP POLICY IF EXISTS onboarding_profiles_select_policy ON public.onboarding_profiles;
DROP POLICY IF EXISTS onboarding_profiles_insert_policy ON public.onboarding_profiles;
DROP POLICY IF EXISTS onboarding_profiles_update_policy ON public.onboarding_profiles;
DROP POLICY IF EXISTS onboarding_documents_select_policy ON public.onboarding_documents;
DROP POLICY IF EXISTS onboarding_documents_insert_policy ON public.onboarding_documents;
DROP POLICY IF EXISTS onboarding_documents_update_policy ON public.onboarding_documents;
DROP POLICY IF EXISTS onboarding_documents_delete_policy ON public.onboarding_documents;

-- (Recreate old policies with old enum values - omitted as those values no longer exist)

COMMIT;
*/
