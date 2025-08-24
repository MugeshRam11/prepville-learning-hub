-- Add category column to mock_questions for admin-assigned criteria/category
ALTER TABLE public.mock_questions
ADD COLUMN IF NOT EXISTS category text;

-- Optional: comment for clarity
COMMENT ON COLUMN public.mock_questions.category IS 'Admin-assigned category/criteria label (e.g., A, B, C, D) for reporting/analysis.';