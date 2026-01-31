-- Migration: Create Extensions and Enums
-- Created: 2026-01-23
-- Description: Sets up PostgreSQL extensions and custom enum types for the HR Portal

-- UP Migration
BEGIN;

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create custom enum types
CREATE TYPE user_role AS ENUM (
  'admin',
  'hr',
  'cos',
  'ceo',
  'employee',
  'intern'
);

CREATE TYPE user_status AS ENUM (
  'active',
  'on_leave',
  'terminated'
);

CREATE TYPE employment_type AS ENUM (
  'regular',
  'probationary',
  'intern',
  'project_based'
);

CREATE TYPE work_arrangement AS ENUM (
  'part_time',
  'full_time'
);

CREATE TYPE document_type AS ENUM (
  'contract',
  'id',
  'certificate',
  'performance_review',
  'resume',
  'medical_record',
  'tax_document',
  'nda',
  'handbook_acknowledgment',
  'other'
);

COMMIT;

-- DOWN Migration (run manually if rollback needed)
/*
BEGIN;

DROP TYPE IF EXISTS document_type CASCADE;
DROP TYPE IF EXISTS work_arrangement CASCADE;
DROP TYPE IF EXISTS employment_type CASCADE;
DROP TYPE IF EXISTS user_status CASCADE;
DROP TYPE IF EXISTS user_role CASCADE;

DROP EXTENSION IF EXISTS "pgcrypto";
DROP EXTENSION IF EXISTS "uuid-ossp";

COMMIT;
*/
