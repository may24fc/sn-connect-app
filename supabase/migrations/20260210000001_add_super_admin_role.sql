-- Add super_admin role to align database with UI roles
ALTER TYPE user_role ADD VALUE IF NOT EXISTS 'super_admin';
