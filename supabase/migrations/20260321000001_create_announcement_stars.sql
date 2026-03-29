-- ============================================
-- Create announcement_stars table
-- Allows users to star/favourite announcements
-- ============================================

CREATE TABLE public.announcement_stars (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  announcement_id uuid NOT NULL REFERENCES public.announcements(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(announcement_id, user_id)
);

CREATE INDEX idx_announcement_stars_user_id ON public.announcement_stars(user_id);
CREATE INDEX idx_announcement_stars_announcement_id ON public.announcement_stars(announcement_id);

ALTER TABLE public.announcement_stars ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcement_stars FORCE ROW LEVEL SECURITY;

-- Users can manage their own stars
CREATE POLICY announcement_stars_self_policy ON public.announcement_stars
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Admins can view all stars (for analytics)
CREATE POLICY announcement_stars_admin_select_policy ON public.announcement_stars
  FOR SELECT TO authenticated
  USING (user_has_any_role(auth.uid(), ARRAY['admin', 'super_admin']::user_role[]));
