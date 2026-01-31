-- Seed File: Sample Data for HR Portal Phase 1
-- Created: 2026-01-23
-- Description: Sample data for development and testing
-- IMPORTANT: This is for development only. Do NOT run in production!

BEGIN;

-- ============================================
-- Clean existing data (for re-running seed)
-- ============================================
TRUNCATE TABLE public.documents CASCADE;
TRUNCATE TABLE public.employees CASCADE;
TRUNCATE TABLE public.users CASCADE;
TRUNCATE TABLE public.departments CASCADE;
TRUNCATE TABLE public.audit_logs CASCADE;

-- Note: We don't truncate auth.users as that's managed by Supabase Auth

-- ============================================
-- Sample Departments
-- ============================================
INSERT INTO public.departments (id, name, description, head_id, created_by)
VALUES
  ('d1111111-1111-1111-1111-111111111111', 'Engineering', 'Software development and technical operations', NULL, NULL),
  ('d2222222-2222-2222-2222-222222222222', 'Human Resources', 'Employee management and people operations', NULL, NULL),
  ('d3333333-3333-3333-3333-333333333333', 'Marketing', 'Brand management and customer acquisition', NULL, NULL),
  ('d4444444-4444-4444-4444-444444444444', 'Sales', 'Revenue generation and client relations', NULL, NULL),
  ('d5555555-5555-5555-5555-555555555555', 'Finance', 'Financial planning and accounting', NULL, NULL),
  ('d6666666-6666-6666-6666-666666666666', 'Operations', 'Business operations and logistics', NULL, NULL);

-- ============================================
-- Sample Users
-- ============================================
-- Note: In production, these would be created via Supabase Auth first
-- For testing, you need to create corresponding auth.users entries

-- Assuming auth.users have been created, we create the extended user profiles

-- CEO
INSERT INTO public.users (id, role, department_id, manager_id, status, created_by)
VALUES
  ('a1111111-1111-1111-1111-111111111111', 'ceo', NULL, NULL, 'active', NULL);

-- COS
INSERT INTO public.users (id, role, department_id, manager_id, status, created_by)
VALUES
  ('a2222222-2222-2222-2222-222222222222', 'cos', NULL, 'a1111111-1111-1111-1111-111111111111', 'active', NULL);

-- HR Manager
INSERT INTO public.users (id, role, department_id, manager_id, status, created_by)
VALUES
  ('a3333333-3333-3333-3333-333333333333', 'hr', 'd2222222-2222-2222-2222-222222222222', 'a2222222-2222-2222-2222-222222222222', 'active', NULL);

-- Department Heads
INSERT INTO public.users (id, role, department_id, manager_id, status, created_by)
VALUES
  ('a4444444-4444-4444-4444-444444444444', 'employee', 'd1111111-1111-1111-1111-111111111111', 'a1111111-1111-1111-1111-111111111111', 'active', NULL), -- Engineering Head
  ('a5555555-5555-5555-5555-555555555555', 'employee', 'd3333333-3333-3333-3333-333333333333', 'a1111111-1111-1111-1111-111111111111', 'active', NULL), -- Marketing Head
  ('a6666666-6666-6666-6666-666666666666', 'employee', 'd4444444-4444-4444-4444-444444444444', 'a1111111-1111-1111-1111-111111111111', 'active', NULL); -- Sales Head

-- Regular Employees
INSERT INTO public.users (id, role, department_id, manager_id, status, created_by)
VALUES
  ('a7777777-7777-7777-7777-777777777777', 'employee', 'd1111111-1111-1111-1111-111111111111', 'a4444444-4444-4444-4444-444444444444', 'active', NULL),
  ('a8888888-8888-8888-8888-888888888888', 'employee', 'd1111111-1111-1111-1111-111111111111', 'a4444444-4444-4444-4444-444444444444', 'active', NULL),
  ('a9999999-9999-9999-9999-999999999999', 'intern', 'd3333333-3333-3333-3333-333333333333', 'a5555555-5555-5555-5555-555555555555', 'active', NULL);

-- Admin
INSERT INTO public.users (id, role, department_id, manager_id, status, created_by)
VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'admin', NULL, NULL, 'active', NULL);

-- Update department heads
UPDATE public.departments SET head_id = 'a4444444-4444-4444-4444-444444444444' WHERE id = 'd1111111-1111-1111-1111-111111111111';
UPDATE public.departments SET head_id = 'a3333333-3333-3333-3333-333333333333' WHERE id = 'd2222222-2222-2222-2222-222222222222';
UPDATE public.departments SET head_id = 'a5555555-5555-5555-5555-555555555555' WHERE id = 'd3333333-3333-3333-3333-333333333333';
UPDATE public.departments SET head_id = 'a6666666-6666-6666-6666-666666666666' WHERE id = 'd4444444-4444-4444-4444-444444444444';

