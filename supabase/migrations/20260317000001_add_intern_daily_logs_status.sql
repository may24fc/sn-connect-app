-- Add status column to intern_daily_logs (draft / submitted)
-- Existing rows default to 'submitted' to preserve backward compatibility.

ALTER TABLE public.intern_daily_logs
  ADD COLUMN status text NOT NULL DEFAULT 'submitted';

ALTER TABLE public.intern_daily_logs
  ADD COLUMN updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.intern_daily_logs
  ADD CONSTRAINT intern_daily_logs_status_valid
  CHECK (status IN ('draft', 'submitted'));

CREATE INDEX idx_intern_daily_logs_status ON public.intern_daily_logs(status);

-- Allow interns to update their OWN draft logs (content edits + submit)
-- The existing update policy only allows supervisors/admins.
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

-- Trigger to auto-update updated_at
CREATE TRIGGER trigger_intern_daily_logs_updated_at
  BEFORE UPDATE ON public.intern_daily_logs
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
