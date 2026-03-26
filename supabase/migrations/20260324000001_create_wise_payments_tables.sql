-- Migration: Create Wise Payment Tables
-- Created: 2026-03-24
-- Description: Creates wise_payments and employee_banking_info tables
--              with payment_method/payment_status enums and strict RLS policies
--              for the Two-Phase Commit payroll execution flow.

BEGIN;

-- ─────────────────────────────────────────────────
-- 1. ENUMS
-- ─────────────────────────────────────────────────

DO $$ BEGIN
  CREATE TYPE payment_method AS ENUM ('wise', 'bank_transfer', 'check', 'other');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE TYPE payment_status AS ENUM ('pending', 'processing', 'completed', 'failed', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ─────────────────────────────────────────────────
-- 2. WISE PAYMENTS TABLE (Ledger)
-- ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.wise_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id),
  employee_id uuid NOT NULL REFERENCES public.employees(id),
  initiated_by uuid NOT NULL REFERENCES auth.users(id),

  -- Wise API references
  wise_transfer_id text UNIQUE,
  wise_quote_id text,
  wise_recipient_id text NOT NULL,

  -- Idempotency
  idempotency_key uuid NOT NULL UNIQUE,

  -- Amounts
  source_currency text NOT NULL DEFAULT 'EUR',
  target_currency text NOT NULL DEFAULT 'PHP',
  source_amount numeric(12,2) NOT NULL,
  target_amount numeric(12,2),
  exchange_rate numeric(12,6),
  fee numeric(12,2),

  -- Status
  payment_status payment_status NOT NULL DEFAULT 'pending',
  error_message text,

  -- Timestamps
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ─────────────────────────────────────────────────
-- 3. EMPLOYEE BANKING INFO TABLE
-- ─────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.employee_banking_info (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_id uuid NOT NULL REFERENCES public.employees(id) UNIQUE,
  wise_recipient_id text,
  account_holder_name text NOT NULL,
  bank_name text,
  account_number text,
  routing_number text,
  swift_code text,
  iban text,
  account_type text,
  currency text NOT NULL DEFAULT 'PHP',
  country_code text NOT NULL DEFAULT 'PH',
  is_verified boolean DEFAULT false,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz
);

-- ─────────────────────────────────────────────────
-- 4. ADD payment_method COLUMN TO invoices
-- ─────────────────────────────────────────────────

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS payment_method payment_method DEFAULT 'wise';

-- ─────────────────────────────────────────────────
-- 5. INDEXES
-- ─────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_wise_payments_invoice_id ON public.wise_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_wise_payments_employee_id ON public.wise_payments(employee_id);
CREATE INDEX IF NOT EXISTS idx_wise_payments_idempotency_key ON public.wise_payments(idempotency_key);
CREATE INDEX IF NOT EXISTS idx_wise_payments_wise_transfer_id ON public.wise_payments(wise_transfer_id);
CREATE INDEX IF NOT EXISTS idx_wise_payments_payment_status ON public.wise_payments(payment_status);
CREATE INDEX IF NOT EXISTS idx_employee_banking_info_employee_id ON public.employee_banking_info(employee_id);

-- ─────────────────────────────────────────────────
-- 6. RLS — wise_payments
-- ─────────────────────────────────────────────────

ALTER TABLE public.wise_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wise_payments FORCE ROW LEVEL SECURITY;

-- Employees can view their own payment records
CREATE POLICY "wise_payments_select_own_policy" ON public.wise_payments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.employees
      WHERE employees.id = wise_payments.employee_id
        AND employees.user_id = auth.uid()
        AND employees.deleted_at IS NULL
    )
  );

-- Admins can view all payment records
CREATE POLICY "wise_payments_select_admin_policy" ON public.wise_payments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'super_admin')
        AND users.deleted_at IS NULL
    )
  );

-- Only service role (backend) can INSERT/UPDATE wise_payments.
-- No authenticated INSERT/UPDATE policies = only supabaseAdmin client can mutate.

-- ─────────────────────────────────────────────────
-- 7. RLS — employee_banking_info
-- ─────────────────────────────────────────────────

ALTER TABLE public.employee_banking_info ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.employee_banking_info FORCE ROW LEVEL SECURITY;

-- Employees can view their own banking info
CREATE POLICY "banking_info_select_own_policy" ON public.employee_banking_info
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.employees
      WHERE employees.id = employee_banking_info.employee_id
        AND employees.user_id = auth.uid()
        AND employees.deleted_at IS NULL
    )
    AND employee_banking_info.deleted_at IS NULL
  );

-- Admins can view all banking info
CREATE POLICY "banking_info_select_admin_policy" ON public.employee_banking_info
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'super_admin')
        AND users.deleted_at IS NULL
    )
    AND employee_banking_info.deleted_at IS NULL
  );

-- Employees can insert/update their own banking info
CREATE POLICY "banking_info_insert_own_policy" ON public.employee_banking_info
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.employees
      WHERE employees.id = employee_banking_info.employee_id
        AND employees.user_id = auth.uid()
        AND employees.deleted_at IS NULL
    )
  );

CREATE POLICY "banking_info_update_own_policy" ON public.employee_banking_info
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.employees
      WHERE employees.id = employee_banking_info.employee_id
        AND employees.user_id = auth.uid()
        AND employees.deleted_at IS NULL
    )
    AND employee_banking_info.deleted_at IS NULL
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.employees
      WHERE employees.id = employee_banking_info.employee_id
        AND employees.user_id = auth.uid()
        AND employees.deleted_at IS NULL
    )
  );

-- Admin insert/update banking info
CREATE POLICY "banking_info_insert_admin_policy" ON public.employee_banking_info
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'super_admin')
        AND users.deleted_at IS NULL
    )
  );

CREATE POLICY "banking_info_update_admin_policy" ON public.employee_banking_info
  FOR UPDATE TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'super_admin')
        AND users.deleted_at IS NULL
    )
    AND employee_banking_info.deleted_at IS NULL
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
        AND users.role IN ('admin', 'super_admin')
        AND users.deleted_at IS NULL
    )
  );

-- ─────────────────────────────────────────────────
-- 8. UPDATED_AT TRIGGERS
-- ─────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS wise_payments_updated_at ON public.wise_payments;
CREATE TRIGGER wise_payments_updated_at
  BEFORE UPDATE ON public.wise_payments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS employee_banking_info_updated_at ON public.employee_banking_info;
CREATE TRIGGER employee_banking_info_updated_at
  BEFORE UPDATE ON public.employee_banking_info
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

COMMIT;
