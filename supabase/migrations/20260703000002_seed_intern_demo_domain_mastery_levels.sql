-- Seed demo domain mastery levels for intern@example.com
-- Goal:
-- 1) Show cross-department mastery tracks in UI
-- 2) Force visible high mastery levels across domains

DO $$
DECLARE
  v_user_id uuid;
  v_department text;
  v_departments text[] := ARRAY[
    'AI & Automation',
    'Marketing',
    'HR',
    'Design',
    'Graphic Design',
    'Video',
    'Accounting'
  ];
BEGIN
  SELECT u.id
    INTO v_user_id
    FROM auth.users au
    JOIN public.users u ON u.id = au.id
   WHERE lower(au.email) = 'intern@example.com'
     AND u.deleted_at IS NULL
   LIMIT 1;

  IF v_user_id IS NULL THEN
    RAISE NOTICE 'Seed skipped: user intern@example.com not found';
    RETURN;
  END IF;

  -- Include any department that appears in badge definitions (department-specific badges),
  -- then union canonical mastery departments so the UI shows all tracks.
  FOR v_department IN
    SELECT DISTINCT dept
    FROM (
      SELECT unnest(v_departments) AS dept
      UNION
      SELECT bd.department AS dept
      FROM public.badge_definitions bd
      WHERE bd.department IS NOT NULL
        AND bd.department <> ''
    ) d
    WHERE dept IS NOT NULL
      AND dept <> ''
  LOOP
    INSERT INTO public.user_domain_mastery (
      user_id,
      department,
      mastery_points,
      mastery_level,
      updated_at
    )
    VALUES (
      v_user_id,
      v_department,
      3600,
      7,
      now()
    )
    ON CONFLICT (user_id, department) DO UPDATE
    SET
      mastery_points = GREATEST(public.user_domain_mastery.mastery_points, 3600),
      mastery_level = GREATEST(public.user_domain_mastery.mastery_level, 7),
      updated_at = now();
  END LOOP;
END;
$$;
