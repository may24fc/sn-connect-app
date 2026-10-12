-- One latest linked charge per subscription, regardless of ledger size.
CREATE INDEX IF NOT EXISTS expense_entries_subscription_latest_idx
  ON public.expense_entries (subscription_id, transaction_date DESC)
  WHERE subscription_id IS NOT NULL AND deleted_at IS NULL;

CREATE VIEW public.finance_subscription_last_charges
WITH (security_invoker = true) AS
SELECT subscription_id, max(transaction_date) AS last_charged
FROM public.expense_entries
WHERE subscription_id IS NOT NULL AND deleted_at IS NULL
GROUP BY subscription_id;

REVOKE ALL ON public.finance_subscription_last_charges FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.finance_subscription_last_charges TO service_role;
