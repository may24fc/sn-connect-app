-- V3-1.5: Add hourly_rate and hours_worked columns to invoices table
-- These allow users to specify an hourly rate and hours worked,
-- with gross_amount auto-calculated as hourly_rate × hours_worked.

ALTER TABLE invoices
  ADD COLUMN IF NOT EXISTS hourly_rate numeric,
  ADD COLUMN IF NOT EXISTS hours_worked numeric;

COMMENT ON COLUMN invoices.hourly_rate IS 'Hourly rate in source currency';
COMMENT ON COLUMN invoices.hours_worked IS 'Number of hours worked for the billing period';
