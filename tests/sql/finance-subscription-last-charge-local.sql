BEGIN;

DO $$
BEGIN
  IF NOT has_table_privilege('service_role', 'public.finance_subscription_last_charges', 'SELECT')
    OR has_table_privilege('authenticated', 'public.finance_subscription_last_charges', 'SELECT')
    OR has_table_privilege('anon', 'public.finance_subscription_last_charges', 'SELECT') THEN
    RAISE EXCEPTION 'Subscription summary view privileges are incorrect';
  END IF;
END $$;

CREATE TEMP TABLE finance_charge_fixture (subscription_id uuid NOT NULL);
WITH inserted AS (
  INSERT INTO public.finance_subscriptions (vendor_name, category_code)
  VALUES ('Rollback-only subscription', 'software')
  RETURNING id
)
INSERT INTO finance_charge_fixture(subscription_id)
SELECT id FROM inserted;

INSERT INTO public.expense_entries (
  submitted_by, vendor_name, transaction_date, total_amount, currency, subscription_id, deleted_at
)
SELECT users.id, 'Rollback-only charge', charge_date, 10, 'AUD', fixture.subscription_id, deleted_at
FROM finance_charge_fixture fixture
CROSS JOIN (SELECT id FROM public.users WHERE role = 'admin' LIMIT 1) users
CROSS JOIN (VALUES
  (DATE '2026-06-01', NULL::timestamptz),
  (DATE '2026-06-10', NULL::timestamptz),
  (DATE '2026-06-20', now())
) AS sample(charge_date, deleted_at);

DO $$
DECLARE latest date;
BEGIN
  SELECT last_charged INTO latest
  FROM public.finance_subscription_last_charges
  WHERE subscription_id = (SELECT subscription_id FROM finance_charge_fixture);
  IF latest IS DISTINCT FROM DATE '2026-06-10' THEN
    RAISE EXCEPTION 'Expected latest active linked charge on 2026-06-10, got %', latest;
  END IF;
END $$;

ROLLBACK;
