-- Add 'venn_drag' to allowed answer_block_type values across all question tables

-- mock_sub_questions
ALTER TABLE public.mock_sub_questions
DROP CONSTRAINT IF EXISTS valid_answer_block_type_sub_questions;

ALTER TABLE public.mock_sub_questions
ADD CONSTRAINT valid_answer_block_type_sub_questions
CHECK (answer_block_type IN (
  'text_equation','graph_plot','drag_drop','image_drop','arrange_order',
  'smart_math','multiple_choice','table_input','image_fill_blanks','venn_drag'
));

-- mock_questions
ALTER TABLE public.mock_questions
DROP CONSTRAINT IF EXISTS valid_answer_block_type;

ALTER TABLE public.mock_questions
DROP CONSTRAINT IF EXISTS valid_answer_block_type_questions;

ALTER TABLE public.mock_questions
ADD CONSTRAINT valid_answer_block_type_questions
CHECK (answer_block_type IS NULL OR answer_block_type IN (
  'text_equation','graph_plot','drag_drop','image_drop','arrange_order',
  'smart_math','multiple_choice','table_input','image_fill_blanks','venn_drag'
));

-- mock_test_question_bank
ALTER TABLE public.mock_test_question_bank
DROP CONSTRAINT IF EXISTS valid_answer_block_type_bank;

ALTER TABLE public.mock_test_question_bank
ADD CONSTRAINT valid_answer_block_type_bank
CHECK (answer_block_type IS NULL OR answer_block_type IN (
  'text_equation','graph_plot','drag_drop','image_drop','arrange_order',
  'smart_math','multiple_choice','table_input','image_fill_blanks','venn_drag'
));

-- mock_test_sub_question_bank
ALTER TABLE public.mock_test_sub_question_bank
DROP CONSTRAINT IF EXISTS valid_answer_block_type_sub_bank;

ALTER TABLE public.mock_test_sub_question_bank
ADD CONSTRAINT valid_answer_block_type_sub_bank
CHECK (answer_block_type IS NULL OR answer_block_type IN (
  'text_equation','graph_plot','drag_drop','image_drop','arrange_order',
  'smart_math','multiple_choice','table_input','image_fill_blanks','venn_drag'
));

-- practice_sub_questions (uses column 'answer_type')
ALTER TABLE public.practice_sub_questions
DROP CONSTRAINT IF EXISTS valid_answer_type_practice_sub;

ALTER TABLE public.practice_sub_questions
ADD CONSTRAINT valid_answer_type_practice_sub
CHECK (answer_type IN (
  'text_equation','graph_plot','drag_drop','image_drop','arrange_order',
  'smart_math','multiple_choice','table_input','image_fill_blanks','venn_drag'
));