-- ============================================
-- Sample Employees
-- ============================================

-- CEO
INSERT INTO public.employees (
  id, user_id, employee_number, immediate_head,
  first_name, middle_name, last_name, birthday,
  date_hired, employment_type, work_arrangement, position, department,
  phone, personal_email, company_email,
  address, city, province, postal_code,
  created_by
)
VALUES
  (
    'e1111111-1111-1111-1111-111111111111',
    'a1111111-1111-1111-1111-111111111111',
    'EMP-001',
    NULL,
    'John',
    'Michael',
    'Smith',
    '1980-05-15',
    '2015-01-01',
    'regular',
    'full_time',
    'Chief Executive Officer',
    'Executive',
    '+63-917-123-4567',
    'john.smith@personal.com',
    'john.smith@company.com',
    '123 Executive St',
    'Makati',
    'Metro Manila',
    '1200',
    NULL
  );

-- COS
INSERT INTO public.employees (
  id, user_id, employee_number, immediate_head,
  first_name, middle_name, last_name, birthday,
  date_hired, employment_type, work_arrangement, position, department,
  phone, personal_email, company_email,
  address, city, province, postal_code,
  created_by
)
VALUES
  (
    'e2222222-2222-2222-2222-222222222222',
    'a2222222-2222-2222-2222-222222222222',
    'EMP-002',
    'a1111111-1111-1111-1111-111111111111',
    'Sarah',
    'Jane',
    'Williams',
    '1985-08-20',
    '2016-03-15',
    'regular',
    'full_time',
    'Chief of Staff',
    'Executive',
    '+63-917-234-5678',
    'sarah.williams@personal.com',
    'sarah.williams@company.com',
    '456 Leadership Ave',
    'Taguig',
    'Metro Manila',
    '1630',
    NULL
  );

-- HR Manager
INSERT INTO public.employees (
  id, user_id, employee_number, immediate_head,
  first_name, middle_name, last_name, birthday,
  date_hired, employment_type, work_arrangement, position, department,
  payroll_account_name, payroll_account_number,
  phone, emergency_contact_name, emergency_contact_number,
  personal_email, company_email,
  address, city, province, postal_code,
  created_by
)
VALUES
  (
    'e3333333-3333-3333-3333-333333333333',
    'a3333333-3333-3333-3333-333333333333',
    'EMP-003',
    'a2222222-2222-2222-2222-222222222222',
    'Maria',
    'Santos',
    'Garcia',
    '1988-11-10',
    '2017-06-01',
    'regular',
    'full_time',
    'HR Manager',
    'Human Resources',
    'Maria S. Garcia',
    '1234-5678-9012',
    '+63-917-345-6789',
    'Roberto Garcia',
    '+63-917-999-8888',
    'maria.garcia@personal.com',
    'maria.garcia@company.com',
    '789 People St',
    'Quezon City',
    'Metro Manila',
    '1100',
    NULL
  );

-- Engineering Head
INSERT INTO public.employees (
  id, user_id, employee_number, immediate_head,
  first_name, middle_name, last_name, birthday,
  date_hired, employment_type, work_arrangement, position, department,
  payroll_account_name, payroll_account_number,
  phone, emergency_contact_name, emergency_contact_number,
  personal_email, company_email,
  address, city, province, postal_code,
  created_by
)
VALUES
  (
    'e4444444-4444-4444-4444-444444444444',
    'a4444444-4444-4444-4444-444444444444',
    'EMP-004',
    'a1111111-1111-1111-1111-111111111111',
    'Carlos',
    'Reyes',
    'Torres',
    '1987-03-25',
    '2018-01-15',
    'regular',
    'full_time',
    'Engineering Manager',
    'Engineering',
    'Carlos R. Torres',
    '2345-6789-0123',
    '+63-917-456-7890',
    'Anna Torres',
    '+63-917-888-7777',
    'carlos.torres@personal.com',
    'carlos.torres@company.com',
    '321 Tech Blvd',
    'Pasig',
    'Metro Manila',
    '1600',
    NULL
  );

