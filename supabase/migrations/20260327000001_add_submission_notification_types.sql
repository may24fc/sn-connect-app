-- Migration: Add submission notification types for invoices, intern logs, and approvals
-- Date: 2026-03-27
-- Purpose: Extend notification_type enum with invoice/intern log and approval notification types

BEGIN;

-- Rename the old enum type
ALTER TYPE notification_type RENAME TO notification_type_old;

-- Create the new enum type with all existing values plus new ones
CREATE TYPE notification_type AS ENUM (
  'task_assigned',
  'task_due',
  'report_submitted',
  'report_approved',
  'report_rejected',
  'invoice_submitted',
  'invoice_approved',
  'invoice_rejected',
  'intern_log_submitted',
  'intern_log_approved',
  'onboarding_approved',
  'onboarding_rejected',
  'announcement_new',
  'resource_new',
  'reminder',
  'onboarding_step',
  'probation_update',
  'system'
);

-- Update the column to use the new type (with cast through text)
ALTER TABLE notifications 
  ALTER COLUMN type DROP DEFAULT,
  ALTER COLUMN type TYPE notification_type USING (type::text::notification_type),
  ALTER COLUMN type SET NOT NULL;

-- Drop the old enum type
DROP TYPE notification_type_old;

-- Verify the migration
DO $$
BEGIN
  RAISE NOTICE 'Successfully added invoice_submitted, invoice_approved, invoice_rejected, intern_log_submitted, intern_log_approved, onboarding_approved, and onboarding_rejected to notification_type enum';
END $$;

COMMIT;
