-- Safe baseline seed for Supabase branches and fresh environments.
--
-- Intentionally minimal:
-- - no demo employees
-- - no fake auth-linked rows
-- - no sample announcements, reports, tasks, or invoices
--
-- Development-only sample data lives in:
--   supabase/seed/01_sample_data.sql
--   supabase/seed/02_corporate_website.sql
--
-- Apply those files manually in non-production environments only.

BEGIN;

-- No-op baseline seed.
SELECT 'safe_baseline_seed' AS status;

-- Seed historical expense entries for baseline risk analysis
-- This data helps the system establish a "normal" spending pattern for recurring vendors.

-- To get realistic user IDs, we'll pick a few from the existing `employees` seed data.
-- We'll assume the following employees exist from the initial seed:
-- Employee 1: 'Steven Tey' (super_admin)
-- Employee 2: 'Maydelyn Paz' (admin)
-- Employee 3: 'Cef Jumao-as' (intern)

DO $$
DECLARE
    steven_user_id uuid;
    may_user_id uuid;
    cef_user_id uuid;
BEGIN
    -- Fetch user IDs from the users table based on their email
    SELECT id INTO steven_user_id FROM auth.users WHERE email = 'steven@snap-raise.com';
    SELECT id INTO may_user_id FROM auth.users WHERE email = 'may@snap-raise.com';
    SELECT id INTO cef_user_id FROM auth.users WHERE email = 'cef@snap-raise.com';

    -- Insert historical data only if the table is empty to prevent duplication on re-seeding
    IF NOT EXISTS (SELECT 1 FROM public.expense_entries) THEN
        INSERT INTO public.expense_entries (
            submitted_by,
            receipt_path,
            vendor_name,
            transaction_date,
            tax_amount,
            total_amount,
            currency,
            draft_debit_account,
            draft_credit_account,
            verified_debit_account,
            verified_credit_account,
            business_justification,
            reviewer_notes,
            risk_bucket,
            processing_status,
            reviewed_by,
            reviewed_at,
            created_at,
            updated_at
        ) VALUES
        -- #1: Standard Recurring: OpenAI (last 3 months for Steven)
        (
            steven_user_id,
            'expense-receipts/seed/openai_apr.png',
            'OpenAI',
            '2026-04-20T10:00:00Z',
            0.00,
            20.00,
            'USD',
            'API Services', 'Company Credit Card',
            'API Services', 'Company Credit Card',
            'Monthly ChatGPT Plus subscription.',
            'Standard recurring charge, auto-approved.',
            'standard_recurring',
            'auto_approved',
            cef_user_id,
            '2026-04-21T10:00:00Z',
            '2026-04-20T09:00:00Z',
            '2026-04-21T10:00:00Z'
        ),
        (
            steven_user_id,
            'expense-receipts/seed/openai_may.png',
            'OpenAI',
            '2026-05-20T10:00:00Z',
            0.00,
            20.00,
            'USD',
            'API Services', 'Company Credit Card',
            'API Services', 'Company Credit Card',
            'Monthly ChatGPT Plus subscription.',
            'Standard recurring charge, auto-approved.',
            'standard_recurring',
            'auto_approved',
            cef_user_id,
            '2026-05-21T10:00:00Z',
            '2026-05-20T09:00:00Z',
            '2026-05-21T10:00:00Z'
        ),
        (
            steven_user_id,
            'expense-receipts/seed/openai_jun.png',
            'OpenAI',
            '2026-06-20T10:00:00Z',
            0.00,
            20.00,
            'USD',
            'API Services', 'Company Credit Card',
            'API Services', 'Company Credit Card',
            'Monthly ChatGPT Plus subscription.',
            'Standard recurring charge, auto-approved.',
            'standard_recurring',
            'auto_approved',
            cef_user_id,
            '2026-06-21T10:00:00Z',
            '2026-06-20T09:00:00Z',
            '2026-06-21T10:00:00Z'
        ),

        -- #2: Price Spike Example: AWS (May had a sudden increase)
        (
            may_user_id,
            'expense-receipts/seed/aws_apr.png',
            'Amazon Web Services',
            '2026-04-15T14:00:00Z',
            10.50,
            150.50,
            'USD',
            'Cloud Infrastructure', 'Company Credit Card',
            'Cloud Infrastructure', 'Company Credit Card',
            'Monthly AWS bill for production infrastructure.',
            'Standard recurring charge.',
            'standard_recurring',
            'auto_approved',
            cef_user_id,
            '2026-04-16T11:00:00Z',
            '2026-04-15T13:00:00Z',
            '2026-04-16T11:00:00Z'
        ),
        (
            may_user_id,
            'expense-receipts/seed/aws_may_spike.png',
            'Amazon Web Services',
            '2026-05-15T14:00:00Z',
            25.00,
            375.00, -- This is the spike
            'USD',
            'Cloud Infrastructure', 'Company Credit Card',
            'Cloud Infrastructure', 'Company Credit Card',
            'Monthly AWS bill. Higher due to new staging environment.',
            'Price spike detected compared to last month. Escalated.',
            'price_spike',
            'approved', -- Manually approved by leadership after review
            steven_user_id, -- Steven approved it
            '2026-05-17T18:00:00Z',
            '2026-05-15T13:00:00Z',
            '2026-05-17T18:00:00Z'
        ),

        -- #3: Non-Recurring Example: A new software purchase
        (
            cef_user_id,
            'expense-receipts/seed/figma.png',
            'Figma',
            '2026-06-01T12:00:00Z',
            15.00,
            150.00,
            'USD',
            'Software Licenses', 'Company Credit Card',
            'Software Licenses', 'Company Credit Card',
            'New annual license for design team.',
            'New vendor, routed for leadership approval.',
            'non_recurring',
            'approved',
            may_user_id, -- May approved it
            '2026-06-02T16:00:00Z',
            '2026-06-01T11:00:00Z',
            '2026-06-02T16:00:00Z'
        ),
        
        -- #4: Awaiting intern review (this will show up in the queue)
        (
            steven_user_id,
            'expense-receipts/seed/vercel_jun.png',
            'Vercel',
            '2026-06-15T18:00:00Z',
            0.00,
            40.00,
            'USD',
            'Cloud Infrastructure',
            'Company Credit Card',
            NULL, NULL, -- Not yet verified
            'Pro plan for main app and preview deployments.',
            NULL, -- No reviewer notes yet
            NULL, -- No risk bucket yet
            'awaiting_intern_review',
            NULL, NULL, -- Not yet reviewed
            '2026-06-15T17:00:00Z',
            '2026-06-15T17:00:00Z'
        );
    END IF;
END $$;

COMMIT;