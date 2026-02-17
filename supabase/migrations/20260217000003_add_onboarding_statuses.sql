-- Migration: Add onboarding statuses to user_status enum
-- Created: 2026-02-17
-- Description: Adds pending_onboarding and awaiting_approval statuses for credentials-first onboarding flow

BEGIN;

-- Add new status values to user_status enum
ALTER TYPE user_status ADD VALUE IF NOT EXISTS 'pending_onboarding';
ALTER TYPE user_status ADD VALUE IF NOT EXISTS 'awaiting_approval';

COMMIT;
