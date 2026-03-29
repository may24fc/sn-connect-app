BEGIN;

CREATE OR REPLACE FUNCTION public.create_job_posting_with_requisition(
  p_title text,
  p_business_unit_id uuid,
  p_department text,
  p_location text,
  p_total_headcount integer,
  p_employment_type text,
  p_description text,
  p_requirements text,
  p_benefits text,
  p_salary_range text,
  p_is_active boolean,
  p_closes_at timestamptz
)
RETURNS jsonb
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  posting_record public.job_postings%ROWTYPE;
  requisition_record public.job_requisitions%ROWTYPE;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'Unauthorized';
  END IF;

  IF p_total_headcount IS NULL OR p_total_headcount < 1 THEN
    RAISE EXCEPTION 'Total headcount must be at least 1';
  END IF;

  INSERT INTO public.job_postings (
    title,
    business_unit_id,
    department,
    location,
    employment_type,
    description,
    requirements,
    benefits,
    salary_range,
    is_active,
    closes_at,
    published_at,
    created_by
  )
  VALUES (
    p_title,
    p_business_unit_id,
    p_department,
    p_location,
    p_employment_type,
    p_description,
    p_requirements,
    p_benefits,
    p_salary_range,
    p_is_active,
    p_closes_at,
    CASE WHEN p_is_active THEN now() ELSE NULL END,
    auth.uid()
  )
  RETURNING * INTO posting_record;

  INSERT INTO public.job_requisitions (
    job_posting_id,
    total_headcount,
    filled_headcount,
    status,
    created_by
  )
  VALUES (
    posting_record.id,
    p_total_headcount,
    0,
    'open',
    auth.uid()
  )
  RETURNING * INTO requisition_record;

  RETURN jsonb_build_object(
    'id', posting_record.id,
    'title', posting_record.title,
    'business_unit_id', posting_record.business_unit_id,
    'department', posting_record.department,
    'location', posting_record.location,
    'employment_type', posting_record.employment_type,
    'description', posting_record.description,
    'requirements', posting_record.requirements,
    'benefits', posting_record.benefits,
    'salary_range', posting_record.salary_range,
    'is_active', posting_record.is_active,
    'published_at', posting_record.published_at,
    'closes_at', posting_record.closes_at,
    'created_at', posting_record.created_at,
    'updated_at', posting_record.updated_at,
    'created_by', posting_record.created_by,
    'deleted_at', posting_record.deleted_at,
    'job_requisition', jsonb_build_object(
      'id', requisition_record.id,
      'job_posting_id', requisition_record.job_posting_id,
      'total_headcount', requisition_record.total_headcount,
      'filled_headcount', requisition_record.filled_headcount,
      'status', requisition_record.status,
      'created_at', requisition_record.created_at,
      'updated_at', requisition_record.updated_at,
      'created_by', requisition_record.created_by,
      'deleted_at', requisition_record.deleted_at
    )
  );
END;
$$;

COMMIT;