-- Software Engineer 1
INSERT INTO public.employees (
  id, user_id, employee_number, immediate_head,
  first_name, middle_name, last_name, birthday,
  date_hired, employment_type, work_arrangement, position, department,
  probation_end_date,
  payroll_account_name, payroll_account_number,
  phone, emergency_contact_name, emergency_contact_number,
  personal_email, company_email,
  address, city, province, postal_code,
  created_by
)
VALUES
  (
    'e7777777-7777-7777-7777-777777777777',
    'a7777777-7777-7777-7777-777777777777',
    'EMP-007',
    'a4444444-4444-4444-4444-444444444444',
    'Miguel',
    'Cruz',
    'Ramos',
    '1995-07-12',
    '2025-10-01',
    'probationary',
    'full_time',
    'Software Engineer',
    'Engineering',
    '2026-03-31',
    'Miguel C. Ramos',
    '3456-7890-1234',
    '+63-917-567-8901',
    'Pedro Ramos',
    '+63-917-777-6666',
    'miguel.ramos@personal.com',
    'miguel.ramos@company.com',
    '654 Developer Lane',
    'Makati',
    'Metro Manila',
    '1210',
    NULL
  );

-- Marketing Intern
INSERT INTO public.employees (
  id, user_id, employee_number, immediate_head,
  first_name, middle_name, last_name, birthday,
  date_hired, employment_type, work_arrangement, position, department,
  probation_end_date,
  phone, emergency_contact_name, emergency_contact_number,
  personal_email, company_email,
  address, city, province, postal_code,
  created_by
)
VALUES
  (
    'e9999999-9999-9999-9999-999999999999',
    'a9999999-9999-9999-9999-999999999999',
    'INT-001',
    'a5555555-5555-5555-5555-555555555555',
    'Isabella',
    'Luna',
    'Mendoza',
    '2003-02-28',
    '2025-11-01',
    'intern',
    'part_time',
    'Marketing Intern',
    'Marketing',
    '2026-05-01',
    '+63-917-678-9012',
    'Carmen Mendoza',
    '+63-917-666-5555',
    'isabella.mendoza@personal.com',
    'isabella.mendoza@company.com',
    '987 Student St',
    'Quezon City',
    'Metro Manila',
    '1105',
    NULL
  );

-- ============================================
-- Sample Documents
-- ============================================

-- CEO's contract (non-confidential)
INSERT INTO public.documents (
  id, employee_id, document_type, file_path, file_name,
  is_confidential, uploaded_by, notes
)
VALUES
  (
    'doc11111-1111-1111-1111-111111111111',
    'e1111111-1111-1111-1111-111111111111',
    'contract',
    'documents/ceo/contract_2015.pdf',
    'Employment Contract - John Smith.pdf',
    false,
    'a3333333-3333-3333-3333-333333333333',
    'Initial employment contract'
  );

-- HR Manager's sensitive documents (confidential)
INSERT INTO public.documents (
  id, employee_id, document_type, file_path, file_name,
  is_confidential, uploaded_by, notes
)
VALUES
  (
    'doc33333-3333-3333-3333-333333333333',
    'e3333333-3333-3333-3333-333333333333',
    'medical_record',
    'documents/hr/medical_garcia.pdf',
    'Medical Certificate - Maria Garcia.pdf',
    true,
    'a3333333-3333-3333-3333-333333333333',
    'Annual medical check-up results'
  );

-- Engineer's performance review
INSERT INTO public.documents (
  id, employee_id, document_type, file_path, file_name,
  is_confidential, uploaded_by, notes
)
VALUES
  (
    'doc77777-7777-7777-7777-777777777777',
    'e7777777-7777-7777-7777-777777777777',
    'performance_review',
    'documents/eng/review_ramos_q4_2025.pdf',
    'Q4 2025 Performance Review - Miguel Ramos.pdf',
    false,
    'a4444444-4444-4444-4444-444444444444',
    'Initial probationary review'
  );

-- Intern's resume
INSERT INTO public.documents (
  id, employee_id, document_type, file_path, file_name,
  is_confidential, uploaded_by, notes
)
VALUES
  (
    'doc99999-9999-9999-9999-999999999999',
    'e9999999-9999-9999-9999-999999999999',
    'resume',
    'documents/interns/resume_mendoza.pdf',
    'Resume - Isabella Mendoza.pdf',
    false,
    'a3333333-3333-3333-3333-333333333333',
    'Application resume'
  );

COMMIT;

-- ============================================
-- Verification Queries
-- ============================================
-- Uncomment to verify seed data

-- SELECT 'Departments' as table_name, COUNT(*) as count FROM public.departments;
-- SELECT 'Users' as table_name, COUNT(*) as count FROM public.users;
-- SELECT 'Employees' as table_name, COUNT(*) as count FROM public.employees;
-- SELECT 'Documents' as table_name, COUNT(*) as count FROM public.documents;

-- Show sample data
-- SELECT d.name, COUNT(u.id) as employee_count
-- FROM public.departments d
-- LEFT JOIN public.users u ON d.id = u.department_id AND u.deleted_at IS NULL
-- WHERE d.deleted_at IS NULL
-- GROUP BY d.name
-- ORDER BY d.name;
