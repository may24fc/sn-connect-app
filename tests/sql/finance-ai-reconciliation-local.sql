-- LOCAL ONLY: psql -X -v ON_ERROR_STOP=1 -h 127.0.0.1 -p 55322 -U postgres -d postgres -f tests/sql/finance-ai-reconciliation-local.sql
-- The source rows, backfill, trigger changes, and assertions all roll back.
BEGIN;

DO $$
DECLARE
  owner_id uuid;
  provider_id uuid;
  other_provider_id uuid;
  first_id uuid;
  second_id uuid;
  third_id uuid;
  duplicate_rejected boolean := false;
  source_count bigint;
  ledger_count bigint;
  source_aud numeric;
  ledger_aud numeric;
  source_usd numeric;
  ledger_usd numeric;
BEGIN
  SELECT id INTO owner_id FROM public.users ORDER BY id LIMIT 1;
  IF owner_id IS NULL THEN
    RAISE EXCEPTION 'LOCAL fixture requires one existing user';
  END IF;
  INSERT INTO public.ai_expense_providers(name) VALUES ('Finance AI reconciliation fixture')
    RETURNING id INTO provider_id;
  INSERT INTO public.ai_expense_providers(name) VALUES ('Finance AI reconciliation alternate')
    RETURNING id INTO other_provider_id;

  -- Populate sources before running the same backfill as the foundation migration.
  ALTER TABLE public.ai_expenses DISABLE TRIGGER sync_ai_expense_to_ledger_trigger;
  INSERT INTO public.ai_expenses(user_id, provider_id, transaction_date, amount_cents, currency, transaction_id, reason)
  VALUES (owner_id, provider_id, '2026-10-01', 12345, 'AUD', 'finance-ai-fixture-1', 'Fixture 1')
    RETURNING id INTO first_id;
  INSERT INTO public.ai_expenses(user_id, provider_id, transaction_date, amount_cents, currency, transaction_id, reason)
  VALUES (owner_id, provider_id, '2026-10-02', 7890, 'AUD', 'finance-ai-fixture-2', 'Fixture 2')
    RETURNING id INTO second_id;
  INSERT INTO public.ai_expenses(user_id, provider_id, transaction_date, amount_cents, currency, transaction_id, reason)
  VALUES (owner_id, provider_id, '2026-10-03', 4567, 'USD', 'finance-ai-fixture-3', 'Fixture 3')
    RETURNING id INTO third_id;
  IF EXISTS (SELECT 1 FROM public.expense_entries
             WHERE source_system = 'ai_spending' AND source_record_id IN (first_id, second_id, third_id)) THEN
    RAISE EXCEPTION 'Fixture sources unexpectedly reached the ledger before backfill';
  END IF;

  INSERT INTO public.expense_entries (
    employee_id, submitted_by, receipt_document_id, vendor_name, transaction_date,
    total_amount, tax_amount, currency, business_justification, expense_type,
    department_id, source_type, match_status, category_code, payment_source,
    payment_status, approval_state, source_system, source_record_id,
    total_amount_aud, created_at
  )
  SELECT e.id, a.user_id, NULL, p.name, a.transaction_date,
    a.amount_cents / 100.0, 0, a.currency, a.reason, 'software',
    u.department_id, 'direct_payment', 'unmatched', 'ai_cloud', 'unknown',
    'unknown', 'pending', 'ai_spending', a.id,
    CASE WHEN upper(a.currency) = 'AUD' THEN a.amount_cents / 100.0 ELSE NULL END,
    a.created_at
  FROM public.ai_expenses a
  JOIN public.ai_expense_providers p ON p.id = a.provider_id
  LEFT JOIN public.employees e ON e.user_id = a.user_id AND e.deleted_at IS NULL
  LEFT JOIN public.users u ON u.id = a.user_id
  ON CONFLICT (source_system, source_record_id) WHERE source_record_id IS NOT NULL DO NOTHING;
  ALTER TABLE public.ai_expenses ENABLE TRIGGER sync_ai_expense_to_ledger_trigger;

  SELECT count(*), sum(total_amount) FILTER (WHERE currency = 'AUD'),
    sum(total_amount) FILTER (WHERE currency = 'USD')
  INTO ledger_count, ledger_aud, ledger_usd
  FROM public.expense_entries
  WHERE source_system = 'ai_spending' AND source_record_id IN (first_id, second_id, third_id)
    AND deleted_at IS NULL;
  IF ledger_count <> 3 OR ledger_aud <> 202.35 OR ledger_usd <> 45.67 THEN
    RAISE EXCEPTION 'Backfill mismatch: count %, AUD %, USD %', ledger_count, ledger_aud, ledger_usd;
  END IF;
  IF EXISTS (
    SELECT source_record_id FROM public.expense_entries
    WHERE source_system = 'ai_spending' AND source_record_id IN (first_id, second_id, third_id)
    GROUP BY source_record_id HAVING count(*) <> 1
  ) THEN
    RAISE EXCEPTION 'Duplicate source IDs after backfill';
  END IF;

  -- Re-running the migration backfill must not create another row for an existing source ID.
  INSERT INTO public.expense_entries (
    submitted_by, vendor_name, transaction_date, total_amount, currency,
    source_system, source_record_id
  )
  SELECT user_id, 'Repeated backfill', transaction_date, amount_cents / 100.0, currency,
    'ai_spending', id
  FROM public.ai_expenses WHERE id IN (first_id, second_id, third_id)
  ON CONFLICT (source_system, source_record_id) WHERE source_record_id IS NOT NULL DO NOTHING;
  IF (SELECT count(*) FROM public.expense_entries
      WHERE source_system = 'ai_spending' AND source_record_id IN (first_id, second_id, third_id)) <> 3 THEN
    RAISE EXCEPTION 'Repeated backfill duplicated a source ID';
  END IF;
  BEGIN
    INSERT INTO public.expense_entries (
      submitted_by, vendor_name, transaction_date, total_amount, currency,
      source_system, source_record_id
    ) VALUES (owner_id, 'Duplicate source', '2026-10-01', 1, 'AUD', 'ai_spending', first_id);
  EXCEPTION WHEN unique_violation THEN
    duplicate_rejected := true;
  END;
  IF NOT duplicate_rejected THEN
    RAISE EXCEPTION 'Unique index accepted duplicate AI source ID';
  END IF;

  UPDATE public.ai_expenses SET amount_cents = 22345, provider_id = other_provider_id,
    transaction_date = '2026-10-04', reason = 'Updated fixture'
  WHERE id = first_id;
  UPDATE public.ai_expenses SET currency = 'AUD' WHERE id = third_id;
  IF NOT EXISTS (
    SELECT 1 FROM public.expense_entries
    WHERE source_system = 'ai_spending' AND source_record_id = first_id
      AND total_amount = 223.45 AND total_amount_aud = 223.45
      AND vendor_name = 'Finance AI reconciliation alternate'
      AND transaction_date = '2026-10-04' AND business_justification = 'Updated fixture'
      AND deleted_at IS NULL
  ) OR NOT EXISTS (
    SELECT 1 FROM public.expense_entries
    WHERE source_system = 'ai_spending' AND source_record_id = third_id
      AND currency = 'AUD' AND total_amount_aud = 45.67 AND deleted_at IS NULL
  ) THEN
    RAISE EXCEPTION 'Source updates failed to synchronize ledger fields';
  END IF;
  DELETE FROM public.ai_expenses WHERE id = second_id;
  IF (SELECT count(*) FROM public.expense_entries
      WHERE source_system = 'ai_spending' AND source_record_id = second_id
        AND deleted_at IS NOT NULL) <> 1 THEN
    RAISE EXCEPTION 'Source deletion failed to soft-delete exactly one ledger row';
  END IF;

  SELECT count(*), coalesce(sum(amount_cents) FILTER (WHERE currency = 'AUD'), 0) / 100.0,
    coalesce(sum(amount_cents) FILTER (WHERE currency = 'USD'), 0) / 100.0
  INTO source_count, source_aud, source_usd
  FROM public.ai_expenses WHERE id IN (first_id, second_id, third_id);
  SELECT count(*), coalesce(sum(total_amount) FILTER (WHERE currency = 'AUD'), 0),
    coalesce(sum(total_amount) FILTER (WHERE currency = 'USD'), 0)
  INTO ledger_count, ledger_aud, ledger_usd
  FROM public.expense_entries
  WHERE source_system = 'ai_spending' AND source_record_id IN (first_id, second_id, third_id)
    AND deleted_at IS NULL;
  IF source_count <> 2 OR source_aud <> 269.12 OR source_usd <> 0
     OR (source_count, source_aud, source_usd) IS DISTINCT FROM (ledger_count, ledger_aud, ledger_usd) THEN
    RAISE EXCEPTION 'Post-change reconciliation: source (%, %, %), ledger (%, %, %)',
      source_count, source_aud, source_usd, ledger_count, ledger_aud, ledger_usd;
  END IF;
  RAISE NOTICE 'LOCAL populated AI reconciliation passed: backfill 3 rows AUD 202.35 USD 45.67; after updates/deletion source=ledger 2 rows AUD 269.12 USD 0; duplicates rejected';
END $$;

ROLLBACK;
