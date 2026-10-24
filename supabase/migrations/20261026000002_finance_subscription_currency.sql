BEGIN;

ALTER TABLE public.finance_subscriptions
  ADD COLUMN billing_amount numeric(12,2),
  ADD COLUMN billing_currency text NOT NULL DEFAULT 'AUD';

ALTER TABLE public.finance_subscriptions
  ADD CONSTRAINT finance_subscription_billing_amount_check
    CHECK (billing_amount IS NULL OR billing_amount >= 0),
  ADD CONSTRAINT finance_subscription_billing_currency_check
    CHECK (billing_currency IN ('AUD','USD','PHP','EUR','GBP','SGD','JPY'));

UPDATE public.finance_subscriptions
SET billing_amount = monthly_amount_aud,
    billing_currency = 'AUD'
WHERE billing_amount IS NULL;

COMMIT;
