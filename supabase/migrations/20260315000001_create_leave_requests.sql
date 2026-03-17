-- ============================================================
-- Migration: Create leave_requests table
-- V3-0.5: Calendar & Leave Request Error Fix
-- ============================================================

-- Leave type enum
DO $$ BEGIN
  CREATE TYPE leave_type AS ENUM (
    'vacation',
    'sick',
    'personal',
    'bereavement',
    'maternity',
    'paternity',
    'unpaid'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Leave request status enum
DO $$ BEGIN
  CREATE TYPE leave_request_status AS ENUM (
    'pending',
    'approved',
    'rejected',
    'cancelled'
  );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Leave requests table
CREATE TABLE IF NOT EXISTS leave_requests (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  leave_type leave_type NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  reason text NOT NULL,
  status leave_request_status DEFAULT 'pending' NOT NULL,
  reviewer_id uuid REFERENCES auth.users(id),
  reviewer_notes text,
  reviewed_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  deleted_at timestamptz,
  CONSTRAINT leave_requests_date_range_check CHECK (end_date >= start_date)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_leave_requests_user_id ON leave_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_start_date ON leave_requests(start_date);
CREATE INDEX IF NOT EXISTS idx_leave_requests_deleted_at ON leave_requests(deleted_at) WHERE deleted_at IS NULL;

-- Enable RLS
ALTER TABLE leave_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE leave_requests FORCE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can read their own leave requests
CREATE POLICY leave_requests_select_own_policy
  ON leave_requests FOR SELECT
  USING (auth.uid() = user_id AND deleted_at IS NULL);

-- Admins/HR/managers can read all leave requests
CREATE POLICY leave_requests_select_admin_policy
  ON leave_requests FOR SELECT
  USING (
    user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
    AND deleted_at IS NULL
  );

-- Users can insert their own leave requests
CREATE POLICY leave_requests_insert_own_policy
  ON leave_requests FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own pending leave requests (cancel)
CREATE POLICY leave_requests_update_own_policy
  ON leave_requests FOR UPDATE
  USING (auth.uid() = user_id AND status = 'pending' AND deleted_at IS NULL)
  WITH CHECK (auth.uid() = user_id);

-- Admins/HR can update any leave request (approve/reject)
CREATE POLICY leave_requests_update_admin_policy
  ON leave_requests FOR UPDATE
  USING (
    user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[])
    AND deleted_at IS NULL
  );

-- updated_at trigger
CREATE OR REPLACE TRIGGER leave_requests_updated_at
  BEFORE UPDATE ON leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
