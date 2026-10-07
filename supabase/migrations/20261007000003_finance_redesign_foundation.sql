-- Finance redesign: keep old expense, AI, invoice, and Wise rows available during rollout.
BEGIN;

ALTER TABLE public.expense_entries
  ALTER COLUMN employee_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS category_code text,
  ADD COLUMN IF NOT EXISTS payment_source text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'unknown',
  ADD COLUMN IF NOT EXISTS approval_state text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS source_system text NOT NULL DEFAULT 'expense_entries',
  ADD COLUMN IF NOT EXISTS source_record_id uuid,
  ADD COLUMN IF NOT EXISTS subscription_id uuid;

ALTER TABLE public.expense_entries
  ADD CONSTRAINT expense_payment_source_check CHECK (payment_source IN ('unknown', 'personal_card', 'company_card', 'bank_transfer')),
  ADD CONSTRAINT expense_payment_status_check CHECK (payment_status IN ('unknown', 'unpaid', 'confirmed')),
  ADD CONSTRAINT expense_approval_state_check CHECK (approval_state IN ('pending', 'approved', 'rejected')),
  ADD CONSTRAINT expense_category_code_check CHECK (category_code IN (
    'advertising', 'ai_cloud', 'software', 'travel', 'meals', 'office_supplies',
    'equipment', 'rent_workspace', 'utilities', 'maintenance', 'professional_services', 'other'
  ));

UPDATE public.expense_entries SET category_code = CASE expense_type::text
  WHEN 'office_supplies' THEN 'office_supplies'
  WHEN 'travel' THEN 'travel'
  WHEN 'meals' THEN 'meals'
  WHEN 'software' THEN 'software'
  WHEN 'equipment' THEN 'equipment'
  WHEN 'utilities' THEN 'utilities'
  WHEN 'maintenance' THEN 'maintenance'
  ELSE 'other' END
WHERE category_code IS NULL;

UPDATE public.expense_entries SET approval_state = CASE
  WHEN processing_status::text IN ('approved', 'auto_approved') THEN 'approved'
  WHEN processing_status::text = 'rejected' THEN 'rejected'
  ELSE 'pending' END;

CREATE UNIQUE INDEX IF NOT EXISTS expense_source_record_unique
  ON public.expense_entries(source_system, source_record_id) WHERE source_record_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS expense_category_month_idx
  ON public.expense_entries(category_code, transaction_date) WHERE deleted_at IS NULL;

CREATE TABLE public.finance_categories (
  code text PRIMARY KEY,
  name text NOT NULL,
  example text NOT NULL,
  sort_order integer NOT NULL UNIQUE
);
INSERT INTO public.finance_categories(code, name, example, sort_order) VALUES
 ('advertising','Advertising & Marketing','Meta, Google Ads, email tools, promotions',1),
 ('ai_cloud','AI & Cloud','AI tools, AWS, hosting',2),
 ('software','Software & Subscriptions','Canva, Adobe, Xero, Salesforce',3),
 ('travel','Travel','Flights, hotels, transport',4),
 ('meals','Meals & Entertainment','Team and client meals',5),
 ('office_supplies','Office Supplies','Consumable office items',6),
 ('equipment','Equipment','Durable equipment',7),
 ('rent_workspace','Rent & Workspace','Office and coworking rent',8),
 ('utilities','Utilities','Internet, power, phone',9),
 ('maintenance','Repairs & Maintenance','Service and repairs',10),
 ('professional_services','Professional Services','Accounting, legal, contractors',11),
 ('other','Other','Provide an explanation',12);

CREATE TABLE public.finance_budgets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_code text NOT NULL REFERENCES public.finance_categories(code),
  month date NOT NULL CHECK (EXTRACT(day FROM month) = 1),
  amount_aud numeric(12,2) NOT NULL CHECK (amount_aud >= 0),
  updated_by uuid REFERENCES public.users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(category_code, month)
);

