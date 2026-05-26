ALTER TABLE public.intern_daily_logs
  DROP CONSTRAINT IF EXISTS chk_intern_daily_logs_hours_valid;

ALTER TABLE public.intern_daily_logs
  DROP CONSTRAINT IF EXISTS intern_daily_logs_hours_valid;

ALTER TABLE public.intern_daily_logs
  ADD CONSTRAINT chk_intern_daily_logs_hours_valid
  CHECK (hours_worked >= 0.25 AND hours_worked <= 40);