-- Migration: Recreate Announcements RLS Policies with Consolidated Roles
-- Created: 2026-02-17
-- Description: Recreates RLS policies for announcements tables using the new
--              consolidated role system (admin, super_admin instead of hr, cos, ceo)
--
-- This migration fixes the issue where the role consolidation migration
-- (20260217000005) dropped all policies but only recreated policies for
-- the users table, leaving announcements and other tables without policies.
--
-- Additionally, when the old user_role enum was dropped with CASCADE, it
-- also dropped the target_roles column. We need to recreate it first.

-- ============================================
-- STEP 1: Add back the target_roles column if it doesn't exist
-- ============================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
    AND table_name = 'announcements' 
    AND column_name = 'target_roles'
  ) THEN
    ALTER TABLE public.announcements 
    ADD COLUMN target_roles user_role[] DEFAULT '{}';
  END IF;
END$$;

-- Also check and restore for resources table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'resources') THEN
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
      AND table_name = 'resources' 
      AND column_name = 'target_roles'
    ) THEN
      ALTER TABLE public.resources 
      ADD COLUMN target_roles user_role[] DEFAULT '{}';
    END IF;
  END IF;
END$$;

-- ============================================
-- STEP 2: ANNOUNCEMENTS table policies
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "announcements_employee_select_policy" ON public.announcements;
DROP POLICY IF EXISTS "announcements_admin_all_policy" ON public.announcements;

-- Employees can view published announcements that target them
CREATE POLICY "announcements_employee_select_policy" ON public.announcements
  FOR SELECT
  TO authenticated
  USING (
    status = 'published'
    AND (published_at IS NULL OR published_at <= now())
    AND (expires_at IS NULL OR expires_at > now())
    AND deleted_at IS NULL
    AND (
      cardinality(target_roles) = 0 OR get_user_role(auth.uid()) = ANY(target_roles)
    )
    AND (
      cardinality(target_departments) = 0 OR EXISTS (
        SELECT 1 FROM public.users u
        WHERE u.id = auth.uid()
        AND u.department_id = ANY(target_departments)
        AND u.deleted_at IS NULL
      )
    )
    AND (
      cardinality(target_employees) = 0 OR auth.uid() = ANY(target_employees)
    )
  );

-- Admin/super_admin can do everything with announcements
CREATE POLICY "announcements_admin_all_policy" ON public.announcements
  FOR ALL
  TO authenticated
  USING (
    user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
  )
  WITH CHECK (
    user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
  );

-- ============================================
-- ANNOUNCEMENT_ATTACHMENTS table policies
-- ============================================

DROP POLICY IF EXISTS "announcement_attachments_select_policy" ON public.announcement_attachments;
DROP POLICY IF EXISTS "announcement_attachments_admin_insert_policy" ON public.announcement_attachments;
DROP POLICY IF EXISTS "announcement_attachments_admin_delete_policy" ON public.announcement_attachments;

-- Users can view attachments for announcements they can see
CREATE POLICY "announcement_attachments_select_policy" ON public.announcement_attachments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.announcements a
      WHERE a.id = announcement_attachments.announcement_id
      AND a.deleted_at IS NULL
      AND (
        (
          a.status = 'published'
          AND (a.published_at IS NULL OR a.published_at <= now())
          AND (a.expires_at IS NULL OR a.expires_at > now())
          AND (
            cardinality(a.target_roles) = 0 OR get_user_role(auth.uid()) = ANY(a.target_roles)
          )
          AND (
            cardinality(a.target_departments) = 0 OR EXISTS (
              SELECT 1 FROM public.users u
              WHERE u.id = auth.uid()
              AND u.department_id = ANY(a.target_departments)
              AND u.deleted_at IS NULL
            )
          )
          AND (
            cardinality(a.target_employees) = 0 OR auth.uid() = ANY(a.target_employees)
          )
        ) OR user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
      )
    )
  );