CREATE TABLE public.finance_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  vendor_name text NOT NULL,
  category_code text NOT NULL REFERENCES public.finance_categories(code),
  payment_source text NOT NULL DEFAULT 'unknown' CHECK (payment_source IN ('unknown','personal_card','company_card','bank_transfer')),
  monthly_amount_aud numeric(12,2),
  seats integer CHECK (seats IS NULL OR seats >= 0),
  next_renewal date,
  active boolean NOT NULL DEFAULT true,
  notes text,
  created_by uuid REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.expense_entries ADD CONSTRAINT expense_subscription_fk
  FOREIGN KEY(subscription_id) REFERENCES public.finance_subscriptions(id) ON DELETE SET NULL;

CREATE TABLE public.finance_approval_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  ceo_user_id uuid REFERENCES public.users(id),
  coo_user_id uuid REFERENCES public.users(id),
  updated_by uuid REFERENCES public.users(id),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (ceo_user_id IS NULL OR coo_user_id IS NULL OR ceo_user_id <> coo_user_id)
);
INSERT INTO public.finance_approval_settings(id) VALUES (true);

CREATE TABLE public.finance_variance_signoffs (
  expense_id uuid PRIMARY KEY REFERENCES public.expense_entries(id),
  reason text NOT NULL CHECK (length(trim(reason)) > 0),
  required_approver uuid REFERENCES public.users(id),
  decision text NOT NULL DEFAULT 'pending' CHECK (decision IN ('pending','approved','rejected')),
  decided_by uuid REFERENCES public.users(id),
  decided_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.finance_variance_signoffs(expense_id, reason)
SELECT id, coalesce(nullif(trim(matched_notes),''), 'Legacy variance pending review')
FROM public.expense_entries
WHERE deleted_at IS NULL AND match_status = 'variance_flagged'
  AND (source_type = 'staff_request' OR matched_entry_id IS NULL)
ON CONFLICT (expense_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.refresh_finance_signoff_owners()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.finance_variance_signoffs s SET required_approver =
    CASE WHEN e.submitted_by = NEW.ceo_user_id THEN NEW.coo_user_id ELSE NEW.ceo_user_id END
  FROM public.expense_entries e
  WHERE e.id = s.expense_id AND s.decision = 'pending'
    AND (abs(coalesce(e.matched_variance_amount,0)) > 100 OR
      abs(coalesce(e.matched_variance_amount,0)) /
      greatest(coalesce(e.total_amount_aud, CASE WHEN e.currency = 'AUD' THEN e.total_amount ELSE NULL END),0.01) > 0.10);
  RETURN NEW;
END $$;
CREATE TRIGGER refresh_finance_signoff_owners_trigger
AFTER UPDATE OF ceo_user_id, coo_user_id ON public.finance_approval_settings
FOR EACH ROW EXECUTE FUNCTION public.refresh_finance_signoff_owners();

CREATE TABLE public.finance_report_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_month date NOT NULL CHECK (EXTRACT(day FROM report_month) = 1),
  status text NOT NULL CHECK (status IN ('draft','final')),
  report_data jsonb NOT NULL,
  exception_count integer NOT NULL DEFAULT 0,
  created_by uuid NOT NULL REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  finalized_at timestamptz
);
CREATE UNIQUE INDEX finance_one_final_per_month ON public.finance_report_snapshots(report_month) WHERE status = 'final';

CREATE TABLE public.wise_batches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status text NOT NULL DEFAULT 'exported' CHECK (status IN ('exported','partial','completed','cancelled')),
  created_by uuid NOT NULL REFERENCES public.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.wise_batch_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.wise_batches(id),
  invoice_id uuid NOT NULL UNIQUE REFERENCES public.invoices(id),
  recipient_id text NOT NULL,
  payment_reference text NOT NULL UNIQUE,
  amount numeric(12,2) NOT NULL CHECK (amount > 0),
  source_currency text NOT NULL,
  target_currency text NOT NULL,
  status text NOT NULL DEFAULT 'exported' CHECK (status IN ('exported','completed','failed')),
  wise_transfer_id text UNIQUE,
  completed_at timestamptz
);
CREATE TABLE public.wise_batch_import_rows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id uuid NOT NULL REFERENCES public.wise_batches(id),
  payment_reference text,
  wise_transfer_id text,
  transfer_status text NOT NULL,
  result text NOT NULL CHECK (result IN ('completed','unmatched','failed','duplicate')),
  detail text,
  imported_by uuid NOT NULL REFERENCES public.users(id),
  imported_at timestamptz NOT NULL DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.create_finance_wise_batch(invoice_ids uuid[], actor_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  batch_id uuid;
  eligible_count integer;
  source_count integer;
BEGIN
  IF coalesce(array_length(invoice_ids, 1), 0) < 1 OR array_length(invoice_ids, 1) > 1000 THEN
    RAISE EXCEPTION 'Select between 1 and 1000 invoices';
  END IF;
  PERFORM 1 FROM public.invoices WHERE id = ANY(invoice_ids) FOR UPDATE;
  SELECT count(*), count(DISTINCT i.source_currency)
  INTO eligible_count, source_count
  FROM public.invoices i
  JOIN public.employee_banking_info b ON b.employee_id = i.employee_id AND b.deleted_at IS NULL
  WHERE i.id = ANY(invoice_ids) AND i.deleted_at IS NULL AND i.status = 'approved'
    AND i.net_amount > 0 AND i.source_currency IS NOT NULL AND i.target_currency IS NOT NULL
    AND b.wise_recipient_id IS NOT NULL AND b.is_verified = true
    AND NOT EXISTS (SELECT 1 FROM public.wise_payments w WHERE w.invoice_id = i.id)
    AND NOT EXISTS (SELECT 1 FROM public.wise_batch_items bi WHERE bi.invoice_id = i.id);
  IF eligible_count <> array_length(invoice_ids, 1)
    OR eligible_count <> (SELECT count(DISTINCT x) FROM unnest(invoice_ids) x)
    OR source_count <> 1 THEN
    RAISE EXCEPTION 'Invoices must be approved, unpaid, unbatched, have verified Wise recipients, and share one source currency';
  END IF;
  INSERT INTO public.wise_batches(created_by) VALUES(actor_id) RETURNING id INTO batch_id;
  INSERT INTO public.wise_batch_items(batch_id, invoice_id, recipient_id, payment_reference, amount, source_currency, target_currency)
  SELECT batch_id, i.id, b.wise_recipient_id, 'SN' || left(replace(i.id::text, '-', ''), 16),
    i.net_amount, i.source_currency, i.target_currency
  FROM public.invoices i
  JOIN public.employee_banking_info b ON b.employee_id = i.employee_id AND b.deleted_at IS NULL
  WHERE i.id = ANY(invoice_ids);
  RETURN batch_id;
END $$;
REVOKE ALL ON FUNCTION public.create_finance_wise_batch(uuid[], uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_finance_wise_batch(uuid[], uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.confirm_finance_wise_transfer(item_id uuid, transfer_id text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  batch_item public.wise_batch_items%ROWTYPE;
BEGIN
  SELECT * INTO batch_item FROM public.wise_batch_items WHERE id = item_id FOR UPDATE;
  IF NOT FOUND OR batch_item.status = 'completed' THEN RETURN false; END IF;
  UPDATE public.invoices SET status = 'paid', paid_at = now()
  WHERE id = batch_item.invoice_id AND status = 'approved' AND deleted_at IS NULL;
  IF NOT FOUND THEN RETURN false; END IF;
  UPDATE public.wise_batch_items SET status = 'completed', wise_transfer_id = transfer_id, completed_at = now()
  WHERE id = item_id;
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.confirm_finance_wise_transfer(uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.confirm_finance_wise_transfer(uuid, text) TO service_role;

CREATE OR REPLACE FUNCTION public.reconcile_finance_expense(
  request_id uuid, payment_id uuid, actor_id uuid, reason text
) RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  request_row public.expense_entries%ROWTYPE;
  payment_row public.expense_entries%ROWTYPE;
  request_aud numeric;
  payment_aud numeric;
  difference numeric;
  significant boolean;
  ceo_id uuid;
  coo_id uuid;
  approver_id uuid;
BEGIN
  SELECT * INTO request_row FROM public.expense_entries WHERE id = request_id AND deleted_at IS NULL FOR UPDATE;
  SELECT * INTO payment_row FROM public.expense_entries WHERE id = payment_id AND deleted_at IS NULL FOR UPDATE;
  IF request_row.id IS NULL OR payment_row.id IS NULL OR request_row.source_type <> 'staff_request'
     OR payment_row.source_type <> 'direct_payment' OR request_row.match_status <> 'unmatched'
     OR payment_row.match_status <> 'unmatched' THEN
    RAISE EXCEPTION 'Only open requests can be matched to open direct payments';
  END IF;
  request_aud := coalesce(request_row.total_amount_aud, CASE WHEN request_row.currency = 'AUD' THEN request_row.total_amount ELSE NULL END);
  payment_aud := coalesce(payment_row.total_amount_aud, CASE WHEN payment_row.currency = 'AUD' THEN payment_row.total_amount ELSE NULL END);
  IF request_aud IS NULL OR payment_aud IS NULL OR request_aud <= 0 THEN
    RAISE EXCEPTION 'AUD conversions are required before matching';
  END IF;
  difference := round(payment_aud - request_aud, 2);
  IF difference <> 0 AND length(trim(coalesce(reason,''))) = 0 THEN
    RAISE EXCEPTION 'A reason is required for an amount difference';
  END IF;
  significant := abs(difference) > 100 OR abs(difference) / request_aud > 0.10;
  SELECT ceo_user_id, coo_user_id INTO ceo_id, coo_id FROM public.finance_approval_settings WHERE id = true;
  approver_id := CASE WHEN request_row.submitted_by = ceo_id THEN coo_id ELSE ceo_id END;
  UPDATE public.expense_entries SET match_status = (CASE WHEN difference = 0 THEN 'matched' ELSE 'variance_flagged' END)::public.expense_match_status,
    matched_entry_id = payment_id, matched_by = actor_id, matched_at = now(),
    matched_variance_amount = difference, matched_notes = nullif(trim(reason),'')
  WHERE id = request_id;
  UPDATE public.expense_entries SET match_status = (CASE WHEN difference = 0 THEN 'matched' ELSE 'variance_flagged' END)::public.expense_match_status,
    matched_entry_id = request_id, matched_by = actor_id, matched_at = now(),
    matched_variance_amount = -difference, matched_notes = nullif(trim(reason),'')
  WHERE id = payment_id;
  IF difference <> 0 THEN
    INSERT INTO public.finance_variance_signoffs(expense_id, reason, required_approver)
    VALUES(request_id, trim(reason), CASE WHEN significant THEN approver_id ELSE NULL END);
  END IF;
  RETURN jsonb_build_object('matchStatus', CASE WHEN difference = 0 THEN 'matched' ELSE 'variance_flagged' END,
    'varianceAmountAud', difference, 'requiresLeadershipSignoff', significant,
    'approverConfigured', NOT significant OR approver_id IS NOT NULL);
END $$;
REVOKE ALL ON FUNCTION public.reconcile_finance_expense(uuid, uuid, uuid, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.reconcile_finance_expense(uuid, uuid, uuid, text) TO service_role;

CREATE OR REPLACE FUNCTION public.decide_finance_variance(
  expense_id uuid, actor_id uuid, outcome text, decision_note text
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  expense_row public.expense_entries%ROWTYPE;
  signoff public.finance_variance_signoffs%ROWTYPE;
  ceo_id uuid;
  coo_id uuid;
  needs_leadership boolean;
BEGIN
  SELECT * INTO expense_row FROM public.expense_entries WHERE id = expense_id AND deleted_at IS NULL FOR UPDATE;
  IF expense_row.id IS NULL OR expense_row.match_status <> 'variance_flagged' OR outcome NOT IN ('approved','rejected') THEN RETURN false; END IF;
  IF expense_row.source_type = 'direct_payment' THEN
    SELECT * INTO expense_row FROM public.expense_entries WHERE id = expense_row.matched_entry_id AND deleted_at IS NULL FOR UPDATE;
  END IF;
  SELECT * INTO signoff FROM public.finance_variance_signoffs s WHERE s.expense_id = expense_row.id FOR UPDATE;
  IF signoff.expense_id IS NULL OR signoff.decision <> 'pending' OR expense_row.submitted_by = actor_id THEN RETURN false; END IF;
  needs_leadership := abs(coalesce(expense_row.matched_variance_amount,0)) > 100
    OR abs(coalesce(expense_row.matched_variance_amount,0)) /
      greatest(coalesce(expense_row.total_amount_aud, CASE WHEN expense_row.currency = 'AUD' THEN expense_row.total_amount ELSE NULL END), 0.01) > 0.10;
  IF needs_leadership AND (signoff.required_approver IS NULL OR signoff.required_approver <> actor_id) THEN RETURN false; END IF;
  UPDATE public.finance_variance_signoffs s SET decision = outcome, decided_by = actor_id, decided_at = now()
  WHERE s.expense_id = expense_row.id;
  UPDATE public.expense_entries SET match_status = 'resolved', approval_state = outcome,
    processing_status = outcome, matched_notes = concat_ws(E'\n', matched_notes, nullif(trim(decision_note),''))
  WHERE id IN (expense_row.id, expense_row.matched_entry_id);
  RETURN true;
END $$;
REVOKE ALL ON FUNCTION public.decide_finance_variance(uuid, uuid, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.decide_finance_variance(uuid, uuid, text, text) TO service_role;

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

CREATE OR REPLACE FUNCTION public.sync_ai_expense_to_ledger()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  owner_employee_id uuid;
  owner_department_id uuid;
  provider_name text;
BEGIN
  IF TG_OP = 'DELETE' THEN
    UPDATE public.expense_entries SET deleted_at = now()
    WHERE source_system = 'ai_spending' AND source_record_id = OLD.id;
    RETURN OLD;
  END IF;
  SELECT id INTO owner_employee_id FROM public.employees
  WHERE user_id = NEW.user_id AND deleted_at IS NULL ORDER BY updated_at DESC LIMIT 1;
  SELECT department_id INTO owner_department_id FROM public.users WHERE id = NEW.user_id;
  SELECT name INTO provider_name FROM public.ai_expense_providers WHERE id = NEW.provider_id;
  INSERT INTO public.expense_entries (
    employee_id, submitted_by, receipt_document_id, vendor_name, transaction_date,
    total_amount, tax_amount, currency, business_justification, expense_type,
    department_id, source_type, match_status, category_code, payment_source,
    payment_status, approval_state, source_system, source_record_id, total_amount_aud, created_at
  ) VALUES (
    owner_employee_id, NEW.user_id, NULL, provider_name, NEW.transaction_date,
    NEW.amount_cents / 100.0, 0, NEW.currency, NEW.reason, 'software',
    owner_department_id, 'direct_payment', 'unmatched', 'ai_cloud', 'unknown',
    'unknown', 'pending', 'ai_spending', NEW.id,
    CASE WHEN upper(NEW.currency) = 'AUD' THEN NEW.amount_cents / 100.0 ELSE NULL END,
    NEW.created_at
  ) ON CONFLICT (source_system, source_record_id) WHERE source_record_id IS NOT NULL
    DO UPDATE SET vendor_name = EXCLUDED.vendor_name, transaction_date = EXCLUDED.transaction_date,
      total_amount = EXCLUDED.total_amount, currency = EXCLUDED.currency,
      business_justification = EXCLUDED.business_justification, total_amount_aud = EXCLUDED.total_amount_aud,
      deleted_at = NULL;
  RETURN NEW;
END $$;
CREATE TRIGGER sync_ai_expense_to_ledger_trigger
AFTER INSERT OR UPDATE OR DELETE ON public.ai_expenses
FOR EACH ROW EXECUTE FUNCTION public.sync_ai_expense_to_ledger();

-- Migrated records without an employee remain visible to their submitter.
CREATE POLICY expense_entries_select_migrated_own ON public.expense_entries
  FOR SELECT TO authenticated USING (submitted_by = auth.uid() AND deleted_at IS NULL);

ALTER TABLE public.finance_categories ENABLE ROW LEVEL SECURITY;
CREATE POLICY finance_categories_read ON public.finance_categories FOR SELECT TO authenticated USING (true);
ALTER TABLE public.finance_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_approval_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_variance_signoffs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_report_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wise_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wise_batch_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wise_batch_import_rows ENABLE ROW LEVEL SECURITY;

ALTER TABLE public.marketing_entries ADD COLUMN IF NOT EXISTS import_source text NOT NULL DEFAULT 'manual';
CREATE UNIQUE INDEX IF NOT EXISTS marketing_billing_csv_unique
  ON public.marketing_entries(platform_id, transaction_id)
  WHERE import_source = 'billing_csv' AND transaction_id IS NOT NULL AND deleted_at IS NULL;

CREATE OR REPLACE FUNCTION public.finance_overview(target_month date)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
WITH bounds AS (
  SELECT date_trunc('month', target_month)::date AS start_date,
         (date_trunc('month', target_month) + interval '1 month')::date AS end_date
), spend AS (
  SELECT e.category_code, sum(e.total_amount_aud) AS amount_aud,
         count(*) FILTER (WHERE e.total_amount_aud IS NULL) AS unconverted
  FROM public.expense_entries e, bounds b
  WHERE e.deleted_at IS NULL AND e.source_type = 'direct_payment'
    AND e.transaction_date >= b.start_date AND e.transaction_date < b.end_date
  GROUP BY e.category_code
), budget_rows AS (
  SELECT c.code, c.name, coalesce(s.amount_aud,0) AS spent_aud, b.amount_aud AS budget_aud
  FROM public.finance_categories c
  LEFT JOIN spend s ON s.category_code = c.code
  LEFT JOIN public.finance_budgets b ON b.category_code = c.code AND b.month = (SELECT start_date FROM bounds)
  ORDER BY c.sort_order
)
SELECT jsonb_build_object(
  'month', (SELECT start_date FROM bounds),
  'recordedSpendAud', coalesce((SELECT sum(amount_aud) FROM spend),0),
  'unconvertedEntries', coalesce((SELECT sum(unconverted) FROM spend),0),
  'categoryBudgets', coalesce((SELECT jsonb_agg(to_jsonb(budget_rows)) FROM budget_rows),'[]'::jsonb),
  'openMatches', (SELECT count(*) FROM public.expense_entries WHERE deleted_at IS NULL AND source_type = 'staff_request' AND match_status = 'unmatched'),
  'openVariances', (SELECT count(*) FROM public.expense_entries WHERE deleted_at IS NULL AND match_status = 'variance_flagged'),
  'pendingApprovals', (SELECT count(*) FROM public.expense_entries WHERE deleted_at IS NULL AND approval_state = 'pending'),
  'submittedInvoices', (SELECT count(*) FROM public.invoices WHERE deleted_at IS NULL AND status = 'submitted'),
  'subscriptionRunRateAud', coalesce((SELECT sum(monthly_amount_aud) FROM public.finance_subscriptions WHERE active),0)
);
$$;
REVOKE ALL ON FUNCTION public.finance_overview(date) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.finance_overview(date) TO service_role;

CREATE OR REPLACE FUNCTION public.create_finance_report_snapshot(
  target_month date, actor_id uuid, payload jsonb, make_final boolean
) RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  month_start date := date_trunc('month', target_month)::date;
  month_end date := (date_trunc('month', target_month) + interval '1 month')::date;
  unresolved integer;
  new_id uuid;
BEGIN
  SELECT count(*) INTO unresolved FROM public.expense_entries e
  WHERE e.deleted_at IS NULL AND e.transaction_date >= month_start AND e.transaction_date < month_end
    AND (e.match_status = 'variance_flagged'
      OR (e.source_type = 'staff_request' AND e.match_status = 'unmatched')
      OR e.approval_state = 'pending');
  unresolved := unresolved + (
    SELECT count(*) FROM public.finance_variance_signoffs s
    JOIN public.expense_entries e ON e.id = s.expense_id
    WHERE s.decision = 'pending' AND e.transaction_date >= month_start AND e.transaction_date < month_end
  );
  IF make_final AND unresolved > 0 THEN
    RAISE EXCEPTION 'Resolve or approve all month-end exceptions before finalizing';
  END IF;
  INSERT INTO public.finance_report_snapshots(report_month, status, report_data, exception_count, created_by, finalized_at)
  VALUES(month_start, CASE WHEN make_final THEN 'final' ELSE 'draft' END, payload, unresolved, actor_id,
    CASE WHEN make_final THEN now() ELSE NULL END) RETURNING id INTO new_id;
  RETURN new_id;
END $$;
REVOKE ALL ON FUNCTION public.create_finance_report_snapshot(date, uuid, jsonb, boolean) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_finance_report_snapshot(date, uuid, jsonb, boolean) TO service_role;

COMMIT;
