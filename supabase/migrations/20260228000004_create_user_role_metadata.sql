-- V2-4.1: Extensible User Profiles (JSONB Metadata)
-- Creates a user_role_metadata table to store role-specific fields
-- without bloating the users table (avoids "God Table" anti-pattern).

CREATE TABLE public.user_role_metadata (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role_type text NOT NULL, -- 'google_ads_specialist', 'content_creator', 'developer', etc.
  metadata jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, role_type)
);

-- Indexes for common lookup patterns
CREATE INDEX idx_user_role_metadata_user_id ON public.user_role_metadata(user_id);
CREATE INDEX idx_user_role_metadata_role_type ON public.user_role_metadata(role_type);
CREATE INDEX idx_user_role_metadata_metadata ON public.user_role_metadata USING GIN(metadata);

-- Auto-update updated_at on row modification
CREATE TRIGGER set_user_role_metadata_updated_at
  BEFORE UPDATE ON public.user_role_metadata
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Enable Row Level Security
ALTER TABLE public.user_role_metadata ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_role_metadata FORCE ROW LEVEL SECURITY;

-- Users can read/write their own metadata
CREATE POLICY user_role_metadata_self_select_policy ON public.user_role_metadata
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY user_role_metadata_self_insert_policy ON public.user_role_metadata
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY user_role_metadata_self_update_policy ON public.user_role_metadata
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY user_role_metadata_self_delete_policy ON public.user_role_metadata
  FOR DELETE USING (user_id = auth.uid());

-- Admins can read all metadata
CREATE POLICY user_role_metadata_admin_select_policy ON public.user_role_metadata
  FOR SELECT USING (
    user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::public.user_role[])
  );

-- Admins can update any user's metadata
CREATE POLICY user_role_metadata_admin_update_policy ON public.user_role_metadata
  FOR UPDATE USING (
    user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::public.user_role[])
  );

-- Example metadata shapes (for documentation):
-- Google Ads Specialist:
--   { "primary_platforms": ["Google Ads", "Meta Ads"], "certifications": ["Google Ads Search", "Google Ads Display"], "managed_accounts": 5 }
-- Developer:
--   { "primary_languages": ["TypeScript", "Python"], "github_username": "user123", "specializations": ["frontend", "backend"] }
-- Content Creator:
--   { "content_types": ["blog", "social_media", "video"], "tools": ["Canva", "Premiere Pro"], "portfolio_url": "https://..." }
-- Designer:
--   { "design_tools": ["Figma", "Photoshop"], "specializations": ["UI/UX", "branding"], "portfolio_url": "https://..." }

-- Also create a role_kpi_entries table for V2-4.2 (KPI tracking for specialists)
CREATE TABLE public.role_kpi_entries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  role_type text NOT NULL,
  entry_date date NOT NULL DEFAULT CURRENT_DATE,
  kpi_name text NOT NULL,           -- e.g., 'spend', 'cpa', 'roas', 'conversions'
  kpi_value numeric NOT NULL,
  kpi_unit text,                     -- e.g., 'USD', 'ratio', 'count'
  notes text,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

CREATE INDEX idx_role_kpi_entries_user_id ON public.role_kpi_entries(user_id);
CREATE INDEX idx_role_kpi_entries_date ON public.role_kpi_entries(entry_date DESC);
CREATE INDEX idx_role_kpi_entries_user_role ON public.role_kpi_entries(user_id, role_type);
CREATE UNIQUE INDEX idx_role_kpi_entries_unique ON public.role_kpi_entries(user_id, role_type, entry_date, kpi_name);

CREATE TRIGGER set_role_kpi_entries_updated_at
  BEFORE UPDATE ON public.role_kpi_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

ALTER TABLE public.role_kpi_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_kpi_entries FORCE ROW LEVEL SECURITY;

-- Users can manage their own KPI entries
CREATE POLICY role_kpi_entries_self_select_policy ON public.role_kpi_entries
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY role_kpi_entries_self_insert_policy ON public.role_kpi_entries
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY role_kpi_entries_self_update_policy ON public.role_kpi_entries
  FOR UPDATE USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY role_kpi_entries_self_delete_policy ON public.role_kpi_entries
  FOR DELETE USING (user_id = auth.uid());

-- Admins can read all KPI entries
CREATE POLICY role_kpi_entries_admin_select_policy ON public.role_kpi_entries
  FOR SELECT USING (
    user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::public.user_role[])
  );
