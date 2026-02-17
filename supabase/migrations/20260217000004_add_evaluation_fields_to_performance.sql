-- Migration: Add evaluation fields to OKRs and KPIs
-- Created: 2026-02-17
-- Description: Adds admin_rating, admin_comments, evaluated_by fields and status field for KPIs

BEGIN;

-- Add status field to kpis table (KPIs previously didn't have status tracking)
ALTER TABLE public.kpis
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'in_progress';

-- Add index for KPI status
CREATE INDEX IF NOT EXISTS idx_kpis_status ON public.kpis(status);

-- Add evaluation fields to okrs table
ALTER TABLE public.okrs
  ADD COLUMN IF NOT EXISTS admin_rating text CHECK (admin_rating IN ('exceptional', 'exceeds', 'meets', 'needs_improvement', 'unsatisfactory')),
  ADD COLUMN IF NOT EXISTS admin_comments text,
  ADD COLUMN IF NOT EXISTS evaluated_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS evaluated_at timestamptz;

-- Add evaluation fields to kpis table
ALTER TABLE public.kpis
  ADD COLUMN IF NOT EXISTS admin_rating text CHECK (admin_rating IN ('exceptional', 'exceeds', 'meets', 'needs_improvement', 'unsatisfactory')),
  ADD COLUMN IF NOT EXISTS admin_comments text,
  ADD COLUMN IF NOT EXISTS evaluated_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS evaluated_at timestamptz;

-- Add indexes for evaluation queries
CREATE INDEX IF NOT EXISTS idx_okrs_evaluated_by ON public.okrs(evaluated_by);
CREATE INDEX IF NOT EXISTS idx_okrs_admin_rating ON public.okrs(admin_rating);
CREATE INDEX IF NOT EXISTS idx_kpis_evaluated_by ON public.kpis(evaluated_by);
CREATE INDEX IF NOT EXISTS idx_kpis_admin_rating ON public.kpis(admin_rating);

COMMENT ON COLUMN public.kpis.status IS 'KPI status: in_progress, submitted, completed, etc.';
COMMENT ON COLUMN public.okrs.admin_rating IS 'Admin evaluation rating for the OKR';
COMMENT ON COLUMN public.okrs.admin_comments IS 'Admin feedback comments on the OKR';
COMMENT ON COLUMN public.okrs.evaluated_by IS 'User ID of the admin who evaluated this OKR';
COMMENT ON COLUMN public.okrs.evaluated_at IS 'Timestamp when the OKR was evaluated';

COMMENT ON COLUMN public.kpis.admin_rating IS 'Admin evaluation rating for the KPI';
COMMENT ON COLUMN public.kpis.admin_comments IS 'Admin feedback comments on the KPI';
COMMENT ON COLUMN public.kpis.evaluated_by IS 'User ID of the admin who evaluated this KPI';
COMMENT ON COLUMN public.kpis.evaluated_at IS 'Timestamp when the KPI was evaluated';

COMMIT;
