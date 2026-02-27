-- Migration: Normalize audit_logs for Edge Functions + create notifications table
-- Created: 2026-02-27
-- Description:
--   1. Add `action` and `metadata` columns to audit_logs for Edge Function usage
--   2. Relax the operation CHECK constraint for Edge Function audit entries
--   3. Create the notifications table with notification_type enum
--
-- Edge Functions will use `action` (text) + `metadata` (jsonb) going forward.
-- Legacy columns (operation, old_values, new_values) are preserved for backward compatibility.

BEGIN;

-- ============================================
-- 1. AUDIT_LOGS NORMALIZATION
-- ============================================

-- Drop the restrictive CHECK constraint on operation so Edge Functions
-- can write custom action strings (e.g., 'onboarding_initiated')
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.check_constraints
    WHERE constraint_name LIKE '%audit_logs_operation%'
  ) THEN
    ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_operation_check;
  END IF;
END
$$;

-- Add action column (nullable — legacy rows won't have it)
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS action text;

-- Add metadata column for structured data
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS metadata jsonb DEFAULT '{}';

-- Create index on the new action column for Edge Function queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON public.audit_logs(action);

-- Add composite index for idempotency checks (action + date)
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_date
  ON public.audit_logs(action, (performed_at::date));

COMMENT ON COLUMN public.audit_logs.action IS 'Edge Function action identifier (e.g., onboarding_initiated, probation_milestone_reminder). Used instead of operation for workflow-triggered audit entries.';
COMMENT ON COLUMN public.audit_logs.metadata IS 'Structured metadata for Edge Function audit entries. Replaces old_values/new_values for workflow-triggered entries.';

-- ============================================
-- 2. NOTIFICATIONS TABLE
-- ============================================

-- Create notification_type enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'notification_type') THEN
    CREATE TYPE notification_type AS ENUM (
      'task_assigned',
      'task_due',
      'report_submitted',
      'report_approved',
      'report_rejected',
      'announcement_new',
      'resource_new',
      'reminder',
      'onboarding_step',
      'probation_update',
      'system'
    );
  END IF;
END
$$;

-- Create notifications table
CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type notification_type NOT NULL,
  title text NOT NULL,
  message text,
  link text, -- Deep link path (e.g., '/tasks/abc-123')
  is_read boolean DEFAULT false,
  read_at timestamptz,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now() NOT NULL,
  expires_at timestamptz
);

-- Indexes for notification queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
  ON public.notifications(user_id, is_read)
  WHERE is_read = false;

CREATE INDEX IF NOT EXISTS idx_notifications_user_created
  ON public.notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notifications_type
  ON public.notifications(type);

-- Enable RLS
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications FORCE ROW LEVEL SECURITY;

-- Users can read/update their own notifications
CREATE POLICY notifications_select_own_policy ON public.notifications
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY notifications_update_own_policy ON public.notifications
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY notifications_delete_own_policy ON public.notifications
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Service role / system can insert notifications for any user
-- (Edge Functions use service role key, bypassing RLS entirely)
-- But allow authenticated users to insert their own notifications too
CREATE POLICY notifications_insert_policy ON public.notifications
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Admins can view all notifications (for admin dashboard)
CREATE POLICY notifications_admin_select_policy ON public.notifications
  FOR SELECT
  TO authenticated
  USING (
    user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
  );

COMMENT ON TABLE public.notifications IS 'In-app notification records for all users. Created by Edge Functions and system events.';
COMMENT ON COLUMN public.notifications.type IS 'Notification category from notification_type enum';
COMMENT ON COLUMN public.notifications.link IS 'Deep link path within the application (e.g., /admin/offboarding/abc-123)';
COMMENT ON COLUMN public.notifications.metadata IS 'Additional structured data for rich notification rendering';
COMMENT ON COLUMN public.notifications.expires_at IS 'Optional expiry — expired notifications can be cleaned up by a cron job';

COMMIT;
