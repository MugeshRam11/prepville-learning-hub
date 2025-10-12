-- Create mock test question bank table for persistent storage
CREATE TABLE IF NOT EXISTS public.mock_test_question_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_number INTEGER NOT NULL,
  question_text TEXT NOT NULL,
  question_image_url TEXT,
  has_sub_questions BOOLEAN DEFAULT FALSE,
  marks INTEGER NOT NULL DEFAULT 1,
  answer_key TEXT,
  word_limit INTEGER,
  difficulty question_difficulty DEFAULT 'medium',
  category TEXT,
  subject test_subject NOT NULL,
  topic TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- Create sub-questions bank table
CREATE TABLE IF NOT EXISTS public.mock_test_sub_question_bank (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  question_bank_id UUID NOT NULL REFERENCES public.mock_test_question_bank(id) ON DELETE CASCADE,
  sub_question_label TEXT NOT NULL,
  sub_question_text TEXT NOT NULL,
  sub_question_image_url TEXT,
  marks INTEGER NOT NULL DEFAULT 1,
  answer_key TEXT,
  word_limit INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.mock_test_question_bank ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.mock_test_sub_question_bank ENABLE ROW LEVEL SECURITY;

-- RLS Policies for question bank
CREATE POLICY "Admins can manage question bank"
ON public.mock_test_question_bank
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'::user_role
  )
);

CREATE POLICY "Admins can view question bank"
ON public.mock_test_question_bank
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'::user_role
  )
);

-- RLS Policies for sub-question bank
CREATE POLICY "Admins can manage sub-question bank"
ON public.mock_test_sub_question_bank
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'::user_role
  )
);

CREATE POLICY "Admins can view sub-question bank"
ON public.mock_test_sub_question_bank
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'admin'::user_role
  )
);

-- Add indexes for better performance
CREATE INDEX idx_question_bank_subject ON public.mock_test_question_bank(subject);
CREATE INDEX idx_question_bank_topic ON public.mock_test_question_bank(topic);
CREATE INDEX idx_question_bank_category ON public.mock_test_question_bank(category);
CREATE INDEX idx_question_bank_active ON public.mock_test_question_bank(is_active);

-- Add trigger for updated_at
CREATE TRIGGER update_question_bank_updated_at
BEFORE UPDATE ON public.mock_test_question_bank
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();