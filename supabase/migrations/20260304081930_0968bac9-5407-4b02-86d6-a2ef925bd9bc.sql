
-- Create evaluation training data table for AI learning
CREATE TABLE public.evaluation_training_data (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evaluation_id uuid REFERENCES public.exam_evaluations(id) ON DELETE CASCADE NOT NULL,
  question_id uuid NOT NULL,
  sub_question_id uuid,
  question_text text NOT NULL,
  correct_answer text,
  student_answer text NOT NULL,
  answer_type text DEFAULT 'text',
  manual_marks_awarded numeric,
  ai_marks_awarded numeric,
  max_marks numeric NOT NULL,
  manual_feedback text,
  ai_feedback text,
  final_marks numeric,
  evaluator_id uuid,
  question_metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.evaluation_training_data ENABLE ROW LEVEL SECURITY;

-- Admins can manage all training data
CREATE POLICY "Admins can manage training data"
ON public.evaluation_training_data
FOR ALL
USING (has_role(auth.uid(), 'admin'::app_role));

-- Add per-question suggestions columns to exam_evaluations
ALTER TABLE public.exam_evaluations
ADD COLUMN IF NOT EXISTS question_evaluations jsonb DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS evaluation_mode text DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS suggestions jsonb DEFAULT '{}'::jsonb;

-- Create trigger for updated_at
CREATE TRIGGER update_evaluation_training_data_timestamp
BEFORE UPDATE ON public.evaluation_training_data
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
