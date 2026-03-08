-- Migration: 20260228000008_fix_tasks_rls_after_role_consolidation.sql
-- Description: Update tasks and task_comments RLS policies to use consolidated roles
--              (admin, super_admin) instead of removed roles (hr, cos, ceo).
-- Dependencies: 20260216000012_repair_tasks_schema.sql, 20260217000005_consolidate_roles.sql

BEGIN;

-- =============================================================================
-- 1. Drop existing tasks policies
-- =============================================================================
DROP POLICY IF EXISTS "tasks_select_policy" ON public.tasks;
DROP POLICY IF EXISTS "tasks_insert_policy" ON public.tasks;
DROP POLICY IF EXISTS "tasks_update_policy" ON public.tasks;
DROP POLICY IF EXISTS "tasks_delete_policy" ON public.tasks;

-- =============================================================================
-- 2. Recreate tasks policies with consolidated roles
-- =============================================================================

-- SELECT: assigned user, assigner, or admin/super_admin
CREATE POLICY "tasks_select_policy" ON public.tasks
  FOR SELECT
  TO authenticated
  USING (
    tasks.deleted_at IS NULL
    AND (
      tasks.assigned_to = auth.uid()
      OR tasks.assigned_by = auth.uid()
      OR user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::public.user_role[])
    )
  );

-- INSERT: assigner must be current user, or admin/super_admin
CREATE POLICY "tasks_insert_policy" ON public.tasks
  FOR INSERT
  TO authenticated
  WITH CHECK (
    tasks.assigned_by = auth.uid()
    OR user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::public.user_role[])
  );

-- UPDATE: assigned user, assigner, or admin/super_admin
CREATE POLICY "tasks_update_policy" ON public.tasks
  FOR UPDATE
  TO authenticated
  USING (
    tasks.deleted_at IS NULL
    AND (
      tasks.assigned_to = auth.uid()
      OR tasks.assigned_by = auth.uid()
      OR user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::public.user_role[])
    )
  )
  WITH CHECK (
    tasks.assigned_to = auth.uid()
    OR tasks.assigned_by = auth.uid()
    OR user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::public.user_role[])
  );

-- DELETE: assigner or admin/super_admin
CREATE POLICY "tasks_delete_policy" ON public.tasks
  FOR DELETE
  TO authenticated
  USING (
    tasks.assigned_by = auth.uid()
    OR user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::public.user_role[])
  );

-- =============================================================================
-- 3. Drop existing task_comments policies
-- =============================================================================
DROP POLICY IF EXISTS "task_comments_select_policy" ON public.task_comments;
DROP POLICY IF EXISTS "task_comments_insert_policy" ON public.task_comments;
DROP POLICY IF EXISTS "task_comments_update_policy" ON public.task_comments;
DROP POLICY IF EXISTS "task_comments_delete_policy" ON public.task_comments;

-- =============================================================================
-- 4. Recreate task_comments policies with consolidated roles
-- =============================================================================

-- SELECT: user can see comments on tasks they have access to
CREATE POLICY "task_comments_select_policy" ON public.task_comments
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.tasks
      WHERE tasks.id = task_comments.task_id
      AND tasks.deleted_at IS NULL
      AND (
        tasks.assigned_to = auth.uid()
        OR tasks.assigned_by = auth.uid()
        OR user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::public.user_role[])
      )
    )
  );

-- INSERT: user can comment on tasks they have access to
CREATE POLICY "task_comments_insert_policy" ON public.task_comments
  FOR INSERT
  TO authenticated
  WITH CHECK (
    task_comments.user_id = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.tasks
      WHERE tasks.id = task_comments.task_id
      AND tasks.deleted_at IS NULL
      AND (
        tasks.assigned_to = auth.uid()
        OR tasks.assigned_by = auth.uid()
        OR user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::public.user_role[])
      )
    )
  );

-- UPDATE: only the comment author
CREATE POLICY "task_comments_update_policy" ON public.task_comments
  FOR UPDATE
  TO authenticated
  USING (
    task_comments.user_id = auth.uid()
  )
  WITH CHECK (
    task_comments.user_id = auth.uid()
  );

-- DELETE: comment author or admin/super_admin
CREATE POLICY "task_comments_delete_policy" ON public.task_comments
  FOR DELETE
  TO authenticated
  USING (
    task_comments.user_id = auth.uid()
    OR user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::public.user_role[])
  );

COMMIT;
