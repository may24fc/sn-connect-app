-- Add status column to intern_daily_logs (draft / submitted)
-- Existing rows default to 'submitted' to preserve backward compatibility.

ALTER TABLE public.intern_daily_logs
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'submitted';

ALTER TABLE public.intern_daily_logs
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'intern_daily_logs_status_valid'
      AND conrelid = 'public.intern_daily_logs'::regclass
  ) THEN
    ALTER TABLE public.intern_daily_logs
      ADD CONSTRAINT intern_daily_logs_status_valid
      CHECK (status IN ('draft', 'submitted'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_intern_daily_logs_status ON public.intern_daily_logs(status);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'intern_daily_logs'
      AND policyname = 'intern_daily_logs_self_update_draft_policy'
  ) THEN
    CREATE POLICY intern_daily_logs_self_update_draft_policy ON public.intern_daily_logs
      FOR UPDATE
      TO authenticated
      USING (
        status = 'draft'
        AND EXISTS (
          SELECT 1
          FROM public.internships i
          JOIN public.employees e ON e.id = i.employee_id
          WHERE i.id = intern_daily_logs.internship_id
            AND e.user_id = auth.uid()
            AND e.deleted_at IS NULL
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1
          FROM public.internships i
          JOIN public.employees e ON e.id = i.employee_id
          WHERE i.id = intern_daily_logs.internship_id
            AND e.user_id = auth.uid()
            AND e.deleted_at IS NULL
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trigger_intern_daily_logs_updated_at'
      AND tgrelid = 'public.intern_daily_logs'::regclass
  ) THEN
    CREATE TRIGGER trigger_intern_daily_logs_updated_at
      BEFORE UPDATE ON public.intern_daily_logs
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_updated_at();
  END IF;
END $$;
