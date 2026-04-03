-- Migration: Create Audit Log Table
-- Created: 2026-01-23
-- Description: Creates audit log table for tracking sensitive operations

-- UP Migration
BEGIN;

-- Audit log table for tracking all sensitive operations
CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  table_name text NOT NULL,
  record_id uuid NOT NULL,
  operation text NOT NULL CHECK (operation IN ('INSERT', 'UPDATE', 'DELETE')),
  old_values jsonb,
  new_values jsonb,
  performed_by uuid REFERENCES auth.users(id),
  performed_at timestamptz NOT NULL DEFAULT now(),
  ip_address inet,
  user_agent text
);

-- Create index for common queries
CREATE INDEX idx_audit_logs_table_name ON public.audit_logs(table_name);
CREATE INDEX idx_audit_logs_record_id ON public.audit_logs(record_id);
CREATE INDEX idx_audit_logs_performed_by ON public.audit_logs(performed_by);
CREATE INDEX idx_audit_logs_performed_at ON public.audit_logs(performed_at DESC);

-- Enable RLS on audit logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs FORCE ROW LEVEL SECURITY;

-- NOTE: The select policy referencing public.users is created in
-- 20260123000004_create_users_table.sql (after the users table exists).

-- System can insert audit logs (no user restrictions)
CREATE POLICY "audit_logs_insert_policy" ON public.audit_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Comment on table
COMMENT ON TABLE public.audit_logs IS 'Audit trail for all sensitive operations across the system';

COMMIT;

-- DOWN Migration (run manually if rollback needed)
/*
BEGIN;

DROP TABLE IF EXISTS public.audit_logs CASCADE;

COMMIT;
*/
