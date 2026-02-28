-- Migration: Fix documents INSERT policy
-- Description: Allow employees/interns to upload documents to their own 201 files
-- Dependencies: 20260216000015_verify_and_repair_schema.sql

-- The current policy only allows admin/hr roles to insert documents.
-- Employees and interns should be able to upload their own documents.
-- Note: Role consolidation removed hr/cos/ceo roles - now only admin/super_admin have elevated access

-- Drop existing insert policy
DROP POLICY IF EXISTS documents_insert_policy ON public.documents;
DROP POLICY IF EXISTS documents_insert_own_policy ON public.documents;

-- Create new insert policy that allows:
-- 1. Employees/interns to insert documents for themselves (matching their employee record)
-- 2. Admin roles (admin, super_admin) to insert documents for any employee
CREATE POLICY documents_insert_own_policy ON public.documents
  FOR INSERT TO authenticated
  WITH CHECK (
    -- User is inserting a document for their own employee record
    EXISTS (
      SELECT 1 FROM public.employees
      WHERE employees.id = employee_id
      AND employees.user_id = auth.uid()
      AND employees.deleted_at IS NULL
    )
    OR
    -- User has admin role (admin or super_admin)
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role IN ('admin', 'super_admin')
      AND users.deleted_at IS NULL
    )
  );

-- Add comment for documentation
COMMENT ON POLICY documents_insert_own_policy ON public.documents IS
  'Allows employees to upload their own documents, and admins to upload for any employee';
