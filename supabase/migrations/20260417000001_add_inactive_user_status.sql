-- Migration: Add inactive status to user_status enum
-- Created: 2026-04-17
-- Description: Supports directory-level account deactivation for employees and interns.

BEGIN;

ALTER TYPE user_status ADD VALUE IF NOT EXISTS 'inactive';

COMMIT;
