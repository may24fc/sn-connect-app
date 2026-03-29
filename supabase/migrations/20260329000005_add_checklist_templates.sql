BEGIN;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'checklist_template_flow') THEN
    CREATE TYPE public.checklist_template_flow AS ENUM ('onboarding', 'offboarding');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'checklist_template_scope') THEN
    CREATE TYPE public.checklist_template_scope AS ENUM ('employee', 'intern', 'default');
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS public.checklist_templates (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  flow_type public.checklist_template_flow NOT NULL,
  scope public.checklist_template_scope NOT NULL,
  tasks jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_by uuid REFERENCES public.users(id),
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT checklist_templates_flow_scope_key UNIQUE (flow_type, scope)
);

ALTER TABLE public.checklist_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.checklist_templates FORCE ROW LEVEL SECURITY;

CREATE POLICY checklist_templates_select_policy ON public.checklist_templates
  FOR SELECT
  TO authenticated
  USING (
    user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'cos', 'ceo', 'super_admin']::user_role[])
  );

CREATE POLICY checklist_templates_insert_policy ON public.checklist_templates
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'cos', 'ceo', 'super_admin']::user_role[])
  );

CREATE POLICY checklist_templates_update_policy ON public.checklist_templates
  FOR UPDATE
  TO authenticated
  USING (
    user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'cos', 'ceo', 'super_admin']::user_role[])
  )
  WITH CHECK (
    user_has_any_role(auth.uid(), ARRAY['admin', 'hr', 'cos', 'ceo', 'super_admin']::user_role[])
  );

DROP TRIGGER IF EXISTS trigger_checklist_templates_updated_at ON public.checklist_templates;
CREATE TRIGGER trigger_checklist_templates_updated_at
  BEFORE UPDATE ON public.checklist_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

COMMENT ON TABLE public.checklist_templates IS 'Admin-managed default onboarding and offboarding checklist templates.';
COMMENT ON COLUMN public.checklist_templates.flow_type IS 'Whether this template is used for onboarding or offboarding.';
COMMENT ON COLUMN public.checklist_templates.scope IS 'Template scope: employee, intern, or default offboarding.';
COMMENT ON COLUMN public.checklist_templates.tasks IS 'Serialized checklist task definitions used before concrete records exist.';

COMMIT;