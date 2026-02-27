-- V2-4.3: Task Categorization (Launch vs. Optimization)
-- Adds category and tags columns to the tasks table for better organization.

-- Add category column with predefined values
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS category text;

-- Add tags column as text array
ALTER TABLE public.tasks
  ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}';

-- Create GIN index for efficient tag searches
CREATE INDEX IF NOT EXISTS idx_tasks_tags ON public.tasks USING GIN(tags);

-- Create index for category filtering
CREATE INDEX IF NOT EXISTS idx_tasks_category ON public.tasks(category);

-- Add a comment describing valid categories
COMMENT ON COLUMN public.tasks.category IS 'Task category: launch, optimization, maintenance, research, administrative, other';
COMMENT ON COLUMN public.tasks.tags IS 'Freeform tags for additional categorization';
