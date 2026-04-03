-- Migration: Create Helper Functions
-- Created: 2026-01-23
-- Description: Creates helper functions for common operations

-- UP Migration
BEGIN;

-- ============================================
-- Function: Check if user has role
-- ============================================
CREATE OR REPLACE FUNCTION public.user_has_role(user_id uuid, required_role user_role)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = user_id
    AND role = required_role
    AND deleted_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.user_has_role(uuid, user_role) IS 'Check if a user has a specific role';

-- ============================================
-- Function: Check if user has any of the roles
-- ============================================
CREATE OR REPLACE FUNCTION public.user_has_any_role(user_id uuid, required_roles user_role[])
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = user_id
    AND role = ANY(required_roles)
    AND deleted_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.user_has_any_role(uuid, user_role[]) IS 'Check if a user has any of the specified roles';

-- Overload accepting text[] so callers can pass ARRAY['admin','hr'] without explicit cast
CREATE OR REPLACE FUNCTION public.user_has_any_role(user_id uuid, required_roles text[])
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.users
    WHERE id = user_id
    AND role = ANY(required_roles::user_role[])
    AND deleted_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.user_has_any_role(uuid, text[]) IS 'Check if a user has any of the specified roles (text overload)';

-- ============================================
-- Function: Get user role
-- ============================================
CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
RETURNS user_role AS $$
  SELECT role FROM public.users
  WHERE id = user_id
  AND deleted_at IS NULL;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.get_user_role(uuid) IS 'Get the role of a specific user';

-- ============================================
-- Function: Check if user is manager of employee
-- ============================================
CREATE OR REPLACE FUNCTION public.is_manager_of(manager_id uuid, employee_user_id uuid)
RETURNS boolean AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.employees
    WHERE user_id = employee_user_id
    AND immediate_head = manager_id
    AND deleted_at IS NULL
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.is_manager_of(uuid, uuid) IS 'Check if first user is the manager of second user';

-- ============================================
-- Function: Get employee by user_id
-- ============================================
CREATE OR REPLACE FUNCTION public.get_employee_by_user_id(user_id uuid)
RETURNS uuid AS $$
  SELECT id FROM public.employees
  WHERE employees.user_id = $1
  AND deleted_at IS NULL
  LIMIT 1;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.get_employee_by_user_id(uuid) IS 'Get employee ID from user ID';

-- ============================================
-- Function: Soft delete helper
-- ============================================
CREATE OR REPLACE FUNCTION public.soft_delete(table_name text, record_id uuid)
RETURNS boolean AS $$
DECLARE
  query text;
BEGIN
  query := format('UPDATE %I SET deleted_at = now() WHERE id = $1 AND deleted_at IS NULL', table_name);
  EXECUTE query USING record_id;
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.soft_delete(text, uuid) IS 'Soft delete a record by setting deleted_at timestamp';

-- ============================================
-- Function: Get direct reports
-- ============================================
CREATE OR REPLACE FUNCTION public.get_direct_reports(manager_user_id uuid)
RETURNS TABLE(
  employee_id uuid,
  user_id uuid,
  employee_number text,
  full_name text,
  "position" text,
  department text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.user_id,
    e.employee_number,
    CONCAT(e.first_name, ' ', e.last_name) as full_name,
    e."position",
    e.department
  FROM public.employees e
  WHERE e.immediate_head = manager_user_id
  AND e.deleted_at IS NULL
  ORDER BY e.last_name, e.first_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.get_direct_reports(uuid) IS 'Get all direct reports for a manager';

-- ============================================
-- Function: Check if employee probation is active
-- ============================================
CREATE OR REPLACE FUNCTION public.is_on_probation(employee_id uuid)
RETURNS boolean AS $$
  SELECT
    CASE
      WHEN probation_end_date IS NULL THEN false
      WHEN probation_end_date >= CURRENT_DATE THEN true
      ELSE false
    END
  FROM public.employees
  WHERE id = employee_id
  AND deleted_at IS NULL;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.is_on_probation(uuid) IS 'Check if an employee is currently on probation';

-- ============================================
-- Function: Calculate tenure in days
-- ============================================
CREATE OR REPLACE FUNCTION public.calculate_tenure_days(employee_id uuid)
RETURNS integer AS $$
  SELECT
    CASE
      WHEN date_hired IS NOT NULL THEN
        (CURRENT_DATE - date_hired)
      ELSE
        NULL
    END
  FROM public.employees
  WHERE id = employee_id
  AND deleted_at IS NULL;
$$ LANGUAGE sql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.calculate_tenure_days(uuid) IS 'Calculate employee tenure in days';

-- ============================================
-- Function: Get employees by department
-- ============================================
CREATE OR REPLACE FUNCTION public.get_employees_by_department(dept_name text)
RETURNS TABLE(
  employee_id uuid,
  employee_number text,
  full_name text,
  "position" text,
  employment_type employment_type,
  date_hired date
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.employee_number,
    CONCAT(e.first_name, ' ', e.last_name) as full_name,
    e."position",
    e.employment_type,
    e.date_hired
  FROM public.employees e
  WHERE e.department = dept_name
  AND e.deleted_at IS NULL
  ORDER BY e.last_name, e.first_name;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.get_employees_by_department(text) IS 'Get all employees in a specific department';

COMMIT;

-- DOWN Migration (run manually if rollback needed)
/*
BEGIN;

DROP FUNCTION IF EXISTS public.get_employees_by_department(text) CASCADE;
DROP FUNCTION IF EXISTS public.calculate_tenure_days(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_on_probation(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_direct_reports(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.soft_delete(text, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_employee_by_user_id(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.is_manager_of(uuid, uuid) CASCADE;
DROP FUNCTION IF EXISTS public.get_user_role(uuid) CASCADE;
DROP FUNCTION IF EXISTS public.user_has_any_role(uuid, text[]) CASCADE;
DROP FUNCTION IF EXISTS public.user_has_any_role(uuid, user_role[]) CASCADE;
DROP FUNCTION IF EXISTS public.user_has_role(uuid, user_role) CASCADE;

COMMIT;
*/
