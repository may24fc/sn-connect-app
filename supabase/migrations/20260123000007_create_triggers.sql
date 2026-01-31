-- Migration: Create Triggers
-- Created: 2026-01-23
-- Description: Creates trigger functions for updated_at and audit logging

-- UP Migration
BEGIN;

-- ============================================
-- Trigger Function: Update updated_at timestamp
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.handle_updated_at() IS 'Automatically updates the updated_at column on row update';

-- ============================================
-- Trigger Function: Audit logging for sensitive tables
-- ============================================
CREATE OR REPLACE FUNCTION public.handle_audit_log()
RETURNS trigger AS $$
DECLARE
  old_data jsonb;
  new_data jsonb;
BEGIN
  -- For DELETE operations
  IF (TG_OP = 'DELETE') THEN
    old_data = to_jsonb(OLD);
    INSERT INTO public.audit_logs (
      table_name,
      record_id,
      operation,
      old_values,
      new_values,
      performed_by
    ) VALUES (
      TG_TABLE_NAME,
      OLD.id,
      TG_OP,
      old_data,
      NULL,
      auth.uid()
    );
    RETURN OLD;

  -- For INSERT operations
  ELSIF (TG_OP = 'INSERT') THEN
    new_data = to_jsonb(NEW);
    INSERT INTO public.audit_logs (
      table_name,
      record_id,
      operation,
      old_values,
      new_values,
      performed_by
    ) VALUES (
      TG_TABLE_NAME,
      NEW.id,
      TG_OP,
      NULL,
      new_data,
      auth.uid()
    );
    RETURN NEW;

  -- For UPDATE operations
  ELSIF (TG_OP = 'UPDATE') THEN
    old_data = to_jsonb(OLD);
    new_data = to_jsonb(NEW);
    INSERT INTO public.audit_logs (
      table_name,
      record_id,
      operation,
      old_values,
      new_values,
      performed_by
    ) VALUES (
      TG_TABLE_NAME,
      NEW.id,
      TG_OP,
      old_data,
      new_data,
      auth.uid()
    );
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.handle_audit_log() IS 'Logs all operations on sensitive tables to audit_logs';

-- ============================================
-- Apply updated_at triggers to all tables
-- ============================================

-- Departments
CREATE TRIGGER trigger_departments_updated_at
  BEFORE UPDATE ON public.departments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Users
CREATE TRIGGER trigger_users_updated_at
  BEFORE UPDATE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Employees
CREATE TRIGGER trigger_employees_updated_at
  BEFORE UPDATE ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- Documents
CREATE TRIGGER trigger_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- Apply audit triggers to sensitive tables
-- ============================================

-- Users (role changes, status changes)
CREATE TRIGGER trigger_users_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_audit_log();

-- Employees (sensitive personal and payroll data)
CREATE TRIGGER trigger_employees_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.employees
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_audit_log();

-- Documents (access to sensitive files)
CREATE TRIGGER trigger_documents_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_audit_log();

-- Departments (organizational changes)
CREATE TRIGGER trigger_departments_audit
  AFTER INSERT OR UPDATE OR DELETE ON public.departments
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_audit_log();

COMMIT;

-- DOWN Migration (run manually if rollback needed)
/*
BEGIN;

-- Drop triggers
DROP TRIGGER IF EXISTS trigger_departments_audit ON public.departments;
DROP TRIGGER IF EXISTS trigger_documents_audit ON public.documents;
DROP TRIGGER IF EXISTS trigger_employees_audit ON public.employees;
DROP TRIGGER IF EXISTS trigger_users_audit ON public.users;

DROP TRIGGER IF EXISTS trigger_documents_updated_at ON public.documents;
DROP TRIGGER IF EXISTS trigger_employees_updated_at ON public.employees;
DROP TRIGGER IF EXISTS trigger_users_updated_at ON public.users;
DROP TRIGGER IF EXISTS trigger_departments_updated_at ON public.departments;

-- Drop functions
DROP FUNCTION IF EXISTS public.handle_audit_log() CASCADE;
DROP FUNCTION IF EXISTS public.handle_updated_at() CASCADE;

COMMIT;
*/
