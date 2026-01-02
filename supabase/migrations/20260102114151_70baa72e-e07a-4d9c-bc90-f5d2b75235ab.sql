-- Add command_term column to mock_questions table
ALTER TABLE public.mock_questions 
ADD COLUMN command_term TEXT;

-- Add command_term column to mock_sub_questions table
ALTER TABLE public.mock_sub_questions 
ADD COLUMN command_term TEXT;

-- Add command_term column to mock_test_question_bank table
ALTER TABLE public.mock_test_question_bank 
ADD COLUMN command_term TEXT;

-- Add command_term column to mock_test_sub_question_bank table
ALTER TABLE public.mock_test_sub_question_bank 
ADD COLUMN command_term TEXT;

-- Create an index for faster queries on command_term
CREATE INDEX idx_mock_questions_command_term ON public.mock_questions(command_term);
CREATE INDEX idx_mock_test_question_bank_command_term ON public.mock_test_question_bank(command_term);