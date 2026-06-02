BEGIN;

CREATE TABLE public.crm_sfo_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name text NOT NULL,
  social_link text,
  message_source text,
  platform text NOT NULL CHECK (platform IN ('META', 'IG')),
  date_of_contact date NOT NULL,
  action_plan text,
  follow_up_status text NOT NULL DEFAULT 'new' CHECK (follow_up_status IN ('new', 'for_follow_up', 'closed', 'lost')),
  action_taken text,
  customer_type text NOT NULL DEFAULT 'new' CHECK (customer_type IN ('new', 'returning', 'wholesale')),
  reason_for_reaching_out text,
  contact_number text,
  address text,
  order_date date,
  products text[] NOT NULL DEFAULT '{}',
  amount numeric(12,2) NOT NULL DEFAULT 0,
  invoice_number text,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'for_follow_up', 'closed', 'lost')),
  remarks text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz
);

CREATE INDEX idx_crm_sfo_leads_status ON public.crm_sfo_leads(status);
CREATE INDEX idx_crm_sfo_leads_follow_up_status ON public.crm_sfo_leads(follow_up_status);
CREATE INDEX idx_crm_sfo_leads_date_of_contact ON public.crm_sfo_leads(date_of_contact DESC);
CREATE INDEX idx_crm_sfo_leads_customer_name ON public.crm_sfo_leads(customer_name);

ALTER TABLE public.crm_sfo_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_sfo_leads FORCE ROW LEVEL SECURITY;

CREATE POLICY crm_sfo_leads_select_policy ON public.crm_sfo_leads
  FOR SELECT TO authenticated
  USING (user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']));

CREATE POLICY crm_sfo_leads_insert_policy ON public.crm_sfo_leads
  FOR INSERT TO authenticated
  WITH CHECK (user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']));

CREATE POLICY crm_sfo_leads_update_policy ON public.crm_sfo_leads
  FOR UPDATE TO authenticated
  USING (user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']))
  WITH CHECK (user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']));

CREATE POLICY crm_sfo_leads_delete_policy ON public.crm_sfo_leads
  FOR DELETE TO authenticated
  USING (user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']));

DROP TRIGGER IF EXISTS set_updated_at ON public.crm_sfo_leads;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.crm_sfo_leads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.crm_sfo_leads IS
  'SFO high-volume retail CRM records with transactional order details.';

CREATE TABLE public.crm_tech_inquiries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  contact_person text NOT NULL,
  company_background text,
  requirements_summary text NOT NULL,
  requirements_checklist text[] NOT NULL DEFAULT '{}',
  pipeline_stage text NOT NULL DEFAULT 'initial_contact' CHECK (
    pipeline_stage IN (
      'initial_contact',
      'requirements_gathering',
      'proposal_sent',
      'under_review',
      'closed_won',
      'closed_lost'
    )
  ),
  long_form_remarks text,
  follow_up_date date,
  assigned_rep text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id),
  deleted_at timestamptz
);

CREATE INDEX idx_crm_tech_inquiries_pipeline_stage ON public.crm_tech_inquiries(pipeline_stage);
CREATE INDEX idx_crm_tech_inquiries_company_name ON public.crm_tech_inquiries(company_name);
CREATE INDEX idx_crm_tech_inquiries_follow_up_date ON public.crm_tech_inquiries(follow_up_date);

ALTER TABLE public.crm_tech_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_tech_inquiries FORCE ROW LEVEL SECURITY;

CREATE POLICY crm_tech_inquiries_select_policy ON public.crm_tech_inquiries
  FOR SELECT TO authenticated
  USING (user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']));

CREATE POLICY crm_tech_inquiries_insert_policy ON public.crm_tech_inquiries
  FOR INSERT TO authenticated
  WITH CHECK (user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']));

CREATE POLICY crm_tech_inquiries_update_policy ON public.crm_tech_inquiries
  FOR UPDATE TO authenticated
  USING (user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']))
  WITH CHECK (user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']));

CREATE POLICY crm_tech_inquiries_delete_policy ON public.crm_tech_inquiries
  FOR DELETE TO authenticated
  USING (user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']));

DROP TRIGGER IF EXISTS set_updated_at ON public.crm_tech_inquiries;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.crm_tech_inquiries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

COMMENT ON TABLE public.crm_tech_inquiries IS
  'SN Tech B2B CRM pipeline records for software requirements and deal stages.';

COMMIT;
