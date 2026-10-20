-- Kept in its own migration because PostgreSQL requires a newly added enum value
-- to be committed before another transaction can use it.
ALTER TYPE public.milestone_status ADD VALUE IF NOT EXISTS 'completed';
