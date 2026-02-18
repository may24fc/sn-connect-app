-- ============================================
-- Add Storage RLS Policies for All Buckets
-- Migration: 20260218000002
-- ============================================
--
-- SECURITY CONTEXT:
-- This migration implements Row Level Security policies for Supabase Storage buckets
-- to prevent unauthorized file uploads/downloads. Without these policies, all storage
-- operations fail with "new row violates row-level security policy" errors.
--
-- BUCKET SECURITY MODEL:
-- 1. announcements-attachments (private)
--    - Upload: Admin roles only (admin, hr, ceo, cos)
--    - Read: All authenticated users (employees can see published announcements)
--    - Delete: Admin roles only
--
-- 2. resources-library (private)
--    - Upload: Admin roles only
--    - Read: All authenticated users (employees can see published resources)
--    - Delete: Admin roles only
--
-- 3. resource-thumbnails (public)
--    - Upload: Admin roles only
--    - Read: Public (for performance/CDN)
--    - Delete: Admin roles only
--
-- ROLE MAPPING (UI → Database):
-- - admin UI role → admin, hr DB roles
-- - super_admin UI role → ceo, cos DB roles (inherits admin privileges)
-- - employee UI role → employee DB role
-- - intern UI role → intern DB role
-- ============================================

-- ============================================
-- Helper Function: Check if user has admin privileges
-- ============================================
-- This function checks if a user has ANY of the admin-level roles
-- Used by storage policies to gate upload/delete operations

CREATE OR REPLACE FUNCTION public.user_is_admin(user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM public.users
    WHERE id = user_id
      AND role IN ('admin', 'hr', 'ceo', 'cos')
      AND status = 'active'
  );
END;
$$;

-- ============================================
-- ANNOUNCEMENTS-ATTACHMENTS BUCKET POLICIES
-- ============================================
-- Private bucket for announcement attachments
-- Admins can upload/delete, all authenticated users can read
-- Note: RLS is already enabled on storage.objects by Supabase by default

-- Allow admins to upload announcement attachments
DROP POLICY IF EXISTS "announcements_attachments_insert_policy" ON storage.objects;
CREATE POLICY "announcements_attachments_insert_policy"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'announcements-attachments'
  AND public.user_is_admin(auth.uid())
);

-- Allow all authenticated users to read announcement attachments
-- (Employees need to download attachments from published announcements)
DROP POLICY IF EXISTS "announcements_attachments_select_policy" ON storage.objects;
CREATE POLICY "announcements_attachments_select_policy"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'announcements-attachments'
  AND auth.uid() IS NOT NULL
);

-- Allow admins to update announcement attachments metadata
DROP POLICY IF EXISTS "announcements_attachments_update_policy" ON storage.objects;
CREATE POLICY "announcements_attachments_update_policy"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'announcements-attachments'
  AND public.user_is_admin(auth.uid())
)
WITH CHECK (
  bucket_id = 'announcements-attachments'
  AND public.user_is_admin(auth.uid())
);

-- Allow admins to delete announcement attachments
DROP POLICY IF EXISTS "announcements_attachments_delete_policy" ON storage.objects;
CREATE POLICY "announcements_attachments_delete_policy"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'announcements-attachments'
  AND public.user_is_admin(auth.uid())
);

-- ============================================
-- RESOURCES-LIBRARY BUCKET POLICIES
-- ============================================
-- Private bucket for resource files (videos, documents, etc.)
-- Admins can upload/delete, all authenticated users can read

-- Allow admins to upload resources
DROP POLICY IF EXISTS "resources_library_insert_policy" ON storage.objects;
CREATE POLICY "resources_library_insert_policy"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'resources-library'
  AND public.user_is_admin(auth.uid())
);

-- Allow all authenticated users to read published resources
-- (Employees access resources via the Information Hub)
DROP POLICY IF EXISTS "resources_library_select_policy" ON storage.objects;
CREATE POLICY "resources_library_select_policy"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'resources-library'
  AND auth.uid() IS NOT NULL
);

-- Allow admins to update resource file metadata
DROP POLICY IF EXISTS "resources_library_update_policy" ON storage.objects;
CREATE POLICY "resources_library_update_policy"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'resources-library'
  AND public.user_is_admin(auth.uid())
)
WITH CHECK (
  bucket_id = 'resources-library'
  AND public.user_is_admin(auth.uid())
);

-- Allow admins to delete resources
DROP POLICY IF EXISTS "resources_library_delete_policy" ON storage.objects;
CREATE POLICY "resources_library_delete_policy"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'resources-library'
  AND public.user_is_admin(auth.uid())
);

-- ============================================
-- RESOURCE-THUMBNAILS BUCKET POLICIES
-- ============================================
-- PUBLIC bucket for resource thumbnails (for CDN performance)
-- Admins can upload/delete, anyone can read (bucket is public)

-- Allow admins to upload resource thumbnails
DROP POLICY IF EXISTS "resource_thumbnails_insert_policy" ON storage.objects;
CREATE POLICY "resource_thumbnails_insert_policy"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'resource-thumbnails'
  AND public.user_is_admin(auth.uid())
);

-- Allow public read access for thumbnails (bucket is public)
DROP POLICY IF EXISTS "resource_thumbnails_select_policy" ON storage.objects;
CREATE POLICY "resource_thumbnails_select_policy"
ON storage.objects
FOR SELECT
TO public
USING (
  bucket_id = 'resource-thumbnails'
);

-- Allow admins to update thumbnail metadata
DROP POLICY IF EXISTS "resource_thumbnails_update_policy" ON storage.objects;
CREATE POLICY "resource_thumbnails_update_policy"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'resource-thumbnails'
  AND public.user_is_admin(auth.uid())
)
WITH CHECK (
  bucket_id = 'resource-thumbnails'
  AND public.user_is_admin(auth.uid())
);

-- Allow admins to delete resource thumbnails
DROP POLICY IF EXISTS "resource_thumbnails_delete_policy" ON storage.objects;
CREATE POLICY "resource_thumbnails_delete_policy"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'resource-thumbnails'
  AND public.user_is_admin(auth.uid())
);

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Uncomment to verify policies are active

-- Check all storage policies
-- SELECT schemaname, tablename, policyname, roles, cmd, qual, with_check
-- FROM pg_policies
-- WHERE schemaname = 'storage'
-- ORDER BY tablename, policyname;

-- Test admin check function
-- SELECT public.user_is_admin(auth.uid());
