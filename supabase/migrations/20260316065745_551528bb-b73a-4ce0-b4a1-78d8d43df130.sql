
-- Create evaluation_items table for per-question evaluation data
CREATE TABLE IF NOT EXISTS public.evaluation_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id uuid NOT NULL REFERENCES public.exam_evaluations(id) ON DELETE CASCADE,
  attempt_id uuid NOT NULL REFERENCES public.test_attempts(id) ON DELETE CASCADE,
  question_id uuid REFERENCES public.mock_questions(id) ON DELETE CASCADE,
  sub_question_id uuid REFERENCES public.mock_sub_questions(id) ON DELETE CASCADE,
  marks_awarded numeric(8,2) DEFAULT 0,
  feedback text,
  suggestions text,
  ai_suggestions jsonb DEFAULT '{}'::jsonb,
  reviewed_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.evaluation_items ENABLE ROW LEVEL SECURITY;

-- Admins can manage all evaluation items
CREATE POLICY "Admins can manage evaluation items"
  ON public.evaluation_items
  FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Students can view their own published evaluation items
CREATE POLICY "Students can view own published evaluation items"
  ON public.evaluation_items
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.test_attempts ta
      JOIN public.exam_evaluations ee ON ee.test_attempt_id = ta.id
      WHERE ee.id = evaluation_items.evaluation_id
        AND ta.user_id = auth.uid()
        AND ee.evaluation_status = 'finalized'
    )
  );

-- Add updated_at trigger
CREATE TRIGGER update_evaluation_items_updated_at
  BEFORE UPDATE ON public.evaluation_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
