-- Add answer_block_type and answer_block_config to mock_questions
ALTER TABLE public.mock_questions
ADD COLUMN IF NOT EXISTS answer_block_type text DEFAULT 'text_equation',
ADD COLUMN IF NOT EXISTS answer_block_config jsonb DEFAULT '{}';

-- Add answer_block_type and answer_block_config to mock_sub_questions  
ALTER TABLE public.mock_sub_questions
ADD COLUMN IF NOT EXISTS answer_block_type text DEFAULT 'text_equation',
ADD COLUMN IF NOT EXISTS answer_block_config jsonb DEFAULT '{}';

-- Add answer_block_type and answer_block_config to question bank tables
ALTER TABLE public.mock_test_question_bank
ADD COLUMN IF NOT EXISTS answer_block_type text DEFAULT 'text_equation',
ADD COLUMN IF NOT EXISTS answer_block_config jsonb DEFAULT '{}';

ALTER TABLE public.mock_test_sub_question_bank
ADD COLUMN IF NOT EXISTS answer_block_type text DEFAULT 'text_equation',
ADD COLUMN IF NOT EXISTS answer_block_config jsonb DEFAULT '{}';

-- Add check constraint for valid answer block types
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'valid_answer_block_type_questions'
  ) THEN
    ALTER TABLE public.mock_questions
    ADD CONSTRAINT valid_answer_block_type_questions 
    CHECK (answer_block_type IN ('text_equation', 'graph_plot', 'drag_drop', 'image_drop', 'arrange_order', 'smart_math', 'multiple_choice'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'valid_answer_block_type_sub_questions'
  ) THEN
    ALTER TABLE public.mock_sub_questions
    ADD CONSTRAINT valid_answer_block_type_sub_questions 
    CHECK (answer_block_type IN ('text_equation', 'graph_plot', 'drag_drop', 'image_drop', 'arrange_order', 'smart_math', 'multiple_choice'));
  END IF;
END $$;

-- Add indexes for answer_block_type
CREATE INDEX IF NOT EXISTS idx_mock_questions_answer_block_type ON public.mock_questions(answer_block_type);
CREATE INDEX IF NOT EXISTS idx_mock_sub_questions_answer_block_type ON public.mock_sub_questions(answer_block_type);

-- Add comment for documentation
COMMENT ON COLUMN public.mock_questions.answer_block_type IS 'Type of answer block: text_equation, graph_plot, drag_drop, image_drop, arrange_order, smart_math, multiple_choice';
COMMENT ON COLUMN public.mock_questions.answer_block_config IS 'JSON configuration for the answer block (e.g., graph settings, drag-drop items)';