-- Admin/super_admin can insert attachments
CREATE POLICY "announcement_attachments_admin_insert_policy" ON public.announcement_attachments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.announcements a
      WHERE a.id = announcement_attachments.announcement_id
      AND a.deleted_at IS NULL
      AND user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
    )
  );

-- Admin/super_admin can delete attachments
CREATE POLICY "announcement_attachments_admin_delete_policy" ON public.announcement_attachments
  FOR DELETE
  TO authenticated
  USING (
    user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
  );

-- ============================================
-- ANNOUNCEMENT_READS table policies
-- ============================================

DROP POLICY IF EXISTS "announcement_reads_select_policy" ON public.announcement_reads;
DROP POLICY IF EXISTS "announcement_reads_insert_policy" ON public.announcement_reads;
DROP POLICY IF EXISTS "announcement_reads_admin_all_policy" ON public.announcement_reads;

-- Users can view their own read records
CREATE POLICY "announcement_reads_select_policy" ON public.announcement_reads
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Users can mark announcements as read
CREATE POLICY "announcement_reads_insert_policy" ON public.announcement_reads
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Admin/super_admin can view all read records
CREATE POLICY "announcement_reads_admin_all_policy" ON public.announcement_reads
  FOR ALL
  TO authenticated
  USING (
    user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
  )
  WITH CHECK (
    user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
  );

-- ============================================
-- ANNOUNCEMENT_COMMENTS table policies
-- ============================================

DROP POLICY IF EXISTS "announcement_comments_select_policy" ON public.announcement_comments;
DROP POLICY IF EXISTS "announcement_comments_insert_policy" ON public.announcement_comments;
DROP POLICY IF EXISTS "announcement_comments_update_own_policy" ON public.announcement_comments;
DROP POLICY IF EXISTS "announcement_comments_delete_own_policy" ON public.announcement_comments;
DROP POLICY IF EXISTS "announcement_comments_admin_all_policy" ON public.announcement_comments;

-- Users can view comments on announcements they can see
CREATE POLICY "announcement_comments_select_policy" ON public.announcement_comments
  FOR SELECT
  TO authenticated
  USING (
    deleted_at IS NULL
    AND EXISTS (
      SELECT 1 FROM public.announcements a
      WHERE a.id = announcement_comments.announcement_id
      AND a.deleted_at IS NULL
      AND (
        a.status = 'published'
        AND (a.published_at IS NULL OR a.published_at <= now())
        AND (a.expires_at IS NULL OR a.expires_at > now())
        AND (
          cardinality(a.target_roles) = 0 OR get_user_role(auth.uid()) = ANY(a.target_roles)
        )
      )
    )
  );

-- Users can insert comments on announcements that allow comments
CREATE POLICY "announcement_comments_insert_policy" ON public.announcement_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.announcements a
      WHERE a.id = announcement_comments.announcement_id
      AND a.deleted_at IS NULL
      AND a.allow_comments = true
      AND a.status = 'published'
    )
  );

-- Users can update their own comments
CREATE POLICY "announcement_comments_update_own_policy" ON public.announcement_comments
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid() AND deleted_at IS NULL)
  WITH CHECK (user_id = auth.uid());

-- Users can soft-delete their own comments
CREATE POLICY "announcement_comments_delete_own_policy" ON public.announcement_comments
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admin/super_admin can do everything with comments
CREATE POLICY "announcement_comments_admin_all_policy" ON public.announcement_comments
  FOR ALL
  TO authenticated
  USING (
    user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
  )
  WITH CHECK (
    user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
  );

-- ============================================
-- Verification
-- ============================================
-- This migration recreates all announcement-related RLS policies with
-- the new consolidated role system:
--   - 'admin' and 'super_admin' for admin access
--   - Removed references to 'hr', 'cos', 'ceo'
--
-- Tables updated:
--   - announcements
--   - announcement_attachments
--   - announcement_reads
--   - announcement_comments
