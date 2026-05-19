-- Migration: Extend notification_type enum with project intake values
-- Created: 2026-05-19
-- Description:
--   Adds two enum values used by the Telegram intake pipeline:
--     * project_claimable  -> broadcast to interns when a new pool item lands
--     * project_assigned   -> direct notification when a project is auto-assigned
--                             to a specific intern (by CEO name hint) or self-claimed
--
-- Note: Postgres requires ALTER TYPE ... ADD VALUE to run outside a transaction
-- in some versions. We use IF NOT EXISTS to keep this idempotent and safe to
-- re-run, and avoid wrapping in BEGIN/COMMIT so the values commit individually.

ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'project_claimable';
ALTER TYPE public.notification_type ADD VALUE IF NOT EXISTS 'project_assigned';
