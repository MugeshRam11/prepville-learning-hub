-- Add diagram_description column to mock_questions table
ALTER TABLE public.mock_questions ADD COLUMN IF NOT EXISTS diagram_description TEXT;

-- Add diagram_description column to mock_test_question_bank table  
ALTER TABLE public.mock_test_question_bank ADD COLUMN IF NOT EXISTS diagram_description TEXT;

-- Add diagram_description column to mock_sub_questions table
ALTER TABLE public.mock_sub_questions ADD COLUMN IF NOT EXISTS diagram_description TEXT;