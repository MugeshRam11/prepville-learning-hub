-- Add table_input to the valid answer_block_type constraint

-- Drop existing constraints
ALTER TABLE public.mock_questions DROP CONSTRAINT IF EXISTS valid_answer_block_type_questions;
ALTER TABLE public.mock_sub_questions DROP CONSTRAINT IF EXISTS valid_answer_block_type_sub_questions;

-- Recreate with table_input included
ALTER TABLE public.mock_questions ADD CONSTRAINT valid_answer_block_type_questions 
CHECK (answer_block_type = ANY (ARRAY['text_equation', 'graph_plot', 'drag_drop', 'image_drop', 'arrange_order', 'smart_math', 'multiple_choice', 'table_input']));

ALTER TABLE public.mock_sub_questions ADD CONSTRAINT valid_answer_block_type_sub_questions 
CHECK (answer_block_type = ANY (ARRAY['text_equation', 'graph_plot', 'drag_drop', 'image_drop', 'arrange_order', 'smart_math', 'multiple_choice', 'table_input']));