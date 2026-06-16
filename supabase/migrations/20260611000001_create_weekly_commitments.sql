-- 2026-06-11: Create weekly_commitments and weekly_commitment_items
-- Stores a user's chosen weekly milestones (references project_milestones)
-- NOTE: RLS owner policy is created below. Please review admin policies after deployment.

CREATE TABLE IF NOT EXISTS public.weekly_commitments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  iso_week integer NOT NULL,
  iso_year integer NOT NULL,
  locked_at timestamptz DEFAULT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid NULL REFERENCES auth.users(id),
  deleted_at timestamptz DEFAULT NULL,
  CONSTRAINT weekly_commitments_user_week_unique UNIQUE (user_id, iso_week, iso_year)
);

CREATE INDEX IF NOT EXISTS idx_weekly_commitments_user_id ON public.weekly_commitments(user_id);
CREATE INDEX IF NOT EXISTS idx_weekly_commitments_iso_week_year ON public.weekly_commitments(iso_week, iso_year);

CREATE TABLE IF NOT EXISTS public.weekly_commitment_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  commitment_id uuid NOT NULL REFERENCES public.weekly_commitments(id) ON DELETE CASCADE,
  milestone_id uuid NOT NULL REFERENCES public.project_milestones(id) ON DELETE CASCADE,
  slot_order smallint NOT NULL CHECK (slot_order >= 1 AND slot_order <= 5),
  created_at timestamptz DEFAULT now() NOT NULL,
  CONSTRAINT weekly_commitment_items_unique_slot UNIQUE (commitment_id, slot_order),
  CONSTRAINT weekly_commitment_items_unique_milestone UNIQUE (commitment_id, milestone_id)
);

CREATE INDEX IF NOT EXISTS idx_weekly_commitment_items_commitment_id ON public.weekly_commitment_items(commitment_id);
CREATE INDEX IF NOT EXISTS idx_weekly_commitment_items_milestone_id ON public.weekly_commitment_items(milestone_id);

-- Enable Row Level Security and add owner-only policies.
ALTER TABLE public.weekly_commitments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_commitment_items ENABLE ROW LEVEL SECURITY;

-- Owner policy: allow users to select/insert/update/delete their own commitments
CREATE POLICY "Weekly commitments: owner full access" ON public.weekly_commitments
  FOR ALL
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Owner policy for items: allow access when the parent commitment belongs to the user
CREATE POLICY "Weekly commitment items: owner access" ON public.weekly_commitment_items
  FOR ALL
  USING (EXISTS (SELECT 1 FROM public.weekly_commitments wc WHERE wc.id = commitment_id AND wc.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.weekly_commitments wc WHERE wc.id = commitment_id AND wc.user_id = auth.uid()));

-- NOTE: Admin/super_admin policies are intentionally omitted here and should be
-- added by a follow-up migration that queries the project's user/roles table to
-- grant read access to admins. This avoids speculative role-field names.
