
-- Create practice_sets table
CREATE TABLE public.practice_sets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  topic TEXT NOT NULL,
  difficulty TEXT NOT NULL DEFAULT 'medium',
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  is_published BOOLEAN NOT NULL DEFAULT false,
  is_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create practice_questions table
CREATE TABLE public.practice_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  practice_set_id UUID NOT NULL REFERENCES public.practice_sets(id) ON DELETE CASCADE,
  question_text TEXT NOT NULL DEFAULT '',
  question_image_url TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create practice_sub_questions table
CREATE TABLE public.practice_sub_questions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  question_id UUID NOT NULL REFERENCES public.practice_questions(id) ON DELETE CASCADE,
  label TEXT NOT NULL DEFAULT 'a',
  marks INTEGER NOT NULL DEFAULT 1,
  answer_type TEXT NOT NULL DEFAULT 'text_equation',
  answer_block_config JSONB DEFAULT '{}'::jsonb,
  answer_key TEXT,
  solution TEXT,
  command_term TEXT,
  sub_question_text TEXT NOT NULL DEFAULT '',
  sub_question_image_url TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.practice_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.practice_sub_questions ENABLE ROW LEVEL SECURITY;

-- practice_sets policies
CREATE POLICY "Admins can manage all practice sets"
  ON public.practice_sets FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view published practice sets"
  ON public.practice_sets FOR SELECT
  USING (is_published = true AND is_archived = false);

-- practice_questions policies
CREATE POLICY "Admins can manage all practice questions"
  ON public.practice_questions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view questions of published sets"
  ON public.practice_questions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.practice_sets
    WHERE practice_sets.id = practice_questions.practice_set_id
      AND practice_sets.is_published = true
      AND practice_sets.is_archived = false
  ));

-- practice_sub_questions policies
CREATE POLICY "Admins can manage all practice sub questions"
  ON public.practice_sub_questions FOR ALL
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Users can view sub questions of published sets"
  ON public.practice_sub_questions FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.practice_questions pq
    JOIN public.practice_sets ps ON ps.id = pq.practice_set_id
    WHERE pq.id = practice_sub_questions.question_id
      AND ps.is_published = true
      AND ps.is_archived = false
  ));

-- Indexes for performance
CREATE INDEX idx_practice_questions_set_id ON public.practice_questions(practice_set_id);
CREATE INDEX idx_practice_sub_questions_question_id ON public.practice_sub_questions(question_id);
CREATE INDEX idx_practice_sets_published ON public.practice_sets(is_published, is_archived);

-- Updated_at triggers
CREATE TRIGGER update_practice_sets_updated_at
  BEFORE UPDATE ON public.practice_sets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_practice_questions_updated_at
  BEFORE UPDATE ON public.practice_questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_practice_sub_questions_updated_at
  BEFORE UPDATE ON public.practice_sub_questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
