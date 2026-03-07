-- Corporate Website Tables
-- Migration for the SN International Group public website

-- ============================================================================
-- 1. Business Units (CMS-driven content for each business)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.business_units (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  slug text UNIQUE NOT NULL,
  name text NOT NULL,
  tagline text,
  description text,
  overview text,
  hero_image_url text,
  logo_url text,
  contact_email text,
  contact_phone text,
  address text,
  services jsonb DEFAULT '[]'::jsonb,
  testimonials jsonb DEFAULT '[]'::jsonb,
  display_order integer DEFAULT 0,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  deleted_at timestamptz
);

CREATE INDEX idx_business_units_slug ON public.business_units (slug);
CREATE INDEX idx_business_units_active ON public.business_units (is_active) WHERE is_active = true;

ALTER TABLE public.business_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_units FORCE ROW LEVEL SECURITY;

-- Public can read active business units
CREATE POLICY business_units_public_select_policy
  ON public.business_units FOR SELECT
  USING (is_active = true AND deleted_at IS NULL);

-- Admin/HR can manage business units
CREATE POLICY business_units_admin_all_policy
  ON public.business_units FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'super_admin', 'hr')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'super_admin', 'hr')
    )
  );

-- ============================================================================
-- 2. Job Postings
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.job_postings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  business_unit_id uuid REFERENCES public.business_units(id) ON DELETE SET NULL,
  department text,
  location text,
  employment_type text DEFAULT 'full-time'
    CHECK (employment_type IN ('full-time', 'part-time', 'internship', 'contract')),
  description text NOT NULL,
  requirements text,
  benefits text,
  salary_range text,
  is_active boolean DEFAULT true NOT NULL,
  published_at timestamptz DEFAULT now(),
  closes_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  deleted_at timestamptz
);

CREATE INDEX idx_job_postings_business ON public.job_postings (business_unit_id);
CREATE INDEX idx_job_postings_active ON public.job_postings (is_active) WHERE is_active = true;
CREATE INDEX idx_job_postings_type ON public.job_postings (employment_type);

ALTER TABLE public.job_postings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_postings FORCE ROW LEVEL SECURITY;

-- Public can read active job postings
CREATE POLICY job_postings_public_select_policy
  ON public.job_postings FOR SELECT
  USING (is_active = true AND deleted_at IS NULL);

-- Admin/HR can manage job postings
CREATE POLICY job_postings_admin_all_policy
  ON public.job_postings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'super_admin', 'hr')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'super_admin', 'hr')
    )
  );

-- ============================================================================
-- 3. Job Applications (write-only from public)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.job_applications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  job_posting_id uuid REFERENCES public.job_postings(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  cv_url text NOT NULL,
  cover_letter text,
  status text DEFAULT 'pending' NOT NULL
    CHECK (status IN ('pending', 'reviewed', 'shortlisted', 'rejected', 'hired')),
  notes text,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  deleted_at timestamptz
);

CREATE INDEX idx_job_applications_posting ON public.job_applications (job_posting_id);
CREATE INDEX idx_job_applications_status ON public.job_applications (status);
CREATE INDEX idx_job_applications_email ON public.job_applications (email);

ALTER TABLE public.job_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_applications FORCE ROW LEVEL SECURITY;

-- Public can insert applications (write-only)
CREATE POLICY job_applications_public_insert_policy
  ON public.job_applications FOR INSERT
  WITH CHECK (true);

-- Admin/HR can read and update applications
CREATE POLICY job_applications_admin_select_policy
  ON public.job_applications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'super_admin', 'hr')
    )
  );

CREATE POLICY job_applications_admin_update_policy
  ON public.job_applications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'super_admin', 'hr')
    )
  );

-- ============================================================================
-- 4. Public Inquiries (write-only from public)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.public_inquiries (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL,
  email text NOT NULL,
  phone text,
  business_unit_id uuid REFERENCES public.business_units(id) ON DELETE SET NULL,
  subject text NOT NULL,
  message text NOT NULL,
  status text DEFAULT 'new' NOT NULL
    CHECK (status IN ('new', 'read', 'responded', 'archived')),
  responded_at timestamptz,
  responded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  deleted_at timestamptz
);

CREATE INDEX idx_public_inquiries_status ON public.public_inquiries (status);
CREATE INDEX idx_public_inquiries_business ON public.public_inquiries (business_unit_id);

ALTER TABLE public.public_inquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.public_inquiries FORCE ROW LEVEL SECURITY;

-- Public can insert inquiries (write-only)
CREATE POLICY public_inquiries_public_insert_policy
  ON public.public_inquiries FOR INSERT
  WITH CHECK (true);

-- Admin/HR can read and update inquiries
CREATE POLICY public_inquiries_admin_select_policy
  ON public.public_inquiries FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'super_admin', 'hr')
    )
  );

CREATE POLICY public_inquiries_admin_update_policy
  ON public.public_inquiries FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'super_admin', 'hr')
    )
  );

-- ============================================================================
-- 5. Website Content (CMS blocks)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.website_content (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  section text NOT NULL,
  key text NOT NULL,
  value text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  is_active boolean DEFAULT true NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE (section, key)
);

CREATE INDEX idx_website_content_section ON public.website_content (section);

ALTER TABLE public.website_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.website_content FORCE ROW LEVEL SECURITY;

-- Public can read active content
CREATE POLICY website_content_public_select_policy
  ON public.website_content FOR SELECT
  USING (is_active = true);

-- Admin can manage content
CREATE POLICY website_content_admin_all_policy
  ON public.website_content FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'super_admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = auth.uid()
      AND u.role IN ('admin', 'super_admin')
    )
  );

-- ============================================================================
-- 6. Auto-update triggers for updated_at
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$
DECLARE
  t text;
BEGIN
  FOR t IN
    SELECT unnest(ARRAY[
      'business_units',
      'job_postings',
      'job_applications',
      'public_inquiries',
      'website_content'
    ])
  LOOP
    EXECUTE format(
      'CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I
       FOR EACH ROW EXECUTE FUNCTION update_updated_at_column()',
      t
    );
  END LOOP;
END;
$$;
