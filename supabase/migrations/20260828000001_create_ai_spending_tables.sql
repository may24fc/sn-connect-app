BEGIN;

CREATE TYPE public.ai_spend_type AS ENUM ('api', 'subscription');

CREATE TABLE IF NOT EXISTS public.ai_expense_providers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.ai_expenses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  provider_id uuid NOT NULL REFERENCES public.ai_expense_providers(id) ON DELETE RESTRICT,
  spend_type public.ai_spend_type NOT NULL DEFAULT 'subscription',
  transaction_date date NOT NULL,
  amount_cents integer NOT NULL CHECK (amount_cents > 0),
  currency text NOT NULL DEFAULT 'AUD',
  account_email text NOT NULL DEFAULT '',
  transaction_id text NOT NULL,
  reason text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_expense_providers_active
  ON public.ai_expense_providers (is_active, name);

CREATE INDEX IF NOT EXISTS idx_ai_expenses_user_id
  ON public.ai_expenses (user_id, transaction_date DESC);

CREATE INDEX IF NOT EXISTS idx_ai_expenses_provider_id
  ON public.ai_expenses (provider_id, user_id);

CREATE INDEX IF NOT EXISTS idx_ai_expenses_spend_type
  ON public.ai_expenses (spend_type, user_id);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_ai_expense_providers_set_updated_at ON public.ai_expense_providers;
DROP TRIGGER IF EXISTS trigger_ai_expenses_set_updated_at ON public.ai_expenses;

CREATE TRIGGER trigger_ai_expense_providers_set_updated_at
BEFORE UPDATE ON public.ai_expense_providers
FOR EACH ROW
EXECUTE PROCEDURE public.set_updated_at();

CREATE TRIGGER trigger_ai_expenses_set_updated_at
BEFORE UPDATE ON public.ai_expenses
FOR EACH ROW
EXECUTE PROCEDURE public.set_updated_at();

ALTER TABLE public.ai_expense_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_expense_providers FORCE ROW LEVEL SECURITY;
ALTER TABLE public.ai_expenses FORCE ROW LEVEL SECURITY;

CREATE POLICY ai_expense_providers_select_policy
  ON public.ai_expense_providers
  FOR SELECT
  USING (auth.uid() IS NOT NULL);

CREATE POLICY ai_expenses_select_policy
  ON public.ai_expenses
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY ai_expenses_insert_policy
  ON public.ai_expenses
  FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY ai_expenses_update_policy
  ON public.ai_expenses
  FOR UPDATE
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY ai_expenses_delete_policy
  ON public.ai_expenses
  FOR DELETE
  USING (user_id = auth.uid());

INSERT INTO public.ai_expense_providers (name)
VALUES ('OpenAI'), ('Claude'), ('GitHub Copilot'), ('Gemini'), ('Kimi'), ('Other')
ON CONFLICT (name) DO NOTHING;

COMMIT;
