
-- Add dual-format math storage columns (LaTeX = source of truth, Unicode = preview)

ALTER TABLE public.mock_questions
  ADD COLUMN IF NOT EXISTS question_text_latex text,
  ADD COLUMN IF NOT EXISTS question_text_unicode text;

ALTER TABLE public.mock_sub_questions
  ADD COLUMN IF NOT EXISTS sub_question_text_latex text,
  ADD COLUMN IF NOT EXISTS sub_question_text_unicode text;

ALTER TABLE public.practice_questions
  ADD COLUMN IF NOT EXISTS question_text_latex text,
  ADD COLUMN IF NOT EXISTS question_text_unicode text;

ALTER TABLE public.practice_sub_questions
  ADD COLUMN IF NOT EXISTS sub_question_text_latex text,
  ADD COLUMN IF NOT EXISTS sub_question_text_unicode text;

ALTER TABLE public.mock_test_question_bank
  ADD COLUMN IF NOT EXISTS question_text_latex text,
  ADD COLUMN IF NOT EXISTS question_text_unicode text;

ALTER TABLE public.mock_test_sub_question_bank
  ADD COLUMN IF NOT EXISTS sub_question_text_latex text,
  ADD COLUMN IF NOT EXISTS sub_question_text_unicode